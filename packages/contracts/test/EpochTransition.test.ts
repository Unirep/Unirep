// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { BigNumber, ethers } from 'ethers'
import { expect } from 'chai'
import {
    genRandomSalt,
    hashLeftRight,
    IncrementalMerkleTree,
    ZkIdentity,
} from '@unirep/crypto'

import {
    GLOBAL_STATE_TREE_DEPTH,
    EPOCH_LENGTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    Circuit,
} from '@unirep/circuits'

import {
    Attestation,
    genEpochKeyCircuitInput,
    genInputForContract,
    genStartTransitionCircuitInput,
    bootstrapRandomUSTree,
    genProcessAttestationsCircuitInput,
    genUserStateTransitionCircuitInput,
} from './utils'
import { deployUnirep, Unirep, UserTransitionProof } from '../src'

describe('Epoch Transition', function () {
    this.timeout(1000000)

    let unirepContract: Unirep
    let accounts: ethers.Signer[]

    let userId, userCommitment

    let attester, attesterAddress, attesterId

    const signedUpInLeaf = 1
    let epochKeyProofIndex
    const proofIndexes: BigNumber[] = []
    const attestingFee = ethers.utils.parseEther('0.1')

    let fromEpoch
    let GSTree
    let userStateTree
    let leafIndex

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], {
            attestingFee,
        })

        console.log('User sign up')
        userId = new ZkIdentity()
        userCommitment = userId.genIdentityCommitment()
        const tree = new IncrementalMerkleTree(GLOBAL_STATE_TREE_DEPTH)
        const stateRoot = genRandomSalt()
        const hashedStateLeaf = hashLeftRight(userCommitment, stateRoot)
        tree.insert(BigInt(hashedStateLeaf.toString()))
        const leafIndex = 0
        let tx = await unirepContract['userSignUp(uint256)'](userCommitment)
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        console.log('Attester sign up')
        attester = accounts[1]
        attesterAddress = attester.address

        tx = await unirepContract.connect(attester).attesterSignUp()
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

        attesterId = await unirepContract.attesters(attesterAddress)

        let epoch = (await unirepContract.currentEpoch()).toNumber()

        let nonce = 1
        let circuitInputs = genEpochKeyCircuitInput(
            userId,
            tree,
            leafIndex,
            stateRoot,
            epoch,
            nonce
        )
        let input = await genInputForContract(
            Circuit.verifyEpochKey,
            circuitInputs
        )
        let epochKey = input.epochKey

        // Submit epoch key proof
        tx = await unirepContract.submitEpochKeyProof(
            input.publicSignals,
            input.proof
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        let proofNullifier = input.hash()
        epochKeyProofIndex = await unirepContract.getProofIndex(proofNullifier)
        const senderPfIdx = 0

        // Submit attestations
        const attestationNum = 6
        for (let i = 0; i < attestationNum; i++) {
            let attestation = new Attestation(
                BigInt(attesterId.toString()),
                BigInt(i),
                BigInt(0),
                genRandomSalt(),
                BigInt(signedUpInLeaf)
            )
            tx = await unirepContract
                .connect(attester)
                .submitAttestation(
                    attestation,
                    epochKey,
                    epochKeyProofIndex,
                    senderPfIdx,
                    { value: attestingFee }
                )
            receipt = await tx.wait()
            expect(receipt.status).equal(1)
        }
    })

    it('premature epoch transition should fail', async () => {
        await expect(
            unirepContract.beginEpochTransition()
        ).to.be.revertedWithCustomError(unirepContract, 'EpochNotEndYet')
    })

    it('epoch transition should succeed', async () => {
        // Record data before epoch transition so as to compare them with data after epoch transition
        let epoch = await unirepContract.currentEpoch()

        // Fast-forward epochLength of seconds
        await hardhatEthers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        // Assert no epoch transition compensation is dispensed to volunteer
        expect(
            await unirepContract.epochTransitionCompensation(attesterAddress)
        ).to.be.equal(0)
        // Begin epoch transition
        let tx = await unirepContract.connect(attester).beginEpochTransition()
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)
        console.log(
            'Gas cost of sealing one epoch key:',
            receipt.gasUsed.toString()
        )
        // Verify compensation to the volunteer increased
        expect(
            await unirepContract.epochTransitionCompensation(attesterAddress)
        ).to.gt(0)

        // Complete epoch transition
        expect(await unirepContract.currentEpoch()).to.be.equal(epoch.add(1))
        // Verify latestEpochTransitionTime and currentEpoch
        let latestEpochTransitionTime =
            await unirepContract.latestEpochTransitionTime()
        expect(latestEpochTransitionTime).equal(
            (await hardhatEthers.provider.getBlock(receipt.blockNumber))
                .timestamp
        )

        let epoch_ = await unirepContract.currentEpoch()
        expect(epoch_).equal(epoch.add(1))
    })

    it('bootstrap user state and reputations and bootstrap global state tree', async () => {
        const results = await bootstrapRandomUSTree()
        userStateTree = results.userStateTree

        // Global state tree
        GSTree = new IncrementalMerkleTree(GLOBAL_STATE_TREE_DEPTH)
        const commitment = userId.genIdentityCommitment()
        const hashedLeaf = hashLeftRight(commitment, userStateTree.root)
        GSTree.insert(hashedLeaf)
        leafIndex = 0
    })

    it('start user state transition should succeed', async () => {
        fromEpoch = 1
        const nonce = 0
        const circuitInputs = genStartTransitionCircuitInput(
            userId,
            GSTree,
            leafIndex,
            userStateTree.root,
            fromEpoch,
            nonce
        )
        const input = await genInputForContract(
            Circuit.startTransition,
            circuitInputs
        )
        const isProofValid = await unirepContract.verifyStartTransitionProof(
            input.publicSignals,
            input.proof
        )
        expect(isProofValid).to.be.true

        const tx = await unirepContract.startUserStateTransition(
            input.publicSignals,
            input.proof
        )
        const receipt = await tx.wait()
        expect(
            receipt.status,
            'Submit user state transition proof failed'
        ).to.equal(1)
        console.log(
            'Gas cost of submit a start transition proof:',
            receipt.gasUsed.toString()
        )

        let proofNullifier = input.hash()
        let proofIndex = await unirepContract.getProofIndex(proofNullifier)
        proofIndexes.push(proofIndex)
    })

    it('submit process attestations proofs should succeed', async () => {
        for (let i = 0; i < NUM_EPOCH_KEY_NONCE_PER_EPOCH; i++) {
            const prooftNum = Math.ceil(Math.random() * 5)
            let toNonce = i
            for (let j = 0; j < prooftNum; j++) {
                // If it is the end of attestations of the epoch key, then the next epoch key nonce increased by one
                if (j == prooftNum - 1) toNonce = i + 1
                // If it it the maximum epoch key nonce, then the next epoch key nonce should not increase
                if (i == NUM_EPOCH_KEY_NONCE_PER_EPOCH - 1) toNonce = i
                const { circuitInputs } = genProcessAttestationsCircuitInput(
                    userId,
                    fromEpoch,
                    BigInt(i),
                    BigInt(toNonce)
                )

                const input = await genInputForContract(
                    Circuit.processAttestations,
                    circuitInputs
                )
                const tx = await unirepContract.processAttestations(
                    input.publicSignals,
                    input.proof
                )
                const receipt = await tx.wait()
                expect(
                    receipt.status,
                    'Submit process attestations proof failed'
                ).to.equal(1)
                console.log(
                    'Gas cost of submit a process attestations proof:',
                    receipt.gasUsed.toString()
                )

                const proofNullifier = input.hash()
                const proofIndex = await unirepContract.getProofIndex(
                    proofNullifier
                )
                proofIndexes.push(proofIndex)
            }
        }
    })

    it('submit user state transition proofs should succeed', async () => {
        const circuitInputs = genUserStateTransitionCircuitInput(
            userId,
            fromEpoch
        )
        const input: UserTransitionProof = await genInputForContract(
            Circuit.userStateTransition,
            circuitInputs
        )
        const tx = await unirepContract.updateUserStateRoot(
            input.publicSignals,
            input.proof,
            proofIndexes
        )
        const receipt = await tx.wait()
        expect(
            receipt.status,
            'Submit user state transition proof failed'
        ).to.equal(1)
        console.log(
            'Gas cost of submit a user state transition proof:',
            receipt.gasUsed.toString()
        )
    })

    it('epoch transition with no attestations and epoch keys should also succeed', async () => {
        let epoch = await unirepContract.currentEpoch()

        // Fast-forward epochLength of seconds
        await hardhatEthers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        // Begin epoch transition
        let tx = await unirepContract.beginEpochTransition()
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        // Verify latestEpochTransitionTime and currentEpoch
        let latestEpochTransitionTime =
            await unirepContract.latestEpochTransitionTime()
        expect(latestEpochTransitionTime).equal(
            (await hardhatEthers.provider.getBlock(receipt.blockNumber))
                .timestamp
        )

        let epoch_ = await unirepContract.currentEpoch()
        expect(epoch_).equal(epoch.add(1))
    })

    it('collecting epoch transition compensation should succeed', async () => {
        const compensation = await unirepContract.epochTransitionCompensation(
            attesterAddress
        )
        expect(compensation).to.gt(0)
        // Set gas price to 0 so attester will not be charged transaction fee
        await expect(() =>
            unirepContract
                .connect(attester)
                .collectEpochTransitionCompensation()
        ).to.changeEtherBalance(attester, compensation)
        expect(
            await unirepContract.epochTransitionCompensation(attesterAddress)
        ).to.equal(0)
    })
})
