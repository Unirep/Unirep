// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { BigNumber, BigNumberish, ethers } from 'ethers'
import { expect } from 'chai'
import { ZkIdentity, genRandomSalt, hashLeftRight } from '@unirep/crypto'
import { Unirep } from '@unirep/contracts'

import {
    genUnirepState,
    genUserState,
    Reputation,
    UnirepProtocol,
    UserState,
} from '../../src'
import {
    attesterSignUp,
    deploy,
    formatProofAndPublicSignals,
    genIdentity,
    genProof,
    genRandomAttestation,
    genRandomList,
    keccak256Hash,
    setAirdrop,
    submitUSTProofs,
    verifyProof,
} from '../utils'
import { config } from '../testConfig'
import { CircuitName } from '../../src/types'

describe('User state transition events in Unirep User State', async function () {
    this.timeout(0)

    // attesters
    let accounts: ethers.Signer[]
    let attester, attesterAddr
    let attesterId

    // users
    let userIds: ZkIdentity[] = []

    // unirep contract and protocol
    const protocol = new UnirepProtocol(config)
    let unirepContract: Unirep

    // test config
    const maxUsers = 10
    const userNum = Math.ceil(Math.random() * maxUsers)
    const attestingFee = ethers.utils.parseEther('0.1')
    const fromProofIndex = 0
    const EPOCH_LENGTH = 60

    // global variables
    const circuit = CircuitName.userStateTransition
    let GSTree = protocol.genNewGST()
    const rootHistories: BigInt[] = []
    let userStateTreeRoots: BigInt[] = []
    let signUpAirdrops: Reputation[] = []
    let attestations: Reputation[] = []
    const transitionedUsers: number[] = []

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deploy(accounts[0], {
            ...config,
            maxUsers,
        })
    })

    describe('Attester sign up and set airdrop', async () => {
        it('attester sign up', async () => {
            attester = accounts[2]
            const success = await attesterSignUp(unirepContract, attester)
            expect(success, 'Attester signs up failed').to.equal(1)
            attesterAddr = await attester.getAddress()
            attesterId = await unirepContract.attesters(attesterAddr)
        })

        it('attester set airdrop amount', async () => {
            const airdropPosRep = 10
            await setAirdrop(unirepContract, attester, airdropPosRep)
        })
    })

    describe('Init User State', async () => {
        it('check User state matches the contract', async () => {
            const id = new ZkIdentity()
            const initUnirepState = await genUserState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address,
                id
            )

            const contractEpoch = await unirepContract.currentEpoch()
            const unirepEpoch = initUnirepState.currentEpoch
            expect(unirepEpoch).equal(Number(contractEpoch))

            const unirepGSTree = initUnirepState.genGSTree(unirepEpoch)
            const defaultGSTree = protocol.genNewGST()
            expect(unirepGSTree.root).equal(defaultGSTree.root)
        })
    })

    describe('User Sign Up event', async () => {
        it('sign up users through attester who sets airdrop', async () => {
            for (let i = 0; i < userNum; i++) {
                const { id, commitment } = genIdentity()
                userIds.push(id)

                const tx = await unirepContract
                    .connect(attester)
                    .userSignUp(commitment)
                const receipt = await tx.wait()
                expect(receipt.status, 'User sign up failed').to.equal(1)

                await expect(
                    unirepContract.connect(attester).userSignUp(commitment)
                ).to.be.revertedWith('Unirep: the user has already signed up')

                const userState = await genUserState(
                    protocol,
                    hardhatEthers.provider,
                    unirepContract.address,
                    id
                )

                const contractEpoch = await unirepContract.currentEpoch()
                const unirepEpoch = userState.currentEpoch
                expect(unirepEpoch).equal(Number(contractEpoch))

                const attesterId = await unirepContract.attesters(attesterAddr)
                const airdroppedAmount = await unirepContract.airdropAmount(
                    attesterAddr
                )
                const newUSTRoot = await protocol.computeInitUserStateRoot(
                    Number(attesterId),
                    Number(airdroppedAmount)
                )
                const newGSTLeaf = hashLeftRight(commitment, newUSTRoot)
                userStateTreeRoots.push(newUSTRoot)
                signUpAirdrops.push(
                    new Reputation(
                        airdroppedAmount.toBigInt(),
                        BigInt(0),
                        BigInt(0),
                        BigInt(1)
                    )
                )
                attestations.push(Reputation.default())
                GSTree.insert(newGSTLeaf)
                rootHistories.push(GSTree.root)
            }
        })

        it('sign up users with no airdrop', async () => {
            for (let i = 0; i < maxUsers - userNum; i++) {
                const { id, commitment } = genIdentity()
                userIds.push(id)

                const tx = await unirepContract.userSignUp(commitment)
                const receipt = await tx.wait()
                expect(receipt.status, 'User sign up failed').to.equal(1)

                const userState = await genUserState(
                    protocol,
                    hardhatEthers.provider,
                    unirepContract.address,
                    id
                )

                const contractEpoch = await unirepContract.currentEpoch()
                const unirepEpoch = userState.currentEpoch
                expect(unirepEpoch).equal(Number(contractEpoch))

                const newUSTRoot = await protocol.computeInitUserStateRoot()
                const newGSTLeaf = hashLeftRight(commitment, newUSTRoot)
                userStateTreeRoots.push(newUSTRoot)
                signUpAirdrops.push(Reputation.default())
                attestations.push(Reputation.default())
                GSTree.insert(newGSTLeaf)
                rootHistories.push(GSTree.root)
            }
        })
    })

    describe('Epoch transition event with no attestation', async () => {
        it('premature epoch transition should fail', async () => {
            await expect(
                unirepContract.beginEpochTransition()
            ).to.be.revertedWith('Unirep: epoch not yet ended')
        })

        it('epoch transition should succeed', async () => {
            // Record data before epoch transition so as to compare them with data after epoch transition
            let epoch = await unirepContract.currentEpoch()

            // Fast-forward epochLength of seconds
            await hardhatEthers.provider.send('evm_increaseTime', [
                EPOCH_LENGTH,
            ])

            // Begin epoch transition
            let tx = await unirepContract
                .connect(attester)
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

            // Verify latestEpochTransitionTime and currentEpoch
            let latestEpochTransitionTime =
                await unirepContract.latestEpochTransitionTime()
            expect(latestEpochTransitionTime).equal(
                (await hardhatEthers.provider.getBlock(receipt.blockNumber))
                    .timestamp
            )

            let epoch_ = await unirepContract.currentEpoch()
            expect(epoch_).equal(epoch.add(1))
        })
    })

    describe('User state transition events with no attestation', async () => {
        let storedUserState
        const storedUserIdx = 0
        let invalidProofIndexes: number[] = []
        const notTransitionUsers: number[] = []
        it('Users should successfully perform user state transition', async () => {
            for (let i = 0; i < userIds.length; i++) {
                const userState = await genUserState(
                    protocol,
                    hardhatEthers.provider,
                    unirepContract.address,
                    userIds[i]
                )

                const circuitInputs = await userState.genCircuitInputs(
                    circuit,
                    {}
                )
                await submitUSTProofs(unirepContract, circuitInputs)
                transitionedUsers.push(i)
            }
        })

        it('Users state transition matches current Unirep state', async () => {
            for (let i = 0; i < transitionedUsers.length; i++) {
                const userState = await genUserState(
                    protocol,
                    hardhatEthers.provider,
                    unirepContract.address,
                    userIds[i]
                )
                expect(userState.currentEpoch).equal(
                    userState.latestTransitionedEpoch
                )
            }
            const userState = await genUserState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address,
                userIds[storedUserIdx]
            )
            const unirepState = await genUnirepState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address
            )
            expect(userState.currentEpoch).equal(unirepState.currentEpoch)
            for (let i = 1; i <= unirepState.currentEpoch; i++) {
                expect(userState.genGSTree(i).root).equal(
                    unirepState.genGSTree(i).root
                )
            }
            expect((await userState.genEpochTree(1)).root).equal(
                (await unirepState.genEpochTree(1)).root
            )

            storedUserState = userState.toJSON()
        })

        it('User generate two UST proofs should not affect Unirep state', async () => {
            // add user state manually
            const UserSignedUpFilter = unirepContract.filters.UserSignedUp()
            const userSignedUpEvents = await unirepContract.queryFilter(
                UserSignedUpFilter
            )

            if (transitionedUsers.length === 0) return
            const n = transitionedUsers[0]
            const userState = new UserState(config, userIds[n])

            for (let signUpEvent of userSignedUpEvents) {
                const args = signUpEvent?.args
                const epoch = Number(args?.epoch)
                const commitment = args?.identityCommitment.toBigInt()
                const attesterId = Number(args?.attesterId)
                const airdrop = Number(args?.airdropAmount)

                await userState.signUp(epoch, commitment, attesterId, airdrop)
            }

            await userState.epochTransition(1)

            const circuitInputs = await userState.genCircuitInputs(circuit, {})
            await submitUSTProofs(unirepContract, circuitInputs)

            const userStateAfterUST = await genUserState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address,
                userIds[storedUserIdx]
            )
            expect(userStateAfterUST.toJSON()).deep.equal(storedUserState)
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
                protocol,
                hardhatEthers.provider,
                unirepContract.address,
                userIds[storedUserIdx]
            )
            expect(userState.toJSON()).deep.equal(storedUserState)

            let hashedProof = keccak256Hash(CircuitName.startTransition, {
                blindedHashChain: randomBlindedHashChain,
                blindedUserState: randomBlindedUserState,
                globalStateTree: randomGSTRoot,
                proof: randomProof,
            })
            const proofIdx = Number(
                await unirepContract.getProofIndex(hashedProof)
            )
            expect(proofIdx).gt(0)
            invalidProofIndexes.push(proofIdx)
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
                protocol,
                hardhatEthers.provider,
                unirepContract.address,
                userIds[storedUserIdx]
            )
            expect(userState.toJSON()).deep.equal(storedUserState)

            let hashedProof = keccak256Hash(CircuitName.processAttestations, {
                outputBlindedUserState: randomOutputBlindedUserState,
                outputBlindedHashChain: randomOutputBlindedHashChain,
                inputBlindedUserState: randomInputBlindedUserState,
                proof: randomProof,
            })
            const proofIdx = Number(
                await unirepContract.getProofIndex(hashedProof)
            )
            expect(proofIdx).gt(0)
            invalidProofIndexes.push(proofIdx)
        })

        it('Submit invalid user state transition proof should not affect Unirep State', async () => {
            const randomProof: BigNumberish[] = genRandomList(8)
            const randomNullifiers: BigNumberish[] = genRandomList(
                protocol.config.numEpochKeyNoncePerEpoch
            )
            const randomBlindedStates: BigNumberish[] = genRandomList(2)
            const randomBlindedChains: BigNumberish[] = genRandomList(
                protocol.config.numEpochKeyNoncePerEpoch
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
                protocol,
                hardhatEthers.provider,
                unirepContract.address,
                userIds[storedUserIdx]
            )
            expect(userState.toJSON()).deep.equal(storedUserState)
        })

        it('submit valid proof with wrong GST will not affect Unirep state', async () => {
            const userState = new UserState(config, userIds[0])

            const epoch = 1
            const commitment = userIds[0].genIdentityCommitment()
            const attesterId = 0
            const airdrop = 0
            await userState.signUp(epoch, commitment, attesterId, airdrop)
            await userState.epochTransition(1)

            const circuitInputs = await userState.genCircuitInputs(circuit, {})
            await submitUSTProofs(unirepContract, circuitInputs)
            const userStateAfterUST = await genUserState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address,
                userIds[storedUserIdx]
            )
            expect(userStateAfterUST.toJSON()).deep.equal(storedUserState)
        })

        it('mismatch proof indexes will not affect Unirep state', async () => {
            if (notTransitionUsers.length < 2) return
            const userState1 = await genUserState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address,
                userIds[notTransitionUsers[0]]
            )
            const userState2 = await genUserState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address,
                userIds[notTransitionUsers[1]]
            )

            const { startTransition, processAttestation } =
                await userState1.genCircuitInputs(circuit, {})
            const { finalTransition } = await userState2.genCircuitInputs(
                circuit,
                {}
            )
            await submitUSTProofs(unirepContract, {
                startTransition,
                processAttestation,
                finalTransition,
            })

            const userState = await genUserState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address,
                userIds[storedUserIdx]
            )
            expect(userState.toJSON()).equal(storedUserState)
        })

        it('Submit attestations to transitioned users', async () => {
            const epochKeyNonce = 0
            const epkCircuit = CircuitName.verifyEpochKey
            for (let i = 0; i < transitionedUsers.length; i++) {
                const userIdx = transitionedUsers[i]
                const userState = await genUserState(
                    protocol,
                    hardhatEthers.provider,
                    unirepContract.address,
                    userIds[userIdx]
                )

                const circuitInputs = await userState.genCircuitInputs(
                    epkCircuit,
                    {
                        epochKeyNonce,
                    }
                )
                const { proof, publicSignals } = await genProof(
                    epkCircuit,
                    circuitInputs
                )
                const input = formatProofAndPublicSignals(
                    epkCircuit,
                    proof,
                    publicSignals
                )
                const isValid = await verifyProof(
                    epkCircuit,
                    publicSignals,
                    proof
                )
                expect(isValid).to.be.true

                let tx = await unirepContract.submitEpochKeyProof(input)
                let receipt = await tx.wait()
                expect(receipt.status).to.equal(1)

                const epochKey = input.epochKey
                const hashedProof = await unirepContract.hashEpochKeyProof(
                    input
                )
                const proofIndex = Number(
                    await unirepContract.getProofIndex(hashedProof)
                )

                const attestation = genRandomAttestation()
                attestation.attesterId = attesterId
                tx = await unirepContract
                    .connect(attester)
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

        it('User state should store the attestations ', async () => {
            const userState = await genUserState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address,
                userIds[storedUserIdx]
            )
            const unirepObj = userState.toJSON()
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
            let tx = await unirepContract
                .connect(attester)
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

            // Verify latestEpochTransitionTime and currentEpoch
            let latestEpochTransitionTime =
                await unirepContract.latestEpochTransitionTime()
            expect(latestEpochTransitionTime).equal(
                (await hardhatEthers.provider.getBlock(receipt.blockNumber))
                    .timestamp
            )

            let epoch_ = await unirepContract.currentEpoch()
            expect(epoch_).equal(epoch.add(1))
        })
    })

    describe('User state transition events with attestations', async () => {
        it('Users should successfully perform user state transition', async () => {
            const unirepStateBefore = await genUnirepState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address
            )
            const epoch = 2
            const GSTRoot = unirepStateBefore.genGSTree(epoch).root

            for (let i = 0; i < userIds.length; i++) {
                const randomUST = Math.round(Math.random())
                if (randomUST === 0) continue
                console.log('transition user', i)
                const userState = await genUserState(
                    protocol,
                    hardhatEthers.provider,
                    unirepContract.address,
                    userIds[i]
                )

                expect(userState.genGSTree(epoch).root).equal(GSTRoot)

                const circuitInputs = await userState.genCircuitInputs(
                    circuit,
                    {}
                )
                await submitUSTProofs(unirepContract, circuitInputs)
            }
        })

        it('Users state transition matches current Unirep state', async () => {
            const unirepState = await genUnirepState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address
            )
            const userState = await genUserState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address,
                userIds[0]
            )
            expect(userState.currentEpoch).equal(unirepState.currentEpoch)
            for (let i = 1; i <= unirepState.currentEpoch; i++) {
                expect(userState.genGSTree(i).root).equal(
                    unirepState.genGSTree(i).root
                )
            }
            expect((await userState.genEpochTree(2)).root).equal(
                (await unirepState.genEpochTree(2)).root
            )
        })
    })
})
