// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { BigNumberish, ethers } from 'ethers'
import { expect } from 'chai'
import { genRandomSalt, ZkIdentity } from '@unirep/crypto'
import { Unirep } from '@unirep/contracts'
import { deployUnirep } from '@unirep/contracts/deploy'
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
import { UserTransitionProof } from '@unirep/contracts/src'

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

    describe('Attester sign up', async () => {
        it('attester sign up', async () => {
            const accounts = await hardhatEthers.getSigners()
            attester = accounts[2]

            const tx = await unirepContract.connect(attester).attesterSignUp()
            const receipt = await tx.wait()
            expect(receipt.status, 'Attester signs up failed').to.equal(1)
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
                            ['userSignUp(uint256)'](id.genIdentityCommitment())
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

        it('Generate epoch tree and GST should be consistent with unirep contract', async () => {
            const epoch = 1
            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            const offchainGST = await unirepState.genGSTree(epoch)
            const offchainEpochTree = await unirepState.genEpochTree(epoch)

            const GSTRootExists = await unirepContract.globalStateTreeRoots(
                epoch,
                offchainGST.root
            )
            expect(GSTRootExists).to.be.true
            const onchainEpochTree = await unirepContract.epochTrees(epoch)
            expect(offchainEpochTree.root.toString()).equal(
                onchainEpochTree.root.toString()
            )
        })

        it.skip('User generate two UST proofs should not affect Unirep state', async () => {
            const id = new ZkIdentity()
            await unirepContract
                .connect(attester)
                ['userSignUp(uint256)'](id.genIdentityCommitment())
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

        it('Submit attestations to transitioned users', async () => {
            const id = new ZkIdentity()
            await unirepContract
                .connect(attester)
                ['userSignUp(uint256)'](id.genIdentityCommitment())
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

            const epochKey = formattedProof.epochKey
            const attestation = genRandomAttestation()
            const attesterId = await unirepContract.attesters(attester.address)

            attestation.attesterId = attesterId
            const receipt = await unirepContract
                .connect(attester)
                .submitAttestation(attestation, epochKey, {
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
            // just the attestation document
            expect(diffs.length).to.equal(1)
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
                ['userSignUp(uint256)'](id.genIdentityCommitment())
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

                    const epochKey = formattedProof.epochKey
                    const attestation = genRandomAttestation()
                    const attesterId = await unirepContract.attesters(
                        attester.address
                    )

                    attestation.attesterId = attesterId
                    const receipt = await unirepContract
                        .connect(attester)
                        .submitAttestation(attestation, epochKey, {
                            value: attestingFee,
                        })
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
            const nullifierCount = diffs.filter(
                (d) => d.table === 'Nullifier'
            ).length
            const gstLeafCount = diffs.filter(
                (d) => d.table === 'GSTLeaf'
            ).length
            expect(diffs.length).to.equal(nullifierCount + gstLeafCount)
            expect(gstLeafCount).to.equal(1)
            const gstLeaf = diffs.find((d) => d.table === 'GSTLeaf')
            expect(gstLeaf.hash).to.equal(
                proofs.finalTransitionProof.newGlobalStateTreeLeaf.toString()
            )
            const currentGST = await userState.genGSTree(epoch)
            expect(expectedGST.root.toString()).to.equal(
                currentGST.root.toString()
            )
            const currentEpochTree = await userState.genEpochTree(epoch)
            const onchainEpochTree = await unirepContract.epochTrees(epoch)
            expect(currentEpochTree.root.toString()).to.equal(
                onchainEpochTree.root.toString()
            )

            expect(nullifierCount).to.equal(1)
            const doc = diffs.find(
                (d) =>
                    d.table === 'Nullifier' &&
                    d.nullifier ===
                        proofs.finalTransitionProof.epkNullifiers[0].toString()
            )
            expect(doc).to.not.be.undefined
            await userState.stop()
        })
    })
})
