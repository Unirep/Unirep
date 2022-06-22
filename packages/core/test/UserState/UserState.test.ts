import { ethers } from 'hardhat'
import { expect } from 'chai'
import {
    IncrementalMerkleTree,
    ZkIdentity,
    hashLeftRight,
} from '@unirep/crypto'
import {
    Attestation,
    deployUnirep,
    UserTransitionProof,
    computeProcessAttestationsProofHash,
    computeStartTransitionProofHash,
} from '@unirep/contracts'
import {
    EPOCH_LENGTH,
    EPOCH_TREE_DEPTH,
    GLOBAL_STATE_TREE_DEPTH,
    MAX_REPUTATION_BUDGET,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    USER_STATE_TREE_DEPTH,
    Circuit,
    verifyProof,
    formatProofForVerifierContract,
} from '@unirep/circuits'

const ATTESTING_FEE = '0' as any
const attestingFee = ethers.utils.parseEther('0.1')

import {
    Reputation,
    genEpochKey,
    computeInitUserStateRoot,
    ISettings,
} from '../../src'
import { genNewGST, genUserState } from '../utils'

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
    }
    const maxUsers = 10
    const userNum = Math.ceil(Math.random() * maxUsers)

    describe('Users sign up', async function () {
        let unirepContract
        const GSTree = new IncrementalMerkleTree(setting.globalStateTreeDepth)
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
                await unirepContract
                    .connect(tmpWallet)
                    .setAirdropAmount(airdropAmount)
                    .then((t) => t.wait())
                const tmpId = new ZkIdentity()
                const tmpUserState = await genUserState(
                    unirepContract.provider,
                    unirepContract.address,
                    tmpId
                ) // TODO: verify this state too?
                await unirepContract
                    .connect(tmpWallet)
                    .userSignUp(tmpId.genIdentityCommitment())
                    .then((t) => t.wait())
                await userState.unirepState.waitForSync()

                // check the tmp state and the control above

                expect(
                    userState.hasSignedUp,
                    'User state cannot be changed (hasSignedUp)'
                ).to.be.false
                expect(
                    userState.latestTransitionedEpoch,
                    'User state cannot be changed (latestTransitionedEpoch)'
                ).equal(0)
                expect(
                    userState.latestGSTLeafIndex,
                    'User state cannot be changed (latestGSTLeafIndex)'
                ).equal(0)
                const tree = await userState.unirepState.genGSTree(epoch)
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
                const unirepGSTree = await userState.getUnirepStateGSTree(epoch)
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
                await userState.getUnirepStateGSTree(wrongEpoch)
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
                .setAirdropAmount(airdropAmount)
                .then((t) => t.wait())
            await unirepContract
                .connect(tmpWallet)
                .userSignUp(id.genIdentityCommitment())
                .then((t) => t.wait())
            await userState.unirepState.waitForSync()

            expect(
                userState.hasSignedUp,
                'User state should be changed (hasSignedUp)'
            ).to.be.true
            expect(
                userState.latestTransitionedEpoch,
                'User state should be changed (latestTransitionedEpoch)'
            ).not.equal(0)
            expect(
                userState.latestGSTLeafIndex,
                'User state should be changed (latestGSTLeafIndex)'
            ).equal(userNum)
            const tree = await userState.unirepState.genGSTree(epoch)
            expect(tree.leaves.length, 'Unirep state should be changed').equal(
                userNum + 1
            )
            expect(
                userState.latestUserStateLeaves[0],
                'Sign up airdrop should be updated'
            ).not.to.be.undefined

            // GST should match
            const USTRoot = computeInitUserStateRoot(
                setting.userStateTreeDepth,
                attesterId,
                airdropAmount
            )
            const GSTLeaf = hashLeftRight(id.genIdentityCommitment(), USTRoot)
            GSTree.insert(GSTLeaf)
            const unirepGSTree = await userState.getUnirepStateGSTree(epoch)
            expect(GSTree.root, 'GST root mismatches').equal(unirepGSTree.root)
            rootHistories.push(GSTree.root)
        })

        it('continue sign up other users', async () => {
            const accounts = await ethers.getSigners()
            const epoch = await userState.getUnirepStateCurrentEpoch()
            for (let i = 0; i < maxUsers - userNum - 3; i++) {
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
                await unirepContract
                    .connect(tmpWallet)
                    .setAirdropAmount(airdropAmount)
                    .then((t) => t.wait())
                const tmpId = new ZkIdentity()
                const tmpUserState = await genUserState(
                    unirepContract.provider,
                    unirepContract.address,
                    tmpId
                ) // TODO: verify this state too?
                await unirepContract
                    .connect(tmpWallet)
                    .userSignUp(tmpId.genIdentityCommitment())
                    .then((t) => t.wait())
                await userState.unirepState.waitForSync()

                // check the tmp state and the control above

                expect(
                    userState.hasSignedUp,
                    'User state cannot be changed (hasSignedUp)'
                ).to.be.true
                expect(
                    userState.latestTransitionedEpoch,
                    'User state cannot be changed (latestTransitionedEpoch)'
                ).equal(1)
                expect(
                    userState.latestGSTLeafIndex,
                    'User state cannot be changed (latestGSTLeafIndex)'
                ).equal(userNum)
                const tree = await userState.unirepState.genGSTree(epoch)
                expect(
                    tree.leaves.length,
                    'Unirep state should be changed'
                ).equal(userNum + 2 + i)
                expect(
                    userState.latestUserStateLeaves,
                    'Sign up airdrop should be updated'
                ).not.to.be.undefined

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
                const unirepGSTree = await userState.getUnirepStateGSTree(epoch)
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
            await unirepContract
                .connect(accounts[1])
                .setAirdropAmount(airdropAmount)
                .then((t) => t.wait())
            // then sign up our mock user
            await unirepContract
                .connect(accounts[1])
                .userSignUp(id.genIdentityCommitment())
                .then((t) => t.wait())
            await userState.unirepState.waitForSync()
        })

        it('generate epoch key proof should succeed', async () => {
            const epoch = await userState.getUnirepStateCurrentEpoch()
            for (let i = 0; i < setting.numEpochKeyNoncePerEpoch; i++) {
                const results = await userState.genVerifyEpochKeyProof(i)
                const expectedEpk = genEpochKey(
                    id.identityNullifier,
                    epoch,
                    i
                ).toString()
                const isValid = await verifyProof(
                    Circuit.verifyEpochKey,
                    results.proof,
                    results.publicSignals
                )

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
            const isValid = await verifyProof(
                Circuit.proveReputation,
                results.proof,
                results.publicSignals
            )

            expect(isValid).to.be.true
            expect(results.epochKey).equal(expectedEpk)
            expect(results.epoch).equal(epoch.toString())
            const outputGSTRoot = results.globalStatetreeRoot
            const exist = await userState.GSTRootExists(outputGSTRoot, epoch)
            expect(exist).to.be.true
            expect(Number(results.minRep)).equal(proveMinRep)
        })

        it('generate reputation proof with nullifiers nonces should succeed', async () => {
            const epoch = await userState.getUnirepStateCurrentEpoch()
            const epkNonce = Math.floor(
                Math.random() * setting.numEpochKeyNoncePerEpoch
            )
            const proveNullifiers = Math.floor(Math.random() * airdropAmount)
            const nonceList: BigInt[] = []
            for (let i = 0; i < setting.maxReputationBudget; i++) {
                if (i < proveNullifiers) nonceList.push(BigInt(i))
                else nonceList.push(BigInt(-1))
            }
            const results = await userState.genProveReputationProof(
                BigInt(attesterId),
                epkNonce,
                proveNullifiers,
                undefined,
                undefined,
                nonceList
            )
            const expectedEpk = genEpochKey(
                id.identityNullifier,
                epoch,
                epkNonce
            ).toString()
            const isValid = await verifyProof(
                Circuit.proveReputation,
                results.proof,
                results.publicSignals
            )

            expect(isValid).to.be.true
            expect(results.epochKey).equal(expectedEpk)
            expect(results.epoch).equal(epoch.toString())
            const outputGSTRoot = results.globalStatetreeRoot
            const exist = await userState.GSTRootExists(outputGSTRoot, epoch)
            expect(exist).to.be.true
            expect(Number(results.minRep)).equal(proveNullifiers)
            expect(Number(results.proveReputationAmount)).equal(
                Math.min(setting.maxReputationBudget, proveNullifiers)
            )
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
            const isValid = await verifyProof(
                Circuit.proveReputation,
                results.proof,
                results.publicSignals
            )
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
            const isValid = await verifyProof(
                Circuit.proveReputation,
                results.proof,
                results.publicSignals
            )
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
            const isValid = await verifyProof(
                Circuit.proveUserSignUp,
                results.proof,
                results.publicSignals
            )

            expect(isValid).to.be.true
            expect(results.epochKey).equal(expectedEpk)
            expect(results.epoch).equal(epoch.toString())
            const outputGSTRoot = results.globalStateTreeRoot
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
            const isValid = await verifyProof(
                Circuit.proveUserSignUp,
                results.proof,
                results.publicSignals
            )

            expect(isValid).to.be.true
            expect(results.epochKey).equal(expectedEpk)
            expect(results.epoch).equal(epoch.toString())
            const outputGSTRoot = results.globalStateTreeRoot
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
        const GSTree = new IncrementalMerkleTree(setting.globalStateTreeDepth)
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
            await unirepContract
                .connect(accounts[1])
                .setAirdropAmount(airdropAmount)
                .then((t) => t.wait())
            // then sign up our mock user
            await unirepContract
                .connect(accounts[1])
                .userSignUp(id.genIdentityCommitment())
                .then((t) => t.wait())
            await unirepContract
                .connect(accounts[1])
                .userSignUp(otherId.genIdentityCommitment())
                .then((t) => t.wait())
            await userState.unirepState.waitForSync()
            await otherUser.unirepState.waitForSync()
        })

        it('epoch transition', async () => {
            const epochLength = await unirepContract.epochLength()
            await ethers.provider.send('evm_increaseTime', [
                epochLength.toNumber(),
            ])
            // now
            await unirepContract.beginEpochTransition().then((t) => t.wait())
            await userState.unirepState.waitForSync()
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
            const {
                startTransitionProof,
                processAttestationProofs,
                finalTransitionProof,
            } = await otherUser.genUserStateTransitionProofs()

            const isStartProofValid = await verifyProof(
                Circuit.startTransition,
                startTransitionProof.proof,
                startTransitionProof.publicSignals
            )
            expect(isStartProofValid).to.be.true
            const fromGSTRoot = startTransitionProof.globalStateTreeRoot
            const fromEpoch = Number(finalTransitionProof.transitionedFromEpoch)
            const exist = await otherUser.GSTRootExists(fromGSTRoot, fromEpoch)
            expect(exist).to.be.true

            for (let i = 0; i < processAttestationProofs.length; i++) {
                const isProcessAttestationValid = await verifyProof(
                    Circuit.processAttestations,
                    processAttestationProofs[i].proof,
                    processAttestationProofs[i].publicSignals
                )
                expect(isProcessAttestationValid).to.be.true
            }

            const isUSTProofValid = await verifyProof(
                Circuit.userStateTransition,
                finalTransitionProof.proof,
                finalTransitionProof.publicSignals
            )
            expect(isUSTProofValid).to.be.true
            expect(finalTransitionProof.fromGSTRoot).equal(
                startTransitionProof.globalStateTreeRoot
            )

            // epoch tree
            const fromEpochTree = finalTransitionProof.fromEpochTree
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
                    finalTransitionProof.epochKeyNullifiers.indexOf(
                        nullifier.toString()
                    )
                ).not.equal(-1)
            }

            await unirepContract.startUserStateTransition(
                startTransitionProof.blindedUserState,
                startTransitionProof.blindedHashChain,
                startTransitionProof.globalStateTreeRoot,
                formatProofForVerifierContract(startTransitionProof.proof)
            )
            let proofIndexes = [] as any[]
            let proofNullifier = computeStartTransitionProofHash(
                startTransitionProof.blindedUserState,
                startTransitionProof.blindedHashChain,
                startTransitionProof.globalStateTreeRoot,
                formatProofForVerifierContract(startTransitionProof.proof)
            )
            let proofIndex = await unirepContract.getProofIndex(proofNullifier)
            proofIndexes.push(proofIndex)
            let isValid

            for (let i = 0; i < processAttestationProofs.length; i++) {
                isValid = await verifyProof(
                    Circuit.processAttestations,
                    processAttestationProofs[i].proof,
                    processAttestationProofs[i].publicSignals
                )
                expect(
                    isValid,
                    'Verify process attestations circuit off-chain failed'
                ).to.be.true

                const outputBlindedUserState =
                    processAttestationProofs[i].outputBlindedUserState
                const outputBlindedHashChain =
                    processAttestationProofs[i].outputBlindedHashChain
                const inputBlindedUserState =
                    processAttestationProofs[i].inputBlindedUserState

                // submit random process attestations should success and not affect the results
                const falseInput = ethers.BigNumber.from(
                    new ZkIdentity().identityNullifier
                )
                await unirepContract
                    .processAttestations(
                        outputBlindedUserState,
                        outputBlindedHashChain,
                        falseInput,
                        formatProofForVerifierContract(
                            processAttestationProofs[i].proof
                        )
                    )
                    .then((t) => t.wait())

                await unirepContract
                    .processAttestations(
                        outputBlindedUserState,
                        outputBlindedHashChain,
                        inputBlindedUserState,
                        formatProofForVerifierContract(
                            processAttestationProofs[i].proof
                        )
                    )
                    .then((t) => t.wait())

                const proofNullifier = computeProcessAttestationsProofHash(
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    inputBlindedUserState,
                    formatProofForVerifierContract(
                        processAttestationProofs[i].proof
                    )
                )
                const proofIndex = await unirepContract.getProofIndex(
                    proofNullifier
                )
                proofIndexes.push(proofIndex)
            }

            isValid = await verifyProof(
                Circuit.userStateTransition,
                finalTransitionProof.proof,
                finalTransitionProof.publicSignals
            )
            expect(
                isValid,
                'Verify user state transition circuit off-chain failed'
            ).to.be.true

            const transitionProof = new UserTransitionProof(
                finalTransitionProof.publicSignals,
                finalTransitionProof.proof
            )

            await unirepContract
                .updateUserStateRoot(transitionProof, proofIndexes)
                .then((t) => t.wait())
            await otherUser.unirepState.waitForSync()
            await userState.unirepState.waitForSync()
            const currentEpoch = await userState.getUnirepStateCurrentEpoch()
            expect(
                userState.latestTransitionedEpoch,
                'User state should not be changed (latestTransitionedEpoch)'
            ).equal(1)
            expect(
                userState.latestGSTLeafIndex,
                'User state should not be changed (latestGSTLeafIndex)'
            ).equal(0)
            const tree = await userState.unirepState.genGSTree(currentEpoch)
            expect(tree.leaves.length, 'Unirep state should be changed').equal(
                1 // both users signed up in previous epoch, UST is only event so far
            )
            const USTree_ = await userState.genUserStateTree()
            const GSTLeaf_ = hashLeftRight(
                otherId.genIdentityCommitment(),
                USTree_.root
            )
            expect(GSTLeaf_.toString()).equal(
                finalTransitionProof.newGlobalStateTreeLeaf
            )

            GSTree.insert(GSTLeaf_)
            const unirepGSTree = await userState.getUnirepStateGSTree(
                currentEpoch
            )
            expect(GSTree.root, 'GST root mismatches').equal(unirepGSTree.root)
            rootHistories.push(GSTree.root)
        })

        it('generate user state transition proofs and verify them should success', async () => {
            const {
                startTransitionProof,
                processAttestationProofs,
                finalTransitionProof,
            } = await userState.genUserStateTransitionProofs()

            const isStartProofValid = await verifyProof(
                Circuit.startTransition,
                startTransitionProof.proof,
                startTransitionProof.publicSignals
            )
            expect(isStartProofValid).to.be.true
            const fromGSTRoot = startTransitionProof.globalStateTreeRoot
            const fromEpoch = Number(finalTransitionProof.transitionedFromEpoch)
            const exist = await userState.GSTRootExists(fromGSTRoot, fromEpoch)
            expect(exist).to.be.true

            for (let i = 0; i < processAttestationProofs.length; i++) {
                const isProcessAttestationValid = await verifyProof(
                    Circuit.processAttestations,
                    processAttestationProofs[i].proof,
                    processAttestationProofs[i].publicSignals
                )
                expect(isProcessAttestationValid).to.be.true
            }

            const isUSTProofValid = await verifyProof(
                Circuit.userStateTransition,
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

            const unirepEpochTree = await userState.getUnirepStateEpochTree(
                fromEpoch
            )
            expect(unirepEpochTree.root.toString()).equal(fromEpochTree)

            // epoch key nullifiers
            const epkNullifiers = await userState.getEpochKeyNullifiers(
                fromEpoch
            )
            for (let nullifier of epkNullifiers) {
                expect(
                    finalTransitionProof.epochKeyNullifiers.indexOf(
                        nullifier.toString()
                    )
                ).not.equal(-1)
            }

            await unirepContract.startUserStateTransition(
                startTransitionProof.blindedUserState,
                startTransitionProof.blindedHashChain,
                startTransitionProof.globalStateTreeRoot,
                formatProofForVerifierContract(startTransitionProof.proof)
            )

            let proofIndexes = [] as any[]
            let proofNullifier = computeStartTransitionProofHash(
                startTransitionProof.blindedUserState,
                startTransitionProof.blindedHashChain,
                startTransitionProof.globalStateTreeRoot,
                formatProofForVerifierContract(startTransitionProof.proof)
            )
            let proofIndex = await unirepContract.getProofIndex(proofNullifier)
            proofIndexes.push(proofIndex)
            let isValid

            for (let i = 0; i < processAttestationProofs.length; i++) {
                isValid = await verifyProof(
                    Circuit.processAttestations,
                    processAttestationProofs[i].proof,
                    processAttestationProofs[i].publicSignals
                )
                expect(
                    isValid,
                    'Verify process attestations circuit off-chain failed'
                ).to.be.true

                const outputBlindedUserState =
                    processAttestationProofs[i].outputBlindedUserState
                const outputBlindedHashChain =
                    processAttestationProofs[i].outputBlindedHashChain
                const inputBlindedUserState =
                    processAttestationProofs[i].inputBlindedUserState

                // submit random process attestations should success and not affect the results
                const falseInput = ethers.BigNumber.from(
                    new ZkIdentity().identityNullifier
                )
                await unirepContract
                    .processAttestations(
                        outputBlindedUserState,
                        outputBlindedHashChain,
                        falseInput,
                        formatProofForVerifierContract(
                            processAttestationProofs[i].proof
                        )
                    )
                    .then((t) => t.wait())

                await unirepContract
                    .processAttestations(
                        outputBlindedUserState,
                        outputBlindedHashChain,
                        inputBlindedUserState,
                        formatProofForVerifierContract(
                            processAttestationProofs[i].proof
                        )
                    )
                    .then((t) => t.wait())

                const proofNullifier = computeProcessAttestationsProofHash(
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    inputBlindedUserState,
                    formatProofForVerifierContract(
                        processAttestationProofs[i].proof
                    )
                )
                const proofIndex = await unirepContract.getProofIndex(
                    proofNullifier
                )
                proofIndexes.push(proofIndex)
            }

            isValid = await verifyProof(
                Circuit.userStateTransition,
                finalTransitionProof.proof,
                finalTransitionProof.publicSignals
            )
            expect(
                isValid,
                'Verify user state transition circuit off-chain failed'
            ).to.be.true

            const transitionProof = new UserTransitionProof(
                finalTransitionProof.publicSignals,
                finalTransitionProof.proof
            )

            await unirepContract
                .updateUserStateRoot(transitionProof, proofIndexes)
                .then((t) => t.wait())
            await otherUser.unirepState.waitForSync()
            await userState.unirepState.waitForSync()
            const currentEpoch = await userState.getUnirepStateCurrentEpoch()
            console.log('asserting')
            expect(
                Number(userState.latestTransitionedEpoch),
                `User state mismatches current epoch: ${currentEpoch}`
            ).equal(currentEpoch)

            // global state tree
            const USTree_ = await userState.genUserStateTree()
            const GSTLeaf_ = hashLeftRight(
                id.genIdentityCommitment(),
                USTree_.root
            )
            expect(GSTLeaf_.toString()).equal(
                finalTransitionProof.newGlobalStateTreeLeaf
            )

            GSTree.insert(GSTLeaf_)
            const unirepGSTree = await userState.getUnirepStateGSTree(
                currentEpoch
            )
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
        //                 userObj.unirepState.GSTLeaves[epoch].length,
        //                 'Unirep state should be changed'
        //             ).equal(userNum + 2 + i)
        //
        //             GSTree.insert(newGSTLeaf)
        //             const unirepGSTree = userState.getUnirepStateGSTree(epoch)
        //             expect(GSTree.root, 'GST root mismatches').equal(
        //                 unirepGSTree.root
        //             )
        //             rootHistories.push(GSTree.root)
        //         }
        //     })
    })

    describe('Generate proofs in the next epoch', async () => {
        //     it('generate epoch key proof should succeed', async () => {
        //         for (let i = 0; i < setting.numEpochKeyNoncePerEpoch; i++) {
        //             const results = await userState.genVerifyEpochKeyProof(i)
        //             const expectedEpk = genEpochKey(
        //                 user.identityNullifier,
        //                 epoch,
        //                 i
        //             ).toString()
        //             const isValid = await verifyProof(
        //                 Circuit.verifyEpochKey,
        //                 results.proof,
        //                 results.publicSignals
        //             )
        //
        //             expect(isValid).to.be.true
        //             expect(results.epochKey).equal(expectedEpk)
        //             expect(results.epoch).equal(epoch.toString())
        //             const outputGSTRoot = results.globalStateTree
        //             const exist = userState.GSTRootExists(outputGSTRoot, epoch)
        //             expect(exist).to.be.true
        //         }
        //     })
        //
        //     it('generate epoch key proof with invalid nonce should fail', async () => {
        //         let error
        //         const invalidNonce = setting.numEpochKeyNoncePerEpoch
        //         try {
        //             await userState.genVerifyEpochKeyProof(invalidNonce)
        //         } catch (e) {
        //             error = e
        //         }
        //         expect(error).not.to.be.undefined
        //     })
        //
        //     it('non signed up user should not generate epoch key proof', async () => {
        //         let error
        //         const invalidUserState = new UserState(
        //             unirepState,
        //             new ZkIdentity()
        //         )
        //         const epkNonce = 0
        //         try {
        //             await invalidUserState.genVerifyEpochKeyProof(epkNonce)
        //         } catch (e) {
        //             error = e
        //         }
        //         expect(error).not.to.be.undefined
        //     })
        //
        //     it('generate reputation proof should succeed', async () => {
        //         const epkNonce = Math.floor(
        //             Math.random() * setting.numEpochKeyNoncePerEpoch
        //         )
        //         const rep = userState.getRepByAttester(BigInt(signedUpAttesterId))
        //         let proveMinRep
        //         if (Number(rep.posRep) - Number(rep.negRep) > 0) {
        //             proveMinRep = Number(rep.posRep) - Number(rep.negRep)
        //         } else {
        //             proveMinRep = 0
        //         }
        //         const results = await userState.genProveReputationProof(
        //             BigInt(signedUpAttesterId),
        //             epkNonce,
        //             proveMinRep
        //         )
        //         const expectedEpk = genEpochKey(
        //             user.identityNullifier,
        //             epoch,
        //             epkNonce
        //         ).toString()
        //         const isValid = await verifyProof(
        //             Circuit.proveReputation,
        //             results.proof,
        //             results.publicSignals
        //         )
        //
        //         expect(isValid).to.be.true
        //         expect(results.epochKey).equal(expectedEpk)
        //         expect(results.epoch).equal(epoch.toString())
        //         const outputGSTRoot = results.globalStatetreeRoot
        //         const exist = userState.GSTRootExists(outputGSTRoot, epoch)
        //         expect(exist).to.be.true
        //         expect(Number(results.minRep)).equal(proveMinRep)
        //     })
        //
        //     it('generate sign up proof should succeed', async () => {
        //         const epkNonce = 0
        //         const results = await userState.genUserSignUpProof(
        //             BigInt(signedUpAttesterId)
        //         )
        //         const expectedEpk = genEpochKey(
        //             user.identityNullifier,
        //             epoch,
        //             epkNonce
        //         ).toString()
        //         const isValid = await verifyProof(
        //             Circuit.proveUserSignUp,
        //             results.proof,
        //             results.publicSignals
        //         )
        //
        //         expect(isValid).to.be.true
        //         expect(results.epochKey).equal(expectedEpk)
        //         expect(results.epoch).equal(epoch.toString())
        //         const outputGSTRoot = results.globalStateTreeRoot
        //         const exist = userState.GSTRootExists(outputGSTRoot, epoch)
        //         expect(exist).to.be.true
        //         expect(Number(results.userHasSignedUp)).equal(1)
        //     })
    })
})
