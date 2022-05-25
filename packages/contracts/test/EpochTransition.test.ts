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
import { CircuitName } from '@unirep/circuits'

import {
    Attestation,
    genEpochKeyCircuitInput,
    genInputForContract,
    genStartTransitionCircuitInput,
    bootstrapRandomUSTree,
    GSTZERO_VALUE,
    genProcessAttestationsCircuitInput,
    genUserStateTransitionCircuitInput,
} from './utils'
import contractConfig, { artifactsPath } from '../src/config'
import contract, { Unirep, UserTransitionProof } from '../src'
import config from '../src/config'

describe('Epoch Transition', function () {
    this.timeout(1000000)

    let ZERO_VALUE = 0

    let unirepContract: Unirep
    let accounts: ethers.Signer[]

    let userId, userCommitment

    let attester, attesterAddress, attesterId, unirepContractCalledByAttester

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

        unirepContract = await contract.deploy(
            artifactsPath,
            accounts[0],
            _config
        )

        console.log('User sign up')
        userId = new ZkIdentity()
        userCommitment = userId.genIdentityCommitment()
        const tree = new IncrementalMerkleTree(
            config.globalStateTreeDepth,
            ZERO_VALUE,
            2
        )
        const stateRoot = genRandomSalt()
        const hashedStateLeaf = hashLeftRight(userCommitment, stateRoot)
        tree.insert(BigInt(hashedStateLeaf.toString()))
        const leafIndex = 0
        let tx = await unirepContract.userSignUp(userCommitment)
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        console.log('Attester sign up')
        attester = accounts[1]
        attesterAddress = await attester.getAddress()
        unirepContractCalledByAttester = unirepContract.connect(attester)
        tx = await unirepContractCalledByAttester.attesterSignUp()
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
            let attestation = new Attestation(
                BigInt(attesterId.toString()),
                BigInt(i),
                BigInt(0),
                genRandomSalt(),
                BigInt(signedUpInLeaf)
            )
            tx = await unirepContractCalledByAttester.submitAttestation(
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
            contractConfig.epochLength,
        ])
        // Assert no epoch transition compensation is dispensed to volunteer
        expect(
            await unirepContract.epochTransitionCompensation(attesterAddress)
        ).to.be.equal(0)
        // Begin epoch transition
        let tx = await unirepContractCalledByAttester.beginEpochTransition()
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
        GSTree = new IncrementalMerkleTree(
            config.globalStateTreeDepth,
            GSTZERO_VALUE,
            2
        )
        const commitment = userId.genIdentityCommitment()
        const hashedLeaf = hashLeftRight(
            commitment,
            userStateTree.getRootHash()
        )
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
            userStateTree.getRootHash(),
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
        console.log('start transition')
        console.log('start blinded user state: ', blindedUserState)
        console.log('start blinded hash chain: ', blindedHashChain)
        const receipt = await tx.wait()
        expect(
            receipt.status,
            'Submit user state transition proof failed'
        ).to.equal(1)
        console.log(
            'Gas cost of submit a start transition proof:',
            receipt.gasUsed.toString()
        )

        let proofNullifier = await unirepContract.hashStartTransitionProof(
            blindedUserState,
            blindedHashChain,
            GSTRoot,
            proof
        )
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
                        userId,
                        fromEpoch,
                        BigInt(i),
                        BigInt(toNonce)
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
                console.log('input blinded user state: ', inputBlindedUserState)
                console.log(
                    'output blinded user state: ',
                    outputBlindedUserState
                )
                console.log(
                    'output blinded hash chain: ',
                    outputBlindedHashChain
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

                const proofNullifier =
                    await unirepContract.hashProcessAttestationsProof(
                        outputBlindedUserState,
                        outputBlindedHashChain,
                        inputBlindedUserState,
                        proof
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
            userId,
            fromEpoch
        )
        const input: UserTransitionProof = await genInputForContract(
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
            contractConfig.epochLength,
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
            unirepContractCalledByAttester.collectEpochTransitionCompensation()
        ).to.changeEtherBalance(attester, compensation)
        expect(
            await unirepContract.epochTransitionCompensation(attesterAddress)
        ).to.equal(0)
    })
})
