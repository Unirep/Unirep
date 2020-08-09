import chai from "chai"
import { ethers } from "@nomiclabs/buidler"
import { Contract, Signer, Wallet } from "ethers"
import { genIdentity, genIdentityCommitment } from 'libsemaphore'

const { expect } = chai

import { circuitGlobalStateTreeDepth } from '../../config/testLocal'
import {
    compileAndLoadCircuit,
} from './utils'
import { deployUnirep } from '../utils'

import {
    genRandomSalt,
    IncrementalQuinTree,
} from 'maci-crypto'

describe('Global State Tree circuits', () => {
    let accounts: Signer[]
    let unirepContract: Contract

    let ZERO_VALUE

    beforeEach(async () => {
        accounts = await ethers.getSigners()

        unirepContract = await deployUnirep(<Wallet>accounts[0], circuitGlobalStateTreeDepth)
        ZERO_VALUE = await unirepContract.hashedBlankStateLeaf()
    })

    describe('LeafExists', () => {
        let circuit

        before(async () => {
            circuit = await compileAndLoadCircuit('test/GSTMerkleTreeLeafExists_test.circom')
        })

        it('Valid LeafExists inputs should work', async () => {
            const tree = new IncrementalQuinTree(circuitGlobalStateTreeDepth, ZERO_VALUE, 2)
            const leaves: any[] = []

            for (let i = 0; i < 2 ** circuitGlobalStateTreeDepth; i++) {
                const id = genIdentity()
                const commitment = genIdentityCommitment(id)
                const stateRoot = genRandomSalt()

                const hashedStateLeaf = await unirepContract.hashStateLeaf(
                    [
                        commitment.toString(),
                        stateRoot.toString()
                    ]
                )
                tree.insert(hashedStateLeaf)
                leaves.push({
                    id: id,
                    stateRoot: stateRoot,
                })
            }

            const root = tree.root

            for (let i = 0; i < 2 ** circuitGlobalStateTreeDepth; i++) {
                const proof = tree.genMerklePath(i)
                const id = leaves[i]['id']
                const stateRoot = leaves[i]['stateRoot']
                const circuitInputs = {
                    identity_pk: id['keypair']['pubKey'],
                    identity_nullifier: id['identityNullifier'], 
                    identity_trapdoor: id['identityTrapdoor'],
                    user_state_root: stateRoot,
                    path_elements: proof.pathElements,
                    path_index: proof.indices,
                    root,
                }
                const witness = circuit.calculateWitness(circuitInputs)
                expect(circuit.checkWitness(witness)).to.be.true
            }
        })

        it('Invalid LeafExists inputs should not work', async () => {
            const tree = new IncrementalQuinTree(circuitGlobalStateTreeDepth, ZERO_VALUE, 2)
            const leaves: any[] = []

            for (let i = 0; i < 2 ** circuitGlobalStateTreeDepth; i++) {
                const id = genIdentity()
                const commitment = genIdentityCommitment(id)
                const stateRoot = genRandomSalt()

                const hashedStateLeaf = await unirepContract.hashStateLeaf(
                    [
                        commitment.toString(),
                        stateRoot.toString()
                    ]
                )
                tree.insert(hashedStateLeaf)
                leaves.push({
                    id: id,
                    stateRoot: genRandomSalt(),  // Generate another random state root as inputs to the circuit
                })
            }

            const root = tree.root

            for (let i = 0; i < 2 ** circuitGlobalStateTreeDepth; i++) {
                const proof = tree.genMerklePath(i)
                const id = leaves[i]['id']
                const stateRoot = leaves[i]['stateRoot']
                const circuitInputs = {
                    identity_pk: id['keypair']['pubKey'],
                    identity_nullifier: id['identityNullifier'], 
                    identity_trapdoor: id['identityTrapdoor'],
                    user_state_root: stateRoot,
                    path_elements: proof.pathElements,
                    path_index: proof.indices,
                    root,
                }
                expect(() => {
                    circuit.calculateWitness(circuitInputs)
                }).to.throw
            }
        })
    })

    describe('MerkleTreeInclusionProof', () => {
        let circuit

        before(async () => {
            circuit = await compileAndLoadCircuit('test/GSTMerkleTreeInclusionProof_test.circom')
        })

        it('Valid update proofs should work', async () => {
            const tree = new IncrementalQuinTree(circuitGlobalStateTreeDepth, ZERO_VALUE, 2)
            const leaves: any[] = []

            // Populate the tree
            for (let i = 0; i < 2 ** circuitGlobalStateTreeDepth; i++) {
                const id = genIdentity()
                const commitment = genIdentityCommitment(id)
                const stateRoot = genRandomSalt()

                const hashedStateLeaf = await unirepContract.hashStateLeaf(
                    [
                        commitment.toString(),
                        stateRoot.toString()
                    ]
                )
                tree.insert(hashedStateLeaf)
                leaves.push({
                    id: id,
                    stateRoot: stateRoot,
                })
            }

            for (let i = 0; i < 2 ** circuitGlobalStateTreeDepth; i++) {
                const newStateRoot = genRandomSalt()

                const newHashedStateLeaf = await unirepContract.hashStateLeaf(
                    [
                        genIdentityCommitment(leaves[i]['id']).toString(),
                        newStateRoot.toString()
                    ]
                )

                tree.update(i, newHashedStateLeaf)

                const proof = tree.genMerklePath(i)

                const root = tree.root

                const id = leaves[i]['id']
                const circuitInputs = {
                    identity_pk: id['keypair']['pubKey'],
                    identity_nullifier: id['identityNullifier'], 
                    identity_trapdoor: id['identityTrapdoor'],
                    user_state_root: newStateRoot,
                    path_elements: proof.pathElements,
                    path_index: proof.indices,
                }

                const witness = circuit.calculateWitness(circuitInputs)
                expect(circuit.checkWitness(witness)).to.be.true

                expect(witness[circuit.getSignalIdx('main.root')].toString())
                    .equal(root.toString())
            }
        })

        it('Invalid update proofs should not work', async () => {
            const tree = new IncrementalQuinTree(circuitGlobalStateTreeDepth, ZERO_VALUE, 2)
            const leaves: any[] = []

            // Populate the tree
            for (let i = 0; i < 2 ** circuitGlobalStateTreeDepth; i++) {
                const id = genIdentity()
                const commitment = genIdentityCommitment(id)
                const stateRoot = genRandomSalt()

                const hashedStateLeaf = await unirepContract.hashStateLeaf(
                    [
                        commitment.toString(),
                        stateRoot.toString()
                    ]
                )
                tree.insert(hashedStateLeaf)
                leaves.push({
                    id: id,
                    stateRoot: stateRoot,
                })
            }

            for (let i = 0; i < 2 ** circuitGlobalStateTreeDepth; i++) {
                const id = genIdentity()
                const commitment = genIdentityCommitment(id)
                const stateRoot = genRandomSalt()

                const hashedStateLeaf = await unirepContract.hashStateLeaf(
                    [
                        commitment.toString(),
                        stateRoot.toString()
                    ]
                )
                tree.insert(hashedStateLeaf)

                const proof = tree.genMerklePath(i)

                const circuitInputs = {
                    identity_pk: id['keypair']['pubKey'],
                    identity_nullifier: id['identityNullifier'], 
                    identity_trapdoor: id['identityTrapdoor'],
                    user_state_root: stateRoot,
                    path_elements: proof.pathElements,
                    path_index: proof.indices,
                }

                expect(() => {
                    circuit.calculateWitness(circuitInputs)
                }).to.throw
            }
        })
    })
})