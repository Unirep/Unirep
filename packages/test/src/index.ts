import { BigNumberish } from '@ethersproject/bignumber'
import {
    Circuit,
    EPOCH_TREE_ARITY,
    EPOCH_TREE_DEPTH,
    Prover,
    SignupProof,
    STATE_TREE_DEPTH,
    CircuitConfig,
} from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'
import {
    genRandomSalt,
    IncrementalMerkleTree,
    stringifyBigInts,
    ZkIdentity,
} from '@unirep/utils'
import { Synchronizer } from '@unirep/core'
import { deployUnirep } from '@unirep/contracts/deploy'
import { ethers } from 'ethers'
import defaultConfig from '@unirep/circuits/config'
import defaultProver from '@unirep/circuits/provers/defaultProver'
import { MemoryConnector } from 'anondb/web'

export async function bootstrapUnirep(
    provider: any, // ethers provider, only required arg
    privateKey: string = '0x361545477f7cee758a6215ad55780d978b4b4d56fdff971f3dfc8cc10a33d9f7',
    config: CircuitConfig = defaultConfig,
    prover: Prover = defaultProver
) {
    const wallet = new ethers.Wallet(privateKey, provider)
    const unirepContract = await deployUnirep(wallet, config, prover)
    const synchronizer = new Synchronizer({
        attesterId: wallet.address,
        unirepAddress: unirepContract.address,
        provider,
    })
    return synchronizer
}

export async function bootstrapAttester(
    provider: any, // ethers provider
    epochLength,
    privateKey: string = '0x361545477f7cee758a6215ad55780d978b4b4d56fdff971f3dfc8cc10a33d9f7'
) {
    const wallet = new ethers.Wallet(privateKey)
    const { unirepContract } = synchronizer.unirepContract
    const attester = ethers.Wallet.createRandom()
    await unirepContract.attesterSignUp()
}

// users
export async function bootstrapUsers(
    synchronizer: Synchronizer,
    userCount = 5,
    key = ''
) {
    const { unirepContract } = synchronizer.unirepContract
    // synchronizer should be authed to send transactions
    for (let x = 0; x < userCount; x++) {
        const userState = new UserState(synchronizer, new ZkIdentity())
        const r = await userState.genUserSignUpProof()
        await unirepContract
            .userSignUp(r.publicSignals, r.proof)
            .then((t) => t.wait())
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
