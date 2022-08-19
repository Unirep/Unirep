// The reason for the ts-ignore below is that if we are executing the code via `ts-node` instead of `hardhat`,
// it can not read the hardhat config and error ts-2503 will be reported.
// @ts-ignore
import { expect } from 'chai'
import { BigNumber, BigNumberish, ethers } from 'ethers'
import {
    IncrementalMerkleTree,
    hashLeftRight,
    genRandomSalt,
    stringifyBigInts,
    ZkIdentity,
} from '@unirep/crypto'
import { Circuit } from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'
import { Attestation } from '@unirep/contracts'

import {
    computeEmptyUserStateRoot,
    genEpochKey,
    Reputation,
    UserState,
} from '../src'
import {
    genEpochKeyCircuitInput,
    genReputationCircuitInput,
    genNewEpochTree,
    genNewUserStateTree,
    toCompleteHexString,
} from '../../circuits/test/utils'
import { IAttestation } from '@unirep/contracts'
import { getUnirepContract } from '@unirep/contracts'
import { Unirep } from '@unirep/contracts'
import { DB, SQLiteConnector } from 'anondb/node'
import * as crypto from 'crypto'
import { Synchronizer } from '../src/Synchronizer'
import { schema } from '../src/schema'

const genNewGST = (
    GSTDepth: number,
    defaultGSTLeaf = BigInt(0)
): IncrementalMerkleTree => {
    const GST = new IncrementalMerkleTree(GSTDepth, defaultGSTLeaf)
    return GST
}

const genRandomAttestation = (): Attestation => {
    const attesterId = Math.ceil(Math.random() * 10)
    const attestation = new Attestation(
        BigInt(attesterId),
        BigInt(Math.floor(Math.random() * 100)),
        BigInt(Math.floor(Math.random() * 100)),
        BigNumber.from(genRandomSalt()),
        BigInt(Math.floor(Math.random() * 2))
    )
    return attestation
}

const genRandomList = (length): BigNumberish[] => {
    const array: BigNumberish[] = []
    for (let i = 0; i < length; i++) {
        array.push(BigNumber.from(genRandomSalt()))
    }
    return array
}

const computeEpochKeyProofHash = (epochKeyProof: any) => {
    const abiEncoder = ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'uint256', 'uint256', 'uint256[8]'],
        epochKeyProof
    )
    return ethers.utils.keccak256(abiEncoder)
}

const verifyStartTransitionProof = async (
    startTransitionProof
): Promise<boolean> => {
    return await defaultProver.verifyProof(
        Circuit.startTransition,
        startTransitionProof.publicSignals,
        startTransitionProof.proof
    )
}

const verifyProcessAttestationsProof = async (
    processAttestationProof
): Promise<boolean> => {
    return await defaultProver.verifyProof(
        Circuit.processAttestations,
        processAttestationProof.publicSignals,
        processAttestationProof.proof
    )
}

const getReputationRecords = async (id: ZkIdentity, userState: UserState) => {
    const currentEpoch = (await userState.loadCurrentEpoch()).number
    const reputaitonRecord = {}
    for (let i = 0; i < currentEpoch; i++) {
        for (let j = 0; j < userState.settings.numEpochKeyNoncePerEpoch; j++) {
            const epk = genEpochKey(id.identityNullifier, i, j)
            const attestations = await userState.getAttestations(epk.toString())
            for (let attestation of attestations) {
                const attesterId = attestation.attesterId.toString()
                if (reputaitonRecord[attesterId] === undefined) {
                    reputaitonRecord[attesterId] = new Reputation(
                        attestation.posRep,
                        attestation.negRep,
                        attestation.graffiti,
                        attestation.signUp
                    )
                } else {
                    reputaitonRecord[attesterId].update(
                        attestation.posRep,
                        attestation.negRep,
                        attestation.graffiti,
                        attestation.signUp
                    )
                }
            }
        }
    }
    return reputaitonRecord
}

const genProveSignUpCircuitInput = (
    id: ZkIdentity,
    epoch: number,
    GSTree: IncrementalMerkleTree,
    leafIdx: number,
    reputationRecords,
    attesterId,
    _signUp?: number
) => {
    const nonce = 0
    const epk = genEpochKey(id.identityNullifier, epoch, nonce)
    if (reputationRecords[attesterId] === undefined) {
        reputationRecords[attesterId] = Reputation.default()
    }

    // User state tree
    const userStateTree = genNewUserStateTree()
    for (const attester of Object.keys(reputationRecords)) {
        userStateTree.update(
            BigInt(attester),
            reputationRecords[attester].hash()
        )
    }
    const userStateRoot = userStateTree.root
    const USTPathElements = userStateTree.createProof(BigInt(attesterId))

    // Global state tree
    const GSTreeProof = GSTree.createProof(leafIdx) // if there is only one GST leaf, the index is 0
    const GSTreeRoot = GSTree.root

    const circuitInputs = {
        epoch: epoch,
        epoch_key: epk,
        identity_nullifier: id.identityNullifier,
        identity_trapdoor: id.trapdoor,
        user_tree_root: userStateRoot,
        GST_path_index: GSTreeProof.pathIndices,
        GST_path_elements: GSTreeProof.siblings,
        GST_root: GSTreeRoot,
        attester_id: attesterId,
        pos_rep: reputationRecords[attesterId]['posRep'],
        neg_rep: reputationRecords[attesterId]['negRep'],
        graffiti: reputationRecords[attesterId]['graffiti'],
        sign_up: reputationRecords[attesterId]['signUp'],
        UST_path_elements: USTPathElements,
    }
    return stringifyBigInts(circuitInputs)
}

