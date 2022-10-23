// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import {
    hash4,
    hashLeftRight,
    IncrementalMerkleTree,
    SparseMerkleTree,
    ZkIdentity,
    stringifyBigInts,
    genEpochKey,
    genStateTreeLeaf,
} from '@unirep/crypto'
import {
    EPOCH_TREE_DEPTH,
    STATE_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    Circuit,
} from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

import {
    EPOCH_LENGTH,
    Unirep,
    UserStateTransitionProof,
    SignupProof,
} from '../src'
import { deployUnirep } from '../deploy'

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
    return { leaf: publicSignals[1], index: leafIndex.toNumber() }
}

describe('User State Transition', function () {
    this.timeout(120000)

    let unirepContract

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])
    })

    it('should have the correct config value', async () => {
        const config = await unirepContract.config()
        expect(NUM_EPOCH_KEY_NONCE_PER_EPOCH).equal(
            config.numEpochKeyNoncePerEpoch
        )
        expect(EPOCH_TREE_DEPTH).equal(config.epochTreeDepth)
        expect(STATE_TREE_DEPTH).equal(config.stateTreeDepth)
    })

    it('attester sign up', async () => {
        const accounts = await ethers.getSigners()
        await unirepContract
            .connect(accounts[1])
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())
    })

    const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)

    it('should fail to transition with invalid proof', async () => {
        const accounts = await ethers.getSigners()
        const id = new ZkIdentity()
        const { leaf, index } = await signupUser(
            id,
            unirepContract,
            accounts[1].address,
            accounts[1]
        )
        stateTree.insert(leaf)
        const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
            .fill(null)
            .map((_, i) =>
                genEpochKey(
                    id.identityNullifier,
                    BigInt(accounts[1].address),
                    0, // from epoch
                    i,
                    2 ** EPOCH_TREE_DEPTH
                )
            )
        const epochTree = new SparseMerkleTree(
            EPOCH_TREE_DEPTH,
            hash4([0, 0, 0, 0])
        )
        const stateTreeProof = stateTree.createProof(index)
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.userStateTransition,
            stringifyBigInts({
                from_epoch: 0,
                to_epoch: 1,
                identity_nullifier: id.identityNullifier,
                state_tree_indexes: stateTreeProof.pathIndices,
                state_tree_elements: stateTreeProof.siblings,
                attester_id: BigInt(accounts[1].address),
                pos_rep: 0,
                neg_rep: 0,
                graffiti: 0,
                timestamp: 0,
                new_pos_rep: epochKeys.map(() => 0),
                new_neg_rep: epochKeys.map(() => 0),
                new_graffiti: epochKeys.map(() => 0),
                new_timestamp: epochKeys.map(() => 0),
                epoch_tree_elements: epochKeys.map((key) =>
                    epochTree.createProof(key)
                ),
                epoch_tree_root: epochTree.root,
            })
        )
        const { publicSignals, proof } = new UserStateTransitionProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        const _proof = [...proof]
        _proof[0] = BigInt(proof[0].toString()) + BigInt(1)
        await expect(
            unirepContract
                .connect(accounts[1])
                .userStateTransition(publicSignals, _proof)
        ).to.be.reverted
        const _publicSignals = [...publicSignals]
        _publicSignals[0] = BigInt(publicSignals[0].toString()) + BigInt(1)
        await expect(
            unirepContract
                .connect(accounts[1])
                .userStateTransition(_publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'InvalidProof')
    })

    it('should fail to transition from wrong epoch', async () => {
        const accounts = await ethers.getSigners()
        const id = new ZkIdentity()
        const { leaf, index } = await signupUser(
            id,
            unirepContract,
            accounts[1].address,
            accounts[1]
        )
        stateTree.insert(leaf)
        const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
            .fill(null)
            .map((_, i) =>
                genEpochKey(
                    id.identityNullifier,
                    BigInt(accounts[1].address),
                    0, // from epoch
                    i,
                    2 ** EPOCH_TREE_DEPTH
                )
            )
        const epochTree = new SparseMerkleTree(
            EPOCH_TREE_DEPTH,
            hash4([0, 0, 0, 0])
        )
        const stateTreeProof = stateTree.createProof(index)
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.userStateTransition,
            stringifyBigInts({
                from_epoch: 1,
                to_epoch: 2,
                identity_nullifier: id.identityNullifier,
                state_tree_indexes: stateTreeProof.pathIndices,
                state_tree_elements: stateTreeProof.siblings,
                attester_id: BigInt(accounts[1].address),
                pos_rep: 0,
                neg_rep: 0,
                graffiti: 0,
                timestamp: 0,
                new_pos_rep: epochKeys.map(() => 0),
                new_neg_rep: epochKeys.map(() => 0),
                new_graffiti: epochKeys.map(() => 0),
                new_timestamp: epochKeys.map(() => 0),
                epoch_tree_elements: epochKeys.map((key) =>
                    epochTree.createProof(key)
                ),
                epoch_tree_root: epochTree.root,
            })
        )
        const { publicSignals, proof } = new UserStateTransitionProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        await expect(
            unirepContract
                .connect(accounts[1])
                .userStateTransition(publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'EpochNotMatch')
    })

    it('should fail to transition from wrong epoch tree', async () => {
        const accounts = await ethers.getSigners()
        const id = new ZkIdentity()
        const _stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        const { leaf, index } = await signupUser(
            id,
            unirepContract,
            accounts[1].address,
            accounts[1]
        )
        stateTree.insert(leaf)
        const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
            .fill(null)
            .map((_, i) =>
                genEpochKey(
                    id.identityNullifier,
                    BigInt(accounts[1].address),
                    0, // from epoch
                    i,
                    2 ** EPOCH_TREE_DEPTH
                )
            )
        const epochTree = new SparseMerkleTree(
            EPOCH_TREE_DEPTH,
            hash4([0, 0, 0, 0])
        )
        epochTree.update(BigInt(1), hash4([2, 2, 0, 0]))
        const stateTreeProof = stateTree.createProof(index)
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.userStateTransition,
            stringifyBigInts({
                from_epoch: 0,
                to_epoch: 1,
                identity_nullifier: id.identityNullifier,
                state_tree_indexes: stateTreeProof.pathIndices,
                state_tree_elements: stateTreeProof.siblings,
                attester_id: BigInt(accounts[1].address),
                pos_rep: 0,
                neg_rep: 0,
                graffiti: 0,
                timestamp: 0,
                new_pos_rep: epochKeys.map(() => 0),
                new_neg_rep: epochKeys.map(() => 0),
                new_graffiti: epochKeys.map(() => 0),
                new_timestamp: epochKeys.map(() => 0),
                epoch_tree_elements: epochKeys.map((key) =>
                    epochTree.createProof(key)
                ),
                epoch_tree_root: epochTree.root,
            })
        )
        const { publicSignals, proof } = new UserStateTransitionProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        const snapshot = await ethers.provider.send('evm_snapshot', [])
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await expect(
            unirepContract
                .connect(accounts[1])
                .userStateTransition(publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'InvalidEpochTreeRoot')
        await ethers.provider.send('evm_revert', [snapshot])
    })

    it('should fail to transition from wrong state tree', async () => {
        const accounts = await ethers.getSigners()
        const id = new ZkIdentity()
        const _stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        const { leaf, index } = await signupUser(
            id,
            unirepContract,
            accounts[1].address,
            accounts[1]
        )
        stateTree.insert(leaf)
        _stateTree.insert(0)
        _stateTree.insert(leaf)
        const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
            .fill(null)
            .map((_, i) =>
                genEpochKey(
                    id.identityNullifier,
                    BigInt(accounts[1].address),
                    0, // from epoch
                    i,
                    2 ** EPOCH_TREE_DEPTH
                )
            )
        const epochTree = new SparseMerkleTree(
            EPOCH_TREE_DEPTH,
            hash4([0, 0, 0, 0])
        )
        const stateTreeProof = _stateTree.createProof(1)
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.userStateTransition,
            stringifyBigInts({
                from_epoch: 0,
                to_epoch: 1,
                identity_nullifier: id.identityNullifier,
                state_tree_indexes: stateTreeProof.pathIndices,
                state_tree_elements: stateTreeProof.siblings,
                attester_id: BigInt(accounts[1].address),
                pos_rep: 0,
                neg_rep: 0,
                graffiti: 0,
                timestamp: 0,
                new_pos_rep: epochKeys.map(() => 0),
                new_neg_rep: epochKeys.map(() => 0),
                new_graffiti: epochKeys.map(() => 0),
                new_timestamp: epochKeys.map(() => 0),
                epoch_tree_elements: epochKeys.map((key) =>
                    epochTree.createProof(key)
                ),
                epoch_tree_root: epochTree.root,
            })
        )
        const { publicSignals, proof } = new UserStateTransitionProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        const snapshot = await ethers.provider.send('evm_snapshot', [])
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await expect(
            unirepContract
                .connect(accounts[1])
                .userStateTransition(publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'InvalidStateTreeRoot')
        await ethers.provider.send('evm_revert', [snapshot])
    })

    it('should fail to double user state transition', async () => {
        const accounts = await ethers.getSigners()
        const id = new ZkIdentity()
        const { leaf, index } = await signupUser(
            id,
            unirepContract,
            accounts[1].address,
            accounts[1]
        )
        stateTree.insert(leaf)
        const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
            .fill(null)
            .map((_, i) =>
                genEpochKey(
                    id.identityNullifier,
                    BigInt(accounts[1].address),
                    0, // from epoch
                    i,
                    2 ** EPOCH_TREE_DEPTH
                )
            )
        const epochTree = new SparseMerkleTree(
            EPOCH_TREE_DEPTH,
            hash4([0, 0, 0, 0])
        )
        const stateTreeProof = stateTree.createProof(index)
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.userStateTransition,
            stringifyBigInts({
                from_epoch: 0,
                to_epoch: 1,
                identity_nullifier: id.identityNullifier,
                state_tree_indexes: stateTreeProof.pathIndices,
                state_tree_elements: stateTreeProof.siblings,
                attester_id: BigInt(accounts[1].address),
                pos_rep: 0,
                neg_rep: 0,
                graffiti: 0,
                timestamp: 0,
                new_pos_rep: epochKeys.map(() => 0),
                new_neg_rep: epochKeys.map(() => 0),
                new_graffiti: epochKeys.map(() => 0),
                new_timestamp: epochKeys.map(() => 0),
                epoch_tree_elements: epochKeys.map((key) =>
                    epochTree.createProof(key)
                ),
                epoch_tree_root: epochTree.root,
            })
        )
        const { publicSignals, proof } = new UserStateTransitionProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        const snapshot = await ethers.provider.send('evm_snapshot', [])
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await unirepContract
            .connect(accounts[1])
            .userStateTransition(publicSignals, proof)
            .then((t) => t.wait())
        await expect(
            unirepContract
                .connect(accounts[1])
                .userStateTransition(publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'NullifierAlreadyUsed')
        await ethers.provider.send('evm_revert', [snapshot])
    })

    it('should do user state transition', async () => {
        const accounts = await ethers.getSigners()
        const id = new ZkIdentity()
        const { leaf, index } = await signupUser(
            id,
            unirepContract,
            accounts[1].address,
            accounts[1]
        )
        stateTree.insert(leaf)
        const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
            .fill(null)
            .map((_, i) =>
                genEpochKey(
                    id.identityNullifier,
                    BigInt(accounts[1].address),
                    0, // from epoch
                    i,
                    2 ** EPOCH_TREE_DEPTH
                )
            )
        const epochTree = new SparseMerkleTree(
            EPOCH_TREE_DEPTH,
            hash4([0, 0, 0, 0])
        )
        const stateTreeProof = stateTree.createProof(index)
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.userStateTransition,
            stringifyBigInts({
                from_epoch: 0,
                to_epoch: 1,
                identity_nullifier: id.identityNullifier,
                state_tree_indexes: stateTreeProof.pathIndices,
                state_tree_elements: stateTreeProof.siblings,
                attester_id: BigInt(accounts[1].address),
                pos_rep: 0,
                neg_rep: 0,
                graffiti: 0,
                timestamp: 0,
                new_pos_rep: epochKeys.map(() => 0),
                new_neg_rep: epochKeys.map(() => 0),
                new_graffiti: epochKeys.map(() => 0),
                new_timestamp: epochKeys.map(() => 0),
                epoch_tree_elements: epochKeys.map((key) =>
                    epochTree.createProof(key)
                ),
                epoch_tree_root: epochTree.root,
            })
        )
        const { publicSignals, proof } = new UserStateTransitionProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        const snapshot = await ethers.provider.send('evm_snapshot', [])
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        const tx = await unirepContract
            .connect(accounts[1])
            .userStateTransition(publicSignals, proof)
        await tx.wait()
        await expect(tx)
            .to.emit(unirepContract, 'StateTreeLeaf')
            .withArgs(1, accounts[1].address, 0, publicSignals[1])
        await expect(tx)
            .to.emit(unirepContract, 'UserStateTransitioned')
            .withArgs(
                1,
                accounts[1].address,
                0,
                publicSignals[1],
                publicSignals[2]
            )
        await ethers.provider.send('evm_revert', [snapshot])
    })

    it('should do multiple user state transitions', async () => {
        const accounts = await ethers.getSigners()
        const id = new ZkIdentity()
        const { leaf, index } = await signupUser(
            id,
            unirepContract,
            accounts[1].address,
            accounts[1]
        )
        stateTree.insert(leaf)
        const snapshot = await ethers.provider.send('evm_snapshot', [])
        const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
            .fill(null)
            .map((_, i) =>
                genEpochKey(
                    id.identityNullifier,
                    BigInt(accounts[1].address),
                    0, // from epoch
                    i,
                    2 ** EPOCH_TREE_DEPTH
                )
            )
        const epochTree = new SparseMerkleTree(
            EPOCH_TREE_DEPTH,
            hash4([0, 0, 0, 0])
        )
        const stateTreeProof = stateTree.createProof(index)
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.userStateTransition,
            stringifyBigInts({
                from_epoch: 0,
                to_epoch: 1,
                identity_nullifier: id.identityNullifier,
                state_tree_indexes: stateTreeProof.pathIndices,
                state_tree_elements: stateTreeProof.siblings,
                attester_id: BigInt(accounts[1].address),
                pos_rep: 0,
                neg_rep: 0,
                graffiti: 0,
                timestamp: 0,
                new_pos_rep: epochKeys.map(() => 0),
                new_neg_rep: epochKeys.map(() => 0),
                new_graffiti: epochKeys.map(() => 0),
                new_timestamp: epochKeys.map(() => 0),
                epoch_tree_elements: epochKeys.map((key) =>
                    epochTree.createProof(key)
                ),
                epoch_tree_root: epochTree.root,
            })
        )
        const { publicSignals, proof } = new UserStateTransitionProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        const tx = await unirepContract
            .connect(accounts[1])
            .userStateTransition(publicSignals, proof)
        await tx.wait()
        await expect(tx)
            .to.emit(unirepContract, 'StateTreeLeaf')
            .withArgs(1, accounts[1].address, 0, publicSignals[1])
        await expect(tx)
            .to.emit(unirepContract, 'UserStateTransitioned')
            .withArgs(
                1,
                accounts[1].address,
                0,
                publicSignals[1],
                publicSignals[2]
            )
        for (let x = 1; x < 5; x++) {
            const _stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
            const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
                .fill(null)
                .map((_, i) =>
                    genEpochKey(
                        id.identityNullifier,
                        BigInt(accounts[1].address),
                        x, // from epoch
                        i,
                        2 ** EPOCH_TREE_DEPTH
                    )
                )
            const epochTree = new SparseMerkleTree(
                EPOCH_TREE_DEPTH,
                hash4([0, 0, 0, 0])
            )
            const leaf = genStateTreeLeaf(
                id.identityNullifier,
                accounts[1].address,
                x,
                0,
                0,
                0,
                0
            )
            _stateTree.insert(leaf)
            const _stateTreeProof = _stateTree.createProof(0)
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.userStateTransition,
                stringifyBigInts({
                    from_epoch: x,
                    to_epoch: x + 1,
                    identity_nullifier: id.identityNullifier,
                    state_tree_indexes: _stateTreeProof.pathIndices,
                    state_tree_elements: _stateTreeProof.siblings,
                    attester_id: BigInt(accounts[1].address),
                    pos_rep: 0,
                    neg_rep: 0,
                    graffiti: 0,
                    timestamp: 0,
                    new_pos_rep: epochKeys.map(() => 0),
                    new_neg_rep: epochKeys.map(() => 0),
                    new_graffiti: epochKeys.map(() => 0),
                    new_timestamp: epochKeys.map(() => 0),
                    epoch_tree_elements: epochKeys.map((key) =>
                        epochTree.createProof(key)
                    ),
                    epoch_tree_root: epochTree.root,
                })
            )
            const { publicSignals, proof } = new UserStateTransitionProof(
                r.publicSignals,
                r.proof,
                defaultProver
            )
            await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
            const tx = await unirepContract
                .connect(accounts[1])
                .userStateTransition(publicSignals, proof)
            await tx.wait()
            await expect(tx)
                .to.emit(unirepContract, 'StateTreeLeaf')
                .withArgs(x + 1, accounts[1].address, 0, publicSignals[1])
            await expect(tx)
                .to.emit(unirepContract, 'UserStateTransitioned')
                .withArgs(
                    x + 1,
                    accounts[1].address,
                    0,
                    publicSignals[1],
                    publicSignals[2]
                )
        }
        await ethers.provider.send('evm_revert', [snapshot])
    })
})
