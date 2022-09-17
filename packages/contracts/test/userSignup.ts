// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import {
    hash5,
    hashLeftRight,
    IncrementalMerkleTree,
    ZkIdentity,
    stringifyBigInts,
} from '@unirep/crypto'
import {
    EPOCH_TREE_DEPTH,
    GLOBAL_STATE_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    Circuit,
} from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

import { EPOCH_LENGTH, Unirep, SignupProof } from '../src'
import { deployUnirep } from '../deploy'

describe('Signup', () => {
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
        expect(GLOBAL_STATE_TREE_DEPTH).equal(config.globalStateTreeDepth)
    })

    describe('User signup', () => {
        it('attester sign up', async () => {
            const accounts = await ethers.getSigners()
            await unirepContract
                .connect(accounts[1])
                .attesterSignUp(EPOCH_LENGTH)
                .then((t) => t.wait())
        })

        it('should fail to signup with invalid proof', async () => {
            const accounts = await ethers.getSigners()
            const id = new ZkIdentity()
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.signup,
                stringifyBigInts({
                    epoch: 0,
                    identity_nullifier: id.identityNullifier,
                    identity_trapdoor: id.trapdoor,
                    attester_id: BigInt(accounts[1].address),
                })
            )
            const { publicSignals, proof } = new SignupProof(
                r.publicSignals,
                r.proof,
                defaultProver
            )
            const _proof = [...proof]
            _proof[0] = BigInt(proof[0].toString()) + BigInt(1)
            await expect(
                unirepContract
                    .connect(accounts[1])
                    .userSignUp(publicSignals, _proof)
            ).to.be.reverted
            const _publicSignals = [...publicSignals]
            _publicSignals[0] = BigInt(publicSignals[0].toString()) + BigInt(1)
            await expect(
                unirepContract
                    .connect(accounts[1])
                    .userSignUp(_publicSignals, proof)
            ).to.be.revertedWithCustomError(unirepContract, 'InvalidProof')
        })

        it('sign up should succeed', async () => {
            const id = new ZkIdentity()
            const accounts = await ethers.getSigners()
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.signup,
                stringifyBigInts({
                    epoch: 0,
                    identity_nullifier: id.identityNullifier,
                    identity_trapdoor: id.trapdoor,
                    attester_id: BigInt(accounts[1].address),
                })
            )
            const { publicSignals, proof } = new SignupProof(
                r.publicSignals,
                r.proof,
                defaultProver
            )
            const tx = await unirepContract
                .connect(accounts[1])
                .userSignUp(publicSignals, proof)
            await tx.wait()

            // check state tree
            // check semaphoreGroup root
            // check stateTreeRoots
            // check event emission
            const gstLeaf = hash5([
                id.identityNullifier,
                BigInt(accounts[1].address),
                0,
                0,
                0,
            ])
            const GSTree = new IncrementalMerkleTree(GLOBAL_STATE_TREE_DEPTH)
            GSTree.insert(gstLeaf)
            const currentRoot = await unirepContract.attesterStateTreeRoot(
                accounts[1].address,
                0
            )
            const rootExists = await unirepContract.attesterStateTreeRootExists(
                accounts[1].address,
                0,
                GSTree.root
            )
            expect(rootExists).to.be.true
            expect(currentRoot.toString(), 'state tree root').to.equal(
                GSTree.root.toString()
            )
            const semaphoreTree = new IncrementalMerkleTree(
                GLOBAL_STATE_TREE_DEPTH
            )
            semaphoreTree.insert(id.genIdentityCommitment())
            const semaphoreRoot =
                await unirepContract.attesterSemaphoreGroupRoot(
                    accounts[1].address
                )
            expect(semaphoreRoot.toString(), 'semaphore root').to.equal(
                semaphoreTree.root.toString()
            )

            expect(tx)
                .to.emit(unirepContract, 'UserSignedUp')
                .withArgs(0, id.genIdentityCommitment(), accounts[1].address, 0)
            expect(tx)
                .to.emit(unirepContract, 'NewGSTLeaf')
                .withArgs(BigInt(0), accounts[1].address, BigInt(0), gstLeaf)
        })

        it('double sign up should fail', async () => {
            const id = new ZkIdentity()
            const accounts = await ethers.getSigners()
            {
                // first signup
                const r = await defaultProver.genProofAndPublicSignals(
                    Circuit.signup,
                    stringifyBigInts({
                        epoch: 0,
                        identity_nullifier: id.identityNullifier,
                        identity_trapdoor: id.trapdoor,
                        attester_id: BigInt(accounts[1].address),
                    })
                )
                const { publicSignals, proof } = new SignupProof(
                    r.publicSignals,
                    r.proof,
                    defaultProver
                )
                await unirepContract
                    .connect(accounts[1])
                    .userSignUp(publicSignals, proof)
                    .then((t) => t.wait())
            }
            // second signup
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.signup,
                stringifyBigInts({
                    epoch: 0,
                    identity_nullifier: id.identityNullifier,
                    identity_trapdoor: id.trapdoor,
                    attester_id: BigInt(accounts[1].address),
                })
            )
            const { publicSignals, proof } = new SignupProof(
                r.publicSignals,
                r.proof,
                defaultProver
            )
            await expect(
                unirepContract
                    .connect(accounts[1])
                    .userSignUp(publicSignals, proof)
            ).to.be.revertedWithCustomError(
                unirepContract,
                `UserAlreadySignedUp`
            )
        })

        it('should fail to signup for unregistered attester', async () => {
            const id = new ZkIdentity()
            const accounts = await ethers.getSigners()
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.signup,
                stringifyBigInts({
                    epoch: 0,
                    identity_nullifier: id.identityNullifier,
                    identity_trapdoor: id.trapdoor,
                    attester_id: BigInt(accounts[5].address),
                })
            )
            const { publicSignals, proof } = new SignupProof(
                r.publicSignals,
                r.proof,
                defaultProver
            )
            await expect(
                unirepContract
                    .connect(accounts[1])
                    .userSignUp(publicSignals, proof)
            ).to.be.revertedWithCustomError(unirepContract, 'AttesterNotSignUp')
        })

        it('should fail to signup with wrong zk epoch', async () => {
            const id = new ZkIdentity()
            const accounts = await ethers.getSigners()
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.signup,
                stringifyBigInts({
                    epoch: 44444,
                    identity_nullifier: id.identityNullifier,
                    identity_trapdoor: id.trapdoor,
                    attester_id: BigInt(accounts[1].address),
                })
            )
            const { publicSignals, proof } = new SignupProof(
                r.publicSignals,
                r.proof,
                defaultProver
            )
            await expect(
                unirepContract
                    .connect(accounts[1])
                    .userSignUp(publicSignals, proof)
            ).to.be.revertedWithCustomError(unirepContract, 'EpochNotMatch')
        })

        it('should update current epoch if needed', async () => {
            const id = new ZkIdentity()
            const accounts = await ethers.getSigners()
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.signup,
                stringifyBigInts({
                    epoch: 0,
                    identity_nullifier: id.identityNullifier,
                    identity_trapdoor: id.trapdoor,
                    attester_id: BigInt(accounts[1].address),
                })
            )
            const { publicSignals, proof } = new SignupProof(
                r.publicSignals,
                r.proof,
                defaultProver
            )
            await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
            await expect(
                unirepContract
                    .connect(accounts[1])
                    .userSignUp(publicSignals, proof)
            ).to.be.revertedWithCustomError(unirepContract, 'EpochNotMatch')
        })
    })
})
