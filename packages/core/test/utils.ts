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
import {
    Circuit,
    formatProofForVerifierContract,
    MAX_REPUTATION_BUDGET,
    defaultProver,
} from '@unirep/circuits'
import {
    Attestation,
    computeStartTransitionProofHash,
    computeProcessAttestationsProofHash,
    UserTransitionProof,
} from '@unirep/contracts'

import {
    computeEmptyUserStateRoot,
    genEpochKey,
    genUserState,
    Reputation,
    UserState,
} from '../src'
import {
    genEpochKeyCircuitInput,
    genNewEpochTree,
    genNewUserStateTree,
    toCompleteHexString,
} from '../../circuits/test/utils'
import { IAttestation } from '@unirep/contracts'
import { getUnirepContract } from '@unirep/contracts'
import { Unirep } from '@unirep/contracts'
import { DB, SQLiteConnector } from 'anondb/node'
import * as crypto from 'crypto'

const genNewGST = (
    GSTDepth: number,
    USTDepth: number
): IncrementalMerkleTree => {
    const emptyUserStateRoot = computeEmptyUserStateRoot(USTDepth)
    const defaultGSTLeaf = hashLeftRight(BigInt(0), emptyUserStateRoot)
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

const genReputationCircuitInput = (
    id: ZkIdentity,
    epoch: number,
    nonce: number,
    GSTree: IncrementalMerkleTree,
    leafIdx: number,
    reputationRecords,
    attesterId,
    _repNullifiersAmount?,
    _minRep?,
    _proveGraffiti?,
    _graffitiPreImage?
) => {
    const epk = genEpochKey(id.identityNullifier, epoch, nonce)
    const repNullifiersAmount = _repNullifiersAmount ?? 0
    const minRep = _minRep ?? 0
    const proveGraffiti = _proveGraffiti ?? 0
    let graffitiPreImage
    if (proveGraffiti === 1 && reputationRecords[attesterId]) {
        graffitiPreImage = reputationRecords[attesterId]['graffitiPreImage']
    }
    graffitiPreImage = _graffitiPreImage ?? 0
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

    // selectors and karma nonce
    const nonceStarter = 0
    const selectors: BigInt[] = []
    const nonceList: BigInt[] = []
    for (let i = 0; i < repNullifiersAmount; i++) {
        nonceList.push(BigInt(nonceStarter + i))
        selectors.push(BigInt(1))
    }
    for (let i = repNullifiersAmount; i < MAX_REPUTATION_BUDGET; i++) {
        nonceList.push(BigInt(0))
        selectors.push(BigInt(0))
    }

    const circuitInputs = {
        epoch: epoch,
        epoch_key_nonce: nonce,
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
        rep_nullifiers_amount: repNullifiersAmount,
        selectors: selectors,
        rep_nonce: nonceList,
        min_rep: minRep,
        prove_graffiti: proveGraffiti,
        graffiti_pre_image: graffitiPreImage,
    }
    return stringifyBigInts(circuitInputs)
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

    let isValid = await verifyStartTransitionProof(startTransitionProof)
    expect(isValid).to.be.true

    // submit proofs
    let tx = await contract.startUserStateTransition(
        startTransitionProof.blindedUserState,
        startTransitionProof.blindedHashChain,
        startTransitionProof.globalStateTreeRoot,
        formatProofForVerifierContract(startTransitionProof.proof)
    )
    let receipt = await tx.wait()
    expect(receipt.status).to.equal(1)

    // submit twice should fail
    await expect(
        contract.startUserStateTransition(
            startTransitionProof.blindedUserState,
            startTransitionProof.blindedHashChain,
            startTransitionProof.globalStateTreeRoot,
            formatProofForVerifierContract(startTransitionProof.proof)
        )
    ).to.be.revertedWithCustomError(contract, 'NullifierAlreadyUsed')

    let hashedProof = computeStartTransitionProofHash(
        startTransitionProof.blindedUserState,
        startTransitionProof.blindedHashChain,
        startTransitionProof.globalStateTreeRoot,
        formatProofForVerifierContract(startTransitionProof.proof)
    )
    proofIndexes.push(Number(await contract.getProofIndex(hashedProof)))

    for (let i = 0; i < processAttestationProofs.length; i++) {
        isValid = await verifyProcessAttestationsProof(
            processAttestationProofs[i]
        )
        expect(isValid).to.be.true

        tx = await contract.processAttestations(
            processAttestationProofs[i].outputBlindedUserState,
            processAttestationProofs[i].outputBlindedHashChain,
            processAttestationProofs[i].inputBlindedUserState,
            formatProofForVerifierContract(processAttestationProofs[i].proof)
        )
        receipt = await tx.wait()
        expect(receipt.status).to.equal(1)

        // submit twice should fail
        await expect(
            contract.processAttestations(
                processAttestationProofs[i].outputBlindedUserState,
                processAttestationProofs[i].outputBlindedHashChain,
                processAttestationProofs[i].inputBlindedUserState,
                formatProofForVerifierContract(
                    processAttestationProofs[i].proof
                )
            )
        ).to.be.revertedWithCustomError(contract, 'NullifierAlreadyUsed')

        let hashedProof = computeProcessAttestationsProofHash(
            processAttestationProofs[i].outputBlindedUserState,
            processAttestationProofs[i].outputBlindedHashChain,
            processAttestationProofs[i].inputBlindedUserState,
            formatProofForVerifierContract(processAttestationProofs[i].proof)
        )
        proofIndexes.push(Number(await contract.getProofIndex(hashedProof)))
    }
    const USTInput = new UserTransitionProof(
        finalTransitionProof.publicSignals,
        finalTransitionProof.proof,
        defaultProver
    )
    isValid = await USTInput.verify()
    expect(isValid).to.be.true
    tx = await contract.updateUserStateRoot(USTInput, proofIndexes)
    receipt = await tx.wait()
    expect(receipt.status).to.equal(1)

    // submit twice should fail
    await expect(
        contract.updateUserStateRoot(USTInput, proofIndexes)
    ).to.be.revertedWithCustomError(contract, 'NullifierAlreadyUsed')
}

export const compareDB = async (db1: DB, db2: DB) => {
    const tables = [
        'Proof',
        'Attestation',
        'GSTLeaf',
        'GSTRoot',
        'Epoch',
        'EpochKey',
        'Nullifier',
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
            expect(contentMap[hash(content)], content).to.equal(true)
        }
    }
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
        expect(await usWithNoStorage.genEpochTree(epoch)).deep.equal(
            await usWithStorage.genEpochTree(epoch)
        )
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
}
