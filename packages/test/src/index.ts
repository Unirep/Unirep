import { ethers } from 'ethers'
import { Prover, CircuitConfig } from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'
import { genRandomSalt, ZkIdentity } from '@unirep/utils'
import { Synchronizer, UserState } from '@unirep/core'
import { deployUnirep } from '@unirep/contracts/deploy'
import defaultConfig from '@unirep/circuits/config'

export async function bootstrapUnirep(
    provider: any, // ethers provider, only required arg
    config: CircuitConfig = defaultConfig,
    prover: Prover = defaultProver
) {
    const unirepContract = await deployUnirep(provider, config, prover)
    const synchronizer = new Synchronizer({
        unirepAddress: unirepContract.address,
        provider,
        prover: defaultProver,
    })
    return synchronizer
}

export async function bootstrapAttester(
    synchronizer: Synchronizer,
    epochLength: number = 300,
    provider?: any // ethers provider
) {
    const { unirepContract } = synchronizer.unirepContract
    const attester = ethers.Wallet.createRandom()
    const sigdata = ethers.utils.solidityKeccak256(
        ['address', 'address'],
        [attester.address, unirepContract.address]
    )
    const sig = attester.signMessage(sigdata)
    await unirepContract
        .attesterSignUpViaRelayer(attester.address, epochLength, sig)
        .then((t) => t.wait())
    return attester.address
}

// users
export async function bootstrapUsers(
    synchronizer: Synchronizer,
    userCount = 5
) {
    const { unirepContract } = synchronizer.unirepContract
    // synchronizer should be authed to send transactions
    const ids = [] as ZkIdentity[]
    for (let x = 0; x < userCount; x++) {
        const userState = new UserState(synchronizer, new ZkIdentity())
        ids.push(userState.id)
        const r = await userState.genUserSignUpProof()
        await unirepContract
            .userSignUp(r.publicSignals, r.proof)
            .then((t) => t.wait())
    }
    return ids
}

// attestations
export async function bootstrapAttestations(
    synchronizer: Synchronizer,
    account: any,
    attestationCount = 10
) {
    const { unirepContract } = synchronizer
    const epoch = synchronizer.calcCurrentEpoch()
    const ids = [] as ZkIdentity[]
    for (let i = 0; i < attestationCount; i++) {
        const userState = new UserState(synchronizer, new ZkIdentity())
        ids.push(userState.id)
        const r = await userState.genUserSignUpProof()
        await unirepContract
            .userSignUp(r.publicSignals, r.proof)
            .then((t) => t.wait())
        await userState.waitForSync()
        const epochKey = await userState.getEpochKeys()
        for (let j = 0; j < attestationCount; j++) {
            const posRep = Math.floor(Math.random() * 10)
            const negRep = Math.floor(Math.random() * 10)
            const graffiti = Math.random() > 0.5 ? genRandomSalt() : BigInt(0)

            await unirepContract
                .connect(account)
                .submitAttestation(epoch, epochKey, posRep, negRep, graffiti)
                .then((t) => t.wait())
        }
    }
    return ids
}

export async function sealEpoch(
    synchronizer: Synchronizer,
    account: any,
    epoch: number
) {
    if (synchronizer.attesterId.toString() === '0') {
        throw new Error('Synchronizer must have attesterId set')
    }
    const { unirepContract } = synchronizer
    const { publicSignals, proof } = await synchronizer.genSealedEpochProof()

    await unirepContract
        .connect(account)
        .sealEpoch(
            epoch,
            synchronizer.attesterId.toString(),
            publicSignals,
            proof
        )
        .then((t) => t.wait())
}
