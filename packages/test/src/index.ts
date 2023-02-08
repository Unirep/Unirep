import { BigNumberish } from '@ethersproject/bignumber'
import {
    Circuit,
    EPOCH_TREE_ARITY,
    EPOCH_TREE_DEPTH,
    Prover,
    SignupProof,
    STATE_TREE_DEPTH,
} from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'
import {
    genRandomSalt,
    IncrementalMerkleTree,
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
        epochTreeDepth = EPOCH_TREE_DEPTH,
        epochTreeArity = EPOCH_TREE_ARITY,
    }: {
        epkNum?: number
        attestNum?: number
        epochTreeLeaf?: bigint
        epochTreeDepth?: number
        epochTreeArity?: number
    } = {}
) {
    for (let i = 0; i < epkNum; i++) {
        const epochKey =
            genRandomSalt() %
            (BigInt(epochTreeArity) ** BigInt(epochTreeDepth) - BigInt(1))
        for (let j = 0; j < attestNum; j++) {
            const posRep = j * 50
            const negRep = j * 100
            const graffiti = genRandomSalt()
            const tx = await unirepContract
                .connect(attester)
                .submitAttestation(epoch, epochKey, posRep, negRep, graffiti)
            const { timestamp } = await tx
                .wait()
                .then(({ blockNumber }) =>
                    unirepContract.provider.getBlock(blockNumber)
                )
        }
    }
}

export async function processAttestations(
    attester: any,
    epoch: BigNumberish,
    unirepContract: any,
    {
        epochTreeDepth = EPOCH_TREE_DEPTH,
        epochTreeArity = EPOCH_TREE_ARITY,
        prover = defaultProver,
    }: {
        epochTreeLeaf?: bigint
        epochTreeDepth?: number
        epochTreeArity?: number
        prover?: Prover
    } = {}
) {
    return
}
