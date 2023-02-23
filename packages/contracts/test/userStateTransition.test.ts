// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import {
    IncrementalMerkleTree,
    ZkIdentity,
    stringifyBigInts,
    genEpochKey,
    genRandomSalt,
    hash2,
} from '@unirep/utils'
import {
    Circuit,
    UserStateTransitionProof,
    SNARK_SCALAR_FIELD,
    SignupProof,
} from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

import { EPOCH_LENGTH } from '../src'
import { deployUnirep } from '../deploy'
import defaultConfig from '@unirep/circuits/config'
const {
    EPOCH_TREE_DEPTH,
    EPOCH_TREE_ARITY,
    STATE_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    FIELD_COUNT,
    SUM_FIELD_COUNT,
    HISTORY_TREE_DEPTH,
} = defaultConfig

const emptyEpochTree = () => {
    const epochTree = new IncrementalMerkleTree(
        EPOCH_TREE_DEPTH,
        0,
        EPOCH_TREE_ARITY
    )
    epochTree.insert(BigInt(0))
    epochTree.insert(BigInt(SNARK_SCALAR_FIELD) - BigInt(1))
    for (let x = 0; x < EPOCH_TREE_ARITY; x++) {
        epochTree.insert(BigInt(0))
    }
    return epochTree
}

const signupUser = async (id, unirepContract, attesterId, account) => {
    const epoch = await unirepContract.attesterCurrentEpoch(attesterId)
    const r = await defaultProver.genProofAndPublicSignals(
        Circuit.signup,
        stringifyBigInts({
            epoch: epoch.toString(),
            identity_nullifier: id.identityNullifier,
            identity_trapdoor: id.trapdoor,
            attester_id: attesterId,
        })
    )
    const { publicSignals, proof } = new SignupProof(
        r.publicSignals,
        r.proof,
        defaultProver
    )
    const leafIndex = await unirepContract.attesterStateTreeLeafCount(
        attesterId,
        epoch
    )
    await unirepContract
        .connect(account)
        .userSignUp(publicSignals, proof)
        .then((t) => t.wait())
    return { leaf: publicSignals[1], index: leafIndex.toNumber(), epoch }
}

