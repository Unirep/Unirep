import chai from "chai"
import { ethers as hardhatEthers } from "hardhat"
import { ethers } from 'ethers'
import { genIdentity, genIdentityCommitment } from 'libsemaphore'

const { expect } = chai

import {
    compileAndLoadCircuit,
    executeCircuit,
    genVerifyEpochKeyProofAndPublicSignals,
    verifyEPKProof,
} from './utils'
import { deployUnirep, genEpochKey, getTreeDepthsForTesting } from '../utils'

import {
    genRandomSalt,
    hash5,
    IncrementalQuinTree,
    stringifyBigInts,
} from 'maci-crypto'
import { numEpochKeyNoncePerEpoch, circuitEpochTreeDepth, circuitGlobalStateTreeDepth } from "../../config/testLocal"
import { DEFAULT_AIRDROPPED_KARMA } from "../../config/socialMedia"

describe('Verify Epoch Key circuits', function () {
    this.timeout(300000)

    let circuit

    let accounts: ethers.Signer[]
    let unirepContract: ethers.Contract
    let ZERO_VALUE

    const maxEPK = BigInt(2 ** circuitEpochTreeDepth)

    let id, commitment, stateRoot
    let tree, proof, root
    let nonce, currentEpoch, epochKey
    let hashedLeaf
    const transitionedPosRep = 20
    const transitionedNegRep = 0

    before(async () => {
        accounts = await hardhatEthers.getSigners()
    
        const _treeDepths = getTreeDepthsForTesting("circuit")
        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], _treeDepths)
        ZERO_VALUE = await unirepContract.hashedBlankStateLeaf()
        const startCompileTime = Math.floor(new Date().getTime() / 1000)
        circuit = await compileAndLoadCircuit('test/verifyEpochKey_test.circom')
        const endCompileTime = Math.floor(new Date().getTime() / 1000)
        console.log(`Compile time: ${endCompileTime - startCompileTime} seconds`)

        tree = new IncrementalQuinTree(circuitGlobalStateTreeDepth, ZERO_VALUE, 2)
        id = genIdentity()
        commitment = genIdentityCommitment(id)
        stateRoot = genRandomSalt()
        hashedLeaf = hash5([
            commitment,
            stateRoot,
            BigInt(transitionedPosRep),
            BigInt(transitionedNegRep),
            BigInt(0)
        ])

        const hashedStateLeaf = await unirepContract.hashStateLeaf(
            [
                commitment.toString(),
                stateRoot.toString(),
                BigInt(DEFAULT_AIRDROPPED_KARMA),
                BigInt(0)
            ]
        )
        tree.insert(BigInt(hashedStateLeaf.toString()))
        proof = tree.genMerklePath(0)
        root = tree.root

        nonce = 0
        currentEpoch = 1
        epochKey = genEpochKey(id['identityNullifier'], currentEpoch, nonce, circuitEpochTreeDepth)
    })

    it('Valid epoch key should pass check', async () => {
        // Check if every valid nonce works
        for (let i = 0; i < numEpochKeyNoncePerEpoch; i++) {
            const n = i
            const epk = genEpochKey(id['identityNullifier'], currentEpoch, n, circuitEpochTreeDepth)
            
            const circuitInputs = {
                GST_path_elements: proof.pathElements,
                GST_path_index: proof.indices,
                GST_root: root,
                identity_pk: id['keypair']['pubKey'],
                identity_nullifier: id['identityNullifier'], 
                identity_trapdoor: id['identityTrapdoor'],
                user_tree_root: stateRoot,
                user_state_hash: hashedLeaf,
                positive_karma: transitionedPosRep,
                negative_karma: transitionedNegRep,
                nonce: n,
                epoch: currentEpoch,
                epoch_key: epk,
            }
            const witness = await executeCircuit(circuit, circuitInputs)
            const startTime = new Date().getTime()
            const results = await genVerifyEpochKeyProofAndPublicSignals(stringifyBigInts(circuitInputs))
            const endTime = new Date().getTime()
            console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            const isValid = await verifyEPKProof(results['proof'], results['publicSignals'])
            expect(isValid).to.be.true
        }
    })

    it('Invalid epoch key should not pass check', async () => {
        // Validate against invalid epoch key
        const invalidEpochKey1 = maxEPK
        let circuitInputs = {
            GST_path_elements: proof.pathElements,
            GST_path_index: proof.indices,
            GST_root: root,
            identity_pk: id['keypair']['pubKey'],
            identity_nullifier: id['identityNullifier'], 
            identity_trapdoor: id['identityTrapdoor'],
            user_tree_root: stateRoot,
            user_state_hash: hashedLeaf,
            positive_karma: transitionedPosRep,
            negative_karma: transitionedNegRep,
            nonce: nonce,
            epoch: currentEpoch,
            epoch_key: invalidEpochKey1,
        }
        let error
        try {
            await executeCircuit(circuit, circuitInputs)
        } catch (e) {
            error = e
            expect(true).to.be.true
        } finally {
            if (!error) throw Error("Epoch key too large should throw error")
        }
    })

    it('Wrong Id should not pass check', async () => {
        const fakeId = genIdentity()
        const circuitInputs = {
            GST_path_elements: proof.pathElements,
            GST_path_index: proof.indices,
            GST_root: root,
            identity_pk: fakeId['keypair']['pubKey'],
            identity_nullifier: fakeId['identityNullifier'], 
            identity_trapdoor: fakeId['identityTrapdoor'],
            user_tree_root: stateRoot,
            user_state_hash: hashedLeaf,
            positive_karma: transitionedPosRep,
            negative_karma: transitionedNegRep,
            nonce: nonce,
            epoch: currentEpoch,
            epoch_key: epochKey,
        }
        let error
        try {
            await executeCircuit(circuit, circuitInputs)
        } catch (e) {
            error = e
            expect(true).to.be.true
        } finally {
            if (!error) throw Error("Wrong Id should throw error")
        }
    })

    it('Mismatched GST tree root should not pass check', async () => {
        const otherTreeRoot = genRandomSalt()
        const circuitInputs = {
            GST_path_elements: proof.pathElements,
            GST_path_index: proof.indices,
            GST_root: root,
            identity_pk: id['keypair']['pubKey'],
            identity_nullifier: id['identityNullifier'], 
            identity_trapdoor: id['identityTrapdoor'],
            user_tree_root: otherTreeRoot,
            user_state_hash: hashedLeaf,
            positive_karma: transitionedPosRep,
            negative_karma: transitionedNegRep,
            nonce: nonce,
            epoch: currentEpoch,
            epoch_key: epochKey,
        }
        let error
        try {
            await executeCircuit(circuit, circuitInputs)
        } catch (e) {
            error = e
            expect(true).to.be.true
        } finally {
            if (!error) throw Error("Wrong GST Root should throw error")
        }
    })

    it('Invalid nonce should not pass check', async () => {
        const invalidNonce = numEpochKeyNoncePerEpoch
        const circuitInputs = {
            GST_path_elements: proof.pathElements,
            GST_path_index: proof.indices,
            GST_root: root,
            identity_pk: id['keypair']['pubKey'],
            identity_nullifier: id['identityNullifier'], 
            identity_trapdoor: id['identityTrapdoor'],
            user_tree_root: stateRoot,
            user_state_hash: hashedLeaf,
            positive_karma: transitionedPosRep,
            negative_karma: transitionedNegRep,
            nonce: invalidNonce,
            epoch: currentEpoch,
            epoch_key: epochKey,
        }
        let error
        try {
            await executeCircuit(circuit, circuitInputs)
        } catch (e) {
            error = e
            expect(true).to.be.true
        } finally {
            if (!error) throw Error("Invalid nonce should throw error")
        }
    })

    it('Invalid epoch should not pass check', async () => {
        let invalidEpoch, invalidEpochKey
        invalidEpoch = currentEpoch + 1
        invalidEpochKey = genEpochKey(id['identityNullifier'], invalidEpoch, nonce, circuitEpochTreeDepth)
        while (invalidEpochKey == epochKey) {
            invalidEpoch += 1
            invalidEpochKey = genEpochKey(id['identityNullifier'], invalidEpoch, nonce, circuitEpochTreeDepth)
        }
        const circuitInputs = {
            GST_path_elements: proof.pathElements,
            GST_path_index: proof.indices,
            GST_root: root,
            identity_pk: id['keypair']['pubKey'],
            identity_nullifier: id['identityNullifier'], 
            identity_trapdoor: id['identityTrapdoor'],
            user_tree_root: stateRoot,
            user_state_hash: hashedLeaf,
            positive_karma: transitionedPosRep,
            negative_karma: transitionedNegRep,
            nonce: nonce,
            epoch: invalidEpoch,
            epoch_key: epochKey,
        }
        let error
        try {
            await executeCircuit(circuit, circuitInputs)
        } catch (e) {
            error = e
            expect(true).to.be.true
        } finally {
            if (!error) throw Error("Wrong epoch should throw error")
        }
    })
})