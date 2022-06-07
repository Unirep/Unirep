// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { BigNumber, BigNumberish, ethers } from 'ethers'
import { expect } from 'chai'
import { genRandomSalt } from '@unirep/crypto'

import {
    genEpochKey,
    deploy,
    genIdentity,
    attesterSignUp,
    keccak256Hash,
} from './utils'
import { UnirepEvent, Unirep, UnirepTypes } from '../src'
import { config } from './testConfig'
import { CircuitName } from '../../circuits/src'

describe('EventSequencing', () => {
    let expectedEventsInOrder: UnirepEvent[] = []
    let expectedEventsNumber: number = 0

    let unirepContract: Unirep
    let accounts: ethers.Signer[]

    let userIds: any[] = []
    const userCommitments: any[] = []

    let attester, attesterAddress, attesterId
    const attestingFee = ethers.utils.parseEther('0.1')
    const _config = {
        ...config,
        attestingFee,
    }

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deploy(accounts[0], _config)

        // 1. Fisrt user sign up
        {
            const { id, commitment } = genIdentity()
            userIds.push(id)
            userCommitments.push(commitment)
            const tx = await unirepContract.userSignUp(commitment)
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
        }

        expectedEventsInOrder.push(UnirepEvent.UserSignedUp)
        expectedEventsNumber++

        // Attester sign up, no events emitted
        {
            attester = accounts[1]
            attesterAddress = await attester.getAddress()
            const success = await attesterSignUp(unirepContract, attester)
            expect(success).equal(1)
            attesterId = await unirepContract.attesters(attesterAddress)
        }

        // 2. Submit epoch key proof
        let currentEpoch = await unirepContract.currentEpoch()
        let epochKeyNonce = 0
        let epochKey = genEpochKey(
            userIds[0].identityNullifier,
            currentEpoch.toNumber(),
            epochKeyNonce,
            config.epochTreeDepth
        ).toString()
        const proof: string[] = []
        let epochKeyProofIndex
        for (let i = 0; i < 8; i++) {
            proof.push('0')
        }
        {
            const publicSignals = [genRandomSalt(), currentEpoch, epochKey]
            const epochKeyProof: UnirepTypes.EpochKeyProofStruct = {
                globalStateTree: genRandomSalt().toString(),
                epoch: currentEpoch,
                epochKey,
                proof,
            }
            const tx = await unirepContract.submitEpochKeyProof(epochKeyProof)
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
            const hash = keccak256Hash(
                CircuitName.verifyEpochKey,
                epochKeyProof
            )
            epochKeyProofIndex = await unirepContract.getProofIndex(hash)
            expect(epochKeyProof).not.equal(null)
        }

        // 2. Submit reputation nullifiers
        {
            const repNullifiers: any[] = []
            const minRep = 0
            const proveGraffiti = 1
            for (let i = 0; i < config.maxReputationBudget; i++) {
                repNullifiers.push(255)
            }
            const tx = await unirepContract.connect(attester).spendReputation(
                {
                    repNullifiers,
                    epoch: currentEpoch.toNumber(),
                    epochKey,
                    globalStateTree: genRandomSalt().toString(),
                    attesterId,
                    proveReputationAmount: 0,
                    minRep,
                    proveGraffiti,
                    graffitiPreImage: genRandomSalt().toString(),
                    proof,
                } as UnirepTypes.ReputationProofStruct,
                { value: attestingFee }
            )
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
        }

        expectedEventsInOrder.push(UnirepEvent.AttestationSubmitted)
        expectedEventsNumber++

        // 3. Attest to first user
        const signedUpInLeaf = 0
        const senderPfIdx = 0
        {
            let attestation: UnirepTypes.AttestationStruct = {
                attesterId,
                posRep: 1,
                negRep: 0,
                graffiti: genRandomSalt().toString(),
                signUp: signedUpInLeaf,
            }
            const tx = await unirepContract
                .connect(attester)
                .submitAttestation(
                    attestation,
                    epochKey,
                    epochKeyProofIndex,
                    senderPfIdx,
                    { value: attestingFee }
                )
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
        }

        expectedEventsInOrder.push(UnirepEvent.AttestationSubmitted)
        expectedEventsNumber++

        // 4. Second user sign up
        {
            const { id, commitment } = genIdentity()
            userIds.push(id)
            userCommitments.push(commitment)
            const tx = await unirepContract.userSignUp(
                BigNumber.from(commitment)
            )
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
        }

        expectedEventsInOrder.push(UnirepEvent.UserSignedUp)
        expectedEventsNumber++

        // 5. First epoch end
        // let numEpochKey = await unirepContract.getNumEpochKey(currentEpoch)
        // expect(numEpochKey).equal(1)
        {
            await hardhatEthers.provider.send('evm_increaseTime', [
                config.epochLength,
            ]) // Fast-forward epochLength of seconds
            const tx = await unirepContract.beginEpochTransition()
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
        }

        currentEpoch = await unirepContract.currentEpoch()
        expectedEventsInOrder.push(UnirepEvent.EpochEnded)
        expectedEventsNumber++

        // 6. Second user starts transition
        let transitionFromEpoch = 1
        const indexes: BigInt[] = []
        {
            const tx = await unirepContract.startUserStateTransition(
                genRandomSalt() as BigNumberish,
                genRandomSalt() as BigNumberish,
                genRandomSalt() as BigNumberish,
                proof
            )
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
        }

        // 7. Second user processes attestations
        {
            const tx = await unirepContract.processAttestations(
                genRandomSalt() as BigNumberish,
                genRandomSalt() as BigNumberish,
                genRandomSalt() as BigNumberish,
                proof
            )
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
        }

        {
            const epkNullifiers: BigInt[] = []
            const blindedHashChains: BigInt[] = []
            const blindedUserStates: BigInt[] = []

            for (let i = 0; i < config.numEpochKeyNoncePerEpoch; i++) {
                epkNullifiers.push(BigInt(255))
                blindedHashChains.push(BigInt(255))
            }
            for (let i = 0; i < 2; i++) {
                blindedUserStates.push(BigInt(255))
            }
            const tx = await unirepContract.updateUserStateRoot(
                {
                    newGlobalStateTreeLeaf: genRandomSalt().toString(),
                    epkNullifiers: epkNullifiers,
                    transitionFromEpoch: transitionFromEpoch,
                    blindedUserStates: blindedUserStates,
                    fromGlobalStateTree: genRandomSalt(),
                    blindedHashChains: blindedHashChains,
                    fromEpochTree: genRandomSalt().toString(),
                    proof: proof,
                } as UnirepTypes.UserTransitionProofStruct,
                indexes as BigNumberish[]
            )
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
        }
        expectedEventsInOrder.push(UnirepEvent.UserStateTransitioned)
        expectedEventsNumber++

        // 9. Attest to second user
        {
            epochKeyNonce = 0
            const epochKey = genEpochKey(
                userIds[1].identityNullifier,
                currentEpoch.toNumber(),
                epochKeyNonce,
                config.epochTreeDepth
            ).toString()
            const attestation: UnirepTypes.AttestationStruct = {
                attesterId,
                posRep: 2,
                negRep: 1,
                graffiti: genRandomSalt().toString(),
                signUp: 1,
            }
            const tx = await unirepContract
                .connect(attester)
                .submitAttestation(
                    attestation,
                    epochKey,
                    epochKeyProofIndex,
                    senderPfIdx,
                    { value: attestingFee }
                )
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
        }
        expectedEventsInOrder.push(UnirepEvent.AttestationSubmitted)
        expectedEventsNumber++

        // 10. Second epoch end
        {
            await hardhatEthers.provider.send('evm_increaseTime', [
                config.epochLength,
            ]) // Fast-forward epochLength of seconds
            const tx = await unirepContract.beginEpochTransition()
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
        }
        currentEpoch = await unirepContract.currentEpoch()
        expectedEventsInOrder.push(UnirepEvent.EpochEnded)
        expectedEventsNumber++

        // 11. Third epoch end
        {
            await hardhatEthers.provider.send('evm_increaseTime', [
                config.epochLength,
            ]) // Fast-forward epochLength of seconds
            const tx = await unirepContract.beginEpochTransition()
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
        }
        currentEpoch = await unirepContract.currentEpoch()
        expectedEventsInOrder.push(UnirepEvent.EpochEnded)
        expectedEventsNumber++

        // 12. First user starts transition
        transitionFromEpoch = 1
        {
            const tx = await unirepContract.startUserStateTransition(
                genRandomSalt() as BigNumberish,
                genRandomSalt() as BigNumberish,
                genRandomSalt() as BigNumberish,
                proof
            )
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
        }

        // 7. Second user processes attestations
        {
            const tx = await unirepContract.processAttestations(
                genRandomSalt() as BigNumberish,
                genRandomSalt() as BigNumberish,
                genRandomSalt() as BigNumberish,
                proof
            )
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
        }

        {
            const epkNullifiers: BigInt[] = []
            const blindedHashChains: BigInt[] = []
            const blindedUserStates: BigInt[] = []

            for (let i = 0; i < config.numEpochKeyNoncePerEpoch; i++) {
                epkNullifiers.push(BigInt(255))
                blindedHashChains.push(BigInt(255))
            }
            for (let i = 0; i < 2; i++) {
                blindedUserStates.push(BigInt(255))
            }
            const tx = await unirepContract.updateUserStateRoot(
                {
                    newGlobalStateTreeLeaf: genRandomSalt().toString(),
                    epkNullifiers: epkNullifiers,
                    transitionFromEpoch: transitionFromEpoch,
                    blindedUserStates: blindedUserStates,
                    fromGlobalStateTree: genRandomSalt(),
                    blindedHashChains: blindedHashChains,
                    fromEpochTree: genRandomSalt().toString(),
                    proof: proof,
                } as UnirepTypes.UserTransitionProofStruct,
                indexes as BigNumberish[]
            )
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
        }
        expectedEventsInOrder.push(UnirepEvent.UserStateTransitioned)
        expectedEventsNumber++

        // 15. Second user starts transition
        transitionFromEpoch = 2
        {
            const tx = await unirepContract.startUserStateTransition(
                genRandomSalt() as BigNumberish,
                genRandomSalt() as BigNumberish,
                genRandomSalt() as BigNumberish,
                proof
            )
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
        }

        // 7. Second user processes attestations
        {
            const tx = await unirepContract.processAttestations(
                genRandomSalt() as BigNumberish,
                genRandomSalt() as BigNumberish,
                genRandomSalt() as BigNumberish,
                proof
            )
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
        }

        {
            const epkNullifiers: BigInt[] = []
            const blindedHashChains: BigInt[] = []
            const blindedUserStates: BigInt[] = []

            for (let i = 0; i < config.numEpochKeyNoncePerEpoch; i++) {
                epkNullifiers.push(BigInt(255))
                blindedHashChains.push(BigInt(255))
            }
            for (let i = 0; i < 2; i++) {
                blindedUserStates.push(BigInt(255))
            }
            const tx = await unirepContract.updateUserStateRoot(
                {
                    newGlobalStateTreeLeaf: genRandomSalt().toString(),
                    epkNullifiers: epkNullifiers,
                    transitionFromEpoch: transitionFromEpoch,
                    blindedUserStates: blindedUserStates,
                    fromGlobalStateTree: genRandomSalt(),
                    blindedHashChains: blindedHashChains,
                    fromEpochTree: genRandomSalt().toString(),
                    proof: proof,
                } as UnirepTypes.UserTransitionProofStruct,
                indexes as BigNumberish[]
            )
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
        }
        expectedEventsInOrder.push(UnirepEvent.UserStateTransitioned)
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
