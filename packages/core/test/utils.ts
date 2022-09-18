// The reason for the ts-ignore below is that if we are executing the code via `ts-node` instead of `hardhat`,
// it can not read the hardhat config and error ts-2503 will be reported.
// @ts-ignore
import { expect } from 'chai'
import { BigNumber, BigNumberish, ethers } from 'ethers'
import {
    IncrementalMerkleTree,
    genRandomSalt,
    stringifyBigInts,
    ZkIdentity,
    genEpochKey,
} from '@unirep/crypto'
import { Circuit } from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'
import { Attestation } from '@unirep/contracts'

import { Reputation, UserState } from '../src'
import {
    genEpochKeyCircuitInput,
    genReputationCircuitInput,
    genNewEpochTree,
    toCompleteHexString,
} from '../../circuits/test/utils'
import { IAttestation } from '@unirep/contracts'
import { getUnirepContract } from '@unirep/contracts'
import { Unirep } from '@unirep/contracts'
import { DB, SQLiteConnector } from 'anondb/node'
import * as crypto from 'crypto'
import { Synchronizer } from '../src/Synchronizer'
import { schema } from '../src/schema'

export const genNewGST = (
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

export const computeEpochKeyProofHash = (epochKeyProof: any) => {
    const abiEncoder = ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'uint256', 'uint256', 'uint256[8]'],
        epochKeyProof
    )
    return ethers.utils.keccak256(abiEncoder)
}

const tables = ['Nullifier', 'GSTLeaf', 'Attestation', 'Epoch', 'UserSignUp']

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

// export const compareStates = async (
//     provider: ethers.providers.Provider,
//     address: string,
//     userId: ZkIdentity,
//     db: Promise<SQLiteConnector>
// ) => {
//     const unirepContract: Unirep = await getUnirepContract(address, provider)
//     const currentEpoch = (await unirepContract.currentEpoch()).toNumber()

//     const usWithNoStorage = await genUserState(provider, address, userId)
//     const usWithStorage = await genUserState(
//         provider,
//         address,
//         userId,
//         await db
//     )
//     expect(await usWithNoStorage.latestGSTLeafIndex()).equal(
//         await usWithStorage.latestGSTLeafIndex()
//     )

//     expect(await usWithNoStorage.latestTransitionedEpoch()).equal(
//         await usWithStorage.latestTransitionedEpoch()
//     )

//     for (let epoch = 1; epoch <= currentEpoch; epoch++) {
//         for (
//             let nonce = 0;
//             nonce < usWithNoStorage.settings.numEpochKeyNoncePerEpoch;
//             nonce++
//         ) {
//             const epk = genEpochKey(
//                 userId.identityNullifier,
//                 epoch,
//                 nonce,
//                 usWithNoStorage.settings.epochTreeDepth
//             ).toString()
//             expect((await usWithNoStorage.getAttestations(epk)).length).equal(
//                 (await usWithStorage.getAttestations(epk)).length
//             )
//         }
//         expect(await usWithNoStorage.genGSTree(epoch)).deep.equal(
//             await usWithStorage.genGSTree(epoch)
//         )
//     }

//     for (let epoch = 1; epoch < currentEpoch; epoch++) {
//         const [root1, root2] = await Promise.all([
//             usWithNoStorage.epochTreeRoot(epoch),
//             usWithStorage.epochTreeRoot(epoch),
//         ])
//         expect(root1).to.equal(root2)
//     }
// }

export const compareAttestations = (
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
export const genUnirepState = async (
    provider: ethers.providers.Provider,
    address: string,
    attesterId: bigint,
    _db?: DB
) => {
    const unirepContract: Unirep = await getUnirepContract(address, provider)
    let synchronizer: Synchronizer
    let db: DB = _db ?? (await SQLiteConnector.create(schema, ':memory:'))
    synchronizer = new Synchronizer({
        db,
        prover: defaultProver,
        unirepContract,
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
    const unirepContract: Unirep = getUnirepContract(address, provider)
    let db: DB = _db ?? (await SQLiteConnector.create(schema, ':memory:'))
    const userState = new UserState({
        db,
        prover: defaultProver,
        unirepContract,
        _id: userIdentity,
        attesterId,
    })
    await userState.start()
    await userState.waitForSync()
    return userState
}
