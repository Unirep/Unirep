// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { BigNumber, BigNumberish, ethers } from 'ethers'
import { expect } from 'chai'
import { ZkIdentity, genRandomSalt } from '@unirep/crypto'
import {
    deployUnirep,
    EpochKeyProof,
    computeStartTransitionProofHash,
    computeProcessAttestationsProofHash,
    Unirep,
} from '@unirep/contracts'
import { EPOCH_LENGTH, defaultProver } from '@unirep/circuits'

import {
    genEpochKey,
    genUnirepState,
    genUserState,
    Reputation,
    UserState,
} from '../../src'
import {
    compareDB,
    getSnapDBDiffs,
    compareSnapDB,
    snapshotDB,
    genRandomAttestation,
    genRandomList,
    submitUSTProofs,
} from '../utils'

describe('User state transition events in Unirep User State', async function () {
    this.timeout(0)

    let unirepContract: Unirep

    let attester: any
    let attesterId: any
    const maxUsers = 2 ** 7
    const attestingFee = ethers.utils.parseEther('0.1')

    before(async () => {
        const accounts = await hardhatEthers.getSigners()

        unirepContract = await deployUnirep(accounts[0], {
            maxUsers,
            attestingFee,
        })
    })

    describe('Attester sign up and set airdrop', async () => {
        it('attester sign up', async () => {
            const accounts = await hardhatEthers.getSigners()
            attester = accounts[2]

            const tx = await unirepContract.connect(attester).attesterSignUp()
            const receipt = await tx.wait()
            expect(receipt.status, 'Attester signs up failed').to.equal(1)
            attesterId = (
                await unirepContract.attesters(attester.address)
            ).toBigInt()
        })

        it('attester set airdrop amount', async () => {
            const airdropPosRep = 10
            const tx = await unirepContract
                .connect(attester)
                .setAirdropAmount(airdropPosRep)
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
            const airdroppedAmount = await unirepContract.airdropAmount(
                attester.address
            )
            expect(airdroppedAmount.toNumber()).equal(airdropPosRep)
        })
    })

    describe('User Sign Up event', async () => {
        it('sign up users through attester who sets airdrop', async () => {
            const id = new ZkIdentity()
            await unirepContract
                .connect(attester)
                .userSignUp(id.genIdentityCommitment())
                .then((t) => t.wait())
            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                id
            )
            const airdroppedAmount = await unirepContract.airdropAmount(
                attester.address
            )
        })

        it('sign up users with no airdrop', async () => {
            const id = new ZkIdentity()
            const commitment = id.genIdentityCommitment()

            const tx = await unirepContract.userSignUp(commitment)
            const receipt = await tx.wait()
            expect(receipt.status, 'User sign up failed').to.equal(1)

            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                id
            )

            const contractEpoch = await unirepContract.currentEpoch()
            const unirepEpoch = await userState.getUnirepStateCurrentEpoch()
            expect(unirepEpoch).equal(Number(contractEpoch))
        })
    })

    describe('User state transition events with no attestation', async () => {
        it('Users should successfully perform user state transition', async () => {
            const userStates = await Promise.all(
                Array(3)
                    .fill(null)
                    .map(async (_, i) => {
                        const id = new ZkIdentity()
                        await unirepContract
                            .connect(attester)
                            .userSignUp(id.genIdentityCommitment())
                            .then((t) => t.wait())
                        return genUserState(
                            hardhatEthers.provider,
                            unirepContract.address,
                            id
                        )
                    })
            )
            await hardhatEthers.provider.send('evm_increaseTime', [
                EPOCH_LENGTH,
            ])
            await unirepContract
                .connect(attester)
                .beginEpochTransition()
                .then((t) => t.wait())

            for (const userState of userStates) await userState.waitForSync()
            const firstUserState = userStates[0]
            const proofs = await firstUserState.genUserStateTransitionProofs()
            await submitUSTProofs(unirepContract, proofs)
            await firstUserState.waitForSync()

            const transitionedUsers = [0] as number[]
            for (let i = 1; i < userStates.length; i++) {
                const randomUST = Math.round(Math.random())
                if (randomUST === 0) continue
                console.log('transition user', i)
                const userState = userStates[i]

                const proofs = await userState.genUserStateTransitionProofs()
                await submitUSTProofs(unirepContract, proofs)
                await userState.waitForSync()
                transitionedUsers.push(i)
            }
            for (let i = 0; i < transitionedUsers.length; i++) {
                const userState = userStates[transitionedUsers[i]]
                expect(await userState.getUnirepStateCurrentEpoch()).equal(
                    await userState.latestTransitionedEpoch()
                )
            }
        })

        it.skip('User generate two UST proofs should not affect Unirep state', async () => {
            const id = new ZkIdentity()
            await unirepContract
                .connect(attester)
                .userSignUp(id.genIdentityCommitment())
                .then((t) => t.wait())
            await hardhatEthers.provider.send('evm_increaseTime', [
                EPOCH_LENGTH,
            ])
            await unirepContract
                .connect(attester)
                .beginEpochTransition()
                .then((t) => t.wait())
            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                id
            )
            const proofs = await userState.genUserStateTransitionProofs()
            await submitUSTProofs(unirepContract, proofs)
            await userState.waitForSync()
            const snap = await snapshotDB((userState as any)._db)
            await submitUSTProofs(unirepContract, proofs)
            await userState.waitForSync()
            const diffs = await getSnapDBDiffs(snap, (userState as any)._db)
            console.log(diffs)
            expect(diffs.length).to.equal(1)
            expect(diffs[0].valid).to.equal(0)
        })

        it('Submit invalid start tranistion proof should not affect Unirep State', async () => {
            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            const snap = await snapshotDB((unirepState as any)._db)
            const randomProof: BigNumberish[] = genRandomList(8)
            const randomBlindedUserState = BigNumber.from(genRandomSalt())
            const randomBlindedHashChain = BigNumber.from(genRandomSalt())
            const randomGSTRoot = BigNumber.from(genRandomSalt())
            await unirepContract
                .startUserStateTransition(
                    randomBlindedUserState,
                    randomBlindedHashChain,
                    randomGSTRoot,
                    randomProof
                )
                .then((t) => t.wait())
            await unirepState.waitForSync()
            const diffs = await getSnapDBDiffs(snap, (unirepState as any)._db)
            expect(diffs.length).to.equal(1)
            expect(diffs[0].valid).to.equal(0)
        })

        it('Submit invalid process attestation proof should not affect Unirep State', async () => {
            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            const snap = await snapshotDB((unirepState as any)._db)
            const randomProof: BigNumberish[] = genRandomList(8)
            const randomOutputBlindedUserState = BigNumber.from(genRandomSalt())
            const randomOutputBlindedHashChain = BigNumber.from(genRandomSalt())
            const randomInputBlindedUserState = BigNumber.from(genRandomSalt())
            const tx = await unirepContract.processAttestations(
                randomOutputBlindedUserState,
                randomOutputBlindedHashChain,
                randomInputBlindedUserState,
                randomProof
            )
            const receipt = await tx.wait()
            expect(receipt.status).to.equal(1)
            await unirepState.waitForSync()

            const diffs = await getSnapDBDiffs(snap, (unirepState as any)._db)
            expect(diffs.length).to.equal(1)
            expect(diffs[0].valid).to.equal(0)
        })

        it('Submit invalid user state transition proof should not affect Unirep State', async () => {
            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            const snap = await snapshotDB((unirepState as any)._db)
            const proofIndexes = [] as any[]
            {
                const randomProof: BigNumberish[] = genRandomList(8)
                const randomBlindedUserState = BigNumber.from(genRandomSalt())
                const randomBlindedHashChain = BigNumber.from(genRandomSalt())
                const randomGSTRoot = BigNumber.from(genRandomSalt())
                await unirepContract
                    .startUserStateTransition(
                        randomBlindedUserState,
                        randomBlindedHashChain,
                        randomGSTRoot,
                        randomProof
                    )
                    .then((t) => t.wait())
                const hashedProof = computeStartTransitionProofHash(
                    BigNumber.from(randomBlindedUserState),
                    BigNumber.from(randomBlindedHashChain),
                    BigNumber.from(randomGSTRoot),
                    randomProof.map((p) => BigNumber.from(p))
                )
                proofIndexes.push(
                    Number(await unirepContract.getProofIndex(hashedProof))
                )
            }
            {
                const randomProof: BigNumberish[] = genRandomList(8)
                const randomOutputBlindedUserState = BigNumber.from(
                    genRandomSalt()
                )
                const randomOutputBlindedHashChain = BigNumber.from(
                    genRandomSalt()
                )
                const randomInputBlindedUserState = BigNumber.from(
                    genRandomSalt()
                )
                await unirepContract
                    .processAttestations(
                        randomOutputBlindedUserState,
                        randomOutputBlindedHashChain,
                        randomInputBlindedUserState,
                        randomProof
                    )
                    .then((t) => t.wait())
                const hashedProof = computeProcessAttestationsProofHash(
                    BigNumber.from(randomOutputBlindedUserState),
                    BigNumber.from(randomOutputBlindedHashChain),
                    BigNumber.from(randomInputBlindedUserState),
                    randomProof.map((p) => BigNumber.from(p))
                )
                proofIndexes.push(
                    Number(await unirepContract.getProofIndex(hashedProof))
                )
            }
            const randomProof: BigNumberish[] = genRandomList(8)
            const randomNullifiers: BigNumberish[] = genRandomList(
                unirepState.settings.numEpochKeyNoncePerEpoch
            )
            const randomBlindedStates: BigNumberish[] = genRandomList(2)
            const randomBlindedChains: BigNumberish[] = genRandomList(
                unirepState.settings.numEpochKeyNoncePerEpoch
            )

            const randomUSTInput = {
                newGlobalStateTreeLeaf: BigNumber.from(genRandomSalt()),
                epkNullifiers: randomNullifiers,
                transitionFromEpoch: 1,
                blindedUserStates: randomBlindedStates,
                fromGlobalStateTree: BigNumber.from(genRandomSalt()),
                blindedHashChains: randomBlindedChains,
                fromEpochTree: BigNumber.from(genRandomSalt()),
                proof: randomProof,
            }
            const tx = await unirepContract.updateUserStateRoot(
                randomUSTInput,
                proofIndexes
            )
            const receipt = await tx.wait()
            expect(receipt.status).to.equal(1)
            await unirepState.waitForSync()

            const diffs = await getSnapDBDiffs(snap, (unirepState as any)._db)
            expect(diffs.length).to.equal(3)
            expect(diffs[0].valid).to.equal(0)
            expect(diffs[1].valid).to.equal(0)
            expect(diffs[2].valid).to.equal(0)
        })

        it('submit valid proof with wrong GST will not affect Unirep state', async () => {
            const id = new ZkIdentity()
            const accounts = await hardhatEthers.getSigners()
            const falseUnirepContract = await deployUnirep(accounts[0], {
                maxUsers,
                attestingFee,
            })
            const targetEpoch = await unirepContract.currentEpoch()
            // console.log(targetEpoch)
            for (let x = 1; x < targetEpoch.toNumber(); x++) {
                await hardhatEthers.provider.send('evm_increaseTime', [
                    EPOCH_LENGTH,
                ])
                await falseUnirepContract
                    .beginEpochTransition()
                    .then((t) => t.wait())
            }

            await falseUnirepContract
                .connect(attester)
                .userSignUp(id.genIdentityCommitment())
                .then((t) => t.wait())
            await unirepContract
                .connect(attester)
                .userSignUp(id.genIdentityCommitment())
                .then((t) => t.wait())
            await hardhatEthers.provider.send('evm_increaseTime', [
                EPOCH_LENGTH,
            ])
            await falseUnirepContract
                .beginEpochTransition()
                .then((t) => t.wait())
            await unirepContract
                .connect(attester)
                .beginEpochTransition()
                .then((t) => t.wait())

            const userState = await genUserState(
                hardhatEthers.provider,
                falseUnirepContract.address,
                id
            )
            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            const snap = await snapshotDB((unirepState as any)._db)

            const proofs = await userState.genUserStateTransitionProofs()
            await submitUSTProofs(unirepContract, proofs)
            await unirepState.waitForSync()

            const diffs = await getSnapDBDiffs(snap, (unirepState as any)._db)
            const expectedProofs = 8
            expect(diffs.length).to.equal(expectedProofs)
            for (let x = 0; x < expectedProofs; x++) {
                expect(diffs[x].valid, 'Proof should be invalid').to.equal(0)
            }
        })

        //     it('mismatch proof indexes will not affect Unirep state', async () => {
        //         if (notTransitionUsers.length < 2) return
        //         const userState1 = await genUserState(
        //             hardhatEthers.provider,
        //             unirepContract.address,
        //             userIds[notTransitionUsers[0]]
        //         )
        //         const userState2 = await genUserState(
        //             hardhatEthers.provider,
        //             unirepContract.address,
        //             userIds[notTransitionUsers[1]]
        //         )
        //
        //         const { startTransitionProof, processAttestationProofs } =
        //             await userState1.genUserStateTransitionProofs()
        //         const { finalTransitionProof } =
        //             await userState2.genUserStateTransitionProofs()
        //         await submitUSTProofs(unirepContract, {
        //             startTransitionProof,
        //             processAttestationProofs,
        //             finalTransitionProof,
        //         })
        //
        //         const userState = await genUserState(
        //             hardhatEthers.provider,
        //             unirepContract.address,
        //             userIds[storedUserIdx]
        //         )
        //         compareDB((userState as any)._db, (storedUserState as any)._db)
        //     })
        //
        //     it('Submit attestations to transitioned users', async () => {
        //         const epkNonce = 0
        //         for (let i = 0; i < transitionedUsers.length; i++) {
        //             const userIdx = transitionedUsers[i]
        //             const userState = await genUserState(
        //                 hardhatEthers.provider,
        //                 unirepContract.address,
        //                 userIds[userIdx]
        //             )
        //
        //             const { proof, publicSignals } =
        //                 await userState.genVerifyEpochKeyProof(epkNonce)
        //             const epkProofInput = new EpochKeyProof(
        //                 publicSignals,
        //                 proof,
        //                 defaultProver
        //             )
        //             const isValid = await epkProofInput.verify()
        //             expect(isValid).to.be.true
        //
        //             let tx = await unirepContract.submitEpochKeyProof(epkProofInput)
        //             let receipt = await tx.wait()
        //             expect(receipt.status).to.equal(1)
        //
        //             const epochKey = epkProofInput.epochKey
        //             const hashedProof = await unirepContract.hashEpochKeyProof(
        //                 epkProofInput
        //             )
        //             const proofIndex = Number(
        //                 await unirepContract.getProofIndex(hashedProof)
        //             )
        //
        //             const attestation = genRandomAttestation()
        //             attestation.attesterId = attesterId
        //             tx = await unirepContract
        //                 .connect(attester)
        //                 .submitAttestation(
        //                     attestation,
        //                     epochKey,
        //                     proofIndex,
        //                     fromProofIndex,
        //                     { value: attestingFee }
        //                 )
        //             receipt = await tx.wait()
        //             expect(receipt.status).to.equal(1)
        //             attestations[userIdx].update(
        //                 attestation.posRep,
        //                 attestation.negRep,
        //                 attestation.graffiti,
        //                 attestation.signUp
        //             )
        //         }
        //         await storedUserState.waitForSync()
        //     })
        //
        //     it('User state should store the attestations ', async () => {
        //         const epkNonce = 0
        //         const epoch = 2
        //         for (let i = 0; i < transitionedUsers.length; i++) {
        //             const epk = genEpochKey(
        //                 userIds[transitionedUsers[i]].identityNullifier,
        //                 epoch,
        //                 epkNonce,
        //                 storedUserState.settings.epochTreeDepth
        //             ).toString()
        //             const userState = await genUserState(
        //                 hardhatEthers.provider,
        //                 unirepContract.address,
        //                 userIds[transitionedUsers[i]]
        //             )
        //             expect((await userState.getAttestations(epk)).length).not.equal(
        //                 0
        //             )
        //             compareDB((userState as any)._db, (storedUserState as any)._db)
        //         }
        //     })
        // })
        //
        // describe('Epoch transition event with attestations', async () => {
        //     it('epoch transition should succeed', async () => {
        //         // Record data before epoch transition so as to compare them with data after epoch transition
        //         let epoch = await unirepContract.currentEpoch()
        //
        //         // Fast-forward epochLength of seconds
        //         await hardhatEthers.provider.send('evm_increaseTime', [
        //             EPOCH_LENGTH,
        //         ])
        //         // Begin epoch transition
        //         let tx = await unirepContract
        //             .connect(attester)
        //             .beginEpochTransition()
        //         let receipt = await tx.wait()
        //         expect(receipt.status).equal(1)
        //         console.log(
        //             'Gas cost of epoch transition:',
        //             receipt.gasUsed.toString()
        //         )
        //
        //         // Complete epoch transition
        //         expect(await unirepContract.currentEpoch()).to.be.equal(
        //             epoch.add(1)
        //         )
        //         let epoch_ = await unirepContract.currentEpoch()
        //         expect(epoch_).equal(epoch.add(1))
        //     })
        // })
        //
        // describe('User state transition events with attestations', async () => {
        //     it('Users should successfully perform user state transition', async () => {
        //         const unirepState = await genUnirepState(
        //             hardhatEthers.provider,
        //             unirepContract.address
        //         )
        //         const epoch = 2
        //         const GSTRoot = (await unirepState.genGSTree(epoch)).root
        //
        //         for (let i = 0; i < userIds.length; i++) {
        //             const randomUST = Math.round(Math.random())
        //             if (randomUST === 0) continue
        //             console.log('transition user', i)
        //             const userState = await genUserState(
        //                 hardhatEthers.provider,
        //                 unirepContract.address,
        //                 userIds[i]
        //             )
        //
        //             expect((await userState.genGSTree(epoch)).root).equal(GSTRoot)
        //
        //             const proofs = await userState.genUserStateTransitionProofs()
        //             await submitUSTProofs(unirepContract, proofs)
        //         }
        //     })
        //
        //     it('Users state transition matches current Unirep state', async () => {
        //         const unirepState = await genUnirepState(
        //             hardhatEthers.provider,
        //             unirepContract.address
        //         )
        //         const userState = await genUserState(
        //             hardhatEthers.provider,
        //             unirepContract.address,
        //             userIds[0]
        //         )
        //         expect(await userState.getUnirepStateCurrentEpoch()).equal(
        //             (await unirepState.loadCurrentEpoch()).number
        //         )
        //         for (
        //             let i = 1;
        //             i <= (await unirepState.loadCurrentEpoch()).number;
        //             i++
        //         ) {
        //             expect((await userState.genGSTree(i)).root).equal(
        //                 (await userState.genGSTree(i)).root
        //             )
        //         }
        //         expect((await userState.getUnirepStateEpochTree(2)).root).equal(
        //             (await unirepState.genEpochTree(2)).root
        //         )
        //     })
    })
})
