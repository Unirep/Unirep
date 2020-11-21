import { BigNumber } from "ethers"
import chai from "chai"

const { expect } = chai

import { genIdentity, genIdentityCommitment } from 'libsemaphore'
import {
    IncrementalQuinTree,
    SnarkBigInt,
    genRandomSalt,
    hashLeftRight,
    stringifyBigInts,
} from 'maci-crypto'

import {
    compileAndLoadCircuit,
    executeCircuit,
    genVerifyUserStateTransitionProofAndPublicSignals,
    verifyUserStateTransitionProof,
    getSignalByName,
} from './utils'
import { circuitEpochTreeDepth, circuitNullifierTreeDepth, circuitUserStateTreeDepth, globalStateTreeDepth, numAttestationsPerEpochKey, numEpochKeyNoncePerEpoch } from "../../config/testLocal"
import { genEpochKey, genAttestationNullifier, genNewEpochTree, genNewNullifierTree, genNewUserStateTree, genEpochKeyNullifier, SMT_ONE_LEAF } from "../utils"
import { SparseMerkleTreeImpl } from "../../crypto/SMT"
import { Attestation, Reputation } from "../../core"

describe('User State Transition circuits', function () {
    this.timeout(400000)

    const epoch = 1
    const user = genIdentity()


    describe('User State Transition', () => {

        let circuit

        before(async () => {
            const startCompileTime = Math.floor(new Date().getTime() / 1000)
            circuit = await compileAndLoadCircuit('test/quick_test.circom')
            const endCompileTime = Math.floor(new Date().getTime() / 1000)
            console.log(`Compile time: ${endCompileTime - startCompileTime} seconds`)

        })

        describe('Process first epoch key', () => {
            // it('Valid user state update inputs should work', async () => {
            //     const a = new Array(254)
            //     for (let i = 0; i < 254; i++) {
            //         a[i] = 0
            //     }
            //     console.log(a)
            //     // a[0] = 1
            //     a[252] = 1
            //     console.log(a)
            //     const circuitInputs = {
            //         in: a,
            //     }

            //     const witness = await executeCircuit(circuit, circuitInputs)
            //     console.log(getSignalByName(circuit, witness, 'main.sign'))
            // })
            // it('Valid user state update inputs should work', async () => {
            //     const circuitInputs = {
            //         in: -10,
            //     }

            //     const witness = await executeCircuit(circuit, circuitInputs)
            //     console.log(getSignalByName(circuit, witness, 'main.out'))
            // })
            it('Valid user state update inputs should work', async () => {
                const circuitInputs = {
                    dividend: BigInt(19070016318605559313723487253530711433938954322988733270422174377741657293372),
                    divisor: 256,
                }

                const witness = await executeCircuit(circuit, circuitInputs)
                console.log(getSignalByName(circuit, witness, 'main.is_dividend_negative'))
                console.log(getSignalByName(circuit, witness, 'main.dividend_adjustment'))
                console.log(getSignalByName(circuit, witness, 'main.abs_dividend'))
                console.log(getSignalByName(circuit, witness, 'main.raw_remainder'))
                console.log(getSignalByName(circuit, witness, 'main.neg_remainder'))
                console.log("ok")
                console.log(getSignalByName(circuit, witness, 'main.remainder'))
                console.log(getSignalByName(circuit, witness, 'main.quotient'))
                const a = BigNumber.from(getSignalByName(circuit, witness, 'main.quotient')).mul(BigNumber.from(256)).add(BigNumber.from(getSignalByName(circuit, witness, 'main.remainder')))
                console.log(a.toString())
            })
        })
    })
})