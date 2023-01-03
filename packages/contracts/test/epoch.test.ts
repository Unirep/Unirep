// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import {
    genRandomSalt,
    hash4,
    IncrementalMerkleTree,
    SparseMerkleTree,
    stringifyBigInts,
    ZkIdentity,
} from '@unirep/utils'
import {
    EPOCH_TREE_DEPTH,
    EPOCH_TREE_ARITY,
    STATE_TREE_DEPTH,
    defaultEpochTreeLeaf,
    Circuit,
    SignupProof,
    AGGREGATE_KEY_COUNT,
    AggregateEpochKeysProof,
} from '@unirep/circuits'

import { EPOCH_LENGTH } from '../src'
import { deployUnirep } from '../deploy'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

async function bootstrapUsers(attester, epoch, unirepContract) {
    const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
    const randomUserNum = Math.ceil(Math.random() * 5)
    for (let i = 0; i < randomUserNum; i++) {
        const id = new ZkIdentity()
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.signup,
            stringifyBigInts({
                epoch,
                identity_nullifier: id.identityNullifier,
                identity_trapdoor: id.trapdoor,
                attester_id: attester.address,
            })
        )
        const { publicSignals, proof, stateTreeLeaf } = new SignupProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )

        await unirepContract
            .connect(attester)
            .userSignUp(publicSignals, proof)
            .then((t) => t.wait())
        stateTree.insert(stateTreeLeaf)
    }

    return stateTree
}

function genAggregateEpochKeysCircuitInputs(
    epoch,
    attester,
    hashchainIndex,
    hashchain,
    epochTree?
) {
    const tree =
        epochTree ??
        new SparseMerkleTree(
            EPOCH_TREE_DEPTH,
            defaultEpochTreeLeaf,
            EPOCH_TREE_ARITY
        )
    const startRoot = tree.root
    const dummyEpochKeys = Array(
        AGGREGATE_KEY_COUNT - hashchain.epochKeys.length
    )
        .fill(null)
        .map(() => '0x0000000')
    const dummyBalances = Array(
        AGGREGATE_KEY_COUNT - hashchain.epochKeyBalances.length
    )
        .fill(null)
        .map(() => [0, 0, 0, 0])
    const allEpochKeys = [hashchain.epochKeys, dummyEpochKeys].flat()
    const allBalances = [
        hashchain.epochKeyBalances.map(
            ({ posRep, negRep, graffiti, timestamp }) => {
                return [
                    posRep.toString(),
                    negRep.toString(),
                    graffiti.toString(),
                    timestamp.toString(),
                ]
            }
        ),
        dummyBalances,
    ].flat()
    const circuitInputs = {
        start_root: startRoot,
        epoch_keys: allEpochKeys.map((k) => k.toString()),
        epoch_key_balances: allBalances,
        old_epoch_key_hashes:
            Array(AGGREGATE_KEY_COUNT).fill(defaultEpochTreeLeaf),
        path_elements: allEpochKeys.map((key, i) => {
            const p = tree.createProof(BigInt(key))
            if (i < hashchain.epochKeys.length) {
                const { posRep, negRep, graffiti, timestamp } =
                    hashchain.epochKeyBalances[i]
                tree.update(
                    BigInt(key),
                    hash4([posRep, negRep, graffiti, timestamp])
                )
            }
            return p
        }),
        epoch: epoch.toString(),
        attester_id: attester.address,
        hashchain_index: hashchainIndex.toString(),
        epoch_key_count: hashchain.epochKeys.length, // process epoch keys with attestations
    }

    return {
        circuitInputs: stringifyBigInts(circuitInputs),
        epochTree: tree,
    }
}

async function bootstrapAttestations(attester, epoch, unirepContract) {
    const defaultEpochTreeLeaf = hash4([0, 0, 0, 0])
    const epochTree = new SparseMerkleTree(
        EPOCH_TREE_DEPTH,
        defaultEpochTreeLeaf,
        EPOCH_TREE_ARITY
    )
    const randomEpkNum = Math.ceil(Math.random() * 10)
    for (let i = 0; i < randomEpkNum; i++) {
        const epochKey =
            genRandomSalt() %
            (BigInt(EPOCH_TREE_ARITY) ** BigInt(EPOCH_TREE_DEPTH) - BigInt(1))
        const randomAttestNum = Math.ceil(Math.random() * 10)
        let totalPosRep = 0
        let totalNegRep = 0
        let finalGraffiti = BigInt(0)
        let finalTimestamp = 0
        for (let j = 0; j < randomAttestNum; j++) {
            const posRep = Math.floor(Math.random() * 10)
            const negRep = Math.floor(Math.random() * 10)
            const graffiti = Math.random() > 0.5 ? genRandomSalt() : BigInt(0)

            const tx = await unirepContract
                .connect(attester)
                .submitAttestation(epoch, epochKey, posRep, negRep, graffiti)
            const { timestamp } = await tx
                .wait()
                .then(({ blockNumber }) =>
                    ethers.provider.getBlock(blockNumber)
                )
            totalPosRep += posRep
            totalNegRep += negRep
            finalGraffiti = graffiti > 0 ? graffiti : finalGraffiti
            finalTimestamp = graffiti > 0 ? timestamp : finalTimestamp
        }
        epochTree.update(
            epochKey,
            hash4([totalPosRep, totalNegRep, finalGraffiti, finalTimestamp])
        )
    }
    return epochTree
}

