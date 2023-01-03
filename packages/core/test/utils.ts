// The reason for the ts-ignore below is that if we are executing the code via `ts-node` instead of `hardhat`,
// it can not read the hardhat config and error ts-2503 will be reported.
// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import {
    genRandomSalt,
    hash4,
    IncrementalMerkleTree,
    SparseMerkleTree,
    stringifyBigInts,
    ZkIdentity,
} from '@unirep/utils'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'
import { Unirep } from '@unirep/contracts'

import { UserState } from '../src'
import { DB, SQLiteConnector } from 'anondb/node'
import * as crypto from 'crypto'
import { Synchronizer } from '../src/Synchronizer'
import { schema } from '../src/schema'
import {
    Circuit,
    EPOCH_TREE_ARITY,
    EPOCH_TREE_DEPTH,
    SignupProof,
    STATE_TREE_DEPTH,
} from '@unirep/circuits'

export const computeEpochKeyProofHash = (epochKeyProof: any) => {
    const abiEncoder = ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'uint256', 'uint256', 'uint256[8]'],
        epochKeyProof
    )
    return ethers.utils.keccak256(abiEncoder)
}

const tables = [
    'Nullifier',
    'StateTreeLeaf',
    'Attestation',
    'Epoch',
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

export const compareAttestations = (attestDB: any, attestObj: any) => {
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
export const genUnirepState = async (
    provider: ethers.providers.Provider,
    address: string,
    attesterId: bigint,
    _db?: DB
) => {
    let synchronizer: Synchronizer
    let db: DB = _db ?? (await SQLiteConnector.create(schema, ':memory:'))
    synchronizer = new Synchronizer({
        db,
        prover: defaultProver,
        unirepAddress: address,
        provider,
        attesterId,
    })
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
export const genUserState = async (
    provider: ethers.providers.Provider,
    address: string,
    userIdentity: ZkIdentity,
    attesterId: bigint,
    _db?: DB
) => {
    let db: DB = _db ?? (await SQLiteConnector.create(schema, ':memory:'))
    const userState = new UserState({
        db,
        prover: defaultProver,
        unirepAddress: address,
        provider,
        attesterId,
        _id: userIdentity,
    })
    await userState.start()
    await userState.waitForSync()
    return userState
}

export const bootstrapUsers = async (
    attester: any,
    epoch: number,
    unirepContract: Unirep
) => {
    const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
    const randomUserNum = Math.ceil(Math.random() * 5)
    for (let i = 0; i < randomUserNum; i++) {
        const id = new ZkIdentity()
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.signup,
            stringifyBigInts({
                epoch,
                identity_nullifier: id.identityNullifier,
                identity_trapdoor: id.trapdoor,
                attester_id: attester.address,
            })
        )
        const { publicSignals, proof, stateTreeLeaf } = new SignupProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )

        await unirepContract
            .connect(attester)
            .userSignUp(publicSignals, proof)
            .then((t) => t.wait())
        stateTree.insert(stateTreeLeaf)
    }

    return stateTree
}

export const bootstrapAttestations = async (
    attester: any,
    epoch: number,
    unirepContract: Unirep
) => {
    const defaultEpochTreeLeaf = hash4([0, 0, 0, 0])
    const epochTree = new SparseMerkleTree(
        EPOCH_TREE_DEPTH,
        defaultEpochTreeLeaf,
        EPOCH_TREE_ARITY
    )
    const randomEpkNum = Math.ceil(Math.random() * 10)
    for (let i = 0; i < randomEpkNum; i++) {
        const epochKey =
            genRandomSalt() %
            (BigInt(EPOCH_TREE_ARITY) ** BigInt(EPOCH_TREE_DEPTH) - BigInt(1))
        const randomAttestNum = Math.ceil(Math.random() * 3)
        let totalPosRep = 0
        let totalNegRep = 0
        let finalGraffiti = BigInt(0)
        let finalTimestamp = 0
        for (let j = 0; j < randomAttestNum; j++) {
            const posRep = Math.floor(Math.random() * 10)
            const negRep = Math.floor(Math.random() * 10)
            const graffiti = Math.random() > 0.5 ? genRandomSalt() : BigInt(0)

            const tx = await unirepContract
                .connect(attester)
                .submitAttestation(epoch, epochKey, posRep, negRep, graffiti)
            const { timestamp } = await tx
                .wait()
                .then(({ blockNumber }) =>
                    ethers.provider.getBlock(blockNumber)
                )
            totalPosRep += posRep
            totalNegRep += negRep
            finalGraffiti = graffiti > 0 ? graffiti : finalGraffiti
            finalTimestamp = graffiti > 0 ? timestamp : finalTimestamp
        }
        epochTree.update(
            epochKey,
            hash4([totalPosRep, totalNegRep, finalGraffiti, finalTimestamp])
        )
    }
    return epochTree
}

export const processAttestations = async (
    synchronizer: Synchronizer,
    unirepContract: Unirep,
    attester: any
) => {
    let success = true
    const epoch = await unirepContract.attesterCurrentEpoch(attester.address)
    while (success) {
        try {
            await synchronizer.waitForSync()
            await unirepContract
                .buildHashchain(attester.address, epoch)
                .then((t) => t.wait())

            const hashchainIndex =
                await unirepContract.attesterHashchainProcessedCount(
                    attester.address,
                    epoch
                )
            const hashchain = await unirepContract.attesterHashchain(
                attester.address,
                epoch,
                hashchainIndex
            )

            const { publicSignals, proof } =
                await synchronizer.genAggregateEpochKeysProof({
                    epochKeys: hashchain.epochKeys as any,
                    newBalances: hashchain.epochKeyBalances as any,
                    hashchainIndex: hashchainIndex as any,
                    epoch: epoch.toNumber(),
                })
            await unirepContract
                .connect(attester)
                .processHashchain(publicSignals, proof)
                .then((t) => t.wait())
        } catch (error) {
            success = false
        }
    }
}