const submitUSTProofs = async (
    contract: ethers.Contract,
    { startTransitionProof, processAttestationProofs, finalTransitionProof }
) => {
    const proofIndexes: number[] = []

    {
        // submit proofs
        const isValid = await startTransitionProof.verify()
        expect(isValid).to.be.true
        const tx = await contract.startUserStateTransition(
            startTransitionProof.publicSignals,
            startTransitionProof.proof
        )
        const receipt = await tx.wait()
        expect(receipt.status).to.equal(1)

        // submit twice should fail
        await expect(
            contract.startUserStateTransition(
                startTransitionProof.publicSignals,
                startTransitionProof.proof
            )
        ).to.be.revertedWithCustomError(contract, 'ProofAlreadyUsed')

        const hashedProof = startTransitionProof.hash()
        proofIndexes.push(Number(await contract.getProofIndex(hashedProof)))
    }

    for (let i = 0; i < processAttestationProofs.length; i++) {
        const isValid = await processAttestationProofs[i].verify()
        expect(isValid).to.be.true

        const tx = await contract.processAttestations(
            processAttestationProofs[i].publicSignals,
            processAttestationProofs[i].proof
        )
        const receipt = await tx.wait()
        expect(receipt.status).to.equal(1)

        // submit random process attestations should success and not affect the results
        // const falseInput = BigNumber.from(genRandomSalt())
        // await contract
        //     .processAttestations(
        //         processAttestationProofs[i].outputBlindedUserState,
        //         processAttestationProofs[i].outputBlindedHashChain,
        //         falseInput,
        //         formatProofForVerifierContract(
        //             processAttestationProofs[i].proof
        //         )
        //     )
        //     .then((t) => t.wait())

        // submit twice should fail
        await expect(
            contract.processAttestations(
                processAttestationProofs[i].publicSignals,
                processAttestationProofs[i].proof
            )
        ).to.be.revertedWithCustomError(contract, 'ProofAlreadyUsed')

        const hashedProof = processAttestationProofs[i].hash()
        proofIndexes.push(Number(await contract.getProofIndex(hashedProof)))
    }

    {
        const isValid = await finalTransitionProof.verify()
        expect(isValid).to.be.true
        const tx = await contract.updateUserStateRoot(
            finalTransitionProof.publicSignals,
            finalTransitionProof.proof
        )
        const receipt = await tx.wait()
        expect(receipt.status).to.equal(1)

        // submit twice should fail
        await expect(
            contract.updateUserStateRoot(
                finalTransitionProof.publicSignals,
                finalTransitionProof.proof
            )
        ).to.be.revertedWithCustomError(contract, 'ProofAlreadyUsed')
    }
}

const tables = [
    'Proof',
    'Nullifier',
    'GSTLeaf',
    'GSTRoot',
    'Attestation',
    'Epoch',
    'EpochKey',
    'UserSignUp',
]

const hash = (obj: any) => {
    const stringContent = JSON.stringify({
        ...obj,
        _id: null,
        createdAt: null,
    })
    return crypto.createHash('sha256').update(stringContent).digest('hex')
}

export const compareDB = async (db1: DB, db2: DB) => {
    for (const table of tables) {
        const contents1 = await db1.findMany(table, { where: {} })
        const contents2 = await db2.findMany(table, { where: {} })
        expect(contents1.length).to.equal(contents2.length)
        const contentMap = contents1.reduce((acc, obj) => {
            return {
                [hash(obj)]: true,
                ...acc,
            }
        }, {})
        for (const content of contents2) {
            expect(contentMap[hash(content)], JSON.stringify(content)).to.equal(
                true
            )
        }
    }
}

// this only returns new and changed documents. It does not account for deleted
// documents
export const getSnapDBDiffs = async (snap: Object, db: DB) => {
    const diffs = [] as any[]
    for (const table of tables) {
        const contents = await db.findMany(table, { where: {} })
        for (const content of contents) {
            if (!snap[hash(content)]) {
                diffs.push({ ...content, table })
            }
        }
    }
    return diffs
}

