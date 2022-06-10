// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { BigNumber, BigNumberish, ethers } from 'ethers'
import { expect } from 'chai'
import { genRandomNumber, ZkIdentity } from '@unirep/crypto'
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
        let publicSignals = [genRandomNumber(), currentEpoch, epochKey]
        let epochKeyProof = new EpochKeyProof(
            publicSignals as BigNumberish[],
            formatProofForSnarkjsVerification(proof)
        )
        tx = await unirepContract.submitEpochKeyProof(epochKeyProof)
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        const epochKeyProofIndex = await unirepContract.getProofIndex(
            epochKeyProof.hash()
        )
        expect(epochKeyProof).not.equal(null)

        // 2. Submit reputation nullifiers
        const reputationNullifiers: bigint[] = []
        const minRep = 0
        const proveGraffiti = 1
        for (let i = 0; i < MAX_REPUTATION_BUDGET; i++) {
            reputationNullifiers.push(BigInt(255))
        }
        tx = await unirepContractCalledByAttester.spendReputation(
            [
                reputationNullifiers,
                currentEpoch.toNumber(),
                epochKey,
                genRandomNumber(),
                attesterId.toNumber(),
                0,
                minRep,
                proveGraffiti,
                genRandomNumber(),
                proof,
            ],
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
            genRandomNumber(),
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
        const epkNullifiers: bigint[] = []
        const blindedHashChains: bigint[] = []
        const blindedUserStates: bigint[] = []
        const indexes: bigint[] = []
        for (let i = 0; i < NUM_EPOCH_KEY_NONCE_PER_EPOCH; i++) {
            epkNullifiers.push(BigInt(255))
            blindedHashChains.push(BigInt(255))
        }
        for (let i = 0; i < 2; i++) {
            blindedUserStates.push(BigInt(255))
        }
        tx = await unirepContract.startUserStateTransition(
            genRandomNumber() as BigNumberish,
            genRandomNumber() as BigNumberish,
            genRandomNumber() as BigNumberish,
            proof
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

        // 7. Second user processes attestations
        tx = await unirepContract.processAttestations(
            genRandomNumber() as BigNumberish,
            genRandomNumber() as BigNumberish,
            genRandomNumber() as BigNumberish,
            proof
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

        tx = await unirepContract.updateUserStateRoot(
            {
                newGlobalStateTreeLeaf: genRandomNumber() as BigNumberish,
                epkNullifiers: epkNullifiers as BigNumberish[],
                transitionFromEpoch: transitionFromEpoch as BigNumberish,
                blindedUserStates: blindedUserStates as BigNumberish[],
                fromGlobalStateTree: genRandomNumber() as BigNumberish,
                blindedHashChains: blindedHashChains as BigNumberish[],
                fromEpochTree: genRandomNumber() as BigNumberish,
                proof: proof as BigNumberish[],
            },
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
            genRandomNumber(),
            BigInt(signedUpInLeaf)
        )
        publicSignals = [genRandomNumber(), currentEpoch, epochKey]
        epochKeyProof = new EpochKeyProof(
            publicSignals as BigNumberish[],
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
        tx = await unirepContract.startUserStateTransition(
            genRandomNumber() as BigNumberish,
            genRandomNumber() as BigNumberish,
            genRandomNumber() as BigNumberish,
            proof
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

        // 13. First user processes attestations
        tx = await unirepContract.processAttestations(
            genRandomNumber() as BigNumberish,
            genRandomNumber() as BigNumberish,
            genRandomNumber() as BigNumberish,
            proof
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

        // 14. First user transition
        tx = await unirepContract.updateUserStateRoot(
            {
                newGlobalStateTreeLeaf: genRandomNumber() as BigNumberish,
                epkNullifiers: epkNullifiers as BigNumberish[],
                transitionFromEpoch: transitionFromEpoch as BigNumberish,
                blindedUserStates: blindedUserStates as BigNumberish[],
                fromGlobalStateTree: genRandomNumber() as BigNumberish,
                blindedHashChains: blindedHashChains as BigNumberish[],
                fromEpochTree: genRandomNumber() as BigNumberish,
                proof: proof as BigNumberish[],
            },
            indexes as BigNumberish[]
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        expectedEventsInOrder.push(Event.UserStateTransitioned)
        expectedEventsNumber++

        // 15. Second user starts transition
        transitionFromEpoch = 2
        tx = await unirepContract.startUserStateTransition(
            genRandomNumber() as BigNumberish,
            genRandomNumber() as BigNumberish,
            genRandomNumber() as BigNumberish,
            proof
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

        // 16. Second user processes attestations
        tx = await unirepContract.processAttestations(
            genRandomNumber() as BigNumberish,
            genRandomNumber() as BigNumberish,
            genRandomNumber() as BigNumberish,
            proof
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

        // 17. Second user transition
        tx = await unirepContract.updateUserStateRoot(
            {
                newGlobalStateTreeLeaf: genRandomNumber() as BigNumberish,
                epkNullifiers: epkNullifiers as BigNumberish[],
                transitionFromEpoch: transitionFromEpoch as BigNumberish,
                blindedUserStates: blindedUserStates as BigNumberish[],
                fromGlobalStateTree: genRandomNumber() as BigNumberish,
                blindedHashChains: blindedHashChains as BigNumberish[],
                fromEpochTree: genRandomNumber() as BigNumberish,
                proof: proof as BigNumberish[],
            },
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
