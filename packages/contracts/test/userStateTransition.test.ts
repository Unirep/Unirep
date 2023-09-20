// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { Identity } from '@semaphore-protocol/identity'
import {
    IncrementalMerkleTree,
    stringifyBigInts,
    genEpochKey,
    genEpochTreeLeaf,
    genStateTreeLeaf,
} from '@unirep/utils'
import { poseidon2 } from 'poseidon-lite'
import {
    Circuit,
    UserStateTransitionProof,
    SignupProof,
    CircuitConfig,
} from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

import { EPOCH_LENGTH } from './config'
import { deployUnirep } from '../deploy'
const {
    EPOCH_TREE_DEPTH,
    STATE_TREE_DEPTH,
    HISTORY_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    FIELD_COUNT,
} = CircuitConfig.default

const id = new Identity()
let circuitInputs = {
    from_epoch: 0,
    to_epoch: 1,
    identity_secret: id.secret,
    state_tree_indexes: [0],
    state_tree_elements: [0],
    history_tree_indices: [0],
    history_tree_elements: [0],
    attester_id: 0,
    data: [0],
    new_data: [[0]],
    epoch_tree_elements: [[0]],
    epoch_tree_indices: [[0]],
    epoch_tree_root: 0,
    chain_id: 0,
}

const signupUser = async (id, unirepContract, attesterId, account) => {
    const epoch = await unirepContract.attesterCurrentEpoch(attesterId)
    const chainId = await unirepContract.unirepChainId()
    const r = await defaultProver.genProofAndPublicSignals(
        Circuit.signup,
        stringifyBigInts({
            epoch: epoch.toString(),
            secret: id.secret,
            attester_id: attesterId,
            chain_id: chainId,
        })
    )
    const { publicSignals, proof } = new SignupProof(
        r.publicSignals,
        r.proof,
        defaultProver
    )
    const leafIndex = await unirepContract.attesterStateTreeLeafCount(
        attesterId
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
    let chainId
    let attester
    const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
    const epochTree = new IncrementalMerkleTree(EPOCH_TREE_DEPTH)
    const historyTree = new IncrementalMerkleTree(HISTORY_TREE_DEPTH)

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])
        chainId = await unirepContract.unirepChainId()
        // generate circuit inputs
        attester = accounts[1]
        await unirepContract
            .connect(attester)
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())
        const { leaf, index } = await signupUser(
            id,
            unirepContract,
            attester.address,
            attester
        )
        epochTree.insert(0)
        stateTree.insert(leaf)
        historyTree.insert(poseidon2([stateTree.root, epochTree.root]))
        const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
            .fill(null)
            .map((_, i) =>
                genEpochKey(
                    id.secret,
                    BigInt(attester.address),
                    0, // from epoch
                    i,
                    chainId
                )
            )
        const stateTreeProof = stateTree.createProof(index)
        const historyTreeProof = historyTree.createProof(0)
        circuitInputs = {
            ...circuitInputs,
            state_tree_indexes: stateTreeProof.pathIndices,
            state_tree_elements: stateTreeProof.siblings,
            history_tree_indices: historyTreeProof.pathIndices,
            history_tree_elements: historyTreeProof.siblings,
            attester_id: attester.address,
            data: Array(FIELD_COUNT).fill(0),
            new_data: epochKeys.map(() => Array(FIELD_COUNT).fill(0)),
            epoch_tree_elements: epochKeys.map(
                () => epochTree.createProof(0).siblings
            ),
            epoch_tree_indices: epochKeys.map(
                () => epochTree.createProof(0).pathIndices
            ),
            epoch_tree_root: epochTree.root,
            chain_id: chainId,
        }
    })

    {
        let snapshot
        beforeEach(async () => {
            snapshot = await ethers.provider.send('evm_snapshot', [])
        })

        afterEach(() => ethers.provider.send('evm_revert', [snapshot]))
    }

    it('should fail to transition with invalid proof', async () => {
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.userStateTransition,
            stringifyBigInts(circuitInputs)
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
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.userStateTransition,
            stringifyBigInts({
                ...circuitInputs,
                attester_id: address,
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

    it('should fail to transition from wrong history tree', async () => {
        const wrongStateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        wrongStateTree.insert(356)
        wrongStateTree.insert(234)
        const wrongStateTreeProof = wrongStateTree.createProof(1)
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.userStateTransition,
            stringifyBigInts({
                ...circuitInputs,
                state_tree_indexes: wrongStateTreeProof.pathIndices,
                state_tree_elements: wrongStateTreeProof.siblings,
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
        await expect(
            unirepContract
                .connect(attester)
                .userStateTransition(publicSignals, proof)
        ).to.be.revertedWithCustomError(
            unirepContract,
            'InvalidHistoryTreeRoot'
        )
    })

    it('should fail to double user state transition', async () => {
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.userStateTransition,
            stringifyBigInts(circuitInputs)
        )
        const { publicSignals, proof } = new UserStateTransitionProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
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

    it('should fail to do user state transition with wrong chain ID', async () => {
        const wrongChainID = 9999
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.userStateTransition,
            stringifyBigInts({
                ...circuitInputs,
                chain_id: wrongChainID,
            })
        )
        expect(wrongChainID).not.equal(chainId)
        const { publicSignals, proof } = new UserStateTransitionProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await expect(
            unirepContract
                .connect(attester)
                .userStateTransition(publicSignals, proof)
        ).to.be.revertedWithCustomError(
            unirepContract,
            'InvalidHistoryTreeRoot'
        )
    })

    it('should do user state transition', async () => {
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.userStateTransition,
            stringifyBigInts(circuitInputs)
        )
        const { publicSignals, proof, stateTreeLeaf, epochKeys } =
            new UserStateTransitionProof(
                r.publicSignals,
                r.proof,
                defaultProver
            )
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        const tx = await unirepContract
            .connect(attester)
            .userStateTransition(publicSignals, proof)
        await tx.wait()
        const leafIndex = 0

        await expect(tx)
            .to.emit(unirepContract, 'StateTreeLeaf')
            .withArgs(
                circuitInputs.to_epoch,
                attester.address,
                leafIndex,
                stateTreeLeaf
            )
        await expect(tx)
            .to.emit(unirepContract, 'UserStateTransitioned')
            .withArgs(
                circuitInputs.to_epoch,
                attester.address,
                leafIndex,
                stateTreeLeaf,
                epochKeys[0]
            )
    })

    it('should do multiple user state transitions', async () => {
        const users = 3
        const epochs = 3
        let fromEpoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        let fromEpochStateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        fromEpochStateTree.insert(
            genStateTreeLeaf(
                id.secret,
                BigInt(attester.address),
                fromEpoch,
                Array(FIELD_COUNT).fill(0),
                chainId
            )
        )
        const userState = Array(users)
            .fill(null)
            .map(() => {
                return {
                    id: new Identity(),
                    index: 0,
                }
            })
        for (let i = 0; i < users; i++) {
            const { leaf } = await signupUser(
                userState[i].id,
                unirepContract,
                attester.address,
                attester
            )
            fromEpochStateTree.insert(leaf)
        }

        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])
        const startEpoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        const historyTree = new IncrementalMerkleTree(HISTORY_TREE_DEPTH)
        for (let epoch = startEpoch; epoch < startEpoch + epochs; epoch++) {
            const toEpochStateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
            const epochTree = new IncrementalMerkleTree(EPOCH_TREE_DEPTH)
            epochTree.insert(0)
            historyTree.insert(
                poseidon2([fromEpochStateTree.root, epochTree.root])
            )
            const historyTreeProof = historyTree.createProof(epoch - startEpoch)
            for (let i = 0; i < users; i++) {
                const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
                    .fill(null)
                    .map((_, n) =>
                        genEpochKey(
                            userState[i].id.secret,
                            BigInt(attester.address),
                            fromEpoch, // from epoch
                            n,
                            chainId
                        )
                    )
                // in the first epoch there is one user signs up in the previous tests
                const index = epoch === 1 ? i + 1 : i
                const stateTreeProof = fromEpochStateTree.createProof(index)
                const r = await defaultProver.genProofAndPublicSignals(
                    Circuit.userStateTransition,
                    stringifyBigInts({
                        ...circuitInputs,
                        from_epoch: fromEpoch,
                        to_epoch: epoch,
                        identity_secret: userState[i].id.secret,
                        state_tree_indexes: stateTreeProof.pathIndices,
                        state_tree_elements: stateTreeProof.siblings,
                        history_tree_indices: historyTreeProof.pathIndices,
                        history_tree_elements: historyTreeProof.siblings,
                        new_data: epochKeys.map(() =>
                            Array(FIELD_COUNT).fill(0)
                        ),
                        epoch_tree_elements: epochKeys.map(
                            () => epochTree.createProof(0).siblings
                        ),
                        epoch_tree_indices: epochKeys.map(
                            () => epochTree.createProof(0).pathIndices
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

    it('should fail to UST with unprocessed data', async () => {
        const fromEpoch = circuitInputs.from_epoch
        const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
            .fill(null)
            .map((_, i) =>
                genEpochKey(
                    id.secret,
                    BigInt(attester.address),
                    fromEpoch, // from epoch
                    i,
                    chainId
                )
            )
        await unirepContract
            .connect(attester)
            .attest(epochKeys[0], fromEpoch, 0, 2)
            .then((t) => t.wait())
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.userStateTransition,
            stringifyBigInts(circuitInputs)
        )
        const { publicSignals, proof } = new UserStateTransitionProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await expect(
            unirepContract
                .connect(attester)
                .userStateTransition(publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'EpochKeyNotProcessed')
    })

    it('should UST with new data', async () => {
        const fromEpoch = 0
        const toEpoch = fromEpoch + 1
        const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
            .fill(null)
            .map((_, i) =>
                genEpochKey(
                    id.secret,
                    BigInt(attester.address),
                    fromEpoch, // from epoch
                    i,
                    chainId
                )
            )
        await unirepContract
            .connect(attester)
            .attest(epochKeys[0], fromEpoch, 0, 2)
            .then((t) => t.wait())
        await unirepContract
            .connect(attester)
            .attest(epochKeys[0], fromEpoch, 1, 3)
            .then((t) => t.wait())
        const newData = Array(FIELD_COUNT)
            .fill(0)
            .map((_, i) => {
                if (i === 0) return 2
                if (i === 1) return 3
                return 0
            })
        const epochTreeLeaf = genEpochTreeLeaf(epochKeys[0], newData)
        const epochTree = new IncrementalMerkleTree(EPOCH_TREE_DEPTH)
        epochTree.insert(epochTreeLeaf)
        const historyTree = new IncrementalMerkleTree(HISTORY_TREE_DEPTH)
        historyTree.insert(poseidon2([stateTree.root, epochTree.root]))
        const historyTreeProof = historyTree.createProof(0)
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.userStateTransition,
            stringifyBigInts({
                ...circuitInputs,
                history_tree_indices: historyTreeProof.pathIndices,
                history_tree_elements: historyTreeProof.siblings,
                data: Array(FIELD_COUNT).fill(0),
                new_data: epochKeys.map((_, i) => {
                    if (i === 0) return newData
                    return Array(FIELD_COUNT).fill(0)
                }),
                epoch_tree_elements: epochKeys.map(
                    () => epochTree.createProof(0).siblings
                ),
                epoch_tree_indices: epochKeys.map(
                    () => epochTree.createProof(0).pathIndices
                ),
                epoch_tree_root: epochTree.root,
            })
        )
        const {
            publicSignals,
            proof,
            stateTreeLeaf,
            epochKeys: ustNullifiers,
        } = new UserStateTransitionProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        const tx = await unirepContract
            .connect(attester)
            .userStateTransition(publicSignals, proof)
        await tx.wait()
        const leafIndex = 0

        await expect(tx)
            .to.emit(unirepContract, 'StateTreeLeaf')
            .withArgs(toEpoch, attester.address, leafIndex, stateTreeLeaf)
        await expect(tx)
            .to.emit(unirepContract, 'UserStateTransitioned')
            .withArgs(
                toEpoch,
                attester.address,
                leafIndex,
                stateTreeLeaf,
                ustNullifiers[0]
            )
    })
})
