// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { BigNumber, BigNumberish, ethers } from 'ethers'
import { expect } from 'chai'
import { ZkIdentity, genRandomSalt, hashLeftRight } from '@unirep/crypto'
import contract, {
    Attestation,
    EpochKeyProof,
    UserTransitionProof,
    Unirep,
    computeStartTransitionProofHash,
    computeProcessAttestationsProofHash,
} from '@unirep/contracts'
import circuit, { CircuitName } from '@unirep/circuits'

import {
    genUnirepState,
    Reputation,
    UnirepProtocol,
    UserState,
} from '../../src'
import {
    genEpochKeyCircuitInput,
    genRandomAttestation,
    genRandomList,
} from '../utils'
import { artifactsPath, config, zkFilesPath } from '../testConfig'

describe('User state transition events in Unirep State', async function () {
    this.timeout(0)

    // attesters
    let accounts: ethers.Signer[]
    let attester = new Object()
    let attesterId

    // users
    let userIds: ZkIdentity[] = []

    // unirep contract and protocol
    const protocol = new UnirepProtocol(zkFilesPath)
    let unirepContract: Unirep
    let unirepContractCalledByAttester: Unirep

    // test config
    const maxUsers = 10
    const userNum = Math.ceil(Math.random() * maxUsers)
    const attestingFee = ethers.utils.parseEther('0.1')
    const fromProofIndex = 0
    const EPOCH_LENGTH = 60

    // global variables
    let userStateTreeRoots: BigInt[] = []
    let signUpAirdrops: Reputation[] = []
    let attestations: Reputation[] = []
    const transitionedUsers: number[] = []

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await contract.deploy(artifactsPath, accounts[0], {
            ...config,
            maxUsers,
        })
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

    describe('Init Unirep State', async () => {
        it('check Unirep state matches the contract', async () => {
            const initUnirepState = await genUnirepState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address
            )

            const contractEpoch = await unirepContract.currentEpoch()
            const unirepEpoch = initUnirepState.currentEpoch
            expect(unirepEpoch).equal(Number(contractEpoch))

            const unirepGSTLeaves = initUnirepState.getNumGSTLeaves(unirepEpoch)
            expect(unirepGSTLeaves).equal(0)

            const unirepGSTree = initUnirepState.genGSTree(unirepEpoch)
            const defaultGSTree = protocol.genNewGST()
            expect(unirepGSTree.root).equal(defaultGSTree.root)
        })
    })

    describe('User Sign Up event', async () => {
        const GSTree = protocol.genNewGST()
        const rootHistories: BigInt[] = []

        it('sign up users through attester who sets airdrop', async () => {
            for (let i = 0; i < userNum; i++) {
                const id = new ZkIdentity()
                const commitment = id.genIdentityCommitment()
                userIds.push(id)

                const tx = await unirepContractCalledByAttester.userSignUp(
                    commitment
                )
                const receipt = await tx.wait()
                expect(receipt.status, 'User sign up failed').to.equal(1)

                await expect(
                    unirepContractCalledByAttester.userSignUp(commitment)
                ).to.be.revertedWith('Unirep: the user has already signed up')

                const unirepState = await genUnirepState(
                    protocol,
                    hardhatEthers.provider,
                    unirepContract.address
                )

                const contractEpoch = await unirepContract.currentEpoch()
                const unirepEpoch = unirepState.currentEpoch
                expect(unirepEpoch).equal(Number(contractEpoch))

                const unirepGSTLeaves = unirepState.getNumGSTLeaves(unirepEpoch)
                expect(unirepGSTLeaves).equal(i + 1)

                const attesterId = await unirepContract.attesters(
                    attester['addr']
                )
                const airdroppedAmount = await unirepContract.airdropAmount(
                    attester['addr']
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
                const id = new ZkIdentity()
                const commitment = id.genIdentityCommitment()
                userIds.push(id)

                const tx = await unirepContract.userSignUp(commitment)
                const receipt = await tx.wait()
                expect(receipt.status, 'User sign up failed').to.equal(1)

                const unirepState = await genUnirepState(
                    protocol,
                    hardhatEthers.provider,
                    unirepContract.address
                )

                const contractEpoch = await unirepContract.currentEpoch()
                const unirepEpoch = unirepState.currentEpoch
                expect(unirepEpoch).equal(Number(contractEpoch))

                const unirepGSTLeaves = unirepState.getNumGSTLeaves(unirepEpoch)
                expect(unirepGSTLeaves).equal(userNum + i + 1)

                const newUSTRoot = await protocol.computeInitUserStateRoot()
                const newGSTLeaf = hashLeftRight(commitment, newUSTRoot)
                userStateTreeRoots.push(newUSTRoot)
                signUpAirdrops.push(Reputation.default())
                attestations.push(Reputation.default())
                GSTree.insert(newGSTLeaf)
                rootHistories.push(GSTree.root)
            }
        })

        it('Sign up users more than contract capacity will not affect Unirep state', async () => {
            const unirepStateBefore = await genUnirepState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address
            )
            const unirepEpoch = unirepStateBefore.currentEpoch
            const unirepGSTLeavesBefore =
                unirepStateBefore.getNumGSTLeaves(unirepEpoch)

            const id = new ZkIdentity()
            const commitment = id.genIdentityCommitment()
            await expect(
                unirepContract.userSignUp(commitment)
            ).to.be.revertedWith(
                'Unirep: maximum number of user signups reached'
            )

            const unirepState = await genUnirepState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address
            )
            const unirepGSTLeaves = unirepState.getNumGSTLeaves(unirepEpoch)
            expect(unirepGSTLeaves).equal(unirepGSTLeavesBefore)
        })

        it('Check GST roots match Unirep state', async () => {
            const unirepState = await genUnirepState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address
            )
            for (let root of rootHistories) {
                const exist = unirepState.GSTRootExists(
                    root,
                    unirepState.currentEpoch
                )
                expect(exist).to.be.true
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
            // Assert no epoch transition compensation is dispensed to volunteer
            expect(
                await unirepContract.epochTransitionCompensation(
                    attester['addr']
                )
            ).to.be.equal(0)
            // Begin epoch transition
            let tx = await unirepContractCalledByAttester.beginEpochTransition()
            let receipt = await tx.wait()
            expect(receipt.status).equal(1)
            console.log(
                'Gas cost of epoch transition:',
                receipt.gasUsed.toString()
            )
            // Verify compensation to the volunteer increased
            expect(
                await unirepContract.epochTransitionCompensation(
                    attester['addr']
                )
            ).to.gt(0)

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
        let storedUnirepState
        let invalidProofIndexes: number[] = []
        const notTransitionUsers: number[] = []
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
                const userState = new UserState(
                    protocol.config.exportBuildPath,
                    userIds[i]
                )

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

                const {
                    startTransitionProof,
                    processAttestationProofs,
                    finalTransitionProof,
                } = await userState.genUserStateTransitionProofs()
                const proofIndexes: number[] = []

                let isValid = await circuit.verifyProof(
                    protocol.config.exportBuildPath,
                    CircuitName.startTransition,
                    startTransitionProof.proof,
                    startTransitionProof.publicSignals
                )
                expect(isValid).to.be.true

                // submit proofs
                let tx = await unirepContract.startUserStateTransition(
                    startTransitionProof.blindedUserState,
                    startTransitionProof.blindedHashChain,
                    startTransitionProof.globalStateTreeRoot,
                    circuit.formatProofForVerifierContract(
                        startTransitionProof.proof
                    )
                )
                let receipt = await tx.wait()
                expect(receipt.status).to.equal(1)

                // submit twice should fail
                await expect(
                    unirepContract.startUserStateTransition(
                        startTransitionProof.blindedUserState,
                        startTransitionProof.blindedHashChain,
                        startTransitionProof.globalStateTreeRoot,
                        circuit.formatProofForVerifierContract(
                            startTransitionProof.proof
                        )
                    )
                ).to.be.revertedWith(
                    'Unirep: the proof has been submitted before'
                )

                let hashedProof = computeStartTransitionProofHash(
                    startTransitionProof.blindedUserState,
                    startTransitionProof.blindedHashChain,
                    startTransitionProof.globalStateTreeRoot,
                    circuit
                        .formatProofForVerifierContract(
                            startTransitionProof.proof
                        )
                        .map((n) => BigNumber.from(n))
                )
                proofIndexes.push(
                    Number(await unirepContract.getProofIndex(hashedProof))
                )

                for (let i = 0; i < processAttestationProofs.length; i++) {
                    isValid = await circuit.verifyProof(
                        protocol.config.exportBuildPath,
                        CircuitName.processAttestations,
                        processAttestationProofs[i].proof,
                        processAttestationProofs[i].publicSignals
                    )
                    expect(isValid).to.be.true

                    tx = await unirepContract.processAttestations(
                        processAttestationProofs[i].outputBlindedUserState,
                        processAttestationProofs[i].outputBlindedHashChain,
                        processAttestationProofs[i].inputBlindedUserState,
                        circuit.formatProofForVerifierContract(
                            processAttestationProofs[i].proof
                        )
                    )
                    receipt = await tx.wait()
                    expect(receipt.status).to.equal(1)

                    // submit twice should fail
                    await expect(
                        unirepContract.processAttestations(
                            processAttestationProofs[i].outputBlindedUserState,
                            processAttestationProofs[i].outputBlindedHashChain,
                            processAttestationProofs[i].inputBlindedUserState,
                            circuit.formatProofForVerifierContract(
                                processAttestationProofs[i].proof
                            )
                        )
                    ).to.be.revertedWith(
                        'Unirep: the proof has been submitted before'
                    )

                    let hashedProof = computeProcessAttestationsProofHash(
                        processAttestationProofs[i].outputBlindedUserState,
                        processAttestationProofs[i].outputBlindedHashChain,
                        processAttestationProofs[i].inputBlindedUserState,
                        circuit
                            .formatProofForVerifierContract(
                                processAttestationProofs[i].proof
                            )
                            .map((n) => BigNumber.from(n))
                    )
                    proofIndexes.push(
                        Number(await unirepContract.getProofIndex(hashedProof))
                    )
                }
                const USTInput = new UserTransitionProof(
                    finalTransitionProof.publicSignals,
                    finalTransitionProof.proof,
                    protocol.config.exportBuildPath
                )
                isValid = await USTInput.verify()
                expect(isValid).to.be.true
                tx = await unirepContract.updateUserStateRoot(
                    USTInput,
                    proofIndexes
                )
                receipt = await tx.wait()
                expect(receipt.status).to.equal(1)

                // submit twice should fail
                await expect(
                    unirepContract.updateUserStateRoot(USTInput, proofIndexes)
                ).to.be.revertedWith(
                    'Unirep: the proof has been submitted before'
                )
                transitionedUsers.push(i)
            }
        })

        it('Users state transition matches current Unirep state', async () => {
            const unirepState = await genUnirepState(
                protocol,
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
            const userState = new UserState(
                protocol.config.exportBuildPath,
                userIds[n]
            )

            for (let signUpEvent of userSignedUpEvents) {
                const args = signUpEvent?.args
                const epoch = Number(args?.epoch)
                const commitment = args?.identityCommitment.toBigInt()
                const attesterId = Number(args?.attesterId)
                const airdrop = Number(args?.airdropAmount)

                await userState.signUp(epoch, commitment, attesterId, airdrop)
            }

            await userState.epochTransition(1)

            const {
                startTransitionProof,
                processAttestationProofs,
                finalTransitionProof,
            } = await userState.genUserStateTransitionProofs()
            const proofIndexes: number[] = []

            let isValid = await circuit.verifyProof(
                protocol.config.exportBuildPath,
                CircuitName.startTransition,
                startTransitionProof.proof,
                startTransitionProof.publicSignals
            )
            expect(isValid).to.be.true

            // submit proofs
            let tx = await unirepContract.startUserStateTransition(
                startTransitionProof.blindedUserState,
                startTransitionProof.blindedHashChain,
                startTransitionProof.globalStateTreeRoot,
                circuit.formatProofForVerifierContract(
                    startTransitionProof.proof
                )
            )
            let receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            let hashedProof = computeStartTransitionProofHash(
                startTransitionProof.blindedUserState,
                startTransitionProof.blindedHashChain,
                startTransitionProof.globalStateTreeRoot,
                circuit
                    .formatProofForVerifierContract(startTransitionProof.proof)
                    .map((n) => BigNumber.from(n))
            )
            proofIndexes.push(
                Number(await unirepContract.getProofIndex(hashedProof))
            )

            for (let i = 0; i < processAttestationProofs.length; i++) {
                isValid = await circuit.verifyProof(
                    protocol.config.exportBuildPath,
                    CircuitName.processAttestations,
                    processAttestationProofs[i].proof,
                    processAttestationProofs[i].publicSignals
                )
                expect(isValid).to.be.true

                tx = await unirepContract.processAttestations(
                    processAttestationProofs[i].outputBlindedUserState,
                    processAttestationProofs[i].outputBlindedHashChain,
                    processAttestationProofs[i].inputBlindedUserState,
                    circuit.formatProofForVerifierContract(
                        processAttestationProofs[i].proof
                    )
                )
                receipt = await tx.wait()
                expect(receipt.status).to.equal(1)

                let hashedProof = computeProcessAttestationsProofHash(
                    processAttestationProofs[i].outputBlindedUserState,
                    processAttestationProofs[i].outputBlindedHashChain,
                    processAttestationProofs[i].inputBlindedUserState,
                    circuit
                        .formatProofForVerifierContract(
                            processAttestationProofs[i].proof
                        )
                        .map((n) => BigNumber.from(n))
                )
                proofIndexes.push(
                    Number(await unirepContract.getProofIndex(hashedProof))
                )
            }
            const USTInput = new UserTransitionProof(
                finalTransitionProof.publicSignals,
                finalTransitionProof.proof,
                protocol.config.exportBuildPath
            )
            isValid = await USTInput.verify()
            expect(isValid).to.be.true
            tx = await unirepContract.updateUserStateRoot(
                USTInput,
                proofIndexes
            )
            receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            const unirepStateAfterUST = await genUnirepState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address
            )
            expect(unirepStateAfterUST.toJSON()).deep.equal(storedUnirepState)
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
                protocol,
                hardhatEthers.provider,
                unirepContract.address
            )
            expect(unirepState.toJSON()).deep.equal(storedUnirepState)

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
                protocol,
                hardhatEthers.provider,
                unirepContract.address
            )
            expect(unirepState.toJSON()).deep.equal(storedUnirepState)

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

            const unirepState = await genUnirepState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address
            )
            expect(unirepState.toJSON()).deep.equal(storedUnirepState)
        })

        it('submit valid proof with wrong GST will not affect Unirep state', async () => {
            const userState = new UserState(
                protocol.config.exportBuildPath,
                userIds[0]
            )

            const epoch = 1
            const commitment = userIds[0].genIdentityCommitment()
            const attesterId = 0
            const airdrop = 0
            await userState.signUp(epoch, commitment, attesterId, airdrop)
            await userState.epochTransition(1)

            const {
                startTransitionProof,
                processAttestationProofs,
                finalTransitionProof,
            } = await userState.genUserStateTransitionProofs()
            const proofIndexes: number[] = []

            let isValid = await circuit.verifyProof(
                protocol.config.exportBuildPath,
                CircuitName.startTransition,
                startTransitionProof.proof,
                startTransitionProof.publicSignals
            )
            expect(isValid).to.be.true

            // submit proofs
            let tx = await unirepContract.startUserStateTransition(
                startTransitionProof.blindedUserState,
                startTransitionProof.blindedHashChain,
                startTransitionProof.globalStateTreeRoot,
                circuit.formatProofForVerifierContract(
                    startTransitionProof.proof
                )
            )
            let receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            let hashedProof = computeStartTransitionProofHash(
                startTransitionProof.blindedUserState,
                startTransitionProof.blindedHashChain,
                startTransitionProof.globalStateTreeRoot,
                circuit
                    .formatProofForVerifierContract(startTransitionProof.proof)
                    .map((n) => BigNumber.from(n))
            )
            proofIndexes.push(
                Number(await unirepContract.getProofIndex(hashedProof))
            )

            for (let i = 0; i < processAttestationProofs.length; i++) {
                isValid = await circuit.verifyProof(
                    protocol.config.exportBuildPath,
                    CircuitName.processAttestations,
                    processAttestationProofs[i].proof,
                    processAttestationProofs[i].publicSignals
                )
                expect(isValid).to.be.true

                tx = await unirepContract.processAttestations(
                    processAttestationProofs[i].outputBlindedUserState,
                    processAttestationProofs[i].outputBlindedHashChain,
                    processAttestationProofs[i].inputBlindedUserState,
                    circuit.formatProofForVerifierContract(
                        processAttestationProofs[i].proof
                    )
                )
                receipt = await tx.wait()
                expect(receipt.status).to.equal(1)

                let hashedProof = computeProcessAttestationsProofHash(
                    processAttestationProofs[i].outputBlindedUserState,
                    processAttestationProofs[i].outputBlindedHashChain,
                    processAttestationProofs[i].inputBlindedUserState,
                    circuit
                        .formatProofForVerifierContract(
                            processAttestationProofs[i].proof
                        )
                        .map((n) => BigNumber.from(n))
                )
                proofIndexes.push(
                    Number(await unirepContract.getProofIndex(hashedProof))
                )
            }
            const USTInput = new UserTransitionProof(
                finalTransitionProof.publicSignals,
                finalTransitionProof.proof,
                protocol.config.exportBuildPath
            )
            isValid = await USTInput.verify()
            expect(isValid).to.be.true
            tx = await unirepContract.updateUserStateRoot(
                USTInput,
                proofIndexes
            )
            receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            const unirepStateAfterUST = await genUnirepState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address
            )
            expect(unirepStateAfterUST.toJSON()).deep.equal(storedUnirepState)
        })

        it('mismatch proof indexes will not affect Unirep state', async () => {
            const UserSignedUpFilter = unirepContract.filters.UserSignedUp()
            const userSignedUpEvents = await unirepContract.queryFilter(
                UserSignedUpFilter
            )
            if (notTransitionUsers.length < 2) return

            const userState1 = new UserState(
                protocol.config.exportBuildPath,
                userIds[notTransitionUsers[0]]
            )
            const userState2 = new UserState(
                protocol.config.exportBuildPath,
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
            const proofIndexes: number[] = []

            let isValid = await circuit.verifyProof(
                protocol.config.exportBuildPath,
                CircuitName.startTransition,
                startTransitionProof.proof,
                startTransitionProof.publicSignals
            )
            expect(isValid).to.be.true

            // submit proofs
            let tx = await unirepContract.startUserStateTransition(
                startTransitionProof.blindedUserState,
                startTransitionProof.blindedHashChain,
                startTransitionProof.globalStateTreeRoot,
                circuit.formatProofForVerifierContract(
                    startTransitionProof.proof
                )
            )
            let receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            let hashedProof = computeStartTransitionProofHash(
                startTransitionProof.blindedUserState,
                startTransitionProof.blindedHashChain,
                startTransitionProof.globalStateTreeRoot,
                circuit
                    .formatProofForVerifierContract(startTransitionProof.proof)
                    .map((n) => BigNumber.from(n))
            )
            proofIndexes.push(
                Number(await unirepContract.getProofIndex(hashedProof))
            )

            for (let i = 0; i < processAttestationProofs.length; i++) {
                isValid = await circuit.verifyProof(
                    protocol.config.exportBuildPath,
                    CircuitName.processAttestations,
                    processAttestationProofs[i].proof,
                    processAttestationProofs[i].publicSignals
                )
                expect(isValid).to.be.true

                tx = await unirepContract.processAttestations(
                    processAttestationProofs[i].outputBlindedUserState,
                    processAttestationProofs[i].outputBlindedHashChain,
                    processAttestationProofs[i].inputBlindedUserState,
                    circuit.formatProofForVerifierContract(
                        processAttestationProofs[i].proof
                    )
                )
                receipt = await tx.wait()
                expect(receipt.status).to.equal(1)

                let hashedProof = computeProcessAttestationsProofHash(
                    processAttestationProofs[i].outputBlindedUserState,
                    processAttestationProofs[i].outputBlindedHashChain,
                    processAttestationProofs[i].inputBlindedUserState,
                    circuit
                        .formatProofForVerifierContract(
                            processAttestationProofs[i].proof
                        )
                        .map((n) => BigNumber.from(n))
                )
                proofIndexes.push(
                    Number(await unirepContract.getProofIndex(hashedProof))
                )
            }
            const user2Proofs = await userState2.genUserStateTransitionProofs()
            const USTInput = new UserTransitionProof(
                user2Proofs.finalTransitionProof.publicSignals,
                user2Proofs.finalTransitionProof.proof,
                protocol.config.exportBuildPath
            )
            isValid = await USTInput.verify()
            expect(isValid).to.be.true
            tx = await unirepContract.updateUserStateRoot(
                USTInput,
                proofIndexes
            )
            receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            const unirepStateAfterUST = await genUnirepState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address
            )
            expect(unirepStateAfterUST.toJSON()).deep.equal(storedUnirepState)
        })

        it('Submit attestations to transitioned users', async () => {
            // generate user state manually
            const unirepState = await genUnirepState(
                protocol,
                hardhatEthers.provider,
                unirepContract.address
            )
            const currentEpoch = unirepState.currentEpoch
            const GST = unirepState.genGSTree(currentEpoch)
            const epkNonce = 0

            for (let i = 0; i < transitionedUsers.length; i++) {
                const userIdx = transitionedUsers[i]
                const UST = await protocol.computeInitUserStateRoot(
                    Number(attesterId),
                    Number(signUpAirdrops[userIdx].posRep)
                )

                const circuitInputs = genEpochKeyCircuitInput(
                    protocol,
                    userIds[userIdx],
                    GST,
                    i,
                    UST,
                    currentEpoch,
                    epkNonce
                )

                const { proof, publicSignals } = await protocol.genProof(
                    CircuitName.verifyEpochKey,
                    circuitInputs
                )
                const epkProofInput = new EpochKeyProof(
                    publicSignals,
                    proof,
                    protocol.config.exportBuildPath
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
                protocol,
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
        let USTNum = 0
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
                protocol,
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
                const userState = new UserState(
                    protocol.config.exportBuildPath,
                    userIds[i]
                )

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

                expect(userState.genGSTree(epoch).root).equal(GSTRoot)

                await userState.epochTransition(2)

                const {
                    startTransitionProof,
                    processAttestationProofs,
                    finalTransitionProof,
                } = await userState.genUserStateTransitionProofs()
                const proofIndexes: number[] = []

                let isValid = await circuit.verifyProof(
                    protocol.config.exportBuildPath,
                    CircuitName.startTransition,
                    startTransitionProof.proof,
                    startTransitionProof.publicSignals
                )
                expect(isValid).to.be.true

                // submit proofs
                let tx = await unirepContract.startUserStateTransition(
                    startTransitionProof.blindedUserState,
                    startTransitionProof.blindedHashChain,
                    startTransitionProof.globalStateTreeRoot,
                    circuit.formatProofForVerifierContract(
                        startTransitionProof.proof
                    )
                )
                let receipt = await tx.wait()
                expect(receipt.status).to.equal(1)

                let hashedProof = computeStartTransitionProofHash(
                    startTransitionProof.blindedUserState,
                    startTransitionProof.blindedHashChain,
                    startTransitionProof.globalStateTreeRoot,
                    circuit
                        .formatProofForVerifierContract(
                            startTransitionProof.proof
                        )
                        .map((n) => BigNumber.from(n))
                )
                proofIndexes.push(
                    Number(await unirepContract.getProofIndex(hashedProof))
                )

                for (let i = 0; i < processAttestationProofs.length; i++) {
                    isValid = await circuit.verifyProof(
                        protocol.config.exportBuildPath,
                        CircuitName.processAttestations,
                        processAttestationProofs[i].proof,
                        processAttestationProofs[i].publicSignals
                    )
                    expect(isValid).to.be.true

                    tx = await unirepContract.processAttestations(
                        processAttestationProofs[i].outputBlindedUserState,
                        processAttestationProofs[i].outputBlindedHashChain,
                        processAttestationProofs[i].inputBlindedUserState,
                        circuit.formatProofForVerifierContract(
                            processAttestationProofs[i].proof
                        )
                    )
                    receipt = await tx.wait()
                    expect(receipt.status).to.equal(1)

                    let hashedProof = computeProcessAttestationsProofHash(
                        processAttestationProofs[i].outputBlindedUserState,
                        processAttestationProofs[i].outputBlindedHashChain,
                        processAttestationProofs[i].inputBlindedUserState,
                        circuit
                            .formatProofForVerifierContract(
                                processAttestationProofs[i].proof
                            )
                            .map((n) => BigNumber.from(n))
                    )
                    proofIndexes.push(
                        Number(await unirepContract.getProofIndex(hashedProof))
                    )
                }
                const USTInput = new UserTransitionProof(
                    finalTransitionProof.publicSignals,
                    finalTransitionProof.proof,
                    protocol.config.exportBuildPath
                )
                isValid = await USTInput.verify()
                expect(isValid).to.be.true
                tx = await unirepContract.updateUserStateRoot(
                    USTInput,
                    proofIndexes
                )
                receipt = await tx.wait()
                expect(receipt.status).to.equal(1)
                USTNum++
            }
        })

        it('Users state transition matches current Unirep state', async () => {
            const unirepState = await genUnirepState(
                protocol,
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
