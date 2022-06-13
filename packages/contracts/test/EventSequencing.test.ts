// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { BigNumber, BigNumberish, ethers } from 'ethers'
import { expect } from 'chai'
import { genRandomSalt, SnarkPublicSignals, ZkIdentity } from '@unirep/crypto'
import { formatProofForSnarkjsVerification } from '@unirep/circuits'
import {
    EPOCH_LENGTH,
    MAX_REPUTATION_BUDGET,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
} from '@unirep/circuits/config'
import { genEpochKey, Attestation } from './utils'
import { deployUnirep, EpochKeyProof, Event } from '../src'
import { Unirep } from '../typechain'

describe('EventSequencing', () => {
    let expectedEventsInOrder: Event[] = []
    let expectedEventsNumber: number = 0

    let unirepContract: Unirep
    let accounts: ethers.Signer[]

    let userIds: any[] = [],
        userCommitments: any[] = []

    let attester, attesterAddress, attesterId, unirepContractCalledByAttester
    const attestingFee = ethers.utils.parseEther('0.1')

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], {
            attestingFee,
        })

        // 1. Fisrt user sign up
        let userId = new ZkIdentity()
        let userCommitment = userId.genIdentityCommitment()
        userIds.push(userId)
        userCommitments.push(userCommitment)
        let tx = await unirepContract.userSignUp(BigNumber.from(userCommitment))
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)
        expectedEventsInOrder.push(Event.UserSignedUp)
        expectedEventsNumber++

        // Attester sign up, no events emitted
        attester = accounts[1]
        attesterAddress = await attester.getAddress()
        unirepContractCalledByAttester = unirepContract.connect(attester)
        tx = await unirepContractCalledByAttester.attesterSignUp()
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        attesterId = await unirepContract.attesters(attesterAddress)

        // 2. Submit epoch key proof
        let currentEpoch = await unirepContract.currentEpoch()
        let epochKeyNonce = 0
        let epochKey = genEpochKey(
            userIds[0].identityNullifier,
            currentEpoch.toNumber(),
            epochKeyNonce
        )
        const proof: string[] = []
        for (let i = 0; i < 8; i++) {
            proof.push('0')
        }
        let publicSignals = [genRandomSalt(), currentEpoch, epochKey]
        let epochKeyProof = new EpochKeyProof(
            publicSignals as SnarkPublicSignals,
            formatProofForSnarkjsVerification(proof)
        )
        tx = await unirepContract.submitEpochKeyProof(
            epochKeyProof.publicSignals,
            epochKeyProof.proof
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        const epochKeyProofIndex = await unirepContract.getProofIndex(
            epochKeyProof.hash()
        )
        expect(epochKeyProof).not.equal(null)

        // 2. Submit reputation nullifiers
        publicSignals = []
        for (let i = 0; i < MAX_REPUTATION_BUDGET + 8; i++) {
            publicSignals.push(BigInt(255))
        }
        publicSignals[MAX_REPUTATION_BUDGET] = currentEpoch
        publicSignals[MAX_REPUTATION_BUDGET + 1] = epochKey
        publicSignals[MAX_REPUTATION_BUDGET + 3] = attesterId
        publicSignals[MAX_REPUTATION_BUDGET + 4] = BigInt(0)
        tx = await unirepContractCalledByAttester.spendReputation(
            publicSignals,
            proof,
            { value: attestingFee }
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        expectedEventsInOrder.push(Event.AttestationSubmitted)
        expectedEventsNumber++

        // 3. Attest to first user
        const signedUpInLeaf = 0
        const senderPfIdx = 0
        let attestation: Attestation = new Attestation(
            BigInt(attesterId),
            BigInt(1),
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
        expectedEventsInOrder.push(Event.AttestationSubmitted)
        expectedEventsNumber++

        // 4. Second user sign up
        userId = new ZkIdentity()
        userCommitment = userId.genIdentityCommitment()
        userIds.push(userId)
        userCommitments.push(userCommitment)
        tx = await unirepContract.userSignUp(BigNumber.from(userCommitment))
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        expectedEventsInOrder.push(Event.UserSignedUp)
        expectedEventsNumber++

        // 5. First epoch end
        // let numEpochKey = await unirepContract.getNumEpochKey(currentEpoch)
        // expect(numEpochKey).equal(1)
        await hardhatEthers.provider.send('evm_increaseTime', [EPOCH_LENGTH]) // Fast-forward epochLength of seconds
        tx = await unirepContract.beginEpochTransition()
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        currentEpoch = await unirepContract.currentEpoch()
        expectedEventsInOrder.push(Event.EpochEnded)
        expectedEventsNumber++

        // 6. Second user starts transition
        let transitionFromEpoch = 1
        publicSignals = [genRandomSalt(), genRandomSalt(), genRandomSalt()]
        const epkNullifiers: BigInt[] = []
        const blindedHashChains: BigInt[] = []
        const blindedUserStates: BigInt[] = []
        const indexes: BigInt[] = []
        for (let i = 0; i < NUM_EPOCH_KEY_NONCE_PER_EPOCH; i++) {
            epkNullifiers.push(BigInt(255))
            blindedHashChains.push(BigInt(255))
        }
        for (let i = 0; i < 2; i++) {
            blindedUserStates.push(BigInt(255))
        }
        tx = await unirepContract.startUserStateTransition(
            publicSignals as BigNumberish[],
            proof
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

        // 7. Second user processes attestations
        publicSignals = [genRandomSalt(), genRandomSalt(), genRandomSalt()]
        tx = await unirepContract.processAttestations(
            publicSignals as BigNumberish[],
            proof
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

        publicSignals = []
        for (let i = 0; i < 5 + NUM_EPOCH_KEY_NONCE_PER_EPOCH * 2; i++) {
            publicSignals.push(BigInt(255))
        }

        publicSignals[1 + NUM_EPOCH_KEY_NONCE_PER_EPOCH] =
            BigInt(transitionFromEpoch)
        tx = await unirepContract.updateUserStateRoot(
            publicSignals as BigNumberish[],
            proof,
            indexes as BigNumberish[]
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        expectedEventsInOrder.push(Event.UserStateTransitioned)
        expectedEventsNumber++

        // 9. Attest to second user
        epochKeyNonce = 0
        epochKey = genEpochKey(
            userIds[1].identityNullifier,
            currentEpoch.toNumber(),
            epochKeyNonce
        )
        attestation = new Attestation(
            BigInt(attesterId),
            BigInt(2),
            BigInt(1),
            genRandomSalt(),
            BigInt(signedUpInLeaf)
        )
        publicSignals = [genRandomSalt(), currentEpoch, epochKey]
        epochKeyProof = new EpochKeyProof(
            publicSignals as SnarkPublicSignals,
            formatProofForSnarkjsVerification(proof)
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
        expectedEventsInOrder.push(Event.AttestationSubmitted)
        expectedEventsNumber++

        // 10. Second epoch end
        await hardhatEthers.provider.send('evm_increaseTime', [EPOCH_LENGTH]) // Fast-forward epochLength of seconds
        tx = await unirepContract.beginEpochTransition()
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        currentEpoch = await unirepContract.currentEpoch()
        expectedEventsInOrder.push(Event.EpochEnded)
        expectedEventsNumber++

        // 11. Third epoch end
        await hardhatEthers.provider.send('evm_increaseTime', [EPOCH_LENGTH]) // Fast-forward epochLength of seconds
        tx = await unirepContract.beginEpochTransition()
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        currentEpoch = await unirepContract.currentEpoch()
        expectedEventsInOrder.push(Event.EpochEnded)
        expectedEventsNumber++

        // 12. First user starts transition
        transitionFromEpoch = 1
        publicSignals = [genRandomSalt(), genRandomSalt(), genRandomSalt()]
        tx = await unirepContract.startUserStateTransition(
            publicSignals as BigNumberish[],
            proof
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

        // 13. First user processes attestations
        publicSignals = [genRandomSalt(), genRandomSalt(), genRandomSalt()]
        tx = await unirepContract.processAttestations(
            publicSignals as BigNumberish[],
            proof
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

        // 14. First user transition
        publicSignals = []
        for (let i = 0; i < 5 + NUM_EPOCH_KEY_NONCE_PER_EPOCH * 2; i++) {
            publicSignals.push(BigInt(244))
        }

        publicSignals[1 + NUM_EPOCH_KEY_NONCE_PER_EPOCH] =
            BigInt(transitionFromEpoch)
        tx = await unirepContract.updateUserStateRoot(
            publicSignals as BigNumberish[],
            proof,
            indexes as BigNumberish[]
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        expectedEventsInOrder.push(Event.UserStateTransitioned)
        expectedEventsNumber++

        // 15. Second user starts transition
        transitionFromEpoch = 2
        publicSignals = [genRandomSalt(), genRandomSalt(), genRandomSalt()]
        tx = await unirepContract.startUserStateTransition(
            publicSignals as BigNumberish[],
            proof
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

        // 16. Second user processes attestations
        publicSignals = [genRandomSalt(), genRandomSalt(), genRandomSalt()]
        tx = await unirepContract.processAttestations(
            publicSignals as BigNumberish[],
            proof
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

        // 17. Second user transition
        publicSignals = []
        for (let i = 0; i < 5 + NUM_EPOCH_KEY_NONCE_PER_EPOCH * 2; i++) {
            publicSignals.push(BigInt(233))
        }

        publicSignals[1 + NUM_EPOCH_KEY_NONCE_PER_EPOCH] =
            BigInt(transitionFromEpoch)
        tx = await unirepContract.updateUserStateRoot(
            publicSignals as BigNumberish[],
            proof,
            indexes as BigNumberish[]
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        expectedEventsInOrder.push(Event.UserStateTransitioned)
        expectedEventsNumber++
    })

    it('Events order should match sequencer order', async () => {
        const sequencerFilter = unirepContract.filters.Sequencer()
        const sequencerEvents = await unirepContract.queryFilter(
            sequencerFilter
        )
        expect(sequencerEvents.length).to.be.equal(expectedEventsNumber)

        for (let i = 0; i < sequencerEvents.length; i++) {
            const event = sequencerEvents[i]
            expect(event.args.userEvent).equal(expectedEventsInOrder[i])
        }
    })
})
