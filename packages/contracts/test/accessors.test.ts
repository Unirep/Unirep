// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import {
    ZkIdentity,
    stringifyBigInts,
    hash2,
    IncrementalMerkleTree,
} from '@unirep/utils'
import { Circuit, CircuitConfig, SignupProof } from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

const { HISTORY_TREE_DEPTH, STATE_TREE_DEPTH } = CircuitConfig.default

import { EPOCH_LENGTH } from '../src'
import { deployUnirep } from '../deploy'

describe('Attester getters', function () {
    this.timeout(120000)

    let unirepContract

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])

        const attester = accounts[1]
        await unirepContract
            .connect(attester)
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())
    })

    {
        let snapshot
        beforeEach(async () => {
            snapshot = await ethers.provider.send('evm_snapshot', [])
        })

        afterEach(() => ethers.provider.send('evm_revert', [snapshot]))
    }

    it('should get member count', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        {
            const numberOfUsers = await unirepContract.attesterMemberCount(
                attester.address
            )
            expect(numberOfUsers).to.equal(0)
        }
        for (let x = 1; x < 5; x++) {
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
            const { publicSignals, proof } = new SignupProof(
                r.publicSignals,
                r.proof,
                defaultProver
            )
            await unirepContract
                .connect(attester)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())
            const numberOfUsers = await unirepContract.attesterMemberCount(
                attester.address
            )
            expect(numberOfUsers).to.equal(x)
        }
    })

    it('should get history root existence', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
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
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])
        await unirepContract
            .connect(accounts[5])
            .updateEpochIfNeeded(attester.address)
            .then((t) => t.wait())
        const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        stateTree.insert(stateTreeLeaf)
        const historyTree = new IncrementalMerkleTree(HISTORY_TREE_DEPTH)
        historyTree.insert(hash2([stateTree.root, 0]))
        {
            const exists = await unirepContract.attesterHistoryRootExists(
                attester.address,
                historyTree.root
            )
            expect(exists).to.be.true
        }
        {
            const exists = await unirepContract.attesterHistoryRootExists(
                attester.address,
                historyTree.root + BigInt(1)
            )
            expect(exists).to.be.false
        }
    })
})
