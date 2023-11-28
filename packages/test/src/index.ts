import { ethers } from 'ethers'
import { Prover, CircuitConfig } from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'
import { Identity } from '@semaphore-protocol/identity'
import { genSignature } from '@unirep/contracts'
import { Synchronizer, UserState } from '@unirep/core'
import { deployUnirep } from '@unirep/contracts/deploy'

export async function bootstrapUnirep(
    provider: any, // ethers provider, only required arg
    config: CircuitConfig = CircuitConfig.default,
    prover: Prover = defaultProver
) {
    const unirepContract = await deployUnirep(provider, config, prover)
    const unirepAddress = await unirepContract.getAddress()
    const synchronizer = new Synchronizer({
        unirepAddress,
        provider,
    })
    return synchronizer
}

export async function bootstrapAttester(
    synchronizer: Synchronizer,
    epochLength: number = 300
) {
    const { unirepContract } = synchronizer
    const attester = ethers.Wallet.createRandom()
    const attesterAddress = await attester.getAddress()
    const unirepAddress = await unirepContract.getAddress()
    const { chainId } = await synchronizer.provider.getNetwork()
    const sigdata = await genSignature(
        unirepAddress,
        attester as any,
        epochLength,
        chainId
    )
    await unirepContract
        .attesterSignUpViaRelayer(attesterAddress, epochLength, sigdata)
        .then((t) => t.wait())
    return attesterAddress
}

// users
export async function bootstrapUsers(
    synchronizer: Synchronizer,
    userCount = 5,
    prover: Prover = defaultProver
) {
    const { unirepContract } = synchronizer
    // synchronizer should be authed to send transactions
    const ids = [] as Identity[]
    for (let x = 0; x < userCount; x++) {
        const userState = new UserState({
            synchronizer,
            id: new Identity(),
            prover,
        })
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
    attestationCount = 10,
    prover: Prover = defaultProver
) {
    const { unirepContract } = synchronizer
    const epoch = synchronizer.calcCurrentEpoch()
    const ids = [] as Identity[]
    for (let i = 0; i < attestationCount; i++) {
        const userState = new UserState({
            synchronizer,
            id: new Identity(),
            prover,
        })
        ids.push(userState.id)
        const r = await userState.genUserSignUpProof()
        await unirepContract
            .userSignUp(r.publicSignals, r.proof)
            .then((t) => t.wait())
        await userState.waitForSync()
        const epochKey = userState.getEpochKeys(epoch)[0] as bigint
        for (let j = 0; j < attestationCount; j++) {
            const fieldIndex = Math.floor(
                Math.random() * synchronizer.settings.fieldCount
            )
            const change = Math.floor(Math.random() * 10)
            await unirepContract
                .connect(account)
                .attest(epoch, epochKey, fieldIndex, change)
                .then((t) => t.wait())
        }
    }
    return ids
}
