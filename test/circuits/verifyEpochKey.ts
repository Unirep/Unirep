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
import { maxEpochKeyNonce } from "../../config/testLocal"

const LEVELS = 4

describe('Verify Epoch Key circuits', () => {
    let circuit

    let accounts: Signer[]
    let unirepContract: Contract
    let ZERO_VALUE

    let tree, id, commitment, stateRoot

    before(async () => {
        accounts = await ethers.getSigners()
    
        unirepContract = await deployUnirep(<Wallet>accounts[0], LEVELS)
        ZERO_VALUE = await unirepContract.hashedBlankStateLeaf()
        circuit = await compileAndLoadCircuit('test/verifyEpochKey_test.circom')

        tree = new IncrementalQuinTree(LEVELS, ZERO_VALUE, 2)
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
    })

    it('Valid epoch key should pass check', async () => {
        for (let nonce = 0; nonce <= maxEpochKeyNonce; nonce++) {
            const currentEpoch = 1
            const epochKey = genEpochKey(id['identityNullifier'], currentEpoch, nonce)

            const root = tree.root

            const proof = tree.genMerklePath(0)
            const circuitInputs = {
                identity_pk: id['keypair']['pubKey'],
                identity_nullifier: id['identityNullifier'], 
                identity_trapdoor: id['identityTrapdoor'],
                user_state_root: stateRoot,
                path_elements: proof.pathElements,
                path_index: proof.indices,
                root: root,
                nonce: nonce,
                epoch_key: epochKey,
            }
            const witness = circuit.calculateWitness(circuitInputs)
            expect(circuit.checkWitness(witness)).to.be.true
        }
    })

    it('Invalid nonce should not pass check', async () => {
        const nonce = maxEpochKeyNonce + 1
        const currentEpoch = 1
        const epochKey = genEpochKey(id['identityNullifier'], currentEpoch, nonce)

        const root = tree.root

        const proof = tree.genMerklePath(0)
        const circuitInputs = {
            identity_pk: id['keypair']['pubKey'],
            identity_nullifier: id['identityNullifier'], 
            identity_trapdoor: id['identityTrapdoor'],
            user_state_root: stateRoot,
            path_elements: proof.pathElements,
            path_index: proof.indices,
            root: root,
            nonce: nonce,
            epoch_key: epochKey,
        }
        expect(() => {
            circuit.calculateWitness(circuitInputs)
        }).to.throw
    })
})