describe('User State Transition', function () {
    this.timeout(500000)

    let unirepContract
    let snapshot

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])

        const attester = accounts[1]
        await unirepContract
            .connect(attester)
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())
    })

    beforeEach(async () => {
        snapshot = await ethers.provider.send('evm_snapshot', [])
    })

    afterEach(async () => {
        await ethers.provider.send('evm_revert', [snapshot])
    })

    it('should fail to transition with invalid proof', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const id = new ZkIdentity()
        const { leaf, index } = await signupUser(
            id,
            unirepContract,
            attester.address,
            attester
        )
        const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        stateTree.insert(leaf)
        const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
            .fill(null)
            .map((_, i) =>
                genEpochKey(
                    id.secretHash,
                    BigInt(attester.address),
                    0, // from epoch
                    i
                )
            )
        const historyTree = new IncrementalMerkleTree(HISTORY_TREE_DEPTH)
        historyTree.insert(hash2([stateTree.root, 0]))
        const historyTreeProof = historyTree.createProof(0)
        const epochTree = emptyEpochTree()
        const stateTreeProof = stateTree.createProof(index)
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.userStateTransition,
            stringifyBigInts({
                from_epoch: 0,
                to_epoch: 1,
                identity_secret: id.secretHash,
                state_tree_indexes: stateTreeProof.pathIndices,
                state_tree_elements: stateTreeProof.siblings,
                history_tree_indices: historyTreeProof.pathIndices,
                history_tree_elements: historyTreeProof.siblings,
                attester_id: attester.address,
                data: Array(FIELD_COUNT).fill(0),
                new_data: epochKeys.map(() => Array(FIELD_COUNT).fill(0)),
                epoch_tree_elements: epochKeys.map(() =>
                    epochTree._createProof(0).siblings.slice(1)
                ),
                epoch_tree_indices: epochKeys.map(() =>
                    epochTree._createProof(0).pathIndices.slice(1)
                ),
                noninclusion_leaf: epochKeys.map(() => [
                    0,
                    BigInt(SNARK_SCALAR_FIELD) - BigInt(1),
                ]),
                noninclusion_leaf_index: epochKeys.map(() => 0),
                noninclusion_elements: epochKeys.map(() => [
                    epochTree.leaves.slice(0, EPOCH_TREE_ARITY),
                    epochTree.leaves.slice(0, EPOCH_TREE_ARITY),
                ]),
                inclusion_leaf_index: epochKeys.map(() => BigInt(0)),
                inclusion_elements: epochKeys.map(() =>
                    Array(EPOCH_TREE_ARITY).fill(0)
                ),
            })
        )
        const p = new UserStateTransitionProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        expect(await p.verify()).to.be.true
        const { publicSignals, proof } = p

        const _proof = [...proof]
        _proof[0] = BigInt(proof[0].toString()) + BigInt(1)
        await expect(
            unirepContract
                .connect(attester)
                .userStateTransition(publicSignals, _proof)
        ).to.be.reverted
        const _publicSignals = [...publicSignals]
        _publicSignals[0] = BigInt(publicSignals[0].toString()) + BigInt(1)
        await expect(
            unirepContract
                .connect(attester)
                .userStateTransition(_publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'InvalidProof')
    })

    it('should fail to transition with invalid attester', async () => {
        const address = BigInt(12345) // not signed up attester
        const id = new ZkIdentity()
        const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
            .fill(null)
            .map((_, i) =>
                genEpochKey(
                    id.secretHash,
                    address,
                    0, // from epoch
                    i
                )
            )
        const epochTree = emptyEpochTree()
        const index = 0
        const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        stateTree.insert(genRandomSalt())
        const stateTreeProof = stateTree.createProof(index)
        const historyTree = new IncrementalMerkleTree(HISTORY_TREE_DEPTH)
        historyTree.insert(hash2([stateTree.root, 0]))
        const historyTreeProof = historyTree.createProof(0)
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.userStateTransition,
            stringifyBigInts({
                from_epoch: 0,
                to_epoch: 1,
                identity_secret: id.secretHash,
                state_tree_indexes: stateTreeProof.pathIndices,
                state_tree_elements: stateTreeProof.siblings,
                history_tree_indices: historyTreeProof.pathIndices,
                history_tree_elements: historyTreeProof.siblings,
                attester_id: address,
                data: Array(FIELD_COUNT).fill(0),
                new_data: epochKeys.map(() => Array(FIELD_COUNT).fill(0)),
                epoch_tree_elements: epochKeys.map(() =>
                    epochTree._createProof(0).siblings.slice(1)
                ),
                epoch_tree_indices: epochKeys.map(() =>
                    epochTree._createProof(0).pathIndices.slice(1)
                ),
                noninclusion_leaf: epochKeys.map(() => [
                    0,
                    BigInt(SNARK_SCALAR_FIELD) - BigInt(1),
                ]),
                noninclusion_leaf_index: epochKeys.map(() => 0),
                noninclusion_elements: epochKeys.map(() => [
                    epochTree.leaves.slice(0, EPOCH_TREE_ARITY),
                    epochTree.leaves.slice(0, EPOCH_TREE_ARITY),
                ]),
                inclusion_leaf_index: epochKeys.map(() => BigInt(0)),
                inclusion_elements: epochKeys.map(() =>
                    Array(EPOCH_TREE_ARITY).fill(0)
                ),
            })
        )
        const p = new UserStateTransitionProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        expect(await p.verify()).to.be.true
        const { publicSignals, proof } = p
        await expect(
            unirepContract.userStateTransition(publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'AttesterNotSignUp')
    })

    it('should fail to transition from invalid history root', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const id = new ZkIdentity()
        const fromEpoch = 0
        const toEpoch = fromEpoch + 1
        const { leaf, index } = await signupUser(
            id,
            unirepContract,
            attester.address,
            attester
        )
        const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        stateTree.insert(leaf)
        const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
            .fill(null)
            .map((_, i) =>
                genEpochKey(
                    id.secretHash,
                    BigInt(attester.address),
                    1, // from epoch
                    i
                )
            )
        const epochTree = emptyEpochTree()
        const stateTreeProof = stateTree.createProof(index)
        const historyTree = new IncrementalMerkleTree(HISTORY_TREE_DEPTH)
        historyTree.insert(0)
        const historyTreeProof = historyTree.createProof(0)
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.userStateTransition,
            stringifyBigInts({
                from_epoch: fromEpoch,
                to_epoch: toEpoch,
                identity_secret: id.secretHash,
                state_tree_indexes: stateTreeProof.pathIndices,
                state_tree_elements: stateTreeProof.siblings,
                history_tree_indices: historyTreeProof.pathIndices,
                history_tree_elements: historyTreeProof.siblings,
                attester_id: attester.address,
                data: Array(FIELD_COUNT).fill(0),
                new_data: epochKeys.map(() => Array(FIELD_COUNT).fill(0)),
                epoch_tree_elements: epochKeys.map(() =>
                    epochTree._createProof(0).siblings.slice(1)
                ),
                epoch_tree_indices: epochKeys.map(() =>
                    epochTree._createProof(0).pathIndices.slice(1)
                ),
                noninclusion_leaf: epochKeys.map(() => [
                    0,
                    BigInt(SNARK_SCALAR_FIELD) - BigInt(1),
                ]),
                noninclusion_leaf_index: epochKeys.map(() => 0),
                noninclusion_elements: epochKeys.map(() => [
                    epochTree.leaves.slice(0, EPOCH_TREE_ARITY),
                    epochTree.leaves.slice(0, EPOCH_TREE_ARITY),
                ]),
                inclusion_leaf_index: epochKeys.map(() => BigInt(0)),
                inclusion_elements: epochKeys.map(() =>
                    Array(EPOCH_TREE_ARITY).fill(0)
                ),
            })
        )
        const p = new UserStateTransitionProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        expect(await p.verify()).to.be.true
        const { publicSignals, proof } = p
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await unirepContract
            .connect(accounts[4])
            .sealEmptyEpoch(fromEpoch, attester.address)
            .then((t) => t.wait())
        await expect(
            unirepContract
                .connect(attester)
                .userStateTransition(publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'IncorrectHash')
    })

    it('should fail to double user state transition', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const id = new ZkIdentity()
        const { leaf, index } = await signupUser(
            id,
            unirepContract,
            attester.address,
            attester
        )
        const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        stateTree.insert(leaf)
        const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
            .fill(null)
            .map((_, i) =>
                genEpochKey(
                    id.secretHash,
                    BigInt(attester.address),
                    0, // from epoch
                    i
                )
            )
        const epochTree = emptyEpochTree()
        const stateTreeProof = stateTree.createProof(index)
        const historyTree = new IncrementalMerkleTree(HISTORY_TREE_DEPTH)
        historyTree.insert(hash2([stateTree.root, 0]))
        const historyTreeProof = historyTree.createProof(0)
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.userStateTransition,
            stringifyBigInts({
                from_epoch: 0,
                to_epoch: 1,
                identity_secret: id.secretHash,
                state_tree_indexes: stateTreeProof.pathIndices,
                state_tree_elements: stateTreeProof.siblings,
                history_tree_indices: historyTreeProof.pathIndices,
                history_tree_elements: historyTreeProof.siblings,
                attester_id: attester.address,
                data: Array(FIELD_COUNT).fill(0),
                new_data: epochKeys.map(() => Array(FIELD_COUNT).fill(0)),
                epoch_tree_elements: epochKeys.map(() =>
                    epochTree._createProof(0).siblings.slice(1)
                ),
                epoch_tree_indices: epochKeys.map(() =>
                    epochTree._createProof(0).pathIndices.slice(1)
                ),
                noninclusion_leaf: epochKeys.map(() => [0, 0]),
                noninclusion_leaf_index: epochKeys.map(() => 0),
                noninclusion_elements: epochKeys.map(() => [
                    epochTree.leaves.slice(0, EPOCH_TREE_ARITY),
                    epochTree.leaves.slice(0, EPOCH_TREE_ARITY),
                ]),
                inclusion_leaf_index: epochKeys.map(() => BigInt(0)),
                inclusion_elements: epochKeys.map(() =>
                    Array(EPOCH_TREE_ARITY).fill(0)
                ),
            })
        )
        const { publicSignals, proof } = new UserStateTransitionProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await unirepContract
            .connect(accounts[4])
            .sealEmptyEpoch(0, attester.address)
            .then((t) => t.wait())
        await unirepContract
            .connect(attester)
            .userStateTransition(publicSignals, proof)
            .then((t) => t.wait())
        await expect(
            unirepContract
                .connect(attester)
                .userStateTransition(publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'NullifierAlreadyUsed')
    })

    it('should do user state transition', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const id = new ZkIdentity()
        const { leaf, index } = await signupUser(
            id,
            unirepContract,
            attester.address,
            attester
        )
        const fromEpoch = 0
        const toEpoch = fromEpoch + 1
        const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        stateTree.insert(leaf)
        const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
            .fill(null)
            .map((_, i) =>
                genEpochKey(
                    id.secretHash,
                    BigInt(attester.address),
                    fromEpoch, // from epoch
                    i
                )
            )
        const epochTree = new IncrementalMerkleTree(
            EPOCH_TREE_DEPTH,
            0,
            EPOCH_TREE_ARITY
        )
        epochTree.insert(0)
        const stateTreeProof = stateTree.createProof(index)
        const historyTree = new IncrementalMerkleTree(HISTORY_TREE_DEPTH)
        historyTree.insert(hash2([stateTree.root, 0]))
        const historyTreeProof = historyTree.createProof(0)
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.userStateTransition,
            stringifyBigInts({
                from_epoch: fromEpoch,
                to_epoch: toEpoch,
                identity_secret: id.secretHash,
                state_tree_indexes: stateTreeProof.pathIndices,
                state_tree_elements: stateTreeProof.siblings,
                history_tree_indices: historyTreeProof.pathIndices,
                history_tree_elements: historyTreeProof.siblings,
                attester_id: attester.address,
                data: Array(FIELD_COUNT).fill(0),
                new_data: epochKeys.map(() => Array(FIELD_COUNT).fill(0)),
                epoch_tree_elements: epochKeys.map(() =>
                    epochTree._createProof(0).siblings.slice(1)
                ),
                epoch_tree_indices: epochKeys.map(() =>
                    epochTree._createProof(0).pathIndices.slice(1)
                ),
                noninclusion_leaf: epochKeys.map(() => [0, 0]),
                noninclusion_leaf_index: epochKeys.map(() => 0),
                noninclusion_elements: epochKeys.map(() => [
                    Array(EPOCH_TREE_ARITY).fill(0),
                    Array(EPOCH_TREE_ARITY).fill(0),
                ]),
                inclusion_leaf_index: epochKeys.map(() => BigInt(0)),
                inclusion_elements: epochKeys.map(() =>
                    Array(EPOCH_TREE_ARITY).fill(0)
                ),
            })
        )
        const { publicSignals, proof } = new UserStateTransitionProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await unirepContract
            .connect(accounts[4])
            .sealEmptyEpoch(fromEpoch, attester.address)
            .then((t) => t.wait())
        const tx = await unirepContract
            .connect(attester)
            .userStateTransition(publicSignals, proof)
        await tx.wait()
        const leafIndex = 0

        await expect(tx)
            .to.emit(unirepContract, 'StateTreeLeaf')
            .withArgs(toEpoch, attester.address, leafIndex, publicSignals[0])
        await expect(tx)
            .to.emit(unirepContract, 'UserStateTransitioned')
            .withArgs(
                toEpoch,
                attester.address,
                leafIndex,
                publicSignals[0],
                publicSignals[1]
            )
    })

    it('should do user state transition with attestations', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const id = new ZkIdentity()
        const { leaf, index } = await signupUser(
            id,
            unirepContract,
            attester.address,
            attester
        )
        const fromEpoch = 0
        const toEpoch = fromEpoch + 1
        const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        stateTree.insert(leaf)
        const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
            .fill(null)
            .map((_, i) =>
                genEpochKey(
                    id.secretHash,
                    BigInt(attester.address),
                    fromEpoch, // from epoch
                    i
                )
            )
        const epochTree = emptyEpochTree()
        const stateTreeProof = stateTree.createProof(index)
        const historyTree = new IncrementalMerkleTree(HISTORY_TREE_DEPTH)
        historyTree.insert(hash2([stateTree.root, 0]))
        const historyTreeProof = historyTree.createProof(0)
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.userStateTransition,
            stringifyBigInts({
                from_epoch: fromEpoch,
                to_epoch: toEpoch,
                identity_secret: id.secretHash,
                state_tree_indexes: stateTreeProof.pathIndices,
                state_tree_elements: stateTreeProof.siblings,
                history_tree_indices: historyTreeProof.pathIndices,
                history_tree_elements: historyTreeProof.siblings,
                attester_id: attester.address,
                data: Array(FIELD_COUNT).fill(0),
                new_data: epochKeys.map(() => Array(FIELD_COUNT).fill(0)),
                epoch_tree_elements: epochKeys.map(() =>
                    epochTree._createProof(0).siblings.slice(1)
                ),
                epoch_tree_indices: epochKeys.map(() =>
                    epochTree._createProof(0).pathIndices.slice(1)
                ),
                noninclusion_leaf: epochKeys.map(() => [0, 0]),
                noninclusion_leaf_index: epochKeys.map(() => 0),
                noninclusion_elements: epochKeys.map(() => [
                    epochTree.leaves.slice(0, EPOCH_TREE_ARITY),
                    epochTree.leaves.slice(0, EPOCH_TREE_ARITY),
                ]),
                inclusion_leaf_index: epochKeys.map(() => BigInt(0)),
                inclusion_elements: epochKeys.map(() =>
                    Array(EPOCH_TREE_ARITY).fill(0)
                ),
            })
        )
        const { publicSignals, proof } = new UserStateTransitionProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await unirepContract
            .connect(accounts[4])
            .sealEmptyEpoch(fromEpoch, attester.address)
            .then((t) => t.wait())
        const tx = await unirepContract
            .connect(attester)
            .userStateTransition(publicSignals, proof)
        await tx.wait()
        const leafIndex = 0

        await expect(tx)
            .to.emit(unirepContract, 'StateTreeLeaf')
            .withArgs(toEpoch, attester.address, leafIndex, publicSignals[0])
        await expect(tx)
            .to.emit(unirepContract, 'UserStateTransitioned')
            .withArgs(
                toEpoch,
                attester.address,
                leafIndex,
                publicSignals[0],
                publicSignals[1]
            )
    })

    it('should do multiple user state transitions', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]

        const users = 3
        const epochs = 3
        let fromEpoch = (
            await unirepContract.attesterCurrentEpoch(attester.address)
        ).toNumber()
        let fromEpochStateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        const userState = Array(users)
            .fill(null)
            .map(() => {
                return {
                    id: new ZkIdentity(),
                    index: 0,
                }
            })
        for (let i = 0; i < users; i++) {
            const { leaf, index } = await signupUser(
                userState[i].id,
                unirepContract,
                attester.address,
                attester
            )
            fromEpochStateTree.insert(leaf)
            userState[i].index = index
        }

        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])
        const startEpoch = (
            await unirepContract.attesterCurrentEpoch(attester.address)
        ).toNumber()
        const historyTree = new IncrementalMerkleTree(HISTORY_TREE_DEPTH)
        for (let epoch = startEpoch; epoch < startEpoch + epochs; epoch++) {
            const toEpochStateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
            await unirepContract
                .connect(accounts[4])
                .sealEmptyEpoch(fromEpoch, attester.address)
                .then((t) => t.wait())
            historyTree.insert(hash2([fromEpochStateTree.root, 0]))
            for (let i = 0; i < users; i++) {
                const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
                    .fill(null)
                    .map((_, n) =>
                        genEpochKey(
                            userState[i].id.secretHash,
                            BigInt(attester.address),
                            fromEpoch, // from epoch
                            n
                        )
                    )
                const epochTree = emptyEpochTree()
                const stateTreeProof = fromEpochStateTree.createProof(
                    userState[i].index
                )
                const historyTreeProof = historyTree.createProof(
                    epoch - startEpoch
                )
                const r = await defaultProver.genProofAndPublicSignals(
                    Circuit.userStateTransition,
                    stringifyBigInts({
                        from_epoch: fromEpoch,
                        to_epoch: epoch,
                        identity_secret: userState[i].id.secretHash,
                        state_tree_indexes: stateTreeProof.pathIndices,
                        state_tree_elements: stateTreeProof.siblings,
                        history_tree_indices: historyTreeProof.pathIndices,
                        history_tree_elements: historyTreeProof.siblings,
                        attester_id: attester.address,
                        data: Array(FIELD_COUNT).fill(0),
                        new_data: epochKeys.map(() =>
                            Array(FIELD_COUNT).fill(0)
                        ),
                        epoch_tree_elements: epochKeys.map(() =>
                            epochTree._createProof(0).siblings.slice(1)
                        ),
                        epoch_tree_indices: epochKeys.map(() =>
                            epochTree._createProof(0).pathIndices.slice(1)
                        ),
                        noninclusion_leaf: epochKeys.map(() => [0, 0]),
                        noninclusion_leaf_index: epochKeys.map(() => 0),
                        noninclusion_elements: epochKeys.map(() => [
                            epochTree.leaves.slice(0, EPOCH_TREE_ARITY),
                            epochTree.leaves.slice(0, EPOCH_TREE_ARITY),
                        ]),
                        inclusion_leaf_index: epochKeys.map(() => BigInt(0)),
                        inclusion_elements: epochKeys.map(() =>
                            Array(EPOCH_TREE_ARITY).fill(0)
                        ),
                    })
                )
                const { publicSignals, proof, stateTreeLeaf } =
                    new UserStateTransitionProof(
                        r.publicSignals,
                        r.proof,
                        defaultProver
                    )
                await unirepContract
                    .connect(attester)
                    .userStateTransition(publicSignals, proof)
                    .then((t) => t.wait())
                userState[i].index = i
                toEpochStateTree.insert(stateTreeLeaf)

                const exist = await unirepContract.attesterStateTreeRootExists(
                    attester.address,
                    epoch,
                    toEpochStateTree.root
                )
                expect(exist).to.be.true
            }
            await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
            fromEpochStateTree = toEpochStateTree
            fromEpoch = epoch
        }
    })
})
