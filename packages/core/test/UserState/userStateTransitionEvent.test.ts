// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { BigNumberish, ethers } from 'ethers'
import { expect } from 'chai'
import { ZkIdentity } from '@unirep/crypto'
import { deployUnirep, Unirep } from '@unirep/contracts'
import {
    EPOCH_LENGTH,
    formatProofForSnarkjsVerification,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
} from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

import { genEpochKey } from '../../src'
import {
    getSnapDBDiffs,
    snapshotDB,
    genRandomAttestation,
    submitUSTProofs,
    genUnirepState,
    genUserState,
} from '../utils'
import {
    UserTransitionProof,
} from '@unirep/contracts/src'

describe('User state transition events in Unirep User State', function () {
    this.timeout(0)

    let unirepContract: Unirep

    let attester: any
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
                expect(await proofs.startTransitionProof.verify()).to.be.true
                for (const p of proofs.processAttestationProofs) {
                    expect(await p.verify()).to.be.true
                }
                expect(await proofs.finalTransitionProof.verify()).to.be.true
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
            for (const state of userStates) {
                await state.stop()
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
            expect(await proofs.startTransitionProof.verify()).to.be.true
            for (const p of proofs.processAttestationProofs) {
                expect(await p.verify()).to.be.true
            }
            expect(await proofs.finalTransitionProof.verify()).to.be.true
            await submitUSTProofs(unirepContract, proofs)
            await userState.waitForSync()
            const snap = await snapshotDB((userState as any)._db)
            await submitUSTProofs(unirepContract, proofs)
            await userState.waitForSync()
            const diffs = await getSnapDBDiffs(snap, (userState as any)._db)
            expect(diffs.length).to.equal(1)
            expect(diffs[0].valid).to.equal(0)
            await userState.stop()
        })

        it('Submit invalid start tranistion proof should not affect Unirep State', async () => {
            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            const snap = await snapshotDB((unirepState as any)._db)
            const randomProof: BigNumberish[] = Array(8).fill('0')
            const randomPublicSignals: BigNumberish[] = Array(3).fill('0')
            await expect(unirepContract
                .startUserStateTransition(randomPublicSignals, randomProof)
            ).to.be.revertedWithCustomError(unirepContract, 'InvalidProof')
            await unirepState.waitForSync()
            const diffs = await getSnapDBDiffs(snap, (unirepState as any)._db)
            expect(diffs.length).to.equal(0)
            await unirepState.stop()
        })

        it('Submit invalid process attestation proof should not affect Unirep State', async () => {
            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            const snap = await snapshotDB((unirepState as any)._db)
            const randomProof: BigNumberish[] = Array(8).fill('0')
            const randomPublicSignals: BigNumberish[] = Array(3).fill('0')
            await expect(unirepContract
                .processAttestations(randomPublicSignals, randomProof)
            ).to.be.revertedWithCustomError(unirepContract, 'InvalidProof')
            await unirepState.waitForSync()

            const diffs = await getSnapDBDiffs(snap, (unirepState as any)._db)
            expect(diffs.length).to.equal(0)
            await unirepState.stop()
        })

        it('Submit invalid user state transition proof should not affect Unirep State', async () => {
            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            const snap = await snapshotDB((unirepState as any)._db)
            const proofIndexes = [1,2,3] as any[]
            const randomProof: BigNumberish[] = Array(8).fill('0')
            const randomPublicSignals: BigNumberish[] = Array(2 * unirepState.settings.numEpochKeyNoncePerEpoch + 6).fill('0')
            const ustProof = new UserTransitionProof(
                randomPublicSignals,
                formatProofForSnarkjsVerification(
                    randomProof.map((n) => n.toString())
                ),
                defaultProver
            )
            ustProof.publicSignals[ustProof.idx.transitionFromEpoch] = 1
            await expect(
                unirepContract
                .updateUserStateRoot(
                    ustProof.publicSignals,
                    ustProof.proof,
                    proofIndexes
                )
            ).to.be.revertedWithCustomError(unirepContract, 'InvalidProof')
            await unirepState.waitForSync()

            const diffs = await getSnapDBDiffs(snap, (unirepState as any)._db)
            expect(diffs.length).to.equal(0)
            await unirepState.stop()
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
            expect(await proofs.startTransitionProof.verify()).to.be.true
            for (const p of proofs.processAttestationProofs) {
                expect(await p.verify()).to.be.true
            }
            expect(await proofs.finalTransitionProof.verify()).to.be.true
            await submitUSTProofs(unirepContract, proofs)
            await unirepState.waitForSync()

            const diffs = await getSnapDBDiffs(snap, (unirepState as any)._db)
            const expectedProofs = 2 + proofs.processAttestationProofs.length
            expect(diffs.length).to.equal(expectedProofs)
            expect(diffs[0].valid).to.equal(0)
            expect(diffs[expectedProofs - 1].valid).to.equal(0)
            await userState.stop()
            await unirepState.stop()
        })

        it('mismatch proof indexes will not affect Unirep state', async () => {
            const id1 = new ZkIdentity()
            const id2 = new ZkIdentity()
            await unirepContract
                .connect(attester)
                .userSignUp(id1.genIdentityCommitment())
                .then((t) => t.wait())
            await unirepContract
                .connect(attester)
                .userSignUp(id2.genIdentityCommitment())
                .then((t) => t.wait())
            await hardhatEthers.provider.send('evm_increaseTime', [
                EPOCH_LENGTH,
            ])
            await unirepContract
                .connect(attester)
                .beginEpochTransition()
                .then((t) => t.wait())
            const userState1 = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                id1
            )
            const userState2 = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                id2
            )
            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            const snap = await snapshotDB((unirepState as any)._db)

            const { startTransitionProof, processAttestationProofs } =
                await userState1.genUserStateTransitionProofs()
            const { finalTransitionProof } =
                await userState2.genUserStateTransitionProofs()
            expect(await startTransitionProof.verify()).to.be.true
            for (const p of processAttestationProofs) {
                expect(await p.verify()).to.be.true
            }
            expect(await finalTransitionProof.verify()).to.be.true
            await submitUSTProofs(unirepContract, {
                startTransitionProof,
                processAttestationProofs,
                finalTransitionProof,
            })
            await unirepState.waitForSync()

            const diffs = await getSnapDBDiffs(snap, (unirepState as any)._db)
            const expectedProofs = 2 + processAttestationProofs.length
            expect(diffs.length).to.equal(expectedProofs)
            const gstLeafCount = diffs.filter(
                (d) => d.table === 'GSTLeaf'
            ).length
            const gstRootCount = diffs.filter(
                (d) => d.table === 'GSTRoot'
            ).length
            const nullifierCount = diffs.filter(
                (d) => d.table === 'Nullifier'
            ).length
            expect(gstLeafCount).to.equal(0)
            expect(gstRootCount).to.equal(0)
            expect(nullifierCount).to.equal(0)
            const ustProofCount = diffs.filter(
                (d) =>
                    d.table === 'Proof' &&
                    d.event === 'IndexedUserStateTransitionProof'
            ).length
            expect(ustProofCount).to.equal(1)
            const startUstProofCount = diffs.filter(
                (d) =>
                    d.table === 'Proof' &&
                    d.event === 'IndexedStartedTransitionProof'
            ).length
            expect(startUstProofCount).to.equal(1)
            const processedAttestationsCount = diffs.filter(
                (d) =>
                    d.table === 'Proof' &&
                    d.event === 'IndexedProcessedAttestationsProof'
            ).length
            expect(processedAttestationsCount).to.equal(
                processAttestationProofs.length
            )
            await unirepState.stop()
            await userState1.stop()
            await userState2.stop()
        })

        it('Submit attestations to transitioned users', async () => {
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
            // now we're synced, let's submit some attestations
            const epkNonce = 0

            const formattedProof = await userState.genVerifyEpochKeyProof(
                epkNonce
            )
            const isValid = await formattedProof.verify()
            expect(isValid).to.be.true

            {
                const receipt = await unirepContract
                    .submitEpochKeyProof(
                        formattedProof.publicSignals,
                        formattedProof.proof
                    )
                    .then((t) => t.wait())
                expect(receipt.status).to.equal(1)
            }

            const epochKey = formattedProof.epochKey
            const proofIndex = Number(
                await unirepContract.getProofIndex(formattedProof.hash())
            )

            const attestation = genRandomAttestation()
            const attesterId = await unirepContract.attesters(attester.address)

            attestation.attesterId = attesterId
            const receipt = await unirepContract
                .connect(attester)
                .submitAttestation(attestation, epochKey, proofIndex, 0, {
                    value: attestingFee,
                })
                .then((t) => t.wait())
            expect(receipt.status).to.equal(1)
            await userState.waitForSync()
            const epoch = await userState.getUnirepStateCurrentEpoch()
            const epk = genEpochKey(
                id.identityNullifier,
                epoch,
                epkNonce,
                userState.settings.epochTreeDepth
            ).toString()
            expect(
                (await userState.getAttestations(epk)).length
            ).to.be.greaterThan(0)
            const diffs = await getSnapDBDiffs(snap, (userState as any)._db)
            // proof, attestation, epoch key
            expect(diffs.length).to.equal(3)
            const formattedProofDoc = diffs.find((d) => d.table === 'Proof')
            expect(formattedProofDoc.epoch).to.equal(epoch)
            expect(formattedProofDoc.valid).to.equal(1)
            const attestationDoc = diffs.find((d) => d.table === 'Attestation')
            expect(attestationDoc.attesterId).to.equal(attesterId.toNumber())
            expect(attestationDoc.posRep).to.equal(
                attestation.posRep.toNumber()
            )
            expect(attestationDoc.negRep).to.equal(
                attestation.negRep.toNumber()
            )
            expect(attestationDoc.graffiti).to.equal(
                attestation.graffiti.toString()
            )
            expect(attestationDoc.hash).to.equal(attestation.hash().toString())
            await userState.stop()
        })

        it('should UST with attestations', async () => {
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

            {
                const proofs = await userState.genUserStateTransitionProofs()
                await submitUSTProofs(unirepContract, proofs)
            }
            await userState.waitForSync()
            // now we're synced, let's submit some attestations
            for (
                let epkNonce = 0;
                epkNonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH;
                epkNonce++
            ) {
                for (let i = 0; i < 5; i++) {
                    const formattedProof =
                        await userState.genVerifyEpochKeyProof(epkNonce)
                    const isValid = await formattedProof.verify()
                    expect(isValid).to.be.true

                    {
                        const receipt = await unirepContract
                            .submitEpochKeyProof(
                                formattedProof.publicSignals,
                                formattedProof.proof
                            )
                            .then((t) => t.wait())
                        expect(receipt.status).to.equal(1)
                    }

                    const epochKey = formattedProof.epochKey
                    const proofIndex = Number(
                        await unirepContract.getProofIndex(
                            formattedProof.hash()
                        )
                    )

                    const attestation = genRandomAttestation()
                    const attesterId = await unirepContract.attesters(
                        attester.address
                    )

                    attestation.attesterId = attesterId
                    const receipt = await unirepContract
                        .connect(attester)
                        .submitAttestation(
                            attestation,
                            epochKey,
                            proofIndex,
                            0,
                            {
                                value: attestingFee,
                            }
                        )
                        .then((t) => t.wait())
                    expect(receipt.status).to.equal(1)
                }
            }
            await userState.waitForSync()

            await hardhatEthers.provider.send('evm_increaseTime', [
                EPOCH_LENGTH,
            ])
            await unirepContract
                .connect(attester)
                .beginEpochTransition()
                .then((t) => t.wait())

            await userState.waitForSync()
            const epoch = await userState.getUnirepStateCurrentEpoch()
            const expectedGST = await userState.genGSTree(epoch)
            const snap = await snapshotDB((userState as any)._db)

            const proofs = await userState.genUserStateTransitionProofs()
            expectedGST.insert(
                proofs.finalTransitionProof.newGlobalStateTreeLeaf
            )
            expect(await proofs.startTransitionProof.verify()).to.be.true
            for (const p of proofs.processAttestationProofs) {
                expect(await p.verify()).to.be.true
            }
            expect(await proofs.finalTransitionProof.verify()).to.be.true
            await submitUSTProofs(unirepContract, proofs)
            await userState.waitForSync()
            const diffs = await getSnapDBDiffs(snap, (userState as any)._db)
            const expectedProofs = 2 + proofs.processAttestationProofs.length
            const nullifierCount = diffs.filter(
                (d) => d.table === 'Nullifier'
            ).length
            const gstLeafCount = diffs.filter(
                (d) => d.table === 'GSTLeaf'
            ).length
            const gstRootCount = diffs.filter(
                (d) => d.table === 'GSTRoot'
            ).length
            expect(diffs.length).to.equal(
                expectedProofs + nullifierCount + gstLeafCount + gstRootCount
            )
            expect(gstLeafCount).to.equal(1)
            const gstLeaf = diffs.find((d) => d.table === 'GSTLeaf')
            expect(gstLeaf.hash).to.equal(
                proofs.finalTransitionProof.newGlobalStateTreeLeaf.toString()
            )
            expect(gstRootCount).to.equal(1)
            const gstRoot = diffs.find((d) => d.table === 'GSTRoot')
            expect(gstRoot.root).to.equal(expectedGST.root.toString())
            expect(nullifierCount).to.equal(
                proofs.finalTransitionProof.epkNullifiers.length
            )
            for (const nullifier of proofs.finalTransitionProof.epkNullifiers) {
                const doc = diffs.find(
                    (d) =>
                        d.table === 'Nullifier' &&
                        d.nullifier === nullifier.toString()
                )
                expect(doc).to.not.be.undefined
            }
            await userState.stop()
        })
    })
})
