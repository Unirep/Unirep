// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import {
    ZkIdentity,
    hashLeftRight,
    IncrementalMerkleTree,
} from '@unirep/crypto'
import {
    Circuit,
    EPOCH_LENGTH,
    GLOBAL_STATE_TREE_DEPTH,
    USER_STATE_TREE_DEPTH,
} from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'
import { deployUnirep } from '@unirep/contracts/deploy'
import { Unirep } from '@unirep/contracts'

const attestingFee = ethers.utils.parseEther('0.1')

import {
    Synchronizer,
    schema,
    computeEmptyUserStateRoot,
    computeInitUserStateRoot,
} from '../../src'
import {
    genNewUserStateTree,
    genUserStateTransitionCircuitInput,
    genInputForContract,
} from '../utils'
import { SQLiteConnector } from 'anondb/node'

let synchronizer: Synchronizer

describe('Offchain Global State Tree', function () {
    this.timeout(0)
    let attester
    let attesterId
    let unirepContract: Unirep
    let GST: IncrementalMerkleTree

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0], {
            attestingFee,
        })
        const db = await SQLiteConnector.create(schema, ':memory:')
        synchronizer = new Synchronizer(db, defaultProver, unirepContract)
        // now create an attester
        for (let i = 1; i <= 10; i++) {
            const tx = await unirepContract
                .connect(accounts[i])
                .attesterSignUp()
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
        }
        attester = accounts[1]
        attesterId = await unirepContract.attesters(attester.address)
        await synchronizer.start()

        GST = new IncrementalMerkleTree(GLOBAL_STATE_TREE_DEPTH)
    })

    it('sign up user without airdrop should match offchain GST', async () => {
        for (let i = 0; i < 5; i++) {
            const user = new ZkIdentity()
            const commitment = user.genIdentityCommitment()
            const tx = await unirepContract['userSignUp(uint256)'](commitment)
            await tx.wait()
            await synchronizer.waitForSync()

            const USTRoot = computeEmptyUserStateRoot(USER_STATE_TREE_DEPTH)
            GST.insert(hashLeftRight(commitment, USTRoot))

            const epoch = await unirepContract.currentEpoch()
            const onchainGST = await unirepContract.globalStateTree(epoch)
            const offchainGST = await synchronizer.genGSTree(epoch)
            expect(GST.root).to.equal(onchainGST.root)
            expect(GST.root).to.equal(offchainGST.root)
        }
    })

    it('sign up user with airdrop should match offchain GST', async () => {
        for (let i = 0; i < 5; i++) {
            const user = new ZkIdentity()
            const commitment = user.genIdentityCommitment()
            const airdropAmount = i
            const tx = await unirepContract
                .connect(attester)
                ['userSignUp(uint256,uint256)'](commitment, airdropAmount)
            await tx.wait()
            await synchronizer.waitForSync()

            const USTRoot = computeInitUserStateRoot(
                USER_STATE_TREE_DEPTH,
                Number(attesterId),
                airdropAmount
            )
            GST.insert(hashLeftRight(commitment, USTRoot))

            const epoch = await unirepContract.currentEpoch()
            const onchainGST = await unirepContract.globalStateTree(epoch)
            const offchainGST = await synchronizer.genGSTree(epoch)
            expect(GST.root).to.equal(onchainGST.root)
            expect(GST.root).to.equal(offchainGST.root)
        }
    })

    it('onchain GST after user state transition should match offchain GST', async () => {
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await unirepContract.beginEpochTransition().then((t) => t.wait())

        const user = new ZkIdentity()
        const commitment = user.genIdentityCommitment()
        const tx = await unirepContract['userSignUp(uint256)'](commitment)
        await tx.wait()

        const prevEpoch = (await unirepContract.currentEpoch()).toNumber()

        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await unirepContract.beginEpochTransition().then((t) => t.wait())
        GST = new IncrementalMerkleTree(GLOBAL_STATE_TREE_DEPTH)

        const userStateTree = genNewUserStateTree()
        const reputationRecords = {}
        const {
            startTransitionCircuitInputs,
            processAttestationCircuitInputs,
            finalTransitionCircuitInputs,
        } = genUserStateTransitionCircuitInput(user, prevEpoch, 0, {
            userStateTree,
            reputationRecords,
        })

        // submit start user state tranisiton proof
        {
            const { publicSignals, proof } = await genInputForContract(
                Circuit.startTransition,
                startTransitionCircuitInputs
            )

            await unirepContract
                .startUserStateTransition(publicSignals, proof)
                .then((t) => t.wait())
        }

        // submit process attestations proofs
        {
            for (const circuitInputs of processAttestationCircuitInputs) {
                const { publicSignals, proof } = await genInputForContract(
                    Circuit.processAttestations,
                    circuitInputs
                )

                await unirepContract
                    .processAttestations(publicSignals, proof)
                    .then((t) => t.wait())
            }
        }

        // final users state transition proofs
        const { publicSignals, proof, newGlobalStateTreeLeaf } =
            await genInputForContract(
                Circuit.userStateTransition,
                finalTransitionCircuitInputs
            )

        await unirepContract
            .updateUserStateRoot(publicSignals, proof)
            .then((t) => t.wait())
        GST.insert(newGlobalStateTreeLeaf)
        await synchronizer.waitForSync()

        const epoch = await unirepContract.currentEpoch()
        const onchainGST = await unirepContract.globalStateTree(epoch)
        const offchainGST = await synchronizer.genGSTree(epoch)
        expect(GST.root).to.equal(onchainGST.root)
        expect(GST.root).to.equal(offchainGST.root)
    })

    it('onchain GST after user state transition with attestations should match offchain GST', async () => {
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await unirepContract.beginEpochTransition().then((t) => t.wait())

        const user = new ZkIdentity()
        const commitment = user.genIdentityCommitment()
        const tx = await unirepContract['userSignUp(uint256)'](commitment)
        await tx.wait()

        const prevEpoch = (await unirepContract.currentEpoch()).toNumber()

        const userStateTree = genNewUserStateTree()
        const reputationRecords = {}
        const {
            startTransitionCircuitInputs,
            processAttestationCircuitInputs,
            finalTransitionCircuitInputs,
            attestationsMap,
        } = genUserStateTransitionCircuitInput(user, prevEpoch, 1, {
            userStateTree,
            reputationRecords,
        })

        const accounts = await ethers.getSigners()
        for (const key in attestationsMap) {
            for (const attestation of attestationsMap[key]) {
                const attesterId = Number(attestation.attesterId.toString())

                const tx = await unirepContract
                    .connect(accounts[attesterId])
                    .submitAttestation(attestation, key, {
                        value: attestingFee,
                    })
                await tx.wait()
            }
        }

        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await unirepContract.beginEpochTransition().then((t) => t.wait())
        GST = new IncrementalMerkleTree(GLOBAL_STATE_TREE_DEPTH)

        // submit start user state tranisiton proof
        {
            const { publicSignals, proof } = await genInputForContract(
                Circuit.startTransition,
                startTransitionCircuitInputs
            )

            await unirepContract
                .startUserStateTransition(publicSignals, proof)
                .then((t) => t.wait())
        }

        // submit process attestations proofs
        {
            for (const circuitInputs of processAttestationCircuitInputs) {
                const { publicSignals, proof } = await genInputForContract(
                    Circuit.processAttestations,
                    circuitInputs
                )

                await unirepContract
                    .processAttestations(publicSignals, proof)
                    .then((t) => t.wait())
            }
        }

        // final users state transition proofs
        const { publicSignals, proof, newGlobalStateTreeLeaf } =
            await genInputForContract(
                Circuit.userStateTransition,
                finalTransitionCircuitInputs
            )

        await unirepContract
            .updateUserStateRoot(publicSignals, proof)
            .then((t) => t.wait())
        GST.insert(newGlobalStateTreeLeaf)
        await synchronizer.waitForSync()

        const epoch = await unirepContract.currentEpoch()
        const onchainGST = await unirepContract.globalStateTree(epoch)
        const offchainGST = await synchronizer.genGSTree(epoch)
        expect(GST.root).to.equal(onchainGST.root)
        expect(GST.root).to.equal(offchainGST.root)
    })
})
