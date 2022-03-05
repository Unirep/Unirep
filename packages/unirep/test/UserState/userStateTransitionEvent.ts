// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import { genIdentity, genIdentityCommitment, genRandomSalt, hashLeftRight, } from '@unirep/crypto'
import { deployUnirep, EpochKeyProof, UserTransitionProof, computeStartTransitionProofHash, computeProcessAttestationsProofHash} from '@unirep/contracts'
import { attestingFee, computeInitUserStateRoot, epochLength, genUnirepStateFromContract, genUserStateFromContract, ISettings, maxAttesters, maxReputationBudget,  numEpochKeyNoncePerEpoch,  Reputation, UnirepState, UserState } from '../../core'
import { genNewGST, genRandomAttestation, genRandomList, getTreeDepthsForTesting, verifyProcessAttestationsProof, verifyStartTransitionProof } from '../utils'
import { formatProofForVerifierContract } from '@unirep/circuits'

describe('User state transition events in Unirep User State', async function () {
    this.timeout(500000)

    let userIds: any[] = []
    let userCommitments: BigInt[] = []
    let userStateTreeRoots: BigInt[] = []
    let signUpAirdrops: Reputation[] = []
    let attestations: Reputation[] = []

    let unirepContract: ethers.Contract
    let unirepContractCalledByAttester: ethers.Contract
    let _treeDepths = getTreeDepthsForTesting("circuit")

    let accounts: ethers.Signer[]
    const attester = new Object()
    let attesterId
    const maxUsers = 10
    const userNum = Math.ceil(Math.random() * maxUsers)
    const transitionedUsers: number[] = []
    const fromProofIndex = 0

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        const _settings = {
            maxUsers: maxUsers,
            maxAttesters: maxAttesters,
            numEpochKeyNoncePerEpoch: numEpochKeyNoncePerEpoch,
            maxReputationBudget: maxReputationBudget,
            epochLength: epochLength,
            attestingFee: attestingFee
        }
        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], _treeDepths, _settings)
    })

    describe('Attester sign up and set airdrop', async () => {
        it('attester sign up', async () => {
            attester['acct'] = accounts[2]
            attester['addr'] = await attester['acct'].getAddress()
            unirepContractCalledByAttester = unirepContract.connect(attester['acct'])
            let tx = await unirepContractCalledByAttester.attesterSignUp()
            let receipt = await tx.wait()
            expect(receipt.status, 'Attester signs up failed').to.equal(1)
            attesterId = BigInt(await unirepContract.attesters(attester['addr']))
        })

        it('attester set airdrop amount', async () => {
            const airdropPosRep = 10
            const tx = await unirepContractCalledByAttester.setAirdropAmount(airdropPosRep)
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
            const airdroppedAmount = await unirepContract.airdropAmount(attester['addr'])
            expect(airdroppedAmount.toNumber()).equal(airdropPosRep)
        })
    })

    describe('Init User State', async () => {
        it('check User state matches the contract', async () => {
            const id = genIdentity()
            const initUnirepState = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                id,
            )

            const contractEpoch = await unirepContract.currentEpoch()
            const unirepEpoch = initUnirepState.getUnirepStateCurrentEpoch()
            expect(unirepEpoch).equal(Number(contractEpoch))

            const unirepGSTree = initUnirepState.getUnirepStateGSTree(unirepEpoch)
            const defaultGSTree = genNewGST(
                _treeDepths.globalStateTreeDepth, 
                _treeDepths.userStateTreeDepth
            )
            expect(unirepGSTree.root).equal(defaultGSTree.root)
        })
    })

    describe('User Sign Up event', async () => {
        const GSTree = genNewGST(
            _treeDepths.globalStateTreeDepth, 
            _treeDepths.userStateTreeDepth
        )
        const rootHistories: BigInt[] = []

        it('sign up users through attester who sets airdrop', async () => {
            for (let i = 0; i < userNum; i++) {
                const id = genIdentity()
                const commitment = genIdentityCommitment(id)
                userIds.push(id)
                userCommitments.push(commitment)

                const tx = await unirepContractCalledByAttester.userSignUp(commitment)
                const receipt = await tx.wait()
                expect(receipt.status, 'User sign up failed').to.equal(1)

                await expect(unirepContractCalledByAttester.userSignUp(commitment))
                    .to.be.revertedWith('Unirep: the user has already signed up')
                

                const userState = await genUserStateFromContract(
                    hardhatEthers.provider,
                    unirepContract.address,
                    id,
                )

                const contractEpoch = await unirepContract.currentEpoch()
                const unirepEpoch = userState.getUnirepStateCurrentEpoch()
                expect(unirepEpoch).equal(Number(contractEpoch))

                const attesterId = await unirepContract.attesters(attester['addr'])
                const airdroppedAmount = await unirepContract.airdropAmount(attester['addr'])
                const newUSTRoot = await computeInitUserStateRoot(
                    _treeDepths.userStateTreeDepth,
                    Number(attesterId),
                    Number(airdroppedAmount)
                )
                const newGSTLeaf = hashLeftRight(commitment, newUSTRoot)
                userStateTreeRoots.push(newUSTRoot)
                signUpAirdrops.push(new Reputation(
                    BigInt(airdroppedAmount),
                    BigInt(0),
                    BigInt(0),
                    BigInt(1),
                ))
                attestations.push(Reputation.default())
                GSTree.insert(newGSTLeaf)
                rootHistories.push(GSTree.root)
            }
        })

        it('sign up users with no airdrop', async () => {
            for (let i = 0; i < maxUsers - userNum; i++) {
                const id = genIdentity()
                const commitment = genIdentityCommitment(id)
                userIds.push(id)
                userCommitments.push(commitment)

                const tx = await unirepContract.userSignUp(commitment)
                const receipt = await tx.wait()
                expect(receipt.status, 'User sign up failed').to.equal(1)

                const userState = await genUserStateFromContract(
                    hardhatEthers.provider,
                    unirepContract.address,
                    id,
                )

                const contractEpoch = await unirepContract.currentEpoch()
                const unirepEpoch = userState.getUnirepStateCurrentEpoch()
                expect(unirepEpoch).equal(Number(contractEpoch))

                const newUSTRoot = await computeInitUserStateRoot(
                    _treeDepths.userStateTreeDepth,
                )
                const newGSTLeaf = hashLeftRight(commitment, newUSTRoot)
                userStateTreeRoots.push(newUSTRoot)
                signUpAirdrops.push(Reputation.default())
                attestations.push(Reputation.default())
                GSTree.insert(newGSTLeaf)
                rootHistories.push(GSTree.root)
            }
        })

        it('Sign up users more than contract capacity will not affect Unirep state', async () => {
            const id = genIdentity()
            const commitment = genIdentityCommitment(id)
            const userStateBefore = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                id
            )
            const GSTRootBefore = userStateBefore.getUnirepStateGSTree(1).root
            
            await expect(unirepContract.userSignUp(commitment))
                .to.be.revertedWith('Unirep: maximum number of user signups reached')

            const userState = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                id
            )
            const GSTRoot = userState.getUnirepStateGSTree(1).root
            expect(GSTRoot).equal(GSTRootBefore)
        })

        it('Check GST roots match Unirep state',async () => {
            const unirepState = await genUnirepStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
            )
            for (let root of rootHistories) {
                const exist = unirepState.GSTRootExists(root, unirepState.currentEpoch)
                expect(exist).to.be.true
            }
        })
    })

    describe('Epoch transition event with no attestation', async () => {
        it('premature epoch transition should fail', async () => {
            await expect(unirepContract.beginEpochTransition()
                ).to.be.revertedWith('Unirep: epoch not yet ended')
        })

        it('epoch transition should succeed', async () => {
            // Record data before epoch transition so as to compare them with data after epoch transition
            let epoch = await unirepContract.currentEpoch()
    
            // Fast-forward epochLength of seconds
            await hardhatEthers.provider.send("evm_increaseTime", [epochLength])

            // Begin epoch transition 
            let tx = await unirepContractCalledByAttester.beginEpochTransition()
            let receipt = await tx.wait()
            expect(receipt.status).equal(1)
            console.log("Gas cost of epoch transition:", receipt.gasUsed.toString())
    
            // Complete epoch transition
            expect(await unirepContract.currentEpoch()).to.be.equal(epoch.add(1))
    
            // Verify latestEpochTransitionTime and currentEpoch
            let latestEpochTransitionTime = await unirepContract.latestEpochTransitionTime()
            expect(latestEpochTransitionTime).equal((await hardhatEthers.provider.getBlock(receipt.blockNumber)).timestamp)
    
            let epoch_ = await unirepContract.currentEpoch()
            expect(epoch_).equal(epoch.add(1))
        })
    })

    describe('User state transition events with no attestation', async () => {
        let storedUserState
        const storedUserIdx = 0
        let invalidProofIndexes: number[] = []
        const notTransitionUsers: number[] = []
        const setting: ISettings = {
            globalStateTreeDepth: _treeDepths.globalStateTreeDepth,
            userStateTreeDepth: _treeDepths.userStateTreeDepth,
            epochTreeDepth: _treeDepths.epochTreeDepth,
            attestingFee: attestingFee,
            epochLength: epochLength,
            numEpochKeyNoncePerEpoch: numEpochKeyNoncePerEpoch,
            maxReputationBudget: maxReputationBudget,
        }
        it('Users should successfully perform user state transition', async () => {
            for (let i = 0; i < userIds.length; i++) {
                const userState = await genUserStateFromContract(
                    hardhatEthers.provider,
                    unirepContract.address,
                    userIds[i],
                )

                const {
                    startTransitionProof,
                    processAttestationProofs,
                    finalTransitionProof
                } = await userState.genUserStateTransitionProofs()
                const proofIndexes: number[] = []

                let isValid = await verifyStartTransitionProof(startTransitionProof)
                expect(isValid).to.be.true

                // submit proofs
                let tx = await unirepContract.startUserStateTransition(
                    startTransitionProof.blindedUserState,
                    startTransitionProof.blindedHashChain,
                    startTransitionProof.globalStateTreeRoot,
                    formatProofForVerifierContract(startTransitionProof.proof)
                )
                let receipt = await tx.wait()
                expect(receipt.status).to.equal(1)
            
                let hashedProof = computeStartTransitionProofHash(
                    startTransitionProof.blindedUserState,
                    startTransitionProof.blindedHashChain,
                    startTransitionProof.globalStateTreeRoot,
                    formatProofForVerifierContract(startTransitionProof.proof)
                )
                proofIndexes.push(Number(await unirepContract.getProofIndex(hashedProof)))

                for (let i = 0; i < processAttestationProofs.length; i++) {
                    isValid = await verifyProcessAttestationsProof(processAttestationProofs[i])
                    expect(isValid).to.be.true

                    tx = await unirepContract.processAttestations(
                        processAttestationProofs[i].outputBlindedUserState,
                        processAttestationProofs[i].outputBlindedHashChain,
                        processAttestationProofs[i].inputBlindedUserState,
                        formatProofForVerifierContract(processAttestationProofs[i].proof)
                    )
                    receipt = await tx.wait()
                    expect(receipt.status).to.equal(1)
                
                    let hashedProof = computeProcessAttestationsProofHash(
                        processAttestationProofs[i].outputBlindedUserState,
                        processAttestationProofs[i].outputBlindedHashChain,
                        processAttestationProofs[i].inputBlindedUserState,
                        formatProofForVerifierContract(processAttestationProofs[i].proof)
                    )
                    proofIndexes.push(Number(await unirepContract.getProofIndex(hashedProof)))
                }
                const USTInput = new UserTransitionProof(
                    finalTransitionProof.publicSignals,
                    finalTransitionProof.proof
                )
                isValid = await USTInput.verify()
                expect(isValid).to.be.true
                tx = await unirepContract.updateUserStateRoot(USTInput, proofIndexes)
                receipt = await tx.wait()
                expect(receipt.status).to.equal(1)

                transitionedUsers.push(i)
            }
        })

        it('Users state transition matches current Unirep state', async () => {
            for (let i = 0; i < transitionedUsers.length; i++) {
                const userState = await genUserStateFromContract(
                    hardhatEthers.provider,
                    unirepContract.address,
                    userIds[i],
                )
                expect(userState.getUnirepStateCurrentEpoch())
                    .equal(userState.latestTransitionedEpoch)
            }
            const userState = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[storedUserIdx],
            )
            const unirepState = await genUnirepStateFromContract(
                hardhatEthers.provider,
                unirepContract.address
            )
            expect(userState.getUnirepStateCurrentEpoch())
                .equal(unirepState.currentEpoch)
            for (let i = 1; i <= unirepState.currentEpoch; i++) {
                expect(userState.getUnirepStateGSTree(i).root)
                    .equal(unirepState.genGSTree(i).root)
            }
            expect((await userState.getUnirepStateEpochTree(1)).getRootHash())
                .equal((await unirepState.genEpochTree(1)).getRootHash())
            
            storedUserState = userState.toJSON()
        })

        it('User generate two UST proofs should not affect Unirep state', async () => {
            // add user state manually
            const UserSignedUpFilter = unirepContract.filters.UserSignedUp()
            const userSignedUpEvents =  await unirepContract.queryFilter(UserSignedUpFilter)

            if(transitionedUsers.length === 0) return
            const n = transitionedUsers[0]
            const unirepState = new UnirepState(setting)
            const userState = new UserState(unirepState, userIds[n])

            for (let signUpEvent of userSignedUpEvents) {
                const args = signUpEvent?.args
                const epoch = Number(args?._epoch)
                const commitment = BigInt(args?._identityCommitment)
                const attesterId = Number(args?._attesterId)
                const airdrop = Number(args?._airdropAmount)

                await userState.signUp(epoch, commitment, attesterId, airdrop)
            }

            await userState.epochTransition(1)
            
            const {
                startTransitionProof,
                processAttestationProofs,
                finalTransitionProof
            } = await userState.genUserStateTransitionProofs()
            const proofIndexes: number[] = []

            let isValid = await verifyStartTransitionProof(startTransitionProof)
            expect(isValid).to.be.true

            // submit proofs
            let tx = await unirepContract.startUserStateTransition(
                startTransitionProof.blindedUserState,
                startTransitionProof.blindedHashChain,
                startTransitionProof.globalStateTreeRoot,
                formatProofForVerifierContract(startTransitionProof.proof)
            )
            let receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            let hashedProof = computeStartTransitionProofHash(
                startTransitionProof.blindedUserState,
                startTransitionProof.blindedHashChain,
                startTransitionProof.globalStateTreeRoot,
                formatProofForVerifierContract(startTransitionProof.proof)
            )
            proofIndexes.push(Number(await unirepContract.getProofIndex(hashedProof)))

            for (let i = 0; i < processAttestationProofs.length; i++) {
                isValid = await verifyProcessAttestationsProof(processAttestationProofs[i])
                expect(isValid).to.be.true

                tx = await unirepContract.processAttestations(
                    processAttestationProofs[i].outputBlindedUserState,
                    processAttestationProofs[i].outputBlindedHashChain,
                    processAttestationProofs[i].inputBlindedUserState,
                    formatProofForVerifierContract(processAttestationProofs[i].proof)
                )
                receipt = await tx.wait()
                expect(receipt.status).to.equal(1)
                
                let hashedProof = computeProcessAttestationsProofHash(
                    processAttestationProofs[i].outputBlindedUserState,
                    processAttestationProofs[i].outputBlindedHashChain,
                    processAttestationProofs[i].inputBlindedUserState,
                    formatProofForVerifierContract(processAttestationProofs[i].proof)
                )
                proofIndexes.push(Number(await unirepContract.getProofIndex(hashedProof)))
            }
            const USTInput = new UserTransitionProof(
                finalTransitionProof.publicSignals,
                finalTransitionProof.proof
            )
            isValid = await USTInput.verify()
            expect(isValid).to.be.true
            tx = await unirepContract.updateUserStateRoot(USTInput, proofIndexes)
            receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            const userStateAfterUST = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[storedUserIdx]
            )
            expect(userStateAfterUST.toJSON()).equal(storedUserState)
        })

        it('Submit invalid start tranistion proof should not affect Unirep State', async () => {
            const randomProof: BigInt[] = genRandomList(8)
            const randomBlindedUserState = genRandomSalt()
            const randomBlindedHashChain = genRandomSalt()
            const randomGSTRoot = genRandomSalt()
            const tx = await unirepContract.startUserStateTransition(
                randomBlindedUserState,
                randomBlindedHashChain,
                randomGSTRoot,
                randomProof,
            )
            let receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            const userState = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[storedUserIdx],
            )
            expect(userState.toJSON()).equal(storedUserState)

            let hashedProof = computeStartTransitionProofHash(
                randomBlindedUserState,
                randomBlindedHashChain,
                randomGSTRoot,
                randomProof
            )
            invalidProofIndexes.push(Number(await unirepContract.getProofIndex(hashedProof)))
        })

        it('Submit invalid process attestation proof should not affect Unirep State', async () => {
            const randomProof: BigInt[] = genRandomList(8)
            const randomOutputBlindedUserState = genRandomSalt()
            const randomOutputBlindedHashChain = genRandomSalt()
            const randomInputBlindedUserState = genRandomSalt()
            const tx = await unirepContract.processAttestations(
                randomOutputBlindedUserState,
                randomOutputBlindedHashChain,
                randomInputBlindedUserState,
                randomProof,
            )
            let receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            const userState = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[storedUserIdx],
            )
            expect(userState.toJSON()).equal(storedUserState)

            let hashedProof = computeProcessAttestationsProofHash(
                randomOutputBlindedUserState,
                randomOutputBlindedHashChain,
                randomInputBlindedUserState,
                randomProof,
            )
            invalidProofIndexes.push(Number(await unirepContract.getProofIndex(hashedProof)))
        })

        it('Submit invalid user state transition proof should not affect Unirep State', async () => {
            const randomProof: BigInt[] = genRandomList(8)
            const randomNullifiers: BigInt[] = genRandomList(numEpochKeyNoncePerEpoch)
            const randomBlindedStates: BigInt[] = genRandomList(2)
            const randomBlindedChains: BigInt[] = genRandomList(numEpochKeyNoncePerEpoch)
            
            const randomUSTInput = {
                newGlobalStateTreeLeaf: genRandomSalt(),
                epkNullifiers: randomNullifiers,
                transitionFromEpoch: 1,
                blindedUserStates: randomBlindedStates,
                fromGlobalStateTree: genRandomSalt(),
                blindedHashChains: randomBlindedChains,
                fromEpochTree: genRandomSalt(),
                proof: randomProof,
            }
            const tx = await unirepContract.updateUserStateRoot(
                randomUSTInput, 
                invalidProofIndexes
            )
            let receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            const userState = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[storedUserIdx],
            )
            expect(userState.toJSON()).equal(storedUserState)
        })

        it('submit valid proof with wrong GST will not affect Unirep state', async () => {
            const unirepState = new UnirepState(setting)
            const userState = new UserState(unirepState, userIds[0])

            const epoch = 1
            const commitment = genIdentityCommitment(userIds[0])
            const attesterId = 0
            const airdrop = 0
            await userState.signUp(epoch, commitment, attesterId, airdrop)
            await userState.epochTransition(1)
            
            const {
                startTransitionProof,
                processAttestationProofs,
                finalTransitionProof
            } = await userState.genUserStateTransitionProofs()
            const proofIndexes: number[] = []

            let isValid = await verifyStartTransitionProof(startTransitionProof)
            expect(isValid).to.be.true

            // submit proofs
            let tx = await unirepContract.startUserStateTransition(
                startTransitionProof.blindedUserState,
                startTransitionProof.blindedHashChain,
                startTransitionProof.globalStateTreeRoot,
                formatProofForVerifierContract(startTransitionProof.proof)
            )
            let receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            let hashedProof = computeStartTransitionProofHash(
                startTransitionProof.blindedUserState,
                startTransitionProof.blindedHashChain,
                startTransitionProof.globalStateTreeRoot,
                formatProofForVerifierContract(startTransitionProof.proof)
            )
            proofIndexes.push(Number(await unirepContract.getProofIndex(hashedProof)))

            for (let i = 0; i < processAttestationProofs.length; i++) {
                isValid = await verifyProcessAttestationsProof(processAttestationProofs[i])
                expect(isValid).to.be.true

                tx = await unirepContract.processAttestations(
                    processAttestationProofs[i].outputBlindedUserState,
                    processAttestationProofs[i].outputBlindedHashChain,
                    processAttestationProofs[i].inputBlindedUserState,
                    formatProofForVerifierContract(processAttestationProofs[i].proof)
                )
                receipt = await tx.wait()
                expect(receipt.status).to.equal(1)

                let hashedProof = computeProcessAttestationsProofHash(
                    processAttestationProofs[i].outputBlindedUserState,
                    processAttestationProofs[i].outputBlindedHashChain,
                    processAttestationProofs[i].inputBlindedUserState,
                    formatProofForVerifierContract(processAttestationProofs[i].proof)
                )
                proofIndexes.push(Number(await unirepContract.getProofIndex(hashedProof)))
            }
            const USTInput = new UserTransitionProof(
                finalTransitionProof.publicSignals,
                finalTransitionProof.proof
            )
            isValid = await USTInput.verify()
            expect(isValid).to.be.true
            tx = await unirepContract.updateUserStateRoot(USTInput, proofIndexes)
            receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            const userStateAfterUST = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[storedUserIdx],
            )
            expect(userStateAfterUST.toJSON()).equal(storedUserState)
        })

        it('mismatch proof indexes will not affect Unirep state', async () => {
            if(notTransitionUsers.length < 2) return
            const userState1 = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[notTransitionUsers[0]],
            )
            const userState2 = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[notTransitionUsers[1]],
            )
            
            const {
                startTransitionProof,
                processAttestationProofs
            } = await userState1.genUserStateTransitionProofs()
            const proofIndexes: number[] = []

            let isValid = await verifyStartTransitionProof(startTransitionProof)
            expect(isValid).to.be.true

            // submit proofs
            let tx = await unirepContract.startUserStateTransition(
                startTransitionProof.blindedUserState,
                startTransitionProof.blindedHashChain,
                startTransitionProof.globalStateTreeRoot,
                formatProofForVerifierContract(startTransitionProof.proof)
            )
            let receipt = await tx.wait()
            expect(receipt.status).to.equal(1)
            
            let hashedProof = computeStartTransitionProofHash(
                startTransitionProof.blindedUserState,
                startTransitionProof.blindedHashChain,
                startTransitionProof.globalStateTreeRoot,
                formatProofForVerifierContract(startTransitionProof.proof)
            )
            proofIndexes.push(Number(await unirepContract.getProofIndex(hashedProof)))

            for (let i = 0; i < processAttestationProofs.length; i++) {
                isValid = await verifyProcessAttestationsProof(processAttestationProofs[i])
                expect(isValid).to.be.true

                tx = await unirepContract.processAttestations(
                    processAttestationProofs[i].outputBlindedUserState,
                    processAttestationProofs[i].outputBlindedHashChain,
                    processAttestationProofs[i].inputBlindedUserState,
                    formatProofForVerifierContract(processAttestationProofs[i].proof)
                )
                receipt = await tx.wait()
                expect(receipt.status).to.equal(1)
                
                let hashedProof = computeProcessAttestationsProofHash(
                    processAttestationProofs[i].outputBlindedUserState,
                    processAttestationProofs[i].outputBlindedHashChain,
                    processAttestationProofs[i].inputBlindedUserState,
                    formatProofForVerifierContract(processAttestationProofs[i].proof)
                )
                proofIndexes.push(Number(await unirepContract.getProofIndex(hashedProof)))
            }
            const user2Proofs = await userState2.genUserStateTransitionProofs()
            const USTInput = new UserTransitionProof(
                user2Proofs.finalTransitionProof.publicSignals,
                user2Proofs.finalTransitionProof.proof
            )
            isValid = await USTInput.verify()
            expect(isValid).to.be.true
            tx = await unirepContract.updateUserStateRoot(USTInput, proofIndexes)
            receipt = await tx.wait()
            expect(receipt.status).to.equal(1)

            const userState = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[storedUserIdx]
            )
            expect(userState.toJSON()).equal(storedUserState)
        })

        it('Submit attestations to transitioned users', async () => {
            const epkNonce = 0
            for (let i = 0; i < transitionedUsers.length; i++) {
                const userIdx = transitionedUsers[i]
                const userState = await genUserStateFromContract(
                    hardhatEthers.provider,
                    unirepContract.address,
                    userIds[userIdx]
                )

                const { proof, publicSignals } = await userState.genVerifyEpochKeyProof(epkNonce)
                const epkProofInput = new EpochKeyProof(
                    publicSignals,
                    proof
                )
                const isValid = await epkProofInput.verify()
                expect(isValid).to.be.true
    
                let tx = await unirepContract.submitEpochKeyProof(epkProofInput)
                let receipt = await tx.wait()
                expect(receipt.status).to.equal(1)

                const epochKey = epkProofInput.epochKey
                const hashedProof = await unirepContract.hashEpochKeyProof(epkProofInput)
                const proofIndex = Number(await unirepContract.getProofIndex(hashedProof))

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

        it('User state should store the attestations ', async () => {
            const userState = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[storedUserIdx]
            )
            const unirepObj = JSON.parse(userState.toJSON())
            expect(Object.keys(unirepObj.unirepState.latestEpochKeyToAttestationsMap).length)
                .equal(transitionedUsers.length)
        })
    })

    describe('Epoch transition event with attestations', async () => {
        it('epoch transition should succeed', async () => {
            // Record data before epoch transition so as to compare them with data after epoch transition
            let epoch = await unirepContract.currentEpoch()
    
            // Fast-forward epochLength of seconds
            await hardhatEthers.provider.send("evm_increaseTime", [epochLength])
            // Begin epoch transition 
            let tx = await unirepContractCalledByAttester.beginEpochTransition()
            let receipt = await tx.wait()
            expect(receipt.status).equal(1)
            console.log("Gas cost of epoch transition:", receipt.gasUsed.toString())
    
            // Complete epoch transition
            expect(await unirepContract.currentEpoch()).to.be.equal(epoch.add(1))
    
            // Verify latestEpochTransitionTime and currentEpoch
            let latestEpochTransitionTime = await unirepContract.latestEpochTransitionTime()
            expect(latestEpochTransitionTime).equal((await hardhatEthers.provider.getBlock(receipt.blockNumber)).timestamp)
    
            let epoch_ = await unirepContract.currentEpoch()
            expect(epoch_).equal(epoch.add(1))
        })
    })

    describe('User state transition events with attestations', async () => {
        it('Users should successfully perform user state transition', async () => {
            const unirepStateBefore = await genUnirepStateFromContract(
                hardhatEthers.provider,
                unirepContract.address
            )
            const epoch = 2
            const GSTRoot = unirepStateBefore.genGSTree(epoch).root

            for (let i = 0; i < userIds.length; i++) {
                const randomUST = Math.round(Math.random())
                if(randomUST === 0) continue
                console.log('transition user', i)
                const userState = await genUserStateFromContract(
                    hardhatEthers.provider,
                    unirepContract.address,
                    userIds[i]
                )

                expect(userState.getUnirepStateGSTree(epoch).root)
                    .equal(GSTRoot)
                            
                const {
                    startTransitionProof,
                    processAttestationProofs,
                    finalTransitionProof
                } = await userState.genUserStateTransitionProofs()
                const proofIndexes: number[] = []

                let isValid = await verifyStartTransitionProof(startTransitionProof)
                expect(isValid).to.be.true

                // submit proofs
                let tx = await unirepContract.startUserStateTransition(
                    startTransitionProof.blindedUserState,
                    startTransitionProof.blindedHashChain,
                    startTransitionProof.globalStateTreeRoot,
                    formatProofForVerifierContract(startTransitionProof.proof)
                )
                let receipt = await tx.wait()
                expect(receipt.status).to.equal(1)

                let hashedProof = computeStartTransitionProofHash(
                    startTransitionProof.blindedUserState,
                    startTransitionProof.blindedHashChain,
                    startTransitionProof.globalStateTreeRoot,
                    formatProofForVerifierContract(startTransitionProof.proof)
                )
                proofIndexes.push(Number(await unirepContract.getProofIndex(hashedProof)))

                for (let i = 0; i < processAttestationProofs.length; i++) {
                    isValid = await verifyProcessAttestationsProof(processAttestationProofs[i])
                    expect(isValid).to.be.true

                    tx = await unirepContract.processAttestations(
                        processAttestationProofs[i].outputBlindedUserState,
                        processAttestationProofs[i].outputBlindedHashChain,
                        processAttestationProofs[i].inputBlindedUserState,
                        formatProofForVerifierContract(processAttestationProofs[i].proof)
                    )
                    receipt = await tx.wait()
                    expect(receipt.status).to.equal(1)

                    let hashedProof = computeProcessAttestationsProofHash(
                        processAttestationProofs[i].outputBlindedUserState,
                        processAttestationProofs[i].outputBlindedHashChain,
                        processAttestationProofs[i].inputBlindedUserState,
                        formatProofForVerifierContract(processAttestationProofs[i].proof)
                    )
                    proofIndexes.push(Number(await unirepContract.getProofIndex(hashedProof)))
                }
                const USTInput = new UserTransitionProof(
                    finalTransitionProof.publicSignals,
                    finalTransitionProof.proof
                )
                isValid = await USTInput.verify()
                expect(isValid).to.be.true
                tx = await unirepContract.updateUserStateRoot(USTInput, proofIndexes)
                receipt = await tx.wait()
                expect(receipt.status).to.equal(1)
            }
        })

        it('Users state transition matches current Unirep state', async () => {
            const unirepState = await genUnirepStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
            )
            const userState = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                userIds[0]
            )
            expect(userState.getUnirepStateCurrentEpoch())
                .equal(unirepState.currentEpoch)
            for (let i = 1; i <= unirepState.currentEpoch; i++) {
                expect(userState.getUnirepStateGSTree(i).root)
                    .equal(unirepState.genGSTree(i).root)
            }
            expect((await userState.getUnirepStateEpochTree(2)).getRootHash())
                .equal((await unirepState.genEpochTree(2)).getRootHash())
        })
    })
})