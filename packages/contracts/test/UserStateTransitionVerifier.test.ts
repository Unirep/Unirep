// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { BigNumberish, ethers } from 'ethers'
import { expect } from 'chai'
import { ZkIdentity, genRandomSalt } from '@unirep/crypto'

import {
    genUserStateTransitionCircuitInput,
    genInputForContract,
    deploy,
    genProofAndVerify,
    keccak256Hash,
} from './utils'
import { Unirep } from '../src'
import { circuitConfig, config } from './testConfig'
import { CircuitName } from '../../circuits/src'

describe('User State Transition', function () {
    this.timeout(600000)
    let accounts: ethers.Signer[]
    let unirepContract: Unirep

    const epoch = 1
    const user = new ZkIdentity()
    const proofIndexes = []

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deploy(accounts[0], config)
    })

    it('Valid user state update inputs should work', async () => {
        const circuitInputs = await genUserStateTransitionCircuitInput(
            user,
            epoch,
            circuitConfig
        )
        const input = await genInputForContract(
            CircuitName.userStateTransition,
            circuitInputs
        )
        const isValid = await genProofAndVerify(
            CircuitName.userStateTransition,
            circuitInputs
        )
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

        const hash = keccak256Hash(CircuitName.userStateTransition, input)
        const pfIdx = await unirepContract.getProofIndex(hash)
        expect(Number(pfIdx)).not.eq(0)
    })

    it('Proof with wrong epoch should fail', async () => {
        const wrongEpoch = epoch + 1
        const circuitInputs = await genUserStateTransitionCircuitInput(
            user,
            epoch,
            circuitConfig
        )
        const input = await genInputForContract(
            CircuitName.userStateTransition,
            circuitInputs
        )
        input.transitionFromEpoch = wrongEpoch
        const isProofValid = await unirepContract.verifyUserStateTransition(
            input
        )
        expect(isProofValid).to.be.false
    })

    it('Proof with wrong global state tree root should fail', async () => {
        const wrongGlobalStateTreeRoot = genRandomSalt() as BigNumberish
        const circuitInputs = await genUserStateTransitionCircuitInput(
            user,
            epoch,
            circuitConfig
        )
        const input = await genInputForContract(
            CircuitName.userStateTransition,
            circuitInputs
        )
        input.fromGlobalStateTree = wrongGlobalStateTreeRoot
        const isProofValid = await unirepContract.verifyUserStateTransition(
            input
        )
        expect(isProofValid).to.be.false
    })

    it('Proof with wrong epoch tree root should fail', async () => {
        const wrongEpochTreeRoot = genRandomSalt()
        const circuitInputs = await genUserStateTransitionCircuitInput(
            user,
            epoch,
            circuitConfig
        )
        const input = await genInputForContract(
            CircuitName.userStateTransition,
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
            epoch,
            circuitConfig
        )
        const input = await genInputForContract(
            CircuitName.userStateTransition,
            circuitInputs
        )
        input.blindedUserStates[0] = genRandomSalt() as BigNumberish
        const isProofValid = await unirepContract.verifyUserStateTransition(
            input
        )
        expect(isProofValid).to.be.false
    })

    it('Proof with wrong blinded hash chain should fail', async () => {
        const circuitInputs = await genUserStateTransitionCircuitInput(
            user,
            epoch,
            circuitConfig
        )
        const input = await genInputForContract(
            CircuitName.userStateTransition,
            circuitInputs
        )
        input.blindedHashChains[0] = genRandomSalt() as BigNumberish
        const isProofValid = await unirepContract.verifyUserStateTransition(
            input
        )
        expect(isProofValid).to.be.false
    })

    it('Proof with wrong global state tree leaf should fail', async () => {
        const circuitInputs = await genUserStateTransitionCircuitInput(
            user,
            epoch,
            circuitConfig
        )
        const input = await genInputForContract(
            CircuitName.userStateTransition,
            circuitInputs
        )
        input.newGlobalStateTreeLeaf = genRandomSalt() as BigNumberish
        const isProofValid = await unirepContract.verifyUserStateTransition(
            input
        )
        expect(isProofValid).to.be.false
    })
})
