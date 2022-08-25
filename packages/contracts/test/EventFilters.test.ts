// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import {
    genRandomSalt,
    ZkIdentity,
    hashLeftRight,
    IncrementalMerkleTree,
} from '@unirep/crypto'

import {
    GLOBAL_STATE_TREE_DEPTH,
    EPOCH_LENGTH,
    Circuit,
} from '@unirep/circuits'
import {
    genInputForContract,
    genUserStateTransitionCircuitInput,
    genNewUserStateTree,
} from './utils'
import { Unirep, UserTransitionProof } from '../src'
import { deployUnirep } from '../src/deploy'

describe('EventFilters', () => {
    let unirepContract: Unirep
    let accounts: any[]

    const userId = new ZkIdentity()
    const userCommitment = userId.genIdentityCommitment()

    let attester

    const epoch = 1
    let tree
    let stateRoot = genRandomSalt()
    let hashedStateLeaf
    const attestingFee = ethers.utils.parseEther('0.1')
    const userStateTree = genNewUserStateTree()
    const reputationRecords = {}
    let attestationsCount = 0
    const {
        startTransitionCircuitInputs,
        processAttestationCircuitInputs,
        finalTransitionCircuitInputs,
        attestationsMap,
    } = genUserStateTransitionCircuitInput(userId, epoch, 1, {
        userStateTree,
        reputationRecords,
    })

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], {
            attestingFee,
        })

        console.log('Attesters sign up')
        for (let i = 1; i <= 10; i++) {
            const tx = await unirepContract
                .connect(accounts[i])
                .attesterSignUp()
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
            expect(await unirepContract.attesters(accounts[i].address)).equal(i)
        }
        attester = accounts[1]
    })

    it('user sign up should succeed', async () => {
        const tx = await unirepContract['userSignUp(uint256)'](userCommitment)
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)

        tree = new IncrementalMerkleTree(GLOBAL_STATE_TREE_DEPTH)
        stateRoot = genRandomSalt()
        hashedStateLeaf = hashLeftRight(userCommitment, stateRoot)
        tree.insert(BigInt(hashedStateLeaf.toString()))
    })

    it('user sign up events should match event filter', async () => {
        const userSignUpFilter = unirepContract.filters.UserSignedUp(
            undefined,
            userCommitment
        )
        const userSignUpEvents = await unirepContract.queryFilter(
            userSignUpFilter
        )
        expect(userSignUpEvents.length).equal(1)
    })

    it('submit attestation should succeed', async () => {
        for (const key in attestationsMap) {
            for (const attestation of attestationsMap[key]) {
                const attesterId = Number(attestation.attesterId.toString())

                const tx = await unirepContract
                    .connect(accounts[attesterId])
                    .submitAttestation(attestation, key, {
                        value: attestingFee,
                    })
                const receipt = await tx.wait()
                expect(receipt.status).equal(1)
                attestationsCount++
            }
        }
    })

    it('submit attestations events should match event filter', async () => {
        const attestationSubmittedFilter =
            unirepContract.filters.AttestationSubmitted()
        const attestationSubmittedEvents = await unirepContract.queryFilter(
            attestationSubmittedFilter
        )
        expect(attestationSubmittedEvents.length).equal(attestationsCount)
    })

    it('submit start user state transition should success', async () => {
        const input = await genInputForContract(
            Circuit.startTransition,
            startTransitionCircuitInputs
        )
        const tx = await unirepContract.startUserStateTransition(
            input.publicSignals,
            input.proof
        )
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)
    })

    it('submit process attestation proofs should success', async () => {
        for (const circuitInputs of processAttestationCircuitInputs) {
            const input = await genInputForContract(
                Circuit.processAttestations,
                circuitInputs
            )
            const tx = await unirepContract.processAttestations(
                input.publicSignals,
                input.proof
            )
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
        }
    })

    it('submit user state transition proofs should success', async () => {
        // Fast-forward epochLength of seconds
        await hardhatEthers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        // Begin epoch transition
        let tx = await unirepContract.beginEpochTransition()
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        // TODO: fix UST with attestations
        const input: UserTransitionProof = await genInputForContract(
            Circuit.userStateTransition,
            finalTransitionCircuitInputs
        )
        tx = await unirepContract.updateUserStateRoot(
            input.publicSignals,
            input.proof
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
    })

    it('user state transition events should match event filter', async () => {
        const epochEndedFilter = unirepContract.filters.EpochEnded()
        const epochEndedEvents = await unirepContract.queryFilter(
            epochEndedFilter
        )
        expect(epochEndedEvents.length).equal(1)

        const USTFilter = unirepContract.filters.UserStateTransitioned()
        const USTEvents = await unirepContract.queryFilter(USTFilter)
        expect(USTEvents.length).equal(1)
    })
})
