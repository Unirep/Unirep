import chai from "chai"
import { ethers } from "@nomiclabs/buidler"
import { Contract, Signer, Wallet } from "ethers"
import { genIdentity, genIdentityCommitment } from 'libsemaphore'

const { expect } = chai

import {
    compileAndLoadCircuit,
} from './utils'
import { deployUnirep, genEpochKey } from '../utils'

import {
    genRandomSalt,
    IncrementalQuinTree,
} from 'maci-crypto'
import { maxEpochKeyNonce, circuitEpochTreeDepth, circuitGlobalStateTreeDepth } from "../../config/testLocal"

describe('Verify Epoch Key circuits', () => {
    let circuit

    let accounts: Signer[]
    let unirepContract: Contract
    let ZERO_VALUE

    let id, commitment, stateRoot
    let tree, proof, root
    let nonce, currentEpoch, epochKey

    before(async () => {
        accounts = await ethers.getSigners()
    
        unirepContract = await deployUnirep(<Wallet>accounts[0], circuitGlobalStateTreeDepth)
        ZERO_VALUE = await unirepContract.hashedBlankStateLeaf()
        circuit = await compileAndLoadCircuit('test/verifyEpochKey_test.circom')

        tree = new IncrementalQuinTree(circuitGlobalStateTreeDepth, ZERO_VALUE, 2)
        id = genIdentity()
        commitment = genIdentityCommitment(id)
        stateRoot = genRandomSalt()

        const hashedStateLeaf = await unirepContract.hashStateLeaf(
            [
                commitment.toString(),
                stateRoot.toString()
            ]
        )
        tree.insert(hashedStateLeaf)
        proof = tree.genMerklePath(0)
        root = tree.root

        nonce = 0
        currentEpoch = 1
        epochKey = genEpochKey(id['identityNullifier'], currentEpoch, nonce, circuitEpochTreeDepth)
    })

    it('Valid epoch key should pass check', async () => {
        // Check if every valid nonce works
        for (let i = 0; i <= maxEpochKeyNonce; i++) {
            const n = i
            const epk = genEpochKey(id['identityNullifier'], currentEpoch, n, circuitEpochTreeDepth)
            const circuitInputs = {
                identity_pk: id['keypair']['pubKey'],
                identity_nullifier: id['identityNullifier'], 
                identity_trapdoor: id['identityTrapdoor'],
                user_state_root: stateRoot,
                path_elements: proof.pathElements,
                path_index: proof.indices,
                root: root,
                nonce: n,
                epoch: currentEpoch,
                epoch_key: epk,
            }
            const witness = circuit.calculateWitness(circuitInputs)
            expect(circuit.checkWitness(witness)).to.be.true
        }
    })

    it('Invalid membership proof in global state tree should not pass check', async () => {
        const fakeId = genIdentity()
        const circuitInputs = {
            identity_pk: fakeId['keypair']['pubKey'],
            identity_nullifier: fakeId['identityNullifier'], 
            identity_trapdoor: fakeId['identityTrapdoor'],
            user_state_root: stateRoot,
            path_elements: proof.pathElements,
            path_index: proof.indices,
            root: root,
            nonce: nonce,
            epoch: currentEpoch,
            epoch_key: epochKey,
        }
        expect(() => {
            circuit.calculateWitness(circuitInputs)
        }).to.throw
    })

    it('Invalid nonce should not pass check', async () => {
        const invalidNonce = maxEpochKeyNonce + 1
        const circuitInputs = {
            identity_pk: id['keypair']['pubKey'],
            identity_nullifier: id['identityNullifier'], 
            identity_trapdoor: id['identityTrapdoor'],
            user_state_root: stateRoot,
            path_elements: proof.pathElements,
            path_index: proof.indices,
            root: root,
            nonce: invalidNonce,
            epoch: currentEpoch,
            epoch_key: epochKey,
        }
        expect(() => {
            circuit.calculateWitness(circuitInputs)
        }).to.throw
    })

    it('Invalid epoch should not pass check', async () => {
        const invalidEpoch = currentEpoch + 1
        const circuitInputs = {
            identity_pk: id['keypair']['pubKey'],
            identity_nullifier: id['identityNullifier'], 
            identity_trapdoor: id['identityTrapdoor'],
            user_state_root: stateRoot,
            path_elements: proof.pathElements,
            path_index: proof.indices,
            root: root,
            nonce: nonce,
            epoch: invalidEpoch,
            epoch_key: epochKey,
        }
        expect(() => {
            circuit.calculateWitness(circuitInputs)
        }).to.throw
    })
})