import { Identity } from '@semaphore-protocol/identity'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'
import { UserState, Synchronizer } from '../src'

export async function bootstrapUsers(
    synchronizer: Synchronizer,
    account: any,
    userCount = 1
) {
    const { unirepContract } = synchronizer
    const epoch = await synchronizer.loadCurrentEpoch()
    // synchronizer should be authed to send transactions
    for (let x = 0; x < userCount; x++) {
        const userState = new UserState({
            synchronizer,
            id: new Identity(),
            prover: defaultProver,
        })
        const r = await userState.genUserSignUpProof({ epoch })
        await unirepContract
            .connect(account)
            .userSignUp(r.publicSignals, r.proof)
            .then((t) => t.wait())
    }
}

// attestations
export async function bootstrapAttestations(
    synchronizer: Synchronizer,
    account: any,
    userCount = 2,
    attestationCount = 2
) {
    const { unirepContract } = synchronizer
    const epoch = await synchronizer.loadCurrentEpoch()
    for (let i = 0; i < userCount; i++) {
        const userState = new UserState({
            synchronizer,
            id: new Identity(),
            prover: defaultProver,
        })
        const r = await userState.genUserSignUpProof({ epoch })
        await unirepContract
            .connect(account)
            .userSignUp(r.publicSignals, r.proof)
            .then((t) => t.wait())
        await userState.waitForSync()
        const [epochKey] = userState.getEpochKeys(epoch) as bigint[]
        for (let j = 0; j < attestationCount; j++) {
            const fieldIndex = Math.floor(
                Math.random() * (synchronizer.settings.sumFieldCount + 1)
            )
            const val = Math.floor(Math.random() * 10000000000000)

            await unirepContract
                .connect(account)
                .attest(epochKey, epoch, fieldIndex, val)
                .then((t) => t.wait())
        }
    }
}
