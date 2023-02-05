import { BigNumberish } from '@ethersproject/bignumber'
import { Circuit, Prover, SignupProof, CircuitConfig } from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'
import {
    genRandomSalt,
    hash4,
    IncrementalMerkleTree,
    SparseMerkleTree,
    stringifyBigInts,
    ZkIdentity,
} from '@unirep/utils'
import { Synchronizer } from '@unirep/core'
import { deployUnirep } from '@unirep/contracts/deploy'
import { ethers } from 'ethers'
import defaultConfig from '@unirep/circuits/config'
import defaultProver from '@unirep/circuits/provers/defaultProver'
import { MemoryConnector } from 'anondb/web'

const { EPOCH_TREE_ARITY, EPOCH_TREE_DEPTH, STATE_TREE_DEPTH } =
    defaultConfig as any

export async function bootstrapUsers(
    attester,
    unirepContract,
    {
        epoch = undefined,
        userNum = 5,
        stateTreeDepth = STATE_TREE_DEPTH,
        stateTree = undefined,
        prover = defaultProver,
    }: {
        epoch?: number
        userNum?: number
        stateTreeDepth?: number
        stateTree?: IncrementalMerkleTree
        prover?: Prover
    } = {}
) {
    const currentStateTree =
        stateTree ?? new IncrementalMerkleTree(stateTreeDepth)
    const randomUserNum = userNum
    const ids: ZkIdentity[] = []
    for (let i = 0; i < randomUserNum; i++) {
        const id = new ZkIdentity()
        const { leaf } = await signupUser(
            id,
            unirepContract,
            attester.address,
            attester,
            {
                prover,
                epoch,
            }
        )
        currentStateTree.insert(leaf)
        ids.push(id)
    }

    return {
        stateTree: currentStateTree,
        ids,
    }
}

export async function signupUser(
    id,
    unirepContract,
    attesterId,
    account,
    {
        prover = defaultProver,
        epoch = undefined,
    }: {
        prover?: Prover
        epoch?: number
    } = {}
) {
    const currentEpoch =
        epoch ??
        (await unirepContract.attesterCurrentEpoch(attesterId)).toNumber()
    const r = await prover.genProofAndPublicSignals(
        Circuit.signup,
        stringifyBigInts({
            epoch: currentEpoch,
            identity_nullifier: id.identityNullifier,
            identity_trapdoor: id.trapdoor,
            attester_id: attesterId,
        })
    )
    const { publicSignals, proof } = new SignupProof(
        r.publicSignals,
        r.proof,
        prover
    )
    const leafIndex = await unirepContract.attesterStateTreeLeafCount(
        attesterId,
        currentEpoch
    )
    await unirepContract
        .connect(account)
        .userSignUp(publicSignals, proof)
        .then((t) => t.wait())
    return {
        leaf: publicSignals[1],
        index: leafIndex.toNumber(),
        epoch: currentEpoch,
    }
}

// attestations
export async function bootstrapAttestations(
    attester,
    epoch,
    unirepContract,
    {
        epkNum = 10,
        attestNum = 10,
        epochTree = undefined,
        epochTreeLeaf = 0,
        epochTreeDepth = EPOCH_TREE_DEPTH,
        epochTreeArity = EPOCH_TREE_ARITY,
    }: {
        epkNum?: number
        attestNum?: number
        epochTree?: SparseMerkleTree
        epochTreeLeaf?: bigint
        epochTreeDepth?: number
        epochTreeArity?: number
    } = {}
) {
    const currentEpochTree =
        epochTree ?? new SparseMerkleTree(epochTreeDepth, 0, epochTreeArity)
    for (let i = 0; i < epkNum; i++) {
        const epochKey =
            genRandomSalt() %
            (BigInt(epochTreeArity) ** BigInt(epochTreeDepth) - BigInt(1))
        let totalPosRep = 0
        let totalNegRep = 0
        let finalGraffiti = BigInt(0)
        let finalTimestamp = 0
        for (let j = 0; j < attestNum; j++) {
            const posRep = Math.floor(Math.random() * 10)
            const negRep = Math.floor(Math.random() * 10)
            const graffiti = Math.random() > 0.5 ? genRandomSalt() : BigInt(0)

            const tx = await unirepContract
                .connect(attester)
                .submitAttestation(epoch, epochKey, posRep, negRep, graffiti)
            const { timestamp } = await tx
                .wait()
                .then(({ blockNumber }) =>
                    unirepContract.provider.getBlock(blockNumber)
                )
            totalPosRep += posRep
            totalNegRep += negRep
            finalGraffiti = graffiti > 0 ? graffiti : finalGraffiti
            finalTimestamp = graffiti > 0 ? timestamp : finalTimestamp
        }
        currentEpochTree.update(
            epochKey,
            hash4([totalPosRep, totalNegRep, finalGraffiti, finalTimestamp])
        )
    }
    return currentEpochTree
}
export async function processAttestations(
    attester: any,
    epoch: BigNumberish,
    unirepContract: any,
    {
        epochTree = undefined,
        epochTreeLeaf = 0,
        epochTreeDepth = EPOCH_TREE_DEPTH,
        epochTreeArity = EPOCH_TREE_ARITY,
        prover = defaultProver,
    }: {
        epochTree?: SparseMerkleTree
        epochTreeLeaf?: bigint
        epochTreeDepth?: number
        epochTreeArity?: number
        prover?: Prover
    } = {}
) {
    let success = true
    let currentEpochTree =
        epochTree ??
        new SparseMerkleTree(epochTreeDepth, epochTreeLeaf, epochTreeArity)
    while (success) {
        try {
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

            const { circuitInputs, epochTree } =
                genAggregateEpochKeysCircuitInputs(
                    epoch,
                    attester,
                    hashchainIndex,
                    hashchain,
                    { epochTree: currentEpochTree }
                )
            currentEpochTree = epochTree
            const r = await prover.genProofAndPublicSignals(
                Circuit.aggregateEpochKeys,
                circuitInputs
            )
            const { publicSignals, proof } = new AggregateEpochKeysProof(
                r.publicSignals,
                r.proof,
                prover
            )
            await unirepContract
                .connect(attester)
                .processHashchain(publicSignals, proof)
                .then((t) => t.wait())
        } catch (error) {
            success = false
        }
    }
}
