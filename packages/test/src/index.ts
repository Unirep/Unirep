import { BigNumberish } from '@ethersproject/bignumber'
import {
    AggregateEpochKeysProof,
    AGGREGATE_KEY_COUNT,
    Circuit,
    defaultEpochTreeLeaf,
    EPOCH_TREE_ARITY,
    EPOCH_TREE_DEPTH,
    Prover,
    SignupProof,
    STATE_TREE_DEPTH,
} from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'
import {
    genRandomSalt,
    hash4,
    IncrementalMerkleTree,
    SparseMerkleTree,
    stringifyBigInts,
    ZkIdentity,
} from '@unirep/utils'

// users
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
        epochTreeLeaf = defaultEpochTreeLeaf,
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
        epochTree ??
        new SparseMerkleTree(epochTreeDepth, epochTreeLeaf, epochTreeArity)
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

export function genAggregateEpochKeysCircuitInputs(
    epoch,
    attester,
    hashchainIndex,
    hashchain,
    {
        epochTree = undefined,
        epochTreeLeaf = defaultEpochTreeLeaf,
        epochTreeDepth = EPOCH_TREE_DEPTH,
        epochTreeArity = EPOCH_TREE_ARITY,
        aggregateKeyCount = AGGREGATE_KEY_COUNT,
    }: {
        epochTree?: SparseMerkleTree
        epochTreeLeaf?: bigint
        epochTreeDepth?: number
        epochTreeArity?: number
        aggregateKeyCount?: number
    } = {}
) {
    const tree =
        epochTree ??
        new SparseMerkleTree(epochTreeDepth, epochTreeLeaf, epochTreeArity)
    const startRoot = tree.root
    const dummyEpochKeys = Array(aggregateKeyCount - hashchain.epochKeys.length)
        .fill(null)
        .map(() => '0x0000000')
    const dummyBalances = Array(
        aggregateKeyCount - hashchain.epochKeyBalances.length
    )
        .fill(null)
        .map(() => [0, 0, 0, 0])
    const allEpochKeys = [hashchain.epochKeys, dummyEpochKeys].flat()
    const allBalances = [
        hashchain.epochKeyBalances.map(
            ({ posRep, negRep, graffiti, timestamp }) => {
                return [
                    posRep.toString(),
                    negRep.toString(),
                    graffiti.toString(),
                    timestamp.toString(),
                ]
            }
        ),
        dummyBalances,
    ].flat()
    const circuitInputs = {
        start_root: startRoot,
        epoch_keys: allEpochKeys.map((k) => k.toString()),
        epoch_key_balances: allBalances,
        old_epoch_key_hashes: Array(aggregateKeyCount).fill(epochTreeLeaf),
        path_elements: allEpochKeys.map((key, i) => {
            const p = tree.createProof(BigInt(key))
            if (i < hashchain.epochKeys.length) {
                const { posRep, negRep, graffiti, timestamp } =
                    hashchain.epochKeyBalances[i]
                tree.update(
                    BigInt(key),
                    hash4([posRep, negRep, graffiti, timestamp])
                )
            }
            return p
        }),
        epoch: epoch.toString(),
        attester_id: attester.address,
        hashchain_index: hashchainIndex.toString(),
        epoch_key_count: hashchain.epochKeys.length, // process epoch keys with attestations
    }

    return {
        circuitInputs: stringifyBigInts(circuitInputs),
        epochTree: tree,
    }
}

export async function processAttestations(
    attester: any,
    epoch: BigNumberish,
    unirepContract: any,
    {
        epochTree = undefined,
        epochTreeLeaf = defaultEpochTreeLeaf,
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
