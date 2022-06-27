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
import { Circuit, defaultProver, EPOCH_LENGTH } from '@unirep/circuits'
import { SQLiteConnector } from 'anondb/node'
import { schema } from '../../src/schema'
import { DB } from 'anondb'

import {
    computeInitUserStateRoot,
    genUnirepState,
    ISettings,
    Reputation,
    UserState,
} from '../../src'
import {
    genEpochKeyCircuitInput,
    genRandomAttestation,
    genRandomList,
    submitUSTProofs,
} from '../utils'

describe('User state transition events in Unirep State', async function () {
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
    const maxUsers = 10
    const userNum = Math.ceil(Math.random() * maxUsers)
    const attestingFee = ethers.utils.parseEther('0.1')
    const transitionedUsers: number[] = []
    const fromProofIndex = 0

    let db: DB
    const mockProver = {
        verifyProof: () => Promise.resolve(true),
    }

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

                const unirepState = await genUnirepState(
                    hardhatEthers.provider,
                    unirepContract.address
                )

                const contractEpoch = await unirepContract.currentEpoch()
                const unirepEpoch = (await unirepState.loadCurrentEpoch())
                    .number
                expect(unirepEpoch).equal(Number(contractEpoch))

                const unirepGSTLeaves = await unirepState.getNumGSTLeaves(
                    unirepEpoch
                )
                expect(unirepGSTLeaves).equal(i + 1)

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

                const unirepState = await genUnirepState(
                    hardhatEthers.provider,
                    unirepContract.address
                )

                const contractEpoch = await unirepContract.currentEpoch()
                const unirepEpoch = (await unirepState.loadCurrentEpoch())
                    .number
                expect(unirepEpoch).equal(Number(contractEpoch))

                const unirepGSTLeaves = await unirepState.getNumGSTLeaves(
                    unirepEpoch
                )
                expect(unirepGSTLeaves).equal(userNum + i + 1)

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
        let storedUnirepState
        let invalidProofIndexes: number[] = []
        const notTransitionUsers: number[] = []
        const setting: ISettings = {
            globalStateTreeDepth: treeDepths.globalStateTreeDepth,
            userStateTreeDepth: treeDepths.userStateTreeDepth,
            epochTreeDepth: treeDepths.epochTreeDepth,
            attestingFee: attestingFee,
            epochLength: EPOCH_LENGTH,
            numEpochKeyNoncePerEpoch,
            maxReputationBudget,
        }
        it('Users should successfully perform user state transition', async () => {
            for (let i = 0; i < userIds.length; i++) {
                console.log(`process user: ${i + 1}`)
                const randomUST = Math.round(Math.random())
                if (randomUST === 0) {
                    notTransitionUsers.push(i)
                    continue
                }
                const userState = new UserState(
                    db,
                    defaultProver,
                    unirepContract,
                    userIds[i]
                )
                await userState.setup()
                await userState.waitForSync()

                const proofs = await userState.genUserStateTransitionProofs()
                await submitUSTProofs(unirepContract, proofs)

                transitionedUsers.push(i)
            }
        })

        it('Users state transition matches current Unirep state', async () => {
            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            // storedUnirepState = unirepState.toJSON()
            // const unirepObj = unirepState.toJSON()
            const currentEpoch = Number(await unirepContract.currentEpoch())
            // expect(unirepObj.currentEpoch).equal(currentEpoch)
            // expect(unirepObj.GSTLeaves[currentEpoch].length).equal(
            //     transitionedUsers.length
            // )
            // expect(unirepObj.epochTreeLeaves[currentEpoch - 1].length).equal(0)
            // expect(unirepObj.nullifiers.length).equal(
            //     transitionedUsers.length * 3
            // )
        })

        it('User generate two UST proofs should not affect Unirep state', async () => {
            // add user state manually
            const UserSignedUpFilter = unirepContract.filters.UserSignedUp()
            const userSignedUpEvents = await unirepContract.queryFilter(
                UserSignedUpFilter
            )

            if (transitionedUsers.length === 0) return
            const n = transitionedUsers[0]
            const userState = new UserState(
                db,
                defaultProver,
                unirepContract,
                userIds[n]
            )
            await userState.setup()
            await userState.waitForSync()

            const proofs = await userState.genUserStateTransitionProofs()
            await submitUSTProofs(unirepContract, proofs)

            const unirepStateAfterUST = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            // expect(unirepStateAfterUST.toJSON()).equal(storedUnirepState)
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

            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            // expect(unirepState.toJSON()).equal(storedUnirepState)

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

            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            // expect(unirepState.toJSON()).equal(storedUnirepState)

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

            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            // expect(unirepState.toJSON()).equal(storedUnirepState)
        })

        it('submit valid proof with wrong GST will not affect Unirep state', async () => {
            const userState = new UserState(
                db,
                defaultProver,
                unirepContract,
                userIds[0]
            )

            await userState.start()
            await userState.waitForSync()

            const proofs = await userState.genUserStateTransitionProofs()
            await submitUSTProofs(unirepContract, proofs)

            const unirepStateAfterUST = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            // expect(unirepStateAfterUST.toJSON()).equal(storedUnirepState)
        })

        it('mismatch proof indexes will not affect Unirep state', async () => {
            if (notTransitionUsers.length < 2) return

            const userState1 = new UserState(
                db,
                defaultProver,
                unirepContract,
                userIds[notTransitionUsers[0]]
            )
            await userState1.start()
            const userState2 = new UserState(
                db,
                defaultProver,
                unirepContract,
                userIds[notTransitionUsers[1]]
            )
            await userState2.start()
            await userState1.waitForSync()
            await userState2.waitForSync()

            const { startTransitionProof, processAttestationProofs } =
                await userState1.genUserStateTransitionProofs()
            const { finalTransitionProof } =
                await userState2.genUserStateTransitionProofs()
            await submitUSTProofs(unirepContract, {
                startTransitionProof,
                processAttestationProofs,
                finalTransitionProof,
            })
            const unirepStateAfterUST = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            // expect(unirepStateAfterUST.toJSON()).equal(storedUnirepState)
        })

        it('Submit attestations to transitioned users', async () => {
            // generate user state manually
            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            const currentEpoch = (await unirepState.loadCurrentEpoch()).number
            const GST = await unirepState.genGSTree(currentEpoch)
            const epkNonce = 0

            for (let i = 0; i < transitionedUsers.length; i++) {
                const userIdx = transitionedUsers[i]
                const UST = await computeInitUserStateRoot(
                    unirepState.settings.userStateTreeDepth,
                    Number(attesterId),
                    Number(signUpAirdrops[userIdx].posRep)
                )

                const circuitInputs = genEpochKeyCircuitInput(
                    userIds[userIdx],
                    GST,
                    i,
                    UST,
                    currentEpoch,
                    epkNonce
                )

                const { proof, publicSignals } =
                    await defaultProver.genProofAndPublicSignals(
                        Circuit.verifyEpochKey,
                        circuitInputs
                    )
                const epkProofInput = new EpochKeyProof(publicSignals, proof)
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
        })

        it('Unirep state should store the attestations ', async () => {
            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            // const unirepObj = unirepState.toJSON()
            // expect(
            //     Object.keys(unirepObj.latestEpochKeyToAttestationsMap).length
            // ).equal(transitionedUsers.length)
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
        let USTNum = 0
        const setting: ISettings = {
            globalStateTreeDepth: treeDepths.globalStateTreeDepth,
            userStateTreeDepth: treeDepths.userStateTreeDepth,
            epochTreeDepth: treeDepths.epochTreeDepth,
            attestingFee: attestingFee,
            epochLength: EPOCH_LENGTH,
            numEpochKeyNoncePerEpoch,
            maxReputationBudget,
        }
        it('Users should successfully perform user state transition', async () => {
            // add user state manually
            const UserSignedUpFilter = unirepContract.filters.UserSignedUp()
            const userSignedUpEvents = await unirepContract.queryFilter(
                UserSignedUpFilter
            )

            const USTProofFilter =
                unirepContract.filters.IndexedUserStateTransitionProof()
            const USTProofEvents = await unirepContract.queryFilter(
                USTProofFilter
            )

            const attestationSubmittedFilter =
                unirepContract.filters.AttestationSubmitted()
            const attestationSubmittedEvents = await unirepContract.queryFilter(
                attestationSubmittedFilter
            )

            const unirepStateBefore = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            const epoch = 2
            const GSTRoot = (await unirepStateBefore.genGSTree(epoch)).root

            for (let i = 0; i < userIds.length; i++) {
                // console.log(`process user: ${i+1}`)
                const randomUST = Math.round(Math.random())
                if (randomUST === 0) continue
                console.log('transition user', i)
                const userState = new UserState(
                    db,
                    defaultProver,
                    unirepContract,
                    userIds[i]
                )
                await userState.start()
                await userState.waitForSync()

                expect((await userState.genGSTree(epoch)).root).equal(GSTRoot)
                const proofs = await userState.genUserStateTransitionProofs()
                await submitUSTProofs(unirepContract, proofs)

                USTNum++
            }
        })

        it('Users state transition matches current Unirep state', async () => {
            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            // const unirepObj = unirepState.toJSON()
            const currentEpoch = Number(await unirepContract.currentEpoch())
            // expect(unirepObj.currentEpoch).equal(currentEpoch)
            // expect(unirepObj.GSTLeaves[currentEpoch].length).equal(USTNum)
            // // All transitioned users received attestaions
            // expect(unirepObj.epochTreeLeaves[currentEpoch - 1].length).equal(
            //     transitionedUsers.length
            // )
        })
    })
})
