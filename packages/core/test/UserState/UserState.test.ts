import { expect } from 'chai'
import circuit, { CircuitName } from '@unirep/circuits'
import { ZkIdentity, genRandomSalt, hashLeftRight } from '@unirep/crypto'
import { Attestation } from '@unirep/contracts'

import { Reputation, UnirepProtocol, UnirepState, UserState } from '../../src'
import { genRandomAttestation } from '../utils'
import { zkFilesPath } from '../testConfig'

describe('User State', async function () {
    this.timeout(0)

    // unirep protocol
    let protocol: UnirepProtocol = new UnirepProtocol(zkFilesPath)

    // unirep state
    let unirepState: UnirepState = new UnirepState(zkFilesPath)

    // user state
    const user: ZkIdentity = new ZkIdentity()
    let userState: UserState = new UserState(zkFilesPath, user)

    // test config
    const maxUsers = 10
    const userNum = Math.ceil(Math.random() * maxUsers)
    let epoch = 1
    const signedUpAttesterId = Math.ceil(Math.random() * 10)
    const signedUpAirdrop = Math.ceil(Math.random() * 10)

    // global variables
    const epochKeys: string[] = []
    const attestationsToEpochKey: { [key: string]: Attestation[] } = {}

    describe('Users sign up', async () => {
        const GSTree = protocol.genNewGST()
        const rootHistories: BigInt[] = []

        it('sign up other users', async () => {
            for (let i = 0; i < userNum; i++) {
                const randomCommitment = genRandomSalt()
                const randomAttesterId = Math.floor(Math.random() * 3)
                const randomAirdropAmount = Math.floor(Math.random() * 3)
                await userState.signUp(
                    epoch,
                    randomCommitment,
                    randomAttesterId,
                    randomAirdropAmount
                )

                const userObj = userState.toJSON()
                expect(
                    userObj.hasSignedUp,
                    'User state cannot be changed (hasSignedUp)'
                ).to.be.false
                expect(
                    userObj.latestTransitionedEpoch,
                    'User state cannot be changed (latestTransitionedEpoch)'
                ).equal(0)
                expect(
                    userObj.latestGSTLeafIndex,
                    'User state cannot be changed (latestGSTLeafIndex)'
                ).equal(0)
                expect(
                    userObj.GSTLeaves[epoch].length,
                    'Unirep state should be changed'
                ).equal(i + 1)

                // GST should match
                const USTRoot = await protocol.computeInitUserStateRoot(
                    randomAttesterId,
                    randomAirdropAmount
                )
                const GSTLeaf = hashLeftRight(randomCommitment, USTRoot)
                GSTree.insert(GSTLeaf)
                const unirepGSTree = userState.genGSTree(epoch)
                expect(GSTree.root, 'GST root mismatches').equal(
                    unirepGSTree.root
                )
                rootHistories.push(GSTree.root)
            }
        })

        it('query Unirep GSTree in the invalid epoch should fail', async () => {
            const wrongEpoch = epoch + 1
            let error
            try {
                userState.genGSTree(wrongEpoch)
            } catch (e) {
                error = e
            }
            expect(error).not.to.be.undefined
        })

        it('sign up the user himself', async () => {
            await userState.signUp(
                epoch,
                user.genIdentityCommitment(),
                signedUpAttesterId,
                signedUpAirdrop
            )

            const userObj = userState.toJSON()
            expect(
                userObj.hasSignedUp,
                'User state should be changed (hasSignedUp)'
            ).to.be.true
            expect(
                userObj.latestTransitionedEpoch,
                'User state should be changed (latestTransitionedEpoch)'
            ).not.equal(0)
            expect(
                userObj.latestGSTLeafIndex,
                'User state should be changed (latestGSTLeafIndex)'
            ).equal(userNum)
            expect(
                userObj.GSTLeaves[epoch].length,
                'Unirep state should be changed'
            ).equal(userNum + 1)
            expect(
                userObj.latestUserStateLeaves[signedUpAttesterId],
                'Sign up airdrop should be updated'
            ).not.to.be.undefined

            // GST should match
            const USTRoot = await protocol.computeInitUserStateRoot(
                signedUpAttesterId,
                signedUpAirdrop
            )
            const GSTLeaf = hashLeftRight(user.genIdentityCommitment(), USTRoot)
            GSTree.insert(GSTLeaf)
            const unirepGSTree = userState.genGSTree(epoch)
            expect(GSTree.root, 'GST root mismatches').equal(unirepGSTree.root)
            rootHistories.push(GSTree.root)
        })

        it('continue sign up other users', async () => {
            for (let i = 0; i < maxUsers - userNum - 3; i++) {
                const randomCommitment = genRandomSalt()
                await userState.signUp(epoch, randomCommitment)

                const userObj = userState.toJSON()
                expect(
                    userObj.hasSignedUp,
                    'User state should be changed (hasSignedUp)'
                ).to.be.true
                expect(
                    userObj.latestTransitionedEpoch,
                    'User state should be changed (latestTransitionedEpoch)'
                ).not.equal(0)
                expect(
                    userObj.latestGSTLeafIndex,
                    'User state should be changed (latestGSTLeafIndex)'
                ).equal(userNum)
                expect(
                    userObj.latestUserStateLeaves[signedUpAttesterId],
                    'Sign up airdrop should be updated'
                ).not.to.be.undefined

                // GST should match
                const USTRoot = await protocol.computeInitUserStateRoot()
                const GSTLeaf = hashLeftRight(randomCommitment, USTRoot)
                GSTree.insert(GSTLeaf)
                const unirepGSTree = userState.genGSTree(epoch)
                expect(GSTree.root, 'GST root mismatches').equal(
                    unirepGSTree.root
                )
                rootHistories.push(GSTree.root)
            }
        })

        it('sign up twice should fail', async () => {
            let error
            try {
                await userState.signUp(epoch, user.genIdentityCommitment())
            } catch (e) {
                error = e
            }
            expect(error).not.to.be.undefined
        })

        it('sign up in wrong epoch should fail', async () => {
            const wrongEpoch = epoch + 1
            let error
            try {
                await userState.signUp(wrongEpoch, genRandomSalt())
            } catch (e) {
                error = e
            }
            expect(error).not.to.be.undefined
        })

        it('Query global state tree roots should success', async () => {
            for (let root of rootHistories) {
                const exist = userState.GSTRootExists(root, epoch)
                expect(
                    exist,
                    'Query global state tree root from User state failed'
                ).to.be.true
            }
        })

        it('Query global state tree roots with wrong input should success', async () => {
            const notExist = userState.GSTRootExists(genRandomSalt(), epoch)
            expect(notExist, 'Query non-exist root from User state should fail')
                .to.be.false

            const invalidEpoch = epoch + 1
            for (let root of rootHistories) {
                let error
                try {
                    userState.GSTRootExists(root, invalidEpoch)
                } catch (e) {
                    error = e
                }
                expect(error).not.to.be.undefined
            }
        })
    })

    describe('Add attestations', async () => {
        it('update User state should success', async () => {
            const maxEpochKeyNum = 10
            const epochKeyNum = Math.ceil(Math.random() * maxEpochKeyNum)
            for (let i = 0; i < epochKeyNum; i++) {
                const maxAttestPerEpochKeyNum = 20
                const attestNum = Math.ceil(
                    Math.random() * maxAttestPerEpochKeyNum
                )

                const epochKey =
                    BigInt(genRandomSalt().toString()) %
                    BigInt(2 ** protocol.config.epochTreeDepth)
                epochKeys.push(epochKey.toString())
                attestationsToEpochKey[epochKey.toString()] = []

                for (let j = 0; j < attestNum; j++) {
                    const attestation = genRandomAttestation()
                    userState.addAttestation(epochKey.toString(), attestation)
                    attestationsToEpochKey[epochKey.toString()].push(
                        attestation
                    )
                }
            }
        })

        it('add attestations to user himself', async () => {
            for (let i = 0; i < protocol.config.numEpochKeyNoncePerEpoch; i++) {
                const userEpk = protocol
                    .genEpochKey(user.identityNullifier, epoch, i)
                    .toString()
                epochKeys.push(userEpk.toString())
                attestationsToEpochKey[userEpk.toString()] = []

                const maxAttestPerEpochKeyNum = 10
                const attestNum = Math.ceil(
                    Math.random() * maxAttestPerEpochKeyNum
                )

                for (let j = 0; j < attestNum; j++) {
                    const attestation = genRandomAttestation()
                    userState.addAttestation(userEpk.toString(), attestation)
                    attestationsToEpochKey[userEpk.toString()].push(attestation)
                }
            }
        })

        it('wrong epoch key should throw error', async () => {
            let error
            const wrongEpochKey = genRandomSalt()
            const attestation = genRandomAttestation()
            try {
                userState.addAttestation(wrongEpochKey.toString(), attestation)
            } catch (e) {
                error = e
            }
            expect(error).not.to.be.undefined
        })

        it('Get attestations should success', async () => {
            for (let i = 0; i < epochKeys.length; i++) {
                const unirepAttestations = userState.getAttestations(
                    epochKeys[i]
                )
                for (let j = 0; j < unirepAttestations.length; j++) {
                    expect(JSON.stringify(unirepAttestations[j])).to.equal(
                        JSON.stringify(attestationsToEpochKey[epochKeys[i]][j])
                    )
                }
            }
        })

        it('Get attestation with non exist epoch key should return an empty array', async () => {
            const epochKey =
                BigInt(genRandomSalt().toString()) %
                BigInt(2 ** protocol.config.epochTreeDepth)
            const unirepAttestations = userState.getAttestations(
                epochKey.toString()
            )
            expect(unirepAttestations.length).equal(0)
        })

        it('Get attestation with invalid epoch key should throw error', async () => {
            let error
            const wrongEpochKey = genRandomSalt()
            try {
                userState.getAttestations(wrongEpochKey.toString())
            } catch (e) {
                error = e
            }
            expect(error).not.to.be.undefined
        })

        it('get epoch keys should success', async () => {
            const unirepEpochKeys = userState.getEpochKeys(epoch)
            expect(unirepEpochKeys.length).equal(epochKeys.length)

            for (let epk of unirepEpochKeys) {
                expect(epochKeys.indexOf(epk)).not.equal(-1)
            }
        })

        it('add reputation nullifiers', async () => {
            const nullifierNum = Math.ceil(Math.random() * 10)
            for (let i = 0; i < nullifierNum; i++) {
                const nullifier = genRandomSalt()
                userState.addReputationNullifiers(nullifier)

                // submit the same nullifier twice should fail
                let error
                try {
                    userState.addReputationNullifiers(nullifier)
                } catch (e) {
                    error = e
                }
                expect(error).not.to.be.undefined

                // query nullifier should succeed
                const exist = userState.nullifierExist(nullifier)
                expect(
                    exist,
                    'Query reputation nullifier from Unirep state failed'
                ).to.be.true
            }
        })

        it('non exist nullifier should return false', async () => {
            const notExist = unirepState.nullifierExist(genRandomSalt())
            expect(
                notExist,
                'Query non exist nullifier from Unirep state with wrong result'
            ).to.be.false
        })
    })

    describe('Generate proofs', async () => {
        it('generate epoch key proof should succeed', async () => {
            for (let i = 0; i < protocol.config.numEpochKeyNoncePerEpoch; i++) {
                const results = await userState.genVerifyEpochKeyProof(i)
                const expectedEpk = protocol
                    .genEpochKey(user.identityNullifier, epoch, i)
                    .toString()
                const isValid = await circuit.verifyProof(
                    protocol.config.exportBuildPath,
                    CircuitName.verifyEpochKey,
                    results.proof,
                    results.publicSignals
                )

                expect(isValid).to.be.true
                expect(results.epochKey).equal(expectedEpk)
                expect(results.epoch).equal(epoch.toString())
                const outputGSTRoot = results.globalStateTree
                const exist = userState.GSTRootExists(outputGSTRoot, epoch)
                expect(exist).to.be.true
            }
        })

        it('generate epoch key proof with invalid nonce should fail', async () => {
            let error
            const invalidNonce = protocol.config.numEpochKeyNoncePerEpoch
            try {
                await userState.genVerifyEpochKeyProof(invalidNonce)
            } catch (e) {
                error = e
            }
            expect(error).not.to.be.undefined
        })

        it('non signed up user should not generate epoch key proof', async () => {
            let error
            const invalidUserState = new UserState(
                zkFilesPath,
                new ZkIdentity()
            )
            const epkNonce = 0
            try {
                await invalidUserState.genVerifyEpochKeyProof(epkNonce)
            } catch (e) {
                error = e
            }
            expect(error).not.to.be.undefined
        })

        it('generate reputation proof should succeed', async () => {
            const epkNonce = Math.floor(
                Math.random() * protocol.config.numEpochKeyNoncePerEpoch
            )
            const proveMinRep = Math.floor(Math.random() * signedUpAirdrop)
            const results = await userState.genProveReputationProof(
                BigInt(signedUpAttesterId),
                epkNonce,
                proveMinRep
            )
            const expectedEpk = protocol
                .genEpochKey(user.identityNullifier, epoch, epkNonce)
                .toString()
            const isValid = await circuit.verifyProof(
                protocol.config.exportBuildPath,
                CircuitName.proveReputation,
                results.proof,
                results.publicSignals
            )

            expect(isValid).to.be.true
            expect(results.epochKey).equal(expectedEpk)
            expect(results.epoch).equal(epoch.toString())
            const outputGSTRoot = results.globalStatetreeRoot
            const exist = userState.GSTRootExists(outputGSTRoot, epoch)
            expect(exist).to.be.true
            expect(Number(results.minRep)).equal(proveMinRep)
        })

        it('generate reputation proof with nullifiers nonces should succeed', async () => {
            const epkNonce = Math.floor(
                Math.random() * protocol.config.numEpochKeyNoncePerEpoch
            )
            const proveNullifiers = Math.floor(Math.random() * signedUpAirdrop)
            const nonceList: BigInt[] = []
            for (let i = 0; i < protocol.config.maxReputationBudget; i++) {
                if (i < proveNullifiers) nonceList.push(BigInt(i))
                else nonceList.push(BigInt(-1))
            }
            const results = await userState.genProveReputationProof(
                BigInt(signedUpAttesterId),
                epkNonce,
                undefined,
                undefined,
                undefined,
                nonceList
            )
            const expectedEpk = protocol
                .genEpochKey(user.identityNullifier, epoch, epkNonce)
                .toString()
            const isValid = await circuit.verifyProof(
                protocol.config.exportBuildPath,
                CircuitName.proveReputation,
                results.proof,
                results.publicSignals
            )

            expect(isValid).to.be.true
            expect(results.epochKey).equal(expectedEpk)
            expect(results.epoch).equal(epoch.toString())
            const outputGSTRoot = results.globalStatetreeRoot
            const exist = userState.GSTRootExists(outputGSTRoot, epoch)
            expect(exist).to.be.true
            expect(Number(results.proveReputationAmount)).equal(proveNullifiers)
        })

        it('generate reputation proof with invalid min rep should fail', async () => {
            const epkNonce = Math.floor(
                Math.random() * protocol.config.numEpochKeyNoncePerEpoch
            )
            const proveMinRep = signedUpAirdrop + 1
            const results = await userState.genProveReputationProof(
                BigInt(signedUpAttesterId),
                epkNonce,
                proveMinRep
            )
            const isValid = await circuit.verifyProof(
                protocol.config.exportBuildPath,
                CircuitName.proveReputation,
                results.proof,
                results.publicSignals
            )
            expect(isValid).to.be.false
        })

        it('generate reputation proof with not exist attester ID should fail', async () => {
            const epkNonce = Math.floor(
                Math.random() * protocol.config.numEpochKeyNoncePerEpoch
            )
            const nonSignUpAttesterId = signedUpAttesterId + 1
            const proveMinRep = 1
            const results = await userState.genProveReputationProof(
                BigInt(nonSignUpAttesterId),
                epkNonce,
                proveMinRep
            )
            const isValid = await circuit.verifyProof(
                protocol.config.exportBuildPath,
                CircuitName.proveReputation,
                results.proof,
                results.publicSignals
            )
            expect(isValid).to.be.false
        })

        it('non signed up user should not generate reputation proof', async () => {
            const epkNonce = Math.floor(
                Math.random() * protocol.config.numEpochKeyNoncePerEpoch
            )
            const proveMinRep = Math.floor(Math.random() * signedUpAirdrop)

            let error
            const invalidUserState = new UserState(
                zkFilesPath,
                new ZkIdentity()
            )
            try {
                await invalidUserState.genProveReputationProof(
                    BigInt(signedUpAttesterId),
                    epkNonce,
                    proveMinRep
                )
            } catch (e) {
                error = e
            }
            expect(error).not.to.be.undefined
        })

        it('generate sign up proof should succeed', async () => {
            const epkNonce = 0
            const results = await userState.genUserSignUpProof(
                BigInt(signedUpAttesterId)
            )
            const expectedEpk = protocol
                .genEpochKey(user.identityNullifier, epoch, epkNonce)
                .toString()
            const isValid = await circuit.verifyProof(
                protocol.config.exportBuildPath,
                CircuitName.proveUserSignUp,
                results.proof,
                results.publicSignals
            )

            expect(isValid).to.be.true
            expect(results.epochKey).equal(expectedEpk)
            expect(results.epoch).equal(epoch.toString())
            const outputGSTRoot = results.globalStateTreeRoot
            const exist = userState.GSTRootExists(outputGSTRoot, epoch)
            expect(exist).to.be.true
            expect(Number(results.userHasSignedUp)).equal(1)
        })

        it('generate sign up proof with other attester ID should succeed', async () => {
            const epkNonce = 0
            const nonSignUpAttesterId = signedUpAttesterId + 1
            const results = await userState.genUserSignUpProof(
                BigInt(nonSignUpAttesterId)
            )
            const expectedEpk = protocol
                .genEpochKey(user.identityNullifier, epoch, epkNonce)
                .toString()
            const isValid = await circuit.verifyProof(
                protocol.config.exportBuildPath,
                CircuitName.proveUserSignUp,
                results.proof,
                results.publicSignals
            )

            expect(isValid).to.be.true
            expect(results.epochKey).equal(expectedEpk)
            expect(results.epoch).equal(epoch.toString())
            const outputGSTRoot = results.globalStateTreeRoot
            const exist = userState.GSTRootExists(outputGSTRoot, epoch)
            expect(exist).to.be.true
            expect(Number(results.userHasSignedUp)).equal(0)
        })

        it('non signed up user should not generate user sign up proof', async () => {
            let error
            const invalidUserState = new UserState(
                zkFilesPath,
                new ZkIdentity()
            )
            try {
                await invalidUserState.genUserSignUpProof(
                    BigInt(signedUpAttesterId)
                )
            } catch (e) {
                error = e
            }
            expect(error).not.to.be.undefined
        })
    })

    describe('Epoch transition', async () => {
        const GSTree = protocol.genNewGST()
        const rootHistories: BigInt[] = []

        it('epoch transition', async () => {
            await userState.epochTransition(epoch)
            expect(
                userState.currentEpoch,
                'Unirep epoch should increase by 1'
            ).equal(epoch + 1)
            epoch = userState.currentEpoch

            // sealed epoch key should not add attestations
            for (let i = 0; i < epochKeys.length; i++) {
                const attestation = genRandomAttestation()

                // submit the attestation to sealed epoch key should fail
                let error
                try {
                    userState.addAttestation(epochKeys[i], attestation)
                } catch (e) {
                    error = e
                }
                expect(error).not.to.be.undefined
            }
        })

        it('generate epoch tree should succeed', async () => {
            const prevEpoch = 1
            const epochTree = await userState.genEpochTree(prevEpoch)
            const root = epochTree.root

            const exist = await userState.epochTreeRootExists(root, prevEpoch)
            expect(exist).to.be.true
        })

        it('epoch transition with wrong epoch input should fail', async () => {
            const wrongEpoch = 1
            let error
            try {
                await userState.epochTransition(wrongEpoch)
            } catch (e) {
                error = e
            }
            expect(error).not.to.be.undefined
        })

        it('transition other users state should success', async () => {
            for (let i = 0; i < userNum; i++) {
                const fromEpoch = 1
                const newGSTLeaf = genRandomSalt()
                const epkNullifiers: BigInt[] = []
                for (
                    let j = 0;
                    j < protocol.config.numEpochKeyNoncePerEpoch;
                    j++
                ) {
                    epkNullifiers.push(genRandomSalt())
                }
                await userState.userStateTransition(
                    fromEpoch,
                    newGSTLeaf,
                    epkNullifiers
                )

                const userObj = userState.toJSON()
                expect(
                    userObj.latestTransitionedEpoch,
                    'User state should not be changed (latestTransitionedEpoch)'
                ).equal(1)
                expect(
                    userObj.latestGSTLeafIndex,
                    'User state should not be changed (latestGSTLeafIndex)'
                ).equal(userNum)
                expect(
                    userObj.GSTLeaves[epoch].length,
                    'Unirep state should be changed'
                ).equal(1 + i)

                GSTree.insert(newGSTLeaf)
                const unirepGSTree = userState.genGSTree(epoch)
                expect(GSTree.root, 'GST root mismatches').equal(
                    unirepGSTree.root
                )
                rootHistories.push(GSTree.root)
            }
        })

        it('generate user state transition proofs and verify them should success', async () => {
            const {
                startTransitionProof,
                processAttestationProofs,
                finalTransitionProof,
            } = await userState.genUserStateTransitionProofs()

            const isStartProofValid = await circuit.verifyProof(
                protocol.config.exportBuildPath,
                CircuitName.startTransition,
                startTransitionProof.proof,
                startTransitionProof.publicSignals
            )
            expect(isStartProofValid).to.be.true
            const fromGSTRoot = startTransitionProof.globalStateTreeRoot
            const fromEpoch = Number(finalTransitionProof.transitionedFromEpoch)
            const exist = userState.GSTRootExists(fromGSTRoot, fromEpoch)
            expect(exist).to.be.true

            for (let i = 0; i < processAttestationProofs.length; i++) {
                const isProcessAttestationValid = await circuit.verifyProof(
                    protocol.config.exportBuildPath,
                    CircuitName.processAttestations,
                    processAttestationProofs[i].proof,
                    processAttestationProofs[i].publicSignals
                )
                expect(isProcessAttestationValid).to.be.true
            }

            const isUSTProofValid = await circuit.verifyProof(
                protocol.config.exportBuildPath,
                CircuitName.userStateTransition,
                finalTransitionProof.proof,
                finalTransitionProof.publicSignals
            )
            expect(isUSTProofValid).to.be.true
            expect(finalTransitionProof.fromGSTRoot).equal(
                startTransitionProof.globalStateTreeRoot
            )

            // epoch tree
            const fromEpochTree = finalTransitionProof.fromEpochTree
            const epochTreeExist = await userState.epochTreeRootExists(
                fromEpochTree,
                fromEpoch
            )
            expect(epochTreeExist).to.be.true

            const unirepEpochTree = await userState.genEpochTree(fromEpoch)
            expect(unirepEpochTree.root.toString()).equal(
                fromEpochTree
            )

            // epoch key nullifiers
            const epkNullifiers = userState.getEpochKeyNullifiers(fromEpoch)
            for (let nullifier of epkNullifiers) {
                expect(
                    finalTransitionProof.epochKeyNullifiers.indexOf(
                        nullifier.toString()
                    )
                ).not.equal(-1)
            }

            const GSTLeaf = BigInt(finalTransitionProof.newGlobalStateTreeLeaf)
            await userState.userStateTransition(
                fromEpoch,
                GSTLeaf,
                epkNullifiers
            )
            const userObj = userState.toJSON()
            expect(
                Number(userObj.latestTransitionedEpoch),
                `User state mismatches current epoch: ${epoch}`
            ).equal(epoch)

            // global state tree
            const USTree_ = await userState.genUserStateTree()
            const GSTLeaf_ = hashLeftRight(
                user.genIdentityCommitment(),
                USTree_.root
            )
            expect(GSTLeaf_.toString()).equal(
                finalTransitionProof.newGlobalStateTreeLeaf
            )

            GSTree.insert(GSTLeaf_)
            const unirepGSTree = userState.genGSTree(epoch)
            expect(GSTree.root, 'GST root mismatches').equal(unirepGSTree.root)
            rootHistories.push(GSTree.root)
        })

        it('get attestations should work', async () => {
            const prevEpoch = 1
            const reputationRecord: { [key: string]: Reputation } = {}
            reputationRecord[signedUpAttesterId.toString()] = new Reputation(
                BigInt(signedUpAirdrop),
                BigInt(0),
                BigInt(0),
                BigInt(1)
            )
            for (let i = 0; i < protocol.config.numEpochKeyNoncePerEpoch; i++) {
                const userEpk = protocol
                    .genEpochKey(user.identityNullifier, prevEpoch, i)
                    .toString()
                const attestations = attestationsToEpochKey[userEpk.toString()]
                for (const attestation of attestations) {
                    const attesterId_ = attestation.attesterId
                    if (
                        reputationRecord[attesterId_.toString()] === undefined
                    ) {
                        reputationRecord[attesterId_.toString()] =
                            new Reputation(
                                attestation.posRep,
                                attestation.negRep,
                                attestation.graffiti,
                                attestation.signUp
                            )
                    } else {
                        reputationRecord[attesterId_.toString()].update(
                            attestation.posRep,
                            attestation.negRep,
                            attestation.graffiti,
                            attestation.signUp
                        )
                    }
                }
            }

            for (const attester in reputationRecord) {
                const rep_ = userState.getRepByAttester(BigInt(attester))
                expect(reputationRecord[attester].toJSON()).equal(rep_.toJSON())
            }
        })

        it('continue transition other users state should success', async () => {
            for (let i = 0; i < maxUsers - userNum - 3; i++) {
                const fromEpoch = 1
                const newGSTLeaf = genRandomSalt()
                const epkNullifiers: BigInt[] = []
                for (
                    let j = 0;
                    j < protocol.config.numEpochKeyNoncePerEpoch;
                    j++
                ) {
                    epkNullifiers.push(genRandomSalt())
                }
                await userState.userStateTransition(
                    fromEpoch,
                    newGSTLeaf,
                    epkNullifiers
                )

                const userObj = userState.toJSON()

                expect(
                    userObj.latestTransitionedEpoch,
                    'User state should not be changed (latestTransitionedEpoch)'
                ).equal(epoch)

                expect(
                    userObj.latestGSTLeafIndex,
                    'User state should not be changed (latestGSTLeafIndex)'
                ).equal(userNum)

                expect(
                    userObj.GSTLeaves[epoch].length,
                    'Unirep state should be changed'
                ).equal(userNum + 2 + i)

                GSTree.insert(newGSTLeaf)
                const unirepGSTree = userState.genGSTree(epoch)
                expect(GSTree.root, 'GST root mismatches').equal(
                    unirepGSTree.root
                )
                rootHistories.push(GSTree.root)
            }
        })
    })

    describe('Generate proofs in the next epoch', async () => {
        it('generate epoch key proof should succeed', async () => {
            for (let i = 0; i < protocol.config.numEpochKeyNoncePerEpoch; i++) {
                const results = await userState.genVerifyEpochKeyProof(i)
                const expectedEpk = protocol
                    .genEpochKey(user.identityNullifier, epoch, i)
                    .toString()
                const isValid = await circuit.verifyProof(
                    protocol.config.exportBuildPath,
                    CircuitName.verifyEpochKey,
                    results.proof,
                    results.publicSignals
                )

                expect(isValid).to.be.true
                expect(results.epochKey).equal(expectedEpk)
                expect(results.epoch).equal(epoch.toString())
                const outputGSTRoot = results.globalStateTree
                const exist = userState.GSTRootExists(outputGSTRoot, epoch)
                expect(exist).to.be.true
            }
        })

        it('generate epoch key proof with invalid nonce should fail', async () => {
            let error
            const invalidNonce = protocol.config.numEpochKeyNoncePerEpoch
            try {
                await userState.genVerifyEpochKeyProof(invalidNonce)
            } catch (e) {
                error = e
            }
            expect(error).not.to.be.undefined
        })

        it('non signed up user should not generate epoch key proof', async () => {
            let error
            const invalidUserState = new UserState(
                zkFilesPath,
                new ZkIdentity()
            )
            const epkNonce = 0
            try {
                await invalidUserState.genVerifyEpochKeyProof(epkNonce)
            } catch (e) {
                error = e
            }
            expect(error).not.to.be.undefined
        })

        it('generate reputation proof should succeed', async () => {
            const epkNonce = Math.floor(
                Math.random() * protocol.config.numEpochKeyNoncePerEpoch
            )
            const rep = userState.getRepByAttester(BigInt(signedUpAttesterId))
            let proveMinRep
            if (Number(rep.posRep) - Number(rep.negRep) > 0) {
                proveMinRep = Number(rep.posRep) - Number(rep.negRep)
            } else {
                proveMinRep = 0
            }
            const results = await userState.genProveReputationProof(
                BigInt(signedUpAttesterId),
                epkNonce,
                proveMinRep
            )
            const expectedEpk = protocol
                .genEpochKey(user.identityNullifier, epoch, epkNonce)
                .toString()
            const isValid = await circuit.verifyProof(
                protocol.config.exportBuildPath,
                CircuitName.proveReputation,
                results.proof,
                results.publicSignals
            )

            expect(isValid).to.be.true
            expect(results.epochKey).equal(expectedEpk)
            expect(results.epoch).equal(epoch.toString())
            const outputGSTRoot = results.globalStatetreeRoot
            const exist = userState.GSTRootExists(outputGSTRoot, epoch)
            expect(exist).to.be.true
            expect(Number(results.minRep)).equal(proveMinRep)
        })

        it('generate sign up proof should succeed', async () => {
            const epkNonce = 0
            const results = await userState.genUserSignUpProof(
                BigInt(signedUpAttesterId)
            )
            const expectedEpk = protocol
                .genEpochKey(user.identityNullifier, epoch, epkNonce)
                .toString()
            const isValid = await circuit.verifyProof(
                protocol.config.exportBuildPath,
                CircuitName.proveUserSignUp,
                results.proof,
                results.publicSignals
            )

            expect(isValid).to.be.true
            expect(results.epochKey).equal(expectedEpk)
            expect(results.epoch).equal(epoch.toString())
            const outputGSTRoot = results.globalStateTreeRoot
            const exist = userState.GSTRootExists(outputGSTRoot, epoch)
            expect(exist).to.be.true
            expect(Number(results.userHasSignedUp)).equal(1)
        })
    })
})