async function processAttestations(attester, epoch, unirepContract) {
    let success = true
    const defaultEpochTreeLeaf = hash4([0, 0, 0, 0])
    let currentEpochTree = new SparseMerkleTree(
        EPOCH_TREE_DEPTH,
        defaultEpochTreeLeaf,
        EPOCH_TREE_ARITY
    )
    while (success) {
        try {
            await unirepContract
                .buildHashchain(attester.address, epoch)
                .then((t) => t.wait())

            const hashchainIndex =
                await unirepContract.attesterHashchainProcessedCount(
                    attester.address,
                    epoch
                )
            const hashchain = await unirepContract.attesterHashchain(
                attester.address,
                epoch,
                hashchainIndex
            )

            const { circuitInputs, epochTree } =
                genAggregateEpochKeysCircuitInputs(
                    epoch,
                    attester,
                    hashchainIndex,
                    hashchain,
                    currentEpochTree
                )
            currentEpochTree = epochTree
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.aggregateEpochKeys,
                circuitInputs
            )
            const { publicSignals, proof } = new AggregateEpochKeysProof(
                r.publicSignals,
                r.proof,
                defaultProver
            )
            await unirepContract
                .connect(attester)
                .processHashchain(publicSignals, proof)
                .then((t) => t.wait())
        } catch (error) {
            success = false
        }
    }
}

describe('Epoch', function () {
    this.timeout(0)

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

    it('should update epoch', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]

        const startEpoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        const emptyStateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        const emptyEpochTree = new SparseMerkleTree(
            EPOCH_TREE_DEPTH,
            defaultEpochTreeLeaf,
            EPOCH_TREE_ARITY
        )
        for (let x = startEpoch.toNumber(); x < 6; x++) {
            const prevEpoch = await unirepContract.attesterCurrentEpoch(
                attester.address
            )
            const stateTree = await bootstrapUsers(
                attester,
                prevEpoch.toNumber(),
                unirepContract
            )
            const epochTree = await bootstrapAttestations(
                attester,
                prevEpoch.toNumber(),
                unirepContract
            )
            const prevStateTreeRoot =
                await unirepContract.attesterStateTreeRoot(
                    attester.address,
                    prevEpoch
                )
            await processAttestations(attester, prevEpoch, unirepContract)
            const prevEpochTreeRoot = await unirepContract.attesterEpochRoot(
                attester.address,
                prevEpoch
            )
            expect(prevStateTreeRoot.toString()).to.equal(
                stateTree.root.toString()
            )
            expect(prevEpochTreeRoot.toString()).to.equal(
                epochTree.root.toString()
            )

            await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
            await unirepContract.updateEpochIfNeeded(attester.address)

            // attester should have the current data
            const newEpoch = await unirepContract.attesterCurrentEpoch(
                attester.address
            )
            expect(prevEpoch.toNumber() + 1).to.equal(newEpoch.toNumber())

            const stateTreeRoot = await unirepContract.attesterStateTreeRoot(
                attester.address,
                newEpoch
            )
            expect(stateTreeRoot.toString()).to.equal(
                emptyStateTree.root.toString()
            )

            const exist = await unirepContract.attesterStateTreeRootExists(
                attester.address,
                newEpoch,
                stateTreeRoot
            )
            expect(exist).to.be.true

            const epochRoot = await unirepContract.attesterEpochRoot(
                attester.address,
                newEpoch
            )
            expect(epochRoot.toString()).to.equal(
                emptyEpochTree.root.toString()
            )
        }
    })

    it('should fail to update epoch with non-signup attester', async () => {
        const address = 12345 // non-signup attester
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await expect(
            unirepContract.updateEpochIfNeeded(address)
        ).to.be.revertedWithCustomError(unirepContract, 'AttesterNotSignUp')
    })
})
