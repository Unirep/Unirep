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
    snapshotDB,
    genRandomAttestation,
    genRandomList,
    submitUSTProofs,
} from '../utils'

describe('User state transition events in Unirep User State', async function () {
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
            const expectedProofs = 2 + proofs.processAttestationProofs.length
            expect(diffs.length).to.equal(expectedProofs)
            expect(diffs[0].valid).to.equal(0)
            expect(diffs[expectedProofs - 1].valid).to.equal(0)
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

            const { formattedProof } = await userState.genVerifyEpochKeyProof(
                epkNonce
            )
            const isValid = await formattedProof.verify()
            expect(isValid).to.be.true

            {
                const receipt = await unirepContract
                    .submitEpochKeyProof(formattedProof)
                    .then((t) => t.wait())
                expect(receipt.status).to.equal(1)
            }

            const epochKey = formattedProof.epochKey
            const hashedProof = await unirepContract.hashEpochKeyProof(
                formattedProof
            )
            const proofIndex = Number(
                await unirepContract.getProofIndex(hashedProof)
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
            const epkProofDoc = diffs.find((d) => d.table === 'Proof')
            expect(epkProofDoc.epoch).to.equal(epoch)
            expect(epkProofDoc.valid).to.equal(1)
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
            const epkNonce = 0

            const { formattedProof } = await userState.genVerifyEpochKeyProof(
                epkNonce
            )
            const isValid = await formattedProof.verify()
            expect(isValid).to.be.true

            {
                const receipt = await unirepContract
                    .submitEpochKeyProof(formattedProof)
                    .then((t) => t.wait())
                expect(receipt.status).to.equal(1)
            }

            const epochKey = formattedProof.epochKey
            const hashedProof = await unirepContract.hashEpochKeyProof(
                formattedProof
            )
            const proofIndex = Number(
                await unirepContract.getProofIndex(hashedProof)
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
                proofs.finalTransitionProof.epochKeyNullifiers.length
            )
            for (const nullifier of proofs.finalTransitionProof
                .epochKeyNullifiers) {
                const doc = diffs.find(
                    (d) =>
                        d.table === 'Nullifier' &&
                        d.nullifier === nullifier.toString()
                )
                expect(doc).to.not.be.undefined
                expect(doc.confirmed).to.equal(1)
            }
        })
    })
})