export const snapshotDB = async (db: DB) => {
    const tableSnaps = await Promise.all(
        tables.map(async (table) => {
            const contents = await db.findMany(table, { where: {} })
            return contents.reduce((acc, obj) => {
                return {
                    [hash(obj)]: true,
                    ...acc,
                }
            }, {})
        })
    )
    return tableSnaps.reduce((acc, snap) => {
        const newSnap = {
            ...snap,
            ...acc,
        }
        expect(Object.keys(newSnap).length, 'duplicate entry').to.equal(
            Object.keys(acc).length + Object.keys(snap).length
        )
        return newSnap
    }, {})
}

const compareStates = async (
    provider: ethers.providers.Provider,
    address: string,
    userId: ZkIdentity,
    db: Promise<SQLiteConnector>
) => {
    const unirepContract: Unirep = await getUnirepContract(address, provider)
    const currentEpoch = (await unirepContract.currentEpoch()).toNumber()

    const usWithNoStorage = await genUserState(provider, address, userId)
    const usWithStorage = await genUserState(
        provider,
        address,
        userId,
        await db
    )
    expect(await usWithNoStorage.latestGSTLeafIndex()).equal(
        await usWithStorage.latestGSTLeafIndex()
    )

    expect(await usWithNoStorage.latestTransitionedEpoch()).equal(
        await usWithStorage.latestTransitionedEpoch()
    )

    for (let epoch = 1; epoch <= currentEpoch; epoch++) {
        for (
            let nonce = 0;
            nonce < usWithNoStorage.settings.numEpochKeyNoncePerEpoch;
            nonce++
        ) {
            const epk = genEpochKey(
                userId.identityNullifier,
                epoch,
                nonce,
                usWithNoStorage.settings.epochTreeDepth
            ).toString()
            expect((await usWithNoStorage.getAttestations(epk)).length).equal(
                (await usWithStorage.getAttestations(epk)).length
            )
        }
        expect(await usWithNoStorage.genGSTree(epoch)).deep.equal(
            await usWithStorage.genGSTree(epoch)
        )
    }

    for (let epoch = 1; epoch < currentEpoch; epoch++) {
        const [root1, root2] = await Promise.all([
            usWithNoStorage.epochTreeRoot(epoch),
            usWithStorage.epochTreeRoot(epoch),
        ])
        expect(root1).to.equal(root2)
    }
}

const compareAttestations = (
    attestDB: IAttestation,
    attestObj: Attestation
) => {
    expect(attestDB.attesterId.toString()).equal(
        attestObj.attesterId.toString()
    )
    expect(attestDB.posRep.toString()).equal(attestObj.posRep.toString())
    expect(attestDB.negRep.toString()).equal(attestObj.negRep.toString())
    expect(attestDB.graffiti.toString()).equal(attestObj.graffiti.toString())
    expect(attestDB.signUp.toString()).equal(attestObj.signUp.toString())
}

/**
 * Retrieves and parses on-chain Unirep contract data to create an off-chain
 * representation as a UnirepState object.
 * @param provider An Ethereum provider
 * @param address The address of the Unirep contract
 * @param _db An optional DB object
 */
const genUnirepState = async (
    provider: ethers.providers.Provider,
    address: string,
    _db?: DB
) => {
    const unirepContract: Unirep = await getUnirepContract(address, provider)
    let synchronizer: Synchronizer
    let db: DB = _db ?? (await SQLiteConnector.create(schema, ':memory:'))
    synchronizer = new Synchronizer(db, defaultProver, unirepContract)
    await synchronizer.start()
    await synchronizer.waitForSync()
    return synchronizer
}

/**
 * This function works mostly the same as genUnirepState,
 * except that it also updates the user's state during events processing.
 * @param provider An Ethereum provider
 * @param address The address of the Unirep contract
 * @param userIdentity The semaphore identity of the user
 * @param _db An optional DB object
 */
const genUserState = async (
    provider: ethers.providers.Provider,
    address: string,
    userIdentity: ZkIdentity,
    _db?: DB
) => {
    const unirepContract: Unirep = getUnirepContract(address, provider)
    let db: DB = _db ?? (await SQLiteConnector.create(schema, ':memory:'))
    const userState = new UserState(
        db,
        defaultProver,
        unirepContract,
        userIdentity
    )
    await userState.start()
    await userState.waitForSync()
    return userState
}

export {
    genNewEpochTree,
    genNewUserStateTree,
    genNewGST,
    genRandomAttestation,
    genRandomList,
    toCompleteHexString,
    computeEpochKeyProofHash,
    verifyStartTransitionProof,
    verifyProcessAttestationsProof,
    getReputationRecords,
    genEpochKeyCircuitInput,
    genReputationCircuitInput,
    genProveSignUpCircuitInput,
    submitUSTProofs,
    compareStates,
    compareAttestations,
    genUserState,
    genUnirepState,
}
