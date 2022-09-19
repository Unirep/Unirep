// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import { ZkIdentity, genRandomSalt } from '@unirep/crypto'
import { Circuit } from '@unirep/circuits'

import {
    genUserStateTransitionCircuitInput,
    genInputForContract,
} from './utils'
import { Unirep, UserTransitionProof } from '../src'
import { deployUnirep } from '../deploy'

describe('User State Transition Verifier', function () {
    this.timeout(600000)
    let accounts: ethers.Signer[]
    let unirepContract: Unirep

    const epoch = 1
    const user = new ZkIdentity()

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0])
    })

    it('Proof with wrong epoch should fail', async () => {
        const wrongEpoch = epoch + 1
        const { finalTransitionCircuitInputs: circuitInputs } =
            genUserStateTransitionCircuitInput(user, epoch)
        const input: UserTransitionProof = await genInputForContract(
            Circuit.userStateTransition,
            circuitInputs
        )
        input.publicSignals[input.idx.transitionFromEpoch] =
            wrongEpoch.toString()
        const isProofValid = await unirepContract.verifyUserStateTransition(
            input.publicSignals,
            input.proof
        )
        expect(isProofValid).to.be.false
    })

    it('Proof with wrong global state tree root should fail', async () => {
        const wrongGlobalStateTreeRoot = genRandomSalt().toString()
        const { finalTransitionCircuitInputs: circuitInputs } =
            genUserStateTransitionCircuitInput(user, epoch)
        const input: UserTransitionProof = await genInputForContract(
            Circuit.userStateTransition,
            circuitInputs
        )
        input.publicSignals[input.idx.fromGlobalStateTree] =
            wrongGlobalStateTreeRoot
        const isProofValid = await unirepContract.verifyUserStateTransition(
            input.publicSignals,
            input.proof
        )
        expect(isProofValid).to.be.false
    })

    it('Proof with wrong blinded user states should fail', async () => {
        const { finalTransitionCircuitInputs: circuitInputs } =
            genUserStateTransitionCircuitInput(user, epoch)
        const input: UserTransitionProof = await genInputForContract(
            Circuit.userStateTransition,
            circuitInputs
        )
        input.publicSignals[input.idx.blindedUserStates[0]] =
            genRandomSalt().toString()
        const isProofValid = await unirepContract.verifyUserStateTransition(
            input.publicSignals,
            input.proof
        )
        expect(isProofValid).to.be.false
    })

    it('Proof with wrong blinded hash chain should fail', async () => {
        const { finalTransitionCircuitInputs: circuitInputs } =
            genUserStateTransitionCircuitInput(user, epoch)
        const input: UserTransitionProof = await genInputForContract(
            Circuit.userStateTransition,
            circuitInputs
        )
        input.publicSignals[input.idx.blindedHashChains[0]] =
            genRandomSalt().toString()
        const isProofValid = await unirepContract.verifyUserStateTransition(
            input.publicSignals,
            input.proof
        )
        expect(isProofValid).to.be.false
    })

    it('Proof with wrong global state tree leaf should fail', async () => {
        const { finalTransitionCircuitInputs: circuitInputs } =
            genUserStateTransitionCircuitInput(user, epoch)
        const input: UserTransitionProof = await genInputForContract(
            Circuit.userStateTransition,
            circuitInputs
        )
        input.publicSignals[input.idx.newGlobalStateTreeLeaf] =
            genRandomSalt().toString()
        const isProofValid = await unirepContract.verifyUserStateTransition(
            input.publicSignals,
            input.proof
        )
        expect(isProofValid).to.be.false
    })
})
