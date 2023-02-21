// The reason for the ts-ignore below is that if we are executing the code via `ts-node` instead of `hardhat`,
// it can not read the hardhat config and error ts-2503 will be reported.
// @ts-ignore
import { expect } from 'chai'
import { ethers } from 'ethers'
import { ZkIdentity } from '@unirep/utils'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

import { UserState } from '../src'
import { DB } from 'anondb/node'
import * as crypto from 'crypto'
import { Synchronizer } from '../src/Synchronizer'

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
    const unirep = new Synchronizer({
        unirepAddress: address,
        provider,
        attesterId,
        prover: defaultProver,
    })
    unirep.pollRate = 150
    await unirep.start()
    await unirep.waitForSync()
    return unirep
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
    const synchronizer = await genUnirepState(
        provider,
        address,
        attesterId,
        _db
    )
    return new UserState(synchronizer, userIdentity)
}
