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
    genRandomAttestation,
    genRandomList,
    submitUSTProofs,
} from '../utils'
import { SQLiteConnector } from 'anondb/node'
import { schema } from '../../src/schema'
import { DB } from 'anondb'

describe('User state transition events in Unirep User State', async function () {
    this.timeout(0)

    let userIds: ZkIdentity[] = []
    let userCommitments: BigInt[] = []
    let signUpAirdrops: Reputation[] = []
    let attestations: Reputation[] = []

    let unirepContract: Unirep

    let treeDepths
    let numEpochKeyNoncePerEpoch
    let maxReputationBudget

    let accounts: ethers.Signer[]
    const attester = new Object()
    let attesterId
    const maxUsers = 5
    const userNum = Math.ceil(Math.random() * maxUsers)
    const attestingFee = ethers.utils.parseEther('0.1')
    const transitionedUsers: number[] = []
    const fromProofIndex = 0

    let db: DB

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], {
            maxUsers,
            attestingFee,
        })

        treeDepths = await unirepContract.treeDepths()
        numEpochKeyNoncePerEpoch =
            await unirepContract.numEpochKeyNoncePerEpoch()
        maxReputationBudget = await unirepContract.maxReputationBudget()

        db = await SQLiteConnector.create(schema, ':memory:')
    })

    describe('Attester sign up and set airdrop', async () => {
        it('attester sign up', async () => {
            attester['acct'] = accounts[2]
            attester['addr'] = await attester['acct'].getAddress()

            let tx = await unirepContract
                .connect(attester['acct'])
                .attesterSignUp()
            let receipt = await tx.wait()
            expect(receipt.status, 'Attester signs up failed').to.equal(1)
            attesterId = (
                await unirepContract.attesters(attester['addr'])
            ).toBigInt()
        })

        it('attester set airdrop amount', async () => {
            const airdropPosRep = 10
            const tx = await unirepContract
                .connect(attester['acct'])
                .setAirdropAmount(airdropPosRep)
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
            const airdroppedAmount = await unirepContract.airdropAmount(
                attester['addr']
            )
            expect(airdroppedAmount.toNumber()).equal(airdropPosRep)
        })
    })

    describe('User Sign Up event', async () => {
        it('sign up users through attester who sets airdrop', async () => {
            for (let i = 0; i < userNum; i++) {
                const id = new ZkIdentity()
                const commitment = id.genIdentityCommitment()
                userIds.push(id)
                userCommitments.push(commitment)

                const tx = await unirepContract
                    .connect(attester['acct'])
                    .userSignUp(commitment)
                const receipt = await tx.wait()
                expect(receipt.status, 'User sign up failed').to.equal(1)

                await expect(
                    unirepContract
                        .connect(attester['acct'])
                        .userSignUp(commitment)
                ).to.be.revertedWithCustomError(
                    unirepContract,
                    `UserAlreadySignedUp`
                )

                const userState = await genUserState(
                    hardhatEthers.provider,
                    unirepContract.address,
                    id
                )

                const contractEpoch = await unirepContract.currentEpoch()
                const unirepEpoch = await userState.getUnirepStateCurrentEpoch()
                expect(unirepEpoch).equal(Number(contractEpoch))

                const airdroppedAmount = await unirepContract.airdropAmount(
                    attester['addr']
                )
                signUpAirdrops.push(
                    new Reputation(
                        airdroppedAmount.toBigInt(),
                        BigInt(0),
                        BigInt(0),
                        BigInt(1)
                    )
                )
                attestations.push(Reputation.default())
            }
        })

        it('sign up users with no airdrop', async () => {
            for (let i = 0; i < maxUsers - userNum; i++) {
                const id = new ZkIdentity()
                const commitment = id.genIdentityCommitment()
                userIds.push(id)
                userCommitments.push(commitment)

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

                signUpAirdrops.push(Reputation.default())
                attestations.push(Reputation.default())
            }
        })
    })

    describe('Epoch transition event with no attestation', async () => {
        it('epoch transition should succeed', async () => {
            // Record data before epoch transition so as to compare them with data after epoch transition
            let epoch = await unirepContract.currentEpoch()

            // Fast-forward epochLength of seconds
            await hardhatEthers.provider.send('evm_increaseTime', [
                EPOCH_LENGTH,
            ])
            // Begin epoch transition
            let tx = await unirepContract
                .connect(attester['acct'])
                .beginEpochTransition()
            let receipt = await tx.wait()
            expect(receipt.status).equal(1)
            console.log(
                'Gas cost of epoch transition:',
                receipt.gasUsed.toString()
            )

            // Complete epoch transition
            expect(await unirepContract.currentEpoch()).to.be.equal(
                epoch.add(1)
            )
            let epoch_ = await unirepContract.currentEpoch()
            expect(epoch_).equal(epoch.add(1))
        })
    })

    describe('User state transition events with no attestation', async () => {
        let storedUserState: UserState
        const storedUserIdx = 0
        let storedProofs
        let invalidProofIndexes: number[] = []
        const notTransitionUsers: number[] = []
        it('Users should successfully perform user state transition', async () => {
            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[storedUserIdx]
            )

            const proofs = await userState.genUserStateTransitionProofs()
            storedProofs = await userState.genUserStateTransitionProofs()
            await submitUSTProofs(unirepContract, proofs)

            transitionedUsers.push(storedUserIdx)

            for (let i = 1; i < userIds.length; i++) {
                const randomUST = Math.round(Math.random())
                if (randomUST === 0) continue
                console.log('transition user', i)
                const userState = await genUserState(
                    hardhatEthers.provider,
                    unirepContract.address,
                    userIds[i]
                )

                const proofs = await userState.genUserStateTransitionProofs()
                await submitUSTProofs(unirepContract, proofs)

                transitionedUsers.push(i)
            }
        })

        it('Users state transition matches current Unirep state', async () => {
            for (let i = 0; i < transitionedUsers.length; i++) {
                const userState = await genUserState(
                    hardhatEthers.provider,
                    unirepContract.address,
                    userIds[transitionedUsers[i]]
                )
                expect(await userState.getUnirepStateCurrentEpoch()).equal(
                    await userState.latestTransitionedEpoch()
                )
            }
            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[storedUserIdx]
            )
            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            expect(await userState.getUnirepStateCurrentEpoch()).equal(
                (await unirepState.loadCurrentEpoch()).number
            )
            for (
                let i = 1;
                i <= (await unirepState.loadCurrentEpoch()).number;
                i++
            ) {
                expect((await userState.genGSTree(i)).root).equal(
                    (await userState.genGSTree(i)).root
                )
            }
            expect((await userState.getUnirepStateEpochTree(1)).root).equal(
                (await unirepState.genEpochTree(1)).root
            )

            storedUserState = userState
        })

        it('User generate two UST proofs should not affect Unirep state', async () => {
            await submitUSTProofs(unirepContract, storedProofs)

            const userStateAfterUST = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[storedUserIdx]
            )
            compareDB(
                (userStateAfterUST as any)._db,
                (storedUserState as any)._db
            )
        })

        it('Submit invalid start tranistion proof should not affect Unirep State', async () => {
            const randomProof: BigNumberish[] = genRandomList(8)
            const randomBlindedUserState = BigNumber.from(genRandomSalt())
            const randomBlindedHashChain = BigNumber.from(genRandomSalt())
            const randomGSTRoot = BigNumber.from(genRandomSalt())
            const tx = await unirepContract.startUserStateTransition(
                randomBlindedUserState,
                randomBlindedHashChain,
                randomGSTRoot,
                randomProof
            )
            let receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[storedUserIdx]
            )
            compareDB((userState as any)._db, (storedUserState as any)._db)

            let hashedProof = computeStartTransitionProofHash(
                BigNumber.from(randomBlindedUserState),
                BigNumber.from(randomBlindedHashChain),
                BigNumber.from(randomGSTRoot),
                randomProof.map((p) => BigNumber.from(p))
            )
            invalidProofIndexes.push(
                Number(await unirepContract.getProofIndex(hashedProof))
            )
        })

        it('Submit invalid process attestation proof should not affect Unirep State', async () => {
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
            let receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[storedUserIdx]
            )
            compareDB((userState as any)._db, (storedUserState as any)._db)

            let hashedProof = computeProcessAttestationsProofHash(
                BigNumber.from(randomOutputBlindedUserState),
                BigNumber.from(randomOutputBlindedHashChain),
                BigNumber.from(randomInputBlindedUserState),
                randomProof.map((p) => BigNumber.from(p))
            )
            invalidProofIndexes.push(
                Number(await unirepContract.getProofIndex(hashedProof))
            )
        })

        it('Submit invalid user state transition proof should not affect Unirep State', async () => {
            const randomProof: BigNumberish[] = genRandomList(8)
            const randomNullifiers: BigNumberish[] = genRandomList(
                numEpochKeyNoncePerEpoch
            )
            const randomBlindedStates: BigNumberish[] = genRandomList(2)
            const randomBlindedChains: BigNumberish[] = genRandomList(
                numEpochKeyNoncePerEpoch
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
                invalidProofIndexes
            )
            let receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[storedUserIdx]
            )
            compareDB((userState as any)._db, (storedUserState as any)._db)
        })

        it('submit valid proof with wrong GST will not affect Unirep state', async () => {
            const falseUnirepContract = await deployUnirep(
                <ethers.Wallet>accounts[0],
                {
                    maxUsers,
                    attestingFee,
                }
            )

            {
                const tx = await falseUnirepContract
                    .connect(attester['acct'])
                    .userSignUp(userIds[0].genIdentityCommitment())
                const receipt = await tx.wait()
                expect(receipt.status, 'User sign up failed').to.equal(1)
            }

            {
                // Fast-forward epochLength of seconds
                await hardhatEthers.provider.send('evm_increaseTime', [
                    EPOCH_LENGTH,
                ])
                // Begin epoch transition
                const tx = await falseUnirepContract
                    .connect(attester['acct'])
                    .beginEpochTransition()

                let receipt = await tx.wait()
                expect(receipt.status).equal(1)
            }

            const userState = await genUserState(
                hardhatEthers.provider,
                falseUnirepContract.address,
                userIds[0]
            )

            const proofs = await userState.genUserStateTransitionProofs()
            await submitUSTProofs(unirepContract, proofs)

            const userStateAfterUST = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[storedUserIdx]
            )
            compareDB(
                (userStateAfterUST as any)._db,
                (storedUserState as any)._db
            )
        })

        it('mismatch proof indexes will not affect Unirep state', async () => {
            if (notTransitionUsers.length < 2) return
            const userState1 = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[notTransitionUsers[0]]
            )
            const userState2 = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[notTransitionUsers[1]]
            )

            const { startTransitionProof, processAttestationProofs } =
                await userState1.genUserStateTransitionProofs()
            const { finalTransitionProof } =
                await userState2.genUserStateTransitionProofs()
            await submitUSTProofs(unirepContract, {
                startTransitionProof,
                processAttestationProofs,
                finalTransitionProof,
            })

            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[storedUserIdx]
            )
            compareDB((userState as any)._db, (storedUserState as any)._db)
        })

        it('Submit attestations to transitioned users', async () => {
            const epkNonce = 0
            for (let i = 0; i < transitionedUsers.length; i++) {
                const userIdx = transitionedUsers[i]
                const userState = await genUserState(
                    hardhatEthers.provider,
                    unirepContract.address,
                    userIds[userIdx]
                )

                const { proof, publicSignals } =
                    await userState.genVerifyEpochKeyProof(epkNonce)
                const epkProofInput = new EpochKeyProof(
                    publicSignals,
                    proof,
                    defaultProver
                )
                const isValid = await epkProofInput.verify()
                expect(isValid).to.be.true

                let tx = await unirepContract.submitEpochKeyProof(epkProofInput)
                let receipt = await tx.wait()
                expect(receipt.status).to.equal(1)

                const epochKey = epkProofInput.epochKey
                const hashedProof = await unirepContract.hashEpochKeyProof(
                    epkProofInput
                )
                const proofIndex = Number(
                    await unirepContract.getProofIndex(hashedProof)
                )

                const attestation = genRandomAttestation()
                attestation.attesterId = attesterId
                tx = await unirepContract
                    .connect(attester['acct'])
                    .submitAttestation(
                        attestation,
                        epochKey,
                        proofIndex,
                        fromProofIndex,
                        { value: attestingFee }
                    )
                receipt = await tx.wait()
                expect(receipt.status).to.equal(1)
                attestations[userIdx].update(
                    attestation.posRep,
                    attestation.negRep,
                    attestation.graffiti,
                    attestation.signUp
                )
            }
            await storedUserState.waitForSync()
        })

        it('User state should store the attestations ', async () => {
            const epkNonce = 0
            const epoch = 2
            for (let i = 0; i < transitionedUsers.length; i++) {
                const epk = genEpochKey(
                    userIds[transitionedUsers[i]].identityNullifier,
                    epoch,
                    epkNonce,
                    storedUserState.settings.epochTreeDepth
                ).toString()
                const userState = await genUserState(
                    hardhatEthers.provider,
                    unirepContract.address,
                    userIds[transitionedUsers[i]]
                )
                expect((await userState.getAttestations(epk)).length).not.equal(
                    0
                )
                compareDB((userState as any)._db, (storedUserState as any)._db)
            }
        })
    })

    describe('Epoch transition event with attestations', async () => {
        it('epoch transition should succeed', async () => {
            // Record data before epoch transition so as to compare them with data after epoch transition
            let epoch = await unirepContract.currentEpoch()

            // Fast-forward epochLength of seconds
            await hardhatEthers.provider.send('evm_increaseTime', [
                EPOCH_LENGTH,
            ])
            // Begin epoch transition
            let tx = await unirepContract
                .connect(attester['acct'])
                .beginEpochTransition()
            let receipt = await tx.wait()
            expect(receipt.status).equal(1)
            console.log(
                'Gas cost of epoch transition:',
                receipt.gasUsed.toString()
            )

            // Complete epoch transition
            expect(await unirepContract.currentEpoch()).to.be.equal(
                epoch.add(1)
            )
            let epoch_ = await unirepContract.currentEpoch()
            expect(epoch_).equal(epoch.add(1))
        })
    })

    describe('User state transition events with attestations', async () => {
        it('Users should successfully perform user state transition', async () => {
            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            const epoch = 2
            const GSTRoot = (await unirepState.genGSTree(epoch)).root

            for (let i = 0; i < userIds.length; i++) {
                const randomUST = Math.round(Math.random())
                if (randomUST === 0) continue
                console.log('transition user', i)
                const userState = await genUserState(
                    hardhatEthers.provider,
                    unirepContract.address,
                    userIds[i]
                )

                expect((await userState.genGSTree(epoch)).root).equal(GSTRoot)

                const proofs = await userState.genUserStateTransitionProofs()
                await submitUSTProofs(unirepContract, proofs)
            }
        })

        it('Users state transition matches current Unirep state', async () => {
            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            const userState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[0]
            )
            expect(await userState.getUnirepStateCurrentEpoch()).equal(
                (await unirepState.loadCurrentEpoch()).number
            )
            for (
                let i = 1;
                i <= (await unirepState.loadCurrentEpoch()).number;
                i++
            ) {
                expect((await userState.genGSTree(i)).root).equal(
                    (await userState.genGSTree(i)).root
                )
            }
            expect((await userState.getUnirepStateEpochTree(2)).root).equal(
                (await unirepState.genEpochTree(2)).root
            )
        })
    })
})
