// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { BigNumberish, ethers } from 'ethers'
import { expect } from 'chai'
import { ZkIdentity, genRandomNumber } from '@unirep/crypto'
import { Circuit } from '@unirep/circuits'

import {
    genUserStateTransitionCircuitInput,
    genInputForContract,
} from './utils'
import { deployUnirep, Unirep, UserTransitionProof } from '../src'

describe('User State Transition', function () {
    this.timeout(600000)
    let accounts: ethers.Signer[]
    let unirepContract: Unirep

    const epoch = 1
    const user = new ZkIdentity()
    const proofIndexes = []

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0])
    })

    it('Valid user state update inputs should work', async () => {
        const circuitInputs = await genUserStateTransitionCircuitInput(
            user,
            epoch
        )
        const input: UserTransitionProof = await genInputForContract(
            Circuit.userStateTransition,
            circuitInputs
        )
        const isValid = await input.verify()
        expect(isValid, 'Verify user state transition proof off-chain failed')
            .to.be.true
        const isProofValid = await unirepContract.verifyUserStateTransition(
            input
        )
        expect(isProofValid).to.be.true

        // UST should be performed after epoch transition
        // Fast-forward epochLength of seconds
        const epochLength = (await unirepContract.epochLength()).toNumber()
        await hardhatEthers.provider.send('evm_increaseTime', [epochLength])
        let tx = await unirepContract.beginEpochTransition()
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        tx = await unirepContract.updateUserStateRoot(input, proofIndexes)
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const pfIdx = await unirepContract.getProofIndex(input.hash())
        expect(Number(pfIdx)).not.eq(0)
    })

    it('Proof with wrong epoch should fail', async () => {
        const wrongEpoch = epoch + 1
        const circuitInputs = await genUserStateTransitionCircuitInput(
            user,
            epoch
        )
        const input: UserTransitionProof = await genInputForContract(
            Circuit.userStateTransition,
            circuitInputs
        )
        input.transitionFromEpoch = wrongEpoch
        const isProofValid = await unirepContract.verifyUserStateTransition(
            input
        )
        expect(isProofValid).to.be.false
    })

    it('Proof with wrong global state tree root should fail', async () => {
        const wrongGlobalStateTreeRoot = genRandomNumber() as BigNumberish
        const circuitInputs = await genUserStateTransitionCircuitInput(
            user,
            epoch
        )
        const input: UserTransitionProof = await genInputForContract(
            Circuit.userStateTransition,
            circuitInputs
        )
        input.fromGlobalStateTree = wrongGlobalStateTreeRoot
        const isProofValid = await unirepContract.verifyUserStateTransition(
            input
        )
        expect(isProofValid).to.be.false
    })

    it('Proof with wrong epoch tree root should fail', async () => {
        const wrongEpochTreeRoot = genRandomNumber()
        const circuitInputs = await genUserStateTransitionCircuitInput(
            user,
            epoch
        )
        const input: UserTransitionProof = await genInputForContract(
            Circuit.userStateTransition,
            circuitInputs
        )
        input.fromEpochTree = wrongEpochTreeRoot as BigNumberish
        const isProofValid = await unirepContract.verifyUserStateTransition(
            input
        )
        expect(isProofValid).to.be.false
    })

    it('Proof with wrong blinded user states should fail', async () => {
        const circuitInputs = await genUserStateTransitionCircuitInput(
            user,
            epoch
        )
        const input: UserTransitionProof = await genInputForContract(
            Circuit.userStateTransition,
            circuitInputs
        )
        input.blindedUserStates[0] = genRandomNumber() as BigNumberish
        const isProofValid = await unirepContract.verifyUserStateTransition(
            input
        )
        expect(isProofValid).to.be.false
    })

    it('Proof with wrong blinded hash chain should fail', async () => {
        const circuitInputs = await genUserStateTransitionCircuitInput(
            user,
            epoch
        )
        const input: UserTransitionProof = await genInputForContract(
            Circuit.userStateTransition,
            circuitInputs
        )
        input.blindedHashChains[0] = genRandomNumber() as BigNumberish
        const isProofValid = await unirepContract.verifyUserStateTransition(
            input
        )
        expect(isProofValid).to.be.false
    })

    it('Proof with wrong global state tree leaf should fail', async () => {
        const circuitInputs = await genUserStateTransitionCircuitInput(
            user,
            epoch
        )
        const input: UserTransitionProof = await genInputForContract(
            Circuit.userStateTransition,
            circuitInputs
        )
        input.newGlobalStateTreeLeaf = genRandomNumber() as BigNumberish
        const isProofValid = await unirepContract.verifyUserStateTransition(
            input
        )
        expect(isProofValid).to.be.false
    })
})
