import * as path from 'path'
import { expect } from 'chai'
import { genRandomSalt, ZkIdentity, hashOne } from '@unirep/crypto'
import { Circuit, executeCircuit } from '../src'
import {
    Reputation,
    compileAndLoadCircuit,
    genNegativeReputationCircuitInput,
    throwError,
    genProofAndVerify,
} from './utils'
import { proveNegativeReputationCircuitPath } from '../config'

const circuitPath = path.join(__dirname, proveNegativeReputationCircuitPath)

describe('Prove reputation from attester circuit', function () {
    this.timeout(300000)

    let circuit
    const epoch = 1
    const nonce = 1

    before(async () => {
        const startCompileTime = Math.floor(new Date().getTime() / 1000)
        circuit = await compileAndLoadCircuit(circuitPath)
        const endCompileTime = Math.floor(new Date().getTime() / 1000)
        console.log(
            `Compile time: ${endCompileTime - startCompileTime} seconds`
        )

        // Bootstrap reputation
    })

    it('successfully prove maximum reputation', async () => {
        const attesterId = 1
        const reputationRecords = {
            [attesterId]: new Reputation(
                BigInt(10),
                BigInt(20),
                BigInt(0),
                BigInt(1)
            ),
        }
        const circuitInputs = genNegativeReputationCircuitInput(
            new ZkIdentity(),
            epoch,
            nonce,
            reputationRecords,
            attesterId,
            -5
        )

        await executeCircuit(circuit, circuitInputs)

        const isValid = await genProofAndVerify(
            Circuit.proveNegativeReputation,
            circuitInputs
        )
        expect(isValid).to.be.true
    })

    it('successfully prove a reputation with equal positive and negative repuataion', async () => {
        const attesterId = 1
        const reputationRecords = {
            [attesterId]: new Reputation(
                BigInt(20),
                BigInt(20),
                BigInt(0),
                BigInt(1)
            ),
        }
        const circuitInputs = genNegativeReputationCircuitInput(
            new ZkIdentity(),
            epoch,
            nonce,
            reputationRecords,
            attesterId,
            0
        )

        await executeCircuit(circuit, circuitInputs)

        const isValid = await genProofAndVerify(
            Circuit.proveNegativeReputation,
            circuitInputs
        )
        expect(isValid).to.be.true
    })

    it('successfully fail to prove maximum reputation', async () => {
        const attesterId = 1
        const reputationRecords = {
            [attesterId]: new Reputation(
                BigInt(10),
                BigInt(20),
                BigInt(0),
                BigInt(1)
            ),
        }
        const circuitInputs = genNegativeReputationCircuitInput(
            new ZkIdentity(),
            epoch,
            nonce,
            reputationRecords,
            attesterId,
            -11
        )

        await throwError(
            circuit,
            circuitInputs,
            'Invalid max should throw error'
        )

        const isValid = await genProofAndVerify(
            Circuit.proveNegativeReputation,
            circuitInputs
        )
        expect(isValid).to.be.false
    })

    it('successfully choose not to prove graffiti with wrong value', async () => {
        const graffitiPreImage = genRandomSalt()

        const attesterId = 1
        const reputationRecords = {
            [attesterId]: new Reputation(
                BigInt(0),
                BigInt(0),
                hashOne(graffitiPreImage),
                BigInt(1)
            ),
        }
        reputationRecords[attesterId].addGraffitiPreImage(graffitiPreImage)

        const notProveGraffiti = 0
        const wrongGraffitiPreImage = genRandomSalt()
        const circuitInputs = genNegativeReputationCircuitInput(
            new ZkIdentity(),
            epoch,
            nonce,
            reputationRecords,
            attesterId,
            undefined,
            notProveGraffiti,
            wrongGraffitiPreImage
        )

        await executeCircuit(circuit, circuitInputs)

        const isValid = await genProofAndVerify(
            Circuit.proveNegativeReputation,
            circuitInputs
        )
        expect(isValid).to.be.true
    })

    it('prove reputation with wrong attester Id should fail', async () => {
        const attesterId = 1
        const reputationRecords = {
            [attesterId]: new Reputation(
                BigInt(20),
                BigInt(20),
                BigInt(0),
                BigInt(1)
            ),
        }

        const circuitInputs = genNegativeReputationCircuitInput(
            new ZkIdentity(),
            epoch,
            nonce,
            reputationRecords,
            attesterId
        )
        const wrongAttesterId = attesterId + 1
        circuitInputs.attester_id = wrongAttesterId

        await throwError(
            circuit,
            circuitInputs,
            'Root mismatch results from wrong attester Id should throw error'
        )

        const isValid = await genProofAndVerify(
            Circuit.proveNegativeReputation,
            circuitInputs
        )
        expect(isValid).to.be.false
    })

    it('prove reputation with not exist user state should fail', async () => {
        const attesterId = 1
        const reputationRecords = {
            [attesterId]: new Reputation(
                BigInt(20),
                BigInt(20),
                BigInt(0),
                BigInt(1)
            ),
        }

        const wrongUserStateRoot = genRandomSalt().toString()
        const circuitInputs = genNegativeReputationCircuitInput(
            new ZkIdentity(),
            epoch,
            nonce,
            reputationRecords,
            attesterId
        )
        circuitInputs.user_tree_root = wrongUserStateRoot

        await throwError(
            circuit,
            circuitInputs,
            'Root mismatch results from wrong user state should throw error'
        )

        const isValid = await genProofAndVerify(
            Circuit.proveNegativeReputation,
            circuitInputs
        )
        expect(isValid).to.be.false
    })

    it('prove reputation with wrong graffiti pre image should fail', async () => {
        const graffitiPreImage = genRandomSalt()

        const attesterId = 1
        const reputationRecords = {
            [attesterId]: new Reputation(
                BigInt(0),
                BigInt(0),
                hashOne(graffitiPreImage),
                BigInt(1)
            ),
        }
        reputationRecords[attesterId].addGraffitiPreImage(graffitiPreImage)

        const proveGraffiti = 1
        const wrongGraffitiPreImage = genRandomSalt()
        const circuitInputs = genNegativeReputationCircuitInput(
            new ZkIdentity(),
            epoch,
            nonce,
            reputationRecords,
            attesterId,
            0,
            proveGraffiti,
            wrongGraffitiPreImage
        )

        await throwError(
            circuit,
            circuitInputs,
            'Invalid graffiti pre-image should throw error'
        )

        const isValid = await genProofAndVerify(
            Circuit.proveNegativeReputation,
            circuitInputs
        )
        expect(isValid).to.be.false
    })
})
