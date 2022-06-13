// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { BigNumber, BigNumberish, ethers } from 'ethers'
import { expect } from 'chai'
import { ZkIdentity, genRandomSalt } from '@unirep/crypto'
import {
    Attestation,
    deployUnirep,
    EpochKeyProof,
    computeStartTransitionProofHash,
    computeProcessAttestationsProofHash,
    Unirep,
} from '@unirep/contracts'
import { Circuit, genProofAndPublicSignals } from '@unirep/circuits'
import { EPOCH_LENGTH } from '@unirep/circuits/config'

import {
    computeInitUserStateRoot,
    genUnirepState,
    ISettings,
    Reputation,
    UnirepState,
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
    let unirepContractCalledByAttester: Unirep
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
    })

    describe('Attester sign up and set airdrop', async () => {
        it('attester sign up', async () => {
            attester['acct'] = accounts[2]
            attester['addr'] = await attester['acct'].getAddress()
            unirepContractCalledByAttester = unirepContract.connect(
                attester['acct']
            )
            let tx = await unirepContractCalledByAttester.attesterSignUp()
            let receipt = await tx.wait()
            expect(receipt.status, 'Attester signs up failed').to.equal(1)
            attesterId = (
                await unirepContract.attesters(attester['addr'])
            ).toBigInt()
        })

        it('attester set airdrop amount', async () => {
            const airdropPosRep = 10
            const tx = await unirepContractCalledByAttester.setAirdropAmount(
                airdropPosRep
            )
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

                const tx = await unirepContractCalledByAttester.userSignUp(
                    commitment
                )
                const receipt = await tx.wait()
                expect(receipt.status, 'User sign up failed').to.equal(1)

                await expect(
                    unirepContractCalledByAttester.userSignUp(commitment)
                ).to.be.revertedWith('Unirep: the user has already signed up')

                const unirepState = await genUnirepState(
                    hardhatEthers.provider,
                    unirepContract.address
                )

                const contractEpoch = await unirepContract.currentEpoch()
                const unirepEpoch = unirepState.currentEpoch
                expect(unirepEpoch).equal(Number(contractEpoch))

                const unirepGSTLeaves = unirepState.getNumGSTLeaves(unirepEpoch)
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
                const unirepEpoch = unirepState.currentEpoch
                expect(unirepEpoch).equal(Number(contractEpoch))

                const unirepGSTLeaves = unirepState.getNumGSTLeaves(unirepEpoch)
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
            let tx = await unirepContractCalledByAttester.beginEpochTransition()
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
            // add user state manually
            const UserSignedUpFilter = unirepContract.filters.UserSignedUp()
            const userSignedUpEvents = await unirepContract.queryFilter(
                UserSignedUpFilter
            )

            for (let i = 0; i < userIds.length; i++) {
                console.log(`process user: ${i + 1}`)
                const randomUST = Math.round(Math.random())
                if (randomUST === 0) {
                    notTransitionUsers.push(i)
                    continue
                }
                const unirepState = new UnirepState(setting)
                const userState = new UserState(unirepState, userIds[i])

                for (let signUpEvent of userSignedUpEvents) {
                    const args = signUpEvent?.args
                    const epoch = Number(args?.epoch)
                    const commitment = args?.identityCommitment.toBigInt()
                    const attesterId = Number(args?.attesterId)
                    const airdrop = Number(args?.airdropAmount)

                    await userState.signUp(
                        epoch,
                        commitment,
                        attesterId,
                        airdrop
                    )
                }

                await userState.epochTransition(1)

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
            storedUnirepState = unirepState.toJSON()
            const unirepObj = unirepState.toJSON()
            const currentEpoch = Number(await unirepContract.currentEpoch())
            expect(unirepObj.currentEpoch).equal(currentEpoch)
            expect(unirepObj.GSTLeaves[currentEpoch].length).equal(
                transitionedUsers.length
            )
            expect(unirepObj.epochTreeLeaves[currentEpoch - 1].length).equal(0)
            expect(unirepObj.nullifiers.length).equal(
                transitionedUsers.length * 3
            )
        })

        it('User generate two UST proofs should not affect Unirep state', async () => {
            // add user state manually
            const UserSignedUpFilter = unirepContract.filters.UserSignedUp()
            const userSignedUpEvents = await unirepContract.queryFilter(
                UserSignedUpFilter
            )

            if (transitionedUsers.length === 0) return
            const n = transitionedUsers[0]
            const unirepState = new UnirepState(setting)
            const userState = new UserState(unirepState, userIds[n])

            for (let signUpEvent of userSignedUpEvents) {
                const args = signUpEvent?.args
                const epoch = Number(args?.epoch)
                const commitment = args?.identityCommitment.toBigInt()
                const attesterId = Number(args?.attesterId)
                const airdrop = Number(args?.airdropAmount)

                await userState.signUp(epoch, commitment, attesterId, airdrop)
            }

            await userState.epochTransition(1)

            const proofs = await userState.genUserStateTransitionProofs()
            await submitUSTProofs(unirepContract, proofs)

            const unirepStateAfterUST = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            expect(unirepStateAfterUST.toJSON()).equal(storedUnirepState)
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
            expect(unirepState.toJSON()).equal(storedUnirepState)

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
            expect(unirepState.toJSON()).equal(storedUnirepState)

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
            expect(unirepState.toJSON()).equal(storedUnirepState)
        })

        it('submit valid proof with wrong GST will not affect Unirep state', async () => {
            const unirepState = new UnirepState(setting)
            const userState = new UserState(unirepState, userIds[0])

            const epoch = 1
            const commitment = userIds[0].genIdentityCommitment()
            const attesterId = 0
            const airdrop = 0
            await userState.signUp(epoch, commitment, attesterId, airdrop)
            await userState.epochTransition(1)

            const proofs = await userState.genUserStateTransitionProofs()
            await submitUSTProofs(unirepContract, proofs)

            const unirepStateAfterUST = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            expect(unirepStateAfterUST.toJSON()).equal(storedUnirepState)
        })

        it('mismatch proof indexes will not affect Unirep state', async () => {
            const UserSignedUpFilter = unirepContract.filters.UserSignedUp()
            const userSignedUpEvents = await unirepContract.queryFilter(
                UserSignedUpFilter
            )
            if (notTransitionUsers.length < 2) return

            const unirepState1 = new UnirepState(setting)
            const unirepState2 = new UnirepState(setting)
            const userState1 = new UserState(
                unirepState1,
                userIds[notTransitionUsers[0]]
            )
            const userState2 = new UserState(
                unirepState2,
                userIds[notTransitionUsers[1]]
            )

            for (let signUpEvent of userSignedUpEvents) {
                const args = signUpEvent?.args
                const epoch = Number(args?.epoch)
                const commitment = args?.identityCommitment.toBigInt()
                const attesterId = Number(args?.attesterId)
                const airdrop = Number(args?.airdropAmount)

                await userState1.signUp(epoch, commitment, attesterId, airdrop)
                await userState2.signUp(epoch, commitment, attesterId, airdrop)
            }

            await userState1.epochTransition(1)
            await userState2.epochTransition(1)

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
            expect(unirepStateAfterUST.toJSON()).equal(storedUnirepState)
        })

        it('Submit attestations to transitioned users', async () => {
            // generate user state manually
            const unirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )
            const currentEpoch = unirepState.currentEpoch
            const GST = unirepState.genGSTree(currentEpoch)
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

                const { proof, publicSignals } = await genProofAndPublicSignals(
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
                tx = await unirepContractCalledByAttester.submitAttestation(
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
            const unirepObj = unirepState.toJSON()
            expect(
                Object.keys(unirepObj.latestEpochKeyToAttestationsMap).length
            ).equal(transitionedUsers.length)
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
            let tx = await unirepContractCalledByAttester.beginEpochTransition()
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
            const GSTRoot = unirepStateBefore.genGSTree(epoch).root

            for (let i = 0; i < userIds.length; i++) {
                // console.log(`process user: ${i+1}`)
                const randomUST = Math.round(Math.random())
                if (randomUST === 0) continue
                console.log('transition user', i)
                const unirepState = new UnirepState(setting)
                const userState = new UserState(unirepState, userIds[i])

                for (let signUpEvent of userSignedUpEvents) {
                    const args = signUpEvent?.args
                    const epoch = Number(args?.epoch)
                    const commitment = args?.identityCommitment.toBigInt()
                    const attesterId = Number(args?.attesterId)
                    const airdrop = Number(args?.airdropAmount)

                    await userState.signUp(
                        epoch,
                        commitment,
                        attesterId,
                        airdrop
                    )
                }

                await userState.epochTransition(1)
                for (let USTEvent of USTProofEvents) {
                    const args = USTEvent?.args?.proof
                    const fromEpoch = Number(args?.transitionFromEpoch)
                    const newGSTLeaf = args?.newGlobalStateTreeLeaf.toBigInt()
                    const nullifiers = args?.epkNullifiers.map((n) =>
                        n.toBigInt()
                    )
                    if (
                        !userState.nullifierExist(nullifiers[0]) &&
                        unirepStateBefore.nullifierExist(nullifiers[0])
                    ) {
                        await userState.userStateTransition(
                            fromEpoch,
                            newGSTLeaf,
                            nullifiers
                        )
                    }
                }

                for (let attestaionEvent of attestationSubmittedEvents) {
                    const args = attestaionEvent?.args
                    const epochKey = (args?.epochKey).toString()
                    const attestation_ = args?.attestation
                    const attestation = new Attestation(
                        attestation_.attesterId,
                        attestation_.posRep,
                        attestation_.negRep,
                        attestation_.graffiti,
                        attestation_.signUp
                    )
                    userState.addAttestation(epochKey, attestation)
                }

                expect(userState.getUnirepStateGSTree(epoch).root).equal(
                    GSTRoot
                )

                await userState.epochTransition(2)

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
            const unirepObj = unirepState.toJSON()
            const currentEpoch = Number(await unirepContract.currentEpoch())
            expect(unirepObj.currentEpoch).equal(currentEpoch)
            expect(unirepObj.GSTLeaves[currentEpoch].length).equal(USTNum)
            // All transitioned users received attestaions
            expect(unirepObj.epochTreeLeaves[currentEpoch - 1].length).equal(
                transitionedUsers.length
            )
        })
    })
})
