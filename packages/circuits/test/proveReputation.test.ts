import { expect } from 'chai'
import { ZkIdentity } from '@unirep/crypto'
import { Circuit } from '../src'
import {
    genReputationCircuitInput,
    genProofAndVerify,
    genEpochKey,
} from './utils'
import { NUM_EPOCH_KEY_NONCE_PER_EPOCH } from '../config'

describe('Prove reputation from attester circuit', function () {
    this.timeout(300000)

    it('should prove a reputation', async () => {
        const id = new ZkIdentity()
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch: 1,
            nonce: 0,
            attesterId: 1,
            startBalance: { posRep: 1, negRep: 0 },
        })
        const { isValid, publicSignals } = await genProofAndVerify(
            Circuit.proveReputation,
            circuitInputs
        )
        expect(publicSignals[2]).to.equal('1') // final pos rep
        expect(publicSignals[3]).to.equal('0') // final neg rep
        expect(isValid).to.be.true
    })

    it('should prove a minRep', async () => {
        const id = new ZkIdentity()
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch: 1,
            nonce: 0,
            attesterId: 1,
            startBalance: { posRep: 5, negRep: 1 },
            minRep: 2,
        })
        const { isValid } = await genProofAndVerify(
            Circuit.proveReputation,
            circuitInputs
        )
        expect(isValid).to.be.true
    })

    it('should prove a minRep with new rep balances', async () => {
        const id = new ZkIdentity()
        const epoch = 1028
        const attesterId = 10210
        const nonce = 0
        const epk = genEpochKey(id.identityNullifier, attesterId, epoch, 1)
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            startBalance: { posRep: 5, negRep: 5 },
            minRep: 8,
            epochKeyBalances: {
                [epk.toString()]: { posRep: 20, negRep: 10 },
            },
        })
        const { isValid, publicSignals } = await genProofAndVerify(
            Circuit.proveReputation,
            circuitInputs
        )
        expect(isValid).to.be.true
        expect(publicSignals[0]).to.equal(
            genEpochKey(
                id.identityNullifier,
                attesterId,
                epoch,
                nonce
            ).toString()
        )
        expect(publicSignals[2]).to.equal('25') // final pos rep
        expect(publicSignals[3]).to.equal('15') // final neg rep
    })

    it('should prove a minRep with many new rep balances', async () => {
        const id = new ZkIdentity()
        const epoch = 1028
        const attesterId = 10210
        const nonce = 1
        const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
            .fill(null)
            .map((_, i) =>
                genEpochKey(id.identityNullifier, attesterId, epoch, i)
            )
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            startBalance: { posRep: 5, negRep: 5 },
            minRep: 8,
            epochKeyBalances: epochKeys.reduce(
                (acc, val) => ({
                    ...acc,
                    [val.toString()]: { posRep: 10, negRep: 1 },
                }),
                {}
            ),
        })
        const { isValid, publicSignals } = await genProofAndVerify(
            Circuit.proveReputation,
            circuitInputs
        )
        expect(isValid).to.be.true
        expect(publicSignals[0]).to.equal(
            genEpochKey(
                id.identityNullifier,
                attesterId,
                epoch,
                nonce
            ).toString()
        )
        expect(publicSignals[2]).to.equal(
            `${5 + 10 * NUM_EPOCH_KEY_NONCE_PER_EPOCH}`
        ) // final pos rep
        expect(publicSignals[3]).to.equal(
            `${5 + 1 * NUM_EPOCH_KEY_NONCE_PER_EPOCH}`
        ) // final neg rep
    })

    it('should fail to prove minRep', async () => {
        const id = new ZkIdentity()
        const epoch = 1028
        const attesterId = 10210
        const nonce = 0
        const epk = genEpochKey(id.identityNullifier, attesterId, epoch, 1)
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            startBalance: { posRep: 5, negRep: 5 },
            minRep: 8,
            epochKeyBalances: {
                [epk.toString()]: { posRep: 10, negRep: 20 },
            },
        })
        const { isValid } = await genProofAndVerify(
            Circuit.proveReputation,
            circuitInputs
        )
        expect(isValid).to.be.false
    })

    it('should choose not to prove minRep', async () => {
        const id = new ZkIdentity()
        const epoch = 1028
        const attesterId = 10210
        const nonce = 0
        const epk = genEpochKey(id.identityNullifier, attesterId, epoch, 1)
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            startBalance: { posRep: 5, negRep: 5 },
            minRep: 0,
            epochKeyBalances: {
                [epk.toString()]: { posRep: 10, negRep: 20 },
            },
        })
        const { isValid } = await genProofAndVerify(
            Circuit.proveReputation,
            circuitInputs
        )
        expect(isValid).to.be.true
    })

    it('should fail to prove wrong reputation', async () => {
        const id = new ZkIdentity()
        const epoch = 1028
        const attesterId = 10210
        const nonce = 0
        const epk = genEpochKey(id.identityNullifier, attesterId, epoch, 1)
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            startBalance: { posRep: 5, negRep: 5 },
            minRep: 0,
            epochKeyBalances: {
                [epk.toString()]: { posRep: 10, negRep: 20 },
            },
        })
        circuitInputs.new_pos_rep[0] = 200
        const { isValid } = await genProofAndVerify(
            Circuit.proveReputation,
            circuitInputs
        )
        expect(isValid).to.be.false
    })

    // it('successfully choose not to prove graffiti with wrong value', async () => {
    //     const reputationRecords = genReputationRecords()
    //     const attesterIds = Object.keys(reputationRecords)
    //     const attesterId =
    //         attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)]
    //     const notProveGraffiti = 0
    //     const wrongGraffitiPreImage = genRandomSalt()
    //     const circuitInputs = genReputationCircuitInput(
    //         user,
    //         epoch,
    //         nonce,
    //         reputationRecords,
    //         attesterId,
    //         undefined,
    //         undefined,
    //         notProveGraffiti,
    //         wrongGraffitiPreImage
    //     )

    //     await executeCircuit(circuit, circuitInputs)

    //     const isValid = await genProofAndVerify(
    //         Circuit.proveReputation,
    //         circuitInputs
    //     )
    //     expect(isValid).to.be.true
    // })

    // it('prove reputation with wrong graffiti pre image should fail', async () => {
    //     const reputationRecords = genReputationRecords()
    //     const attesterIds = Object.keys(reputationRecords)
    //     const attesterId = Number(
    //         attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)]
    //     )
    //     const wrongGraffitiPreImage = genRandomSalt()
    //     const circuitInputs = genReputationCircuitInput(
    //         user,
    //         epoch,
    //         nonce,
    //         reputationRecords,
    //         attesterId,
    //         undefined,
    //         undefined,
    //         proveGraffiti,
    //         wrongGraffitiPreImage
    //     )

    //     await throwError(
    //         circuit,
    //         circuitInputs,
    //         'Wrong graffiti pre-image should throw error'
    //     )

    //     const isValid = await genProofAndVerify(
    //         Circuit.proveReputation,
    //         circuitInputs
    //     )
    //     expect(isValid).to.be.false
    // })
})
