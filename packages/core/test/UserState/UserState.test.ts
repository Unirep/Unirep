import { ethers } from 'hardhat'
import { expect } from 'chai'
import { ZkIdentity, hashLeftRight } from '@unirep/crypto'
import { deployUnirep } from '@unirep/contracts'
import {
    EPOCH_LENGTH,
    EPOCH_TREE_DEPTH,
    GLOBAL_STATE_TREE_DEPTH,
    MAX_REPUTATION_BUDGET,
    NUM_ATTESTATIONS_PER_PROOF,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    USER_STATE_TREE_DEPTH,
} from '@unirep/circuits'

const ATTESTING_FEE = '0' as any
const attestingFee = ethers.utils.parseEther('0.1')

import { genEpochKey, computeInitUserStateRoot, ISettings } from '../../src'
import { genNewGST, genUserState, submitUSTProofs } from '../utils'

describe('User State', async function () {
    this.timeout(0)

    const setting: ISettings = {
        globalStateTreeDepth: GLOBAL_STATE_TREE_DEPTH,
        userStateTreeDepth: USER_STATE_TREE_DEPTH,
        epochTreeDepth: EPOCH_TREE_DEPTH,
        attestingFee: ATTESTING_FEE,
        epochLength: EPOCH_LENGTH,
        numEpochKeyNoncePerEpoch: NUM_EPOCH_KEY_NONCE_PER_EPOCH,
        maxReputationBudget: MAX_REPUTATION_BUDGET,
        numAttestationsPerProof: NUM_ATTESTATIONS_PER_PROOF,
    }
    const maxUsers = 100
    const userNum = 5

    describe('Users sign up', async function () {
        let unirepContract
        const GSTree = genNewGST(
            setting.globalStateTreeDepth,
            setting.userStateTreeDepth
        )
        const rootHistories: BigInt[] = []
        const id = new ZkIdentity()
        let userState

        before(async () => {
            const accounts = await ethers.getSigners()
            unirepContract = await deployUnirep(accounts[0], {
                maxUsers,
                attestingFee,
            })
            userState = await genUserState(
                unirepContract.provider,
                unirepContract.address,
                id
            )
        })

        // after(() => userState.stop())

        it('sign up other users', async () => {
            const accounts = await ethers.getSigners()
            const epoch = await userState.getUnirepStateCurrentEpoch()
            for (let i = 0; i < userNum; i++) {
                const _tmpWallet = ethers.Wallet.createRandom()
                const tmpWallet = new ethers.Wallet(
                    _tmpWallet.privateKey,
                    unirepContract.provider
                )
                await accounts[1]
                    .sendTransaction({
                        to: tmpWallet.address,
                        value: ethers.utils.parseEther('0.1'),
                    })
                    .then((t) => t.wait())
                // now initialize an attester using accounts[0]
                await unirepContract
                    .connect(tmpWallet)
                    .attesterSignUp()
                    .then((t) => t.wait())
                const attesterId = await unirepContract.attesters(
                    tmpWallet.address
                )
                const airdropAmount = Math.ceil(Math.random() * 1000)
                const tmpId = new ZkIdentity()
                // const tmpUserState = await genUserState(
                //     unirepContract.provider,
                //     unirepContract.address,
                //     tmpId
                // ) // TODO: verify this state too?
                await unirepContract
                    .connect(tmpWallet)
                    ['userSignUp(uint256,uint256)'](
                        tmpId.genIdentityCommitment(),
                        airdropAmount
                    )
                    .then((t) => t.wait())
                await userState.waitForSync()

                // check the tmp state and the control above

                expect(
                    await userState.hasSignedUp(),
                    'User state cannot be changed (hasSignedUp)'
                ).to.be.false
                expect(
                    await userState.latestTransitionedEpoch(),
                    'User state cannot be changed (latestTransitionedEpoch)'
                ).equal(0)
                expect(
                    await userState.latestGSTLeafIndex(),
                    'User state cannot be changed (latestGSTLeafIndex)'
                ).equal(-1)
                const tree = await userState.genGSTree(epoch)
                expect(
                    tree.leaves.length,
                    'Unirep state should be changed'
                ).equal(i + 1)

                // GST should match
                const USTRoot = computeInitUserStateRoot(
                    setting.userStateTreeDepth,
                    attesterId.toNumber(),
                    airdropAmount
                )
                const GSTLeaf = hashLeftRight(
                    tmpId.genIdentityCommitment(),
                    USTRoot
                )
                GSTree.insert(GSTLeaf)
                const unirepGSTree = await userState.genGSTree(epoch)
                expect(GSTree.root, 'GST root mismatches').equal(
                    unirepGSTree.root
                )
                rootHistories.push(GSTree.root)
            }
        })

        it('query Unirep GSTree in the invalid epoch should fail', async () => {
            const epoch = await userState.getUnirepStateCurrentEpoch()
            const wrongEpoch = epoch + 1
            try {
                await userState.genGSTree(wrongEpoch)
                expect(false).to.be.true
            } catch (e) {
                expect(e).not.to.be.undefined
            }
        })

        it('sign up the user himself', async () => {
            const accounts = await ethers.getSigners()
            const epoch = await userState.getUnirepStateCurrentEpoch()
            const _tmpWallet = ethers.Wallet.createRandom()
            const tmpWallet = new ethers.Wallet(
                _tmpWallet.privateKey,
                unirepContract.provider
            )
            await accounts[1]
                .sendTransaction({
                    to: tmpWallet.address,
                    value: ethers.utils.parseEther('0.1'),
                })
                .then((t) => t.wait())
            // now initialize an attester using accounts[0]
            await unirepContract
                .connect(tmpWallet)
                .attesterSignUp()
                .then((t) => t.wait())
            const attesterId = await unirepContract.attesters(tmpWallet.address)
            const airdropAmount = Math.ceil(Math.random() * 1000)
            await unirepContract
                .connect(tmpWallet)
                ['userSignUp(uint256,uint256)'](
                    id.genIdentityCommitment(),
                    airdropAmount
                )
                .then((t) => t.wait())
            await userState.waitForSync()

            expect(
                await userState.hasSignedUp(),
                'User state should be changed (hasSignedUp)'
            ).to.be.true
            expect(
                await userState.latestTransitionedEpoch(),
                'User state should be changed (latestTransitionedEpoch)'
            ).not.equal(0)
            expect(
                await userState.latestGSTLeafIndex(),
                'User state should be changed (latestGSTLeafIndex)'
            ).equal(userNum)
            const tree = await userState.genGSTree(epoch)
            expect(tree.leaves.length, 'Unirep state should be changed').equal(
                userNum + 1
            )

            // GST should match
            const USTRoot = computeInitUserStateRoot(
                setting.userStateTreeDepth,
                attesterId.toNumber(),
                airdropAmount
            )
            const GSTLeaf = hashLeftRight(id.genIdentityCommitment(), USTRoot)
            GSTree.insert(GSTLeaf)
            const unirepGSTree = await userState.genGSTree(epoch)
            expect(GSTree.root, 'GST root mismatches').equal(unirepGSTree.root)
            rootHistories.push(GSTree.root)
        })

        it('continue sign up other users', async () => {
            const accounts = await ethers.getSigners()
            const epoch = await userState.getUnirepStateCurrentEpoch()
            for (let i = 0; i < 5; i++) {
                const _tmpWallet = ethers.Wallet.createRandom()
                const tmpWallet = new ethers.Wallet(
                    _tmpWallet.privateKey,
                    unirepContract.provider
                )
                await accounts[1]
                    .sendTransaction({
                        to: tmpWallet.address,
                        value: ethers.utils.parseEther('0.1'),
                    })
                    .then((t) => t.wait())
                // now initialize an attester using accounts[0]
                await unirepContract
                    .connect(tmpWallet)
                    .attesterSignUp()
                    .then((t) => t.wait())
                const attesterId = await unirepContract.attesters(
                    tmpWallet.address
                )
                const airdropAmount = Math.ceil(Math.random() * 1000)
                const tmpId = new ZkIdentity()
                // const tmpUserState = await genUserState(
                //     unirepContract.provider,
                //     unirepContract.address,
                //     tmpId
                // ) // TODO: verify this state too?
                await unirepContract
                    .connect(tmpWallet)
                    ['userSignUp(uint256,uint256)'](
                        tmpId.genIdentityCommitment(),
                        airdropAmount
                    )
                    .then((t) => t.wait())
                await userState.waitForSync()

                // check the tmp state and the control above

                expect(
                    await userState.hasSignedUp(),
                    'User state cannot be changed (hasSignedUp)'
                ).to.be.true
                expect(
                    await userState.latestTransitionedEpoch(),
                    'User state cannot be changed (latestTransitionedEpoch)'
                ).equal(1)
                expect(
                    await userState.latestGSTLeafIndex(),
                    'User state cannot be changed (latestGSTLeafIndex)'
                ).equal(userNum)
                const tree = await userState.genGSTree(epoch)
                expect(
                    tree.leaves.length,
                    'Unirep state should be changed'
                ).equal(userNum + 2 + i)

                // GST should match
                const USTRoot = computeInitUserStateRoot(
                    setting.userStateTreeDepth,
                    attesterId.toNumber(),
                    airdropAmount
                )
                const GSTLeaf = hashLeftRight(
                    tmpId.genIdentityCommitment(),
                    USTRoot
                )
                GSTree.insert(GSTLeaf)
                const unirepGSTree = await userState.genGSTree(epoch)
                expect(GSTree.root, 'GST root mismatches').equal(
                    unirepGSTree.root
                )
                rootHistories.push(GSTree.root)
            }
        })

        it('sign up twice should fail', async () => {
            const epoch = await userState.getUnirepStateCurrentEpoch()
            const user = new ZkIdentity()
            try {
                await userState.signUp(epoch, user.genIdentityCommitment())
                expect(false).to.be.true
            } catch (e) {
                expect(e).not.to.be.undefined
            }
        })

        it('sign up in wrong epoch should fail', async () => {
            const epoch = await userState.getUnirepStateCurrentEpoch()
            const wrongEpoch = epoch + 1
            try {
                const tmpId = new ZkIdentity()
                await userState.signUp(
                    wrongEpoch,
                    tmpId.genIdentityCommitment()
                )
                expect(false).to.be.true
            } catch (e) {
                expect(e).not.to.be.undefined
            }
        })

        it('Query global state tree roots should success', async () => {
            const epoch = await userState.getUnirepStateCurrentEpoch()
            for (let root of rootHistories) {
                const exist = await userState.GSTRootExists(root, epoch)
                expect(
                    exist,
                    'Query global state tree root from User state failed'
                ).to.be.true
            }
        })

        it('Query global state tree roots with wrong input should success', async () => {
            const epoch = await userState.getUnirepStateCurrentEpoch()
            const tmpId = new ZkIdentity()
            const notExist = await userState.GSTRootExists(
                tmpId.genIdentityCommitment(),
                epoch
            )
            expect(notExist, 'Query non-exist root from User state should fail')
                .to.be.false

            const invalidEpoch = epoch + 1
            for (let root of rootHistories) {
                try {
                    await userState.GSTRootExists(root, invalidEpoch)
                    expect(false).to.be.true
                } catch (e) {
                    expect(e).not.to.be.undefined
                }
            }
        })
    })

    describe('Generate proofs', async () => {
        let unirepContract
        const id = new ZkIdentity()
        let userState
        let attesterId, airdropAmount

        before(async () => {
            const accounts = await ethers.getSigners()
            unirepContract = await deployUnirep(accounts[0], {
                maxUsers,
                attestingFee,
            })
            userState = await genUserState(
                unirepContract.provider,
                unirepContract.address,
                id
            )
            // now initialize an attester using accounts[0]
            await unirepContract
                .connect(accounts[1])
                .attesterSignUp()
                .then((t) => t.wait())
            attesterId = await unirepContract.attesters(accounts[1].address)
            airdropAmount = Math.ceil(Math.random() * 1000)
            // then sign up our mock user
            await unirepContract
                .connect(accounts[1])
                ['userSignUp(uint256,uint256)'](
                    id.genIdentityCommitment(),
                    airdropAmount
                )
                .then((t) => t.wait())
            await userState.waitForSync()
        })

        after(() => userState.stop())

        it('generate epoch key proof should succeed', async () => {
            const epoch = await userState.getUnirepStateCurrentEpoch()
            for (let i = 0; i < setting.numEpochKeyNoncePerEpoch; i++) {
                const results = await userState.genVerifyEpochKeyProof(i)
                const expectedEpk = genEpochKey(
                    id.identityNullifier,
                    epoch,
                    i
                ).toString()
                const isValid = await results.verify()

                expect(isValid).to.be.true
                expect(results.epochKey).equal(expectedEpk)
                expect(results.epoch).equal(epoch.toString())
                const outputGSTRoot = results.globalStateTree
                const exist = await userState.GSTRootExists(
                    outputGSTRoot,
                    epoch
                )
                expect(exist).to.be.true
            }
        })

        it('generate epoch key proof with invalid nonce should fail', async () => {
            const invalidNonce = setting.numEpochKeyNoncePerEpoch
            try {
                await userState.genVerifyEpochKeyProof(invalidNonce)
                expect(false).to.be.true
            } catch (e) {
                expect(e).not.to.be.undefined
            }
        })

        it('non signed up user should not generate epoch key proof', async () => {
            const notSignedUp = await genUserState(
                unirepContract.provider,
                unirepContract.address,
                new ZkIdentity()
            )
            const epkNonce = 0
            try {
                await notSignedUp.genVerifyEpochKeyProof(epkNonce)
                expect(false).to.be.true
            } catch (e) {
                expect(e).not.to.be.undefined
            }
        })

        it('generate reputation proof should succeed', async () => {
            const epoch = await userState.getUnirepStateCurrentEpoch()
            const epkNonce = Math.floor(
                Math.random() * setting.numEpochKeyNoncePerEpoch
            )
            const proveMinRep = Math.floor(Math.random() * airdropAmount)
            const results = await userState.genProveReputationProof(
                BigInt(attesterId),
                epkNonce,
                proveMinRep
            )
            const expectedEpk = genEpochKey(
                id.identityNullifier,
                epoch,
                epkNonce
            ).toString()
            const isValid = await results.verify()

            expect(isValid).to.be.true
            expect(results.epochKey).equal(expectedEpk)
            expect(results.epoch).equal(epoch.toString())
            const outputGSTRoot = results.globalStateTree
            const exist = await userState.GSTRootExists(outputGSTRoot, epoch)
            expect(exist).to.be.true
            expect(Number(results.minRep)).equal(proveMinRep)
        })

        it('generate reputation proof with invalid min rep should fail', async () => {
            const epkNonce = Math.floor(
                Math.random() * setting.numEpochKeyNoncePerEpoch
            )
            const proveMinRep = airdropAmount + 1
            const results = await userState.genProveReputationProof(
                BigInt(attesterId),
                epkNonce,
                proveMinRep
            )
            const isValid = await results.verify()
            expect(isValid).to.be.false
        })

        it('generate reputation proof with not exist attester ID should fail', async () => {
            const epkNonce = Math.floor(
                Math.random() * setting.numEpochKeyNoncePerEpoch
            )
            const nonSignUpAttesterId = attesterId + 1
            const proveMinRep = 1
            const results = await userState.genProveReputationProof(
                BigInt(nonSignUpAttesterId),
                epkNonce,
                proveMinRep
            )
            const isValid = await results.verify()
            expect(isValid).to.be.false
        })

        it('non signed up user should not generate reputation proof', async () => {
            const epkNonce = Math.floor(
                Math.random() * setting.numEpochKeyNoncePerEpoch
            )
            const proveMinRep = Math.floor(Math.random() * airdropAmount)
            const nonSignUp = await genUserState(
                unirepContract.provider,
                unirepContract.address,
                new ZkIdentity()
            )
            try {
                await nonSignUp.genProveReputationProof(
                    BigInt(attesterId),
                    epkNonce,
                    proveMinRep
                )
                expect(false).to.be.true
            } catch (e) {
                expect(e).not.to.be.undefined
            }
        })

        it('generate sign up proof should succeed', async () => {
            const epoch = await userState.getUnirepStateCurrentEpoch()
            const epkNonce = 0
            const results = await userState.genUserSignUpProof(
                BigInt(attesterId)
            )
            const expectedEpk = genEpochKey(
                id.identityNullifier,
                epoch,
                epkNonce
            ).toString()
            const isValid = await results.verify()

            expect(isValid).to.be.true
            expect(results.epochKey).equal(expectedEpk)
            expect(results.epoch).equal(epoch.toString())
            const outputGSTRoot = results.globalStateTree
            const exist = await userState.GSTRootExists(outputGSTRoot, epoch)
            expect(exist).to.be.true
            expect(Number(results.userHasSignedUp)).equal(1)
        })

        it('generate sign up proof with other attester ID should succeed', async () => {
            const epoch = await userState.getUnirepStateCurrentEpoch()
            const epkNonce = 0
            const nonSignUpAttesterId = attesterId + 1
            const results = await userState.genUserSignUpProof(
                BigInt(nonSignUpAttesterId)
            )
            const expectedEpk = genEpochKey(
                id.identityNullifier,
                epoch,
                epkNonce
            ).toString()
            const isValid = await results.verify()

            expect(isValid).to.be.true
            expect(results.epochKey).equal(expectedEpk)
            expect(results.epoch).equal(epoch.toString())
            const outputGSTRoot = results.globalStateTree
            const exist = await userState.GSTRootExists(outputGSTRoot, epoch)
            expect(exist).to.be.true
            expect(Number(results.userHasSignedUp)).equal(0)
        })

        it('non signed up user should not generate user sign up proof', async () => {
            const nonSignUp = await genUserState(
                unirepContract.provider,
                unirepContract.address,
                new ZkIdentity()
            )
            try {
                await nonSignUp.genUserSignUpProof(BigInt(attesterId))
                expect(false).to.be.true
            } catch (e) {
                expect(e).not.to.be.undefined
            }
        })
    })

    describe('Epoch transition', async () => {
        const GSTree = genNewGST(
            setting.globalStateTreeDepth,
            setting.userStateTreeDepth
        )
        const rootHistories: BigInt[] = []
        let unirepContract
        const id = new ZkIdentity()
        const otherId = new ZkIdentity()
        let userState, otherUser
        let attesterId, airdropAmount

        before(async () => {
            const accounts = await ethers.getSigners()
            unirepContract = await deployUnirep(accounts[0], {
                maxUsers,
                attestingFee,
            })
            userState = await genUserState(
                unirepContract.provider,
                unirepContract.address,
                id
            )
            otherUser = await genUserState(
                unirepContract.provider,
                unirepContract.address,
                otherId
            )
            // now initialize an attester using accounts[0]
            await unirepContract
                .connect(accounts[1])
                .attesterSignUp()
                .then((t) => t.wait())
            attesterId = await unirepContract.attesters(accounts[1].address)
            airdropAmount = Math.ceil(Math.random() * 1000)
            // then sign up our mock user
            await unirepContract
                .connect(accounts[1])
                ['userSignUp(uint256,uint256)'](
                    id.genIdentityCommitment(),
                    airdropAmount
                )
                .then((t) => t.wait())
            await unirepContract
                .connect(accounts[1])
                ['userSignUp(uint256,uint256)'](
                    otherId.genIdentityCommitment(),
                    airdropAmount
                )
                .then((t) => t.wait())
            await userState.waitForSync()
            await otherUser.waitForSync()
        })

        after(() => {
            userState.stop()
            otherUser.stop()
        })

        it('epoch transition', async () => {
            const epochLength = (await unirepContract.config()).epochLength
            await ethers.provider.send('evm_increaseTime', [
                epochLength.toNumber(),
            ])
            // now
            await unirepContract.beginEpochTransition().then((t) => t.wait())
            await userState.waitForSync()
            const currentEpoch = await userState.getUnirepStateCurrentEpoch()
            expect(
                await userState.getUnirepStateCurrentEpoch(),
                'Unirep epoch should match current epoch'
            ).equal(currentEpoch)
        })

        it('generate epoch tree should succeed', async () => {
            const currentEpoch = await userState.getUnirepStateCurrentEpoch()
            const prevEpoch = currentEpoch - 1
            const epochTree = await userState.getUnirepStateEpochTree(prevEpoch)
            const root = epochTree.root

            const exist = await userState.epochTreeRootExists(root, prevEpoch)
            expect(exist).to.be.true
        })

        it('epoch transition with wrong epoch input should fail', async () => {
            const currentEpoch = await userState.getUnirepStateCurrentEpoch()
            try {
                await userState.epochTransition(currentEpoch - 1)
                expect(false).to.be.true
            } catch (e) {
                expect(e).not.to.be.undefined
            }
        })

        it('transition other users state should success', async () => {
            const proofs = await otherUser.genUserStateTransitionProofs()

            const fromGSTRoot = proofs.startTransitionProof.globalStateTree
            const fromEpoch = Number(
                proofs.finalTransitionProof.transitionFromEpoch
            )
            const exist = await otherUser.GSTRootExists(fromGSTRoot, fromEpoch)
            expect(exist).to.be.true

            // epoch tree
            const fromEpochTree = proofs.finalTransitionProof.fromEpochTree
            const epochTreeExist = await otherUser.epochTreeRootExists(
                fromEpochTree,
                fromEpoch
            )
            expect(epochTreeExist).to.be.true

            const unirepEpochTree = await otherUser.getUnirepStateEpochTree(
                fromEpoch
            )
            expect(unirepEpochTree.root.toString()).equal(fromEpochTree)

            // epoch key nullifiers
            const epkNullifiers = await otherUser.getEpochKeyNullifiers(
                fromEpoch
            )
            for (let nullifier of epkNullifiers) {
                expect(
                    proofs.finalTransitionProof.epkNullifiers.indexOf(
                        nullifier.toString()
                    )
                ).not.equal(-1)
            }

            await submitUSTProofs(unirepContract, proofs)

            await otherUser.waitForSync()
            await userState.waitForSync()
            const currentEpoch = await userState.getUnirepStateCurrentEpoch()
            expect(
                await userState.latestTransitionedEpoch(),
                'User state should not be changed (latestTransitionedEpoch)'
            ).equal(1)
            expect(
                await userState.latestGSTLeafIndex(),
                'User state should not be changed (latestGSTLeafIndex)'
            ).equal(-1)
            const tree = await userState.genGSTree(currentEpoch)
            expect(tree.leaves.length, 'Unirep state should be changed').equal(
                1 // both users signed up in previous epoch, UST is only event so far
            )
            const USTree_ = await userState.genUserStateTree()
            const GSTLeaf_ = hashLeftRight(
                otherId.genIdentityCommitment(),
                USTree_.root
            )
            expect(GSTLeaf_.toString()).equal(
                proofs.finalTransitionProof.newGlobalStateTreeLeaf
            )

            GSTree.insert(GSTLeaf_)
            const unirepGSTree = await userState.genGSTree(currentEpoch)
            expect(GSTree.root, 'GST root mismatches').equal(unirepGSTree.root)
            rootHistories.push(GSTree.root)
        })

        it('generate user state transition proofs and verify them should success', async () => {
            const proofs = await userState.genUserStateTransitionProofs()
            await submitUSTProofs(unirepContract, proofs)
            await otherUser.waitForSync()
            await userState.waitForSync()
            const currentEpoch = await userState.getUnirepStateCurrentEpoch()
            expect(
                await userState.latestTransitionedEpoch(),
                `User state mismatches current epoch: ${currentEpoch}`
            ).equal(currentEpoch)

            // global state tree
            const USTree_ = await userState.genUserStateTree()
            const GSTLeaf_ = hashLeftRight(
                id.genIdentityCommitment(),
                USTree_.root
            )
            expect(GSTLeaf_.toString()).equal(
                proofs.finalTransitionProof.newGlobalStateTreeLeaf
            )

            GSTree.insert(GSTLeaf_)
            const unirepGSTree = await userState.genGSTree(currentEpoch)
            expect(GSTree.root, 'GST root mismatches').equal(unirepGSTree.root)
            rootHistories.push(GSTree.root)
        })

        // it('get attestations should work', async () => {
        //     const prevEpoch = 1
        //     const reputationRecord: { [key: string]: Reputation } = {}
        //     reputationRecord[attesterId.toString()] = new Reputation(
        //         BigInt(airdropAmount),
        //         BigInt(0),
        //         BigInt(0),
        //         BigInt(1)
        //     )
        //     for (let i = 0; i < NUM_EPOCH_KEY_NONCE_PER_EPOCH; i++) {
        //         const userEpk = genEpochKey(
        //             id.identityNullifier,
        //             prevEpoch,
        //             i
        //         ).toString()
        //         const attestations = attestationsToEpochKey[userEpk.toString()]
        //         for (const attestation of attestations) {
        //             const attesterId_ = attestation.attesterId
        //             if (
        //                 reputationRecord[attesterId_.toString()] === undefined
        //             ) {
        //                 reputationRecord[attesterId_.toString()] =
        //                     new Reputation(
        //                         attestation.posRep,
        //                         attestation.negRep,
        //                         attestation.graffiti,
        //                         attestation.signUp
        //                     )
        //             } else {
        //                 reputationRecord[attesterId_.toString()].update(
        //                     attestation.posRep,
        //                     attestation.negRep,
        //                     attestation.graffiti,
        //                     attestation.signUp
        //                 )
        //             }
        //         }
        //     }
        //
        //     for (const attester in reputationRecord) {
        //         const rep_ = userState.getRepByAttester(BigInt(attester))
        //         expect(reputationRecord[attester].toJSON()).equal(rep_.toJSON())
        //     }
        // })

        //     it('continue transition other users state should success', async () => {
        //         for (let i = 0; i < maxUsers - userNum - 3; i++) {
        //             const fromEpoch = 1
        //             const newGSTLeaf = genRandomSalt()
        //             const epkNullifiers: BigInt[] = []
        //             for (let j = 0; j < NUM_EPOCH_KEY_NONCE_PER_EPOCH; j++) {
        //                 epkNullifiers.push(genRandomSalt())
        //             }
        //             await userState.userStateTransition(
        //                 fromEpoch,
        //                 newGSTLeaf,
        //                 epkNullifiers
        //             )
        //
        //             const userObj = userState.toJSON()
        //
        //             expect(
        //                 userObj.latestTransitionedEpoch,
        //                 'User state should not be changed (latestTransitionedEpoch)'
        //             ).equal(epoch)
        //
        //             expect(
        //                 userObj.latestGSTLeafIndex,
        //                 'User state should not be changed (latestGSTLeafIndex)'
        //             ).equal(userNum)
        //
        //             expect(
        //                 userObj.GSTLeaves[epoch].length,
        //                 'Unirep state should be changed'
        //             ).equal(userNum + 2 + i)
        //
        //             GSTree.insert(newGSTLeaf)
        //             const unirepGSTree = userState.genGSTree(epoch)
        //             expect(GSTree.root, 'GST root mismatches').equal(
        //                 unirepGSTree.root
        //             )
        //             rootHistories.push(GSTree.root)
        //         }
        //     })

        describe('Generate proofs in the next epoch', async () => {
            it('generate epoch key proof should succeed', async () => {
                const currentEpoch =
                    await userState.getUnirepStateCurrentEpoch()
                for (let i = 0; i < setting.numEpochKeyNoncePerEpoch; i++) {
                    const results = await userState.genVerifyEpochKeyProof(i)
                    const expectedEpk = genEpochKey(
                        id.identityNullifier,
                        currentEpoch,
                        i,
                        userState.settings.epochTreeDepth
                    ).toString()
                    const isValid = await results.verify()

                    expect(isValid).to.be.true
                    expect(results.epochKey).equal(expectedEpk)
                    expect(results.epoch).equal(currentEpoch.toString())
                    const outputGSTRoot = results.globalStateTree
                    const exist = await userState.GSTRootExists(
                        outputGSTRoot,
                        currentEpoch
                    )
                    expect(exist).to.be.true
                }
            })

            it('generate epoch key proof with invalid nonce should fail', async () => {
                const invalidNonce = setting.numEpochKeyNoncePerEpoch
                try {
                    await userState.genVerifyEpochKeyProof(invalidNonce)
                    expect(false).to.be.true
                } catch (e) {
                    expect(e).not.to.be.undefined
                }
            })

            it('non signed up user should not generate epoch key proof', async () => {
                const invalidUserState = await genUserState(
                    unirepContract.provider,
                    unirepContract.address,
                    new ZkIdentity()
                )
                const epkNonce = 0
                try {
                    await invalidUserState.genVerifyEpochKeyProof(epkNonce)
                } catch (e) {
                    expect(e).not.to.be.undefined
                }
            })

            it('generate reputation proof should succeed', async () => {
                const epkNonce = Math.floor(
                    Math.random() * setting.numEpochKeyNoncePerEpoch
                )
                const rep = userState.getRepByAttester(BigInt(attesterId))
                const currentEpoch =
                    await userState.getUnirepStateCurrentEpoch()
                let proveMinRep
                if (Number(rep.posRep) - Number(rep.negRep) > 0) {
                    proveMinRep = Number(rep.posRep) - Number(rep.negRep)
                } else {
                    proveMinRep = 0
                }
                const results = await userState.genProveReputationProof(
                    BigInt(attesterId),
                    epkNonce,
                    proveMinRep
                )
                const expectedEpk = genEpochKey(
                    id.identityNullifier,
                    currentEpoch,
                    epkNonce
                ).toString()
                const isValid = await results.verify()

                expect(isValid).to.be.true
                expect(results.epochKey).equal(expectedEpk)
                expect(results.epoch).equal(currentEpoch.toString())
                const outputGSTRoot = results.globalStateTree
                const exist = await userState.GSTRootExists(
                    outputGSTRoot,
                    currentEpoch
                )
                expect(exist).to.be.true
                expect(Number(results.minRep)).equal(proveMinRep)
            })

            it('generate sign up proof should succeed', async () => {
                const currentEpoch =
                    await userState.getUnirepStateCurrentEpoch()
                const epkNonce = 0
                const results = await userState.genUserSignUpProof(
                    BigInt(attesterId)
                )
                const expectedEpk = genEpochKey(
                    id.identityNullifier,
                    currentEpoch,
                    epkNonce
                ).toString()
                const isValid = await results.verify()

                expect(isValid).to.be.true
                expect(results.epochKey).equal(expectedEpk)
                expect(results.epoch).equal(currentEpoch.toString())
                const outputGSTRoot = results.globalStateTree
                const exist = await userState.GSTRootExists(
                    outputGSTRoot,
                    currentEpoch
                )
                expect(exist).to.be.true
                expect(Number(results.userHasSignedUp)).equal(1)
            })
        })
    })
})
