// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { BigNumber, ethers } from 'ethers'
import { expect } from 'chai'
import {
    genRandomSalt,
    hashLeftRight,
    IncrementalMerkleTree,
} from '@unirep/crypto'

import {
    genEpochKeyCircuitInput,
    genInputForContract,
    deploy,
    genUserStateTransitionCircuitInput,
    genProcessAttestationsCircuitInput,
    keccak256Hash,
    genStartTransitionCircuitInput,
    bootstrapRandomUSTree,
    genIdentity,
    attesterSignUp,
} from './utils'
import { config } from './testConfig'
import { Unirep, UnirepTypes } from '../src'
import { CircuitName } from '../../circuits/src'

describe('Epoch Transition', function () {
    this.timeout(1000000)

    let unirepContract: Unirep
    let accounts: ethers.Signer[]

    const { id, commitment } = genIdentity()

    let attester, attesterAddress, attesterId

    const signedUpInLeaf = 1
    let epochKeyProofIndex
    const proofIndexes: BigNumber[] = []
    const attestingFee = ethers.utils.parseEther('0.1')
    const _config = {
        ...config,
        attestingFee,
    }

    let fromEpoch
    let GSTree
    let userStateTree
    let leafIndex

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deploy(accounts[0], _config)

        console.log('User sign up')
        const tree = new IncrementalMerkleTree(config.globalStateTreeDepth)
        const stateRoot = genRandomSalt()
        const hashedStateLeaf = hashLeftRight(commitment, stateRoot)
        tree.insert(BigInt(hashedStateLeaf.toString()))
        const leafIndex = 0
        let tx = await unirepContract.userSignUp(commitment)
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        console.log('Attester sign up')
        attester = accounts[1]
        attesterAddress = await attester.getAddress()
        const success = await attesterSignUp(unirepContract, attester)
        expect(success).equal(1)

        attesterId = await unirepContract.attesters(attesterAddress)

        let epoch = (await unirepContract.currentEpoch()).toNumber()

        let nonce = 1
        let circuitInputs = genEpochKeyCircuitInput(
            id,
            tree,
            leafIndex,
            stateRoot,
            epoch,
            nonce
        )
        let input = await genInputForContract(
            CircuitName.verifyEpochKey,
            circuitInputs
        )
        let epochKey = input.epochKey

        // Submit epoch key proof
        tx = await unirepContract.submitEpochKeyProof(input)
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        let proofNullifier = await unirepContract.hashEpochKeyProof(input)
        epochKeyProofIndex = await unirepContract.getProofIndex(proofNullifier)
        const senderPfIdx = 0

        // Submit attestations
        const attestationNum = 6
        for (let i = 0; i < attestationNum; i++) {
            let attestation: UnirepTypes.AttestationStruct = {
                attesterId,
                posRep: i,
                negRep: 0,
                graffiti: genRandomSalt().toString(),
                signUp: signedUpInLeaf,
            }
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
        await expect(unirepContract.beginEpochTransition()).to.be.revertedWith(
            'Unirep: epoch not yet ended'
        )
    })

    it('epoch transition should succeed', async () => {
        // Record data before epoch transition so as to compare them with data after epoch transition
        let epoch = await unirepContract.currentEpoch()

        // Fast-forward epochLength of seconds
        await hardhatEthers.provider.send('evm_increaseTime', [
            config.epochLength,
        ])
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
        GSTree = new IncrementalMerkleTree(config.globalStateTreeDepth)
        const hashedLeaf = hashLeftRight(commitment, userStateTree.root)
        GSTree.insert(hashedLeaf)
        leafIndex = 0
    })

    it('start user state transition should succeed', async () => {
        fromEpoch = 1
        const nonce = 0
        const circuitInputs = genStartTransitionCircuitInput(
            id,
            GSTree,
            leafIndex,
            userStateTree.root,
            fromEpoch,
            nonce
        )
        const { blindedUserState, blindedHashChain, GSTRoot, proof } =
            await genInputForContract(
                CircuitName.startTransition,
                circuitInputs
            )
        const isProofValid = await unirepContract.verifyStartTransitionProof(
            blindedUserState,
            blindedHashChain,
            GSTRoot,
            proof
        )
        expect(isProofValid).to.be.true

        const tx = await unirepContract.startUserStateTransition(
            blindedUserState,
            blindedHashChain,
            GSTRoot,
            proof
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

        const input = {
            blindedUserState,
            blindedHashChain,
            GSTRoot,
            proof,
        }
        let proofNullifier = keccak256Hash(CircuitName.startTransition, input)
        let proofIndex = await unirepContract.getProofIndex(proofNullifier)
        proofIndexes.push(proofIndex)
    })

    it('submit process attestations proofs should succeed', async () => {
        for (let i = 0; i < config.numEpochKeyNoncePerEpoch; i++) {
            const prooftNum = Math.ceil(Math.random() * 5)
            let toNonce = i
            for (let j = 0; j < prooftNum; j++) {
                // If it is the end of attestations of the epoch key, then the next epoch key nonce increased by one
                if (j == prooftNum - 1) toNonce = i + 1
                // If it it the maximum epoch key nonce, then the next epoch key nonce should not increase
                if (i == config.numEpochKeyNoncePerEpoch - 1) toNonce = i
                const { circuitInputs } =
                    await genProcessAttestationsCircuitInput(
                        id,
                        fromEpoch,
                        BigInt(i),
                        BigInt(toNonce),
                        undefined,
                        undefined,
                        undefined,
                        config
                    )

                const {
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    inputBlindedUserState,
                    proof,
                } = await genInputForContract(
                    CircuitName.processAttestations,
                    circuitInputs
                )
                const tx = await unirepContract.processAttestations(
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    inputBlindedUserState,
                    proof
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

                const input = {
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    inputBlindedUserState,
                    proof,
                }
                const proofNullifier = keccak256Hash(
                    CircuitName.processAttestations,
                    input
                )
                const proofIndex = await unirepContract.getProofIndex(
                    proofNullifier
                )
                proofIndexes.push(proofIndex)
            }
        }
    })

    it('submit user state transition proofs should succeed', async () => {
        const circuitInputs = await genUserStateTransitionCircuitInput(
            id,
            fromEpoch,
            config
        )
        const input = await genInputForContract(
            CircuitName.userStateTransition,
            circuitInputs
        )
        const tx = await unirepContract.updateUserStateRoot(input, proofIndexes)
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
        await hardhatEthers.provider.send('evm_increaseTime', [
            config.epochLength,
        ])
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
