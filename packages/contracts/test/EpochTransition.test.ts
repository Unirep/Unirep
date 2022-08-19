// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import {
    hashLeftRight,
    IncrementalMerkleTree,
    ZkIdentity,
} from '@unirep/crypto'
import { GLOBAL_STATE_TREE_DEPTH, Circuit } from '@unirep/circuits'
import {
    genInputForContract,
    genUserStateTransitionCircuitInput,
    genNewUserStateTree,
} from './utils'
import { deployUnirep, Unirep, UserTransitionProof } from '../src'

const EPOCH_LENGTH = 1000000

describe('Epoch Transition', function () {
    this.timeout(1000000)

    let unirepContract: Unirep
    let accounts: any

    const userId = new ZkIdentity()
    const userCommitment = userId.genIdentityCommitment()

    let transitionAccount

    const attestingFee = ethers.utils.parseEther('0.1')

    let fromEpoch = 1
    let GSTree
    const userStateTree = genNewUserStateTree()
    const reputationRecords = {}
    const {
        startTransitionCircuitInputs,
        processAttestationCircuitInputs,
        finalTransitionCircuitInputs,
        attestationsMap,
    } = genUserStateTransitionCircuitInput(userId, fromEpoch, 1, {
        userStateTree,
        reputationRecords,
    })

    before(async () => {
        accounts = await hardhatEthers.getSigners()
        transitionAccount = accounts[0]

        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], {
            attestingFee,
            epochLength: EPOCH_LENGTH,
        })

        console.log('User sign up')
        const tree = new IncrementalMerkleTree(GLOBAL_STATE_TREE_DEPTH)
        const stateRoot = genNewUserStateTree().root
        const hashedStateLeaf = hashLeftRight(userCommitment, stateRoot)
        tree.insert(BigInt(hashedStateLeaf.toString()))
        let tx = await unirepContract['userSignUp(uint256)'](userCommitment)
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        console.log('Attester sign up')
        for (let i = 1; i <= 10; i++) {
            const tx = await unirepContract
                .connect(accounts[i])
                .attesterSignUp()
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
            expect(await unirepContract.attesters(accounts[i].address)).equal(i)
        }

        // Submit attestations
        for (const key in attestationsMap) {
            for (const attestation of attestationsMap[key]) {
                const attesterId = Number(attestation.attesterId.toString())

                const tx = await unirepContract
                    .connect(accounts[attesterId])
                    .submitAttestation(attestation, key, {
                        value: attestingFee,
                    })
                receipt = await tx.wait()
                expect(receipt.status).equal(1)
            }
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
        const account = accounts[0]

        // Fast-forward epochLength of seconds
        await hardhatEthers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        // Assert no epoch transition compensation is dispensed to volunteer
        expect(
            await unirepContract.epochTransitionCompensation(account.address)
        ).to.be.equal(0)
        // Begin epoch transition
        let tx = await unirepContract.connect(account).beginEpochTransition()
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)
        console.log(
            'Gas cost of sealing one epoch key:',
            receipt.gasUsed.toString()
        )
        // Verify compensation to the volunteer increased
        expect(
            await unirepContract.epochTransitionCompensation(account.address)
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
        // Global state tree
        GSTree = new IncrementalMerkleTree(GLOBAL_STATE_TREE_DEPTH)
        const commitment = userId.genIdentityCommitment()
        const hashedLeaf = hashLeftRight(commitment, userStateTree.root)
        GSTree.insert(hashedLeaf)
    })

    it('start user state transition should succeed', async () => {
        const input = await genInputForContract(
            Circuit.startTransition,
            startTransitionCircuitInputs
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
    })

    it('submit process attestations proofs should succeed', async () => {
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
            expect(
                receipt.status,
                'Submit process attestations proof failed'
            ).to.equal(1)
            console.log(
                'Gas cost of submit a process attestations proof:',
                receipt.gasUsed.toString()
            )
        }
    })

    it('submit user state transition proofs should succeed', async () => {
        const input: UserTransitionProof = await genInputForContract(
            Circuit.userStateTransition,
            finalTransitionCircuitInputs
        )
        const tx = await unirepContract.updateUserStateRoot(
            input.publicSignals,
            input.proof
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
        let tx = await unirepContract
            .connect(transitionAccount)
            .beginEpochTransition()
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
            transitionAccount.address
        )
        expect(compensation).to.gt(0)
        // Set gas price to 0 so attester will not be charged transaction fee
        await expect(() =>
            unirepContract
                .connect(transitionAccount)
                .collectEpochTransitionCompensation()
        ).to.changeEtherBalance(transitionAccount, compensation)
        expect(
            await unirepContract.epochTransitionCompensation(
                transitionAccount.address
            )
        ).to.equal(0)
    })
})
