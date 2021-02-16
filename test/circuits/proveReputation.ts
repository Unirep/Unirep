import chai from "chai"

const { expect } = chai

import {
    compileAndLoadCircuit,
    executeCircuit,
    genVerifyReputationProofAndPublicSignals,
    verifyProveReputationProof,
} from './utils'
import { genEpochKey, genEpochKeyNullifier, genNewNullifierTree, genNewUserStateTree, SMT_ONE_LEAF } from '../utils'

import {
    IncrementalQuinTree,
    genRandomSalt,
    hash5,
    hashLeftRight,
    hashOne,
    stringifyBigInts,
} from 'maci-crypto'
import { genIdentity, genIdentityCommitment } from 'libsemaphore'
import { SparseMerkleTreeImpl } from "../../crypto/SMT"
import { circuitEpochTreeDepth, circuitGlobalStateTreeDepth, circuitNullifierTreeDepth, circuitUserStateTreeDepth } from "../../config/testLocal"
import { Reputation } from "../../core"

describe('Prove reputation from attester circuit', function () {
    this.timeout(300000)

    let circuit

    const epoch = 1
    const nonce = 1
    const user = genIdentity()
    const NUM_ATTESTERS = 10

    let GSTZERO_VALUE = 0, GSTree, GSTreeRoot, GSTreeProof
    let userStateTree: SparseMerkleTreeImpl, userStateRoot
    let nullifierTree: SparseMerkleTreeImpl, nullifierTreeRoot, epkNullifierProof
    let epkNullifier

    let reputationRecords = {}
    const MIN_POS_REP = 10
    const MAX_NEG_REP = 10

    before(async () => {
        const startCompileTime = Math.floor(new Date().getTime() / 1000)
        circuit = await compileAndLoadCircuit('test/proveReputation_test.circom')
        const endCompileTime = Math.floor(new Date().getTime() / 1000)
        console.log(`Compile time: ${endCompileTime - startCompileTime} seconds`)

        // User state
        userStateTree = await genNewUserStateTree("circuit")

        // Bootstrap user state
        for (let i = 0; i < NUM_ATTESTERS; i++) {
            let attesterId = Math.ceil(Math.random() * (2 ** circuitUserStateTreeDepth - 1))
            while (reputationRecords[attesterId] !== undefined) attesterId = Math.floor(Math.random() * (2 ** circuitUserStateTreeDepth))
            const graffitiPreImage = genRandomSalt()
            reputationRecords[attesterId] = new Reputation(
                BigInt(Math.floor(Math.random() * 100) + MIN_POS_REP),
                BigInt(Math.floor(Math.random() * MAX_NEG_REP)),
                hashOne(graffitiPreImage),
            )
            reputationRecords[attesterId].addGraffitiPreImage(graffitiPreImage)
            await userStateTree.update(BigInt(attesterId), reputationRecords[attesterId].hash())
        }

        userStateRoot = userStateTree.getRootHash()
        // Global state tree
        GSTree = new IncrementalQuinTree(circuitGlobalStateTreeDepth, GSTZERO_VALUE, 2)
        const commitment = genIdentityCommitment(user)
        const hashedStateLeaf = hashLeftRight(commitment, userStateRoot)
        GSTree.insert(hashedStateLeaf)
        GSTreeProof = GSTree.genMerklePath(0)
        GSTreeRoot = GSTree.root

        // Nullifier tree
        nullifierTree = await genNewNullifierTree("circuit")
        nullifierTreeRoot = nullifierTree.getRootHash()

        epkNullifier = genEpochKeyNullifier(user['identityNullifier'], epoch, nonce, circuitNullifierTreeDepth)
        epkNullifierProof = await nullifierTree.getMerkleProof(epkNullifier)
    })

    it('successfully prove reputation', async () => {
        const attesterIds = Object.keys(reputationRecords)
        const attesterId = attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)]
        const USTPathElements = await userStateTree.getMerkleProof(BigInt(attesterId))

        const circuitInputs = {
            epoch: epoch,
            nonce: nonce,
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'], 
            identity_trapdoor: user['identityTrapdoor'],
            user_state_root: userStateRoot,
            GST_path_index: GSTreeProof.indices,
            GST_path_elements: GSTreeProof.pathElements,
            GST_root: GSTreeRoot,
            nullifier_tree_root: nullifierTreeRoot,
            nullifier_path_elements: epkNullifierProof,
            attester_id: attesterId,
            pos_rep: reputationRecords[attesterId]['posRep'],
            neg_rep: reputationRecords[attesterId]['negRep'],
            graffiti: reputationRecords[attesterId]['graffiti'],
            UST_path_elements: USTPathElements,
            min_pos_rep: MIN_POS_REP,
            max_neg_rep: MAX_NEG_REP,
            graffiti_pre_image: reputationRecords[attesterId]['graffitiPreImage']
        }

        const witness = await executeCircuit(circuit, circuitInputs)
        const startTime = new Date().getTime()
        const results = await genVerifyReputationProofAndPublicSignals(stringifyBigInts(circuitInputs))
        const endTime = new Date().getTime()
        console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
        const isValid = await verifyProveReputationProof(results['proof'], results['publicSignals'])
        expect(isValid).to.be.true
    })

    it('prove reputation with wrong attester Id should fail', async () => {
        const attesterIds = Object.keys(reputationRecords)
        const attesterId = Number(attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)])
        const USTPathElements = await userStateTree.getMerkleProof(BigInt(attesterId))
        const wrongAttesterId = attesterId < (NUM_ATTESTERS - 1) ? attesterId + 1 : attesterId - 1

        const circuitInputs = {
            epoch: epoch,
            nonce: nonce,
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'], 
            identity_trapdoor: user['identityTrapdoor'],
            user_state_root: userStateRoot,
            GST_path_index: GSTreeProof.indices,
            GST_path_elements: GSTreeProof.pathElements,
            GST_root: GSTreeRoot,
            nullifier_tree_root: nullifierTreeRoot,
            nullifier_path_elements: epkNullifierProof,
            attester_id: wrongAttesterId,
            pos_rep: reputationRecords[attesterId]['posRep'],
            neg_rep: reputationRecords[attesterId]['negRep'],
            graffiti: reputationRecords[attesterId]['graffiti'],
            UST_path_elements: USTPathElements,
            min_pos_rep: MIN_POS_REP,
            max_neg_rep: MAX_NEG_REP,
            graffiti_pre_image: reputationRecords[attesterId]['graffitiPreImage']
        }

        let error
        try {
            await executeCircuit(circuit, circuitInputs)
        } catch (e) {
            error = e
            expect(true).to.be.true
        } finally {
            if (!error) throw Error("Root mismatch results from wrong attester Id should throw error")
        }
    })

    it('prove reputation with not exist user state should fail', async () => {
        const attesterIds = Object.keys(reputationRecords)
        const attesterId = Number(attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)])
        const USTPathElements = await userStateTree.getMerkleProof(BigInt(attesterId))
        const wrongUserStateRoot = genRandomSalt()

        const circuitInputs = {
            epoch: epoch,
            nonce: nonce,
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'], 
            identity_trapdoor: user['identityTrapdoor'],
            user_state_root: wrongUserStateRoot,
            GST_path_index: GSTreeProof.indices,
            GST_path_elements: GSTreeProof.pathElements,
            GST_root: GSTreeRoot,
            nullifier_tree_root: nullifierTreeRoot,
            nullifier_path_elements: epkNullifierProof,
            attester_id: attesterId,
            pos_rep: reputationRecords[attesterId]['posRep'],
            neg_rep: reputationRecords[attesterId]['negRep'],
            graffiti: reputationRecords[attesterId]['graffiti'],
            UST_path_elements: USTPathElements,
            min_pos_rep: MIN_POS_REP,
            max_neg_rep: MAX_NEG_REP,
            graffiti_pre_image: reputationRecords[attesterId]['graffitiPreImage']
        }

        let error
        try {
            await executeCircuit(circuit, circuitInputs)
        } catch (e) {
            error = e
            expect(true).to.be.true
        } finally {
            if (!error) throw Error("Root mismatch results from wrong user state should throw error")
        }
    })

    it('prove reputation with incorrect reputation should fail', async () => {
        const attesterIds = Object.keys(reputationRecords)
        const attesterId = Number(attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)])
        const posRep = reputationRecords[attesterId]['posRep']
        const negRep = reputationRecords[attesterId]['negRep']
        const USTPathElements = await userStateTree.getMerkleProof(BigInt(attesterId))
        const wrongMinPosRep = posRep

        const circuitInputs1 = {
            epoch: epoch,
            nonce: nonce,
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'], 
            identity_trapdoor: user['identityTrapdoor'],
            user_state_root: userStateRoot,
            GST_path_index: GSTreeProof.indices,
            GST_path_elements: GSTreeProof.pathElements,
            GST_root: GSTreeRoot,
            nullifier_tree_root: nullifierTreeRoot,
            nullifier_path_elements: epkNullifierProof,
            attester_id: attesterId,
            pos_rep: reputationRecords[attesterId]['posRep'],
            neg_rep: reputationRecords[attesterId]['negRep'],
            graffiti: reputationRecords[attesterId]['graffiti'],
            UST_path_elements: USTPathElements,
            min_pos_rep: wrongMinPosRep,
            max_neg_rep: MAX_NEG_REP,
            graffiti_pre_image: reputationRecords[attesterId]['graffitiPreImage']
        }

        let error
        try {
            await executeCircuit(circuit, circuitInputs1)
        } catch (e) {
            error = e
            expect(true).to.be.true
        } finally {
            if (!error) throw Error("Mismatch reputation record should throw error")
        }

        const wrongMaxNegRep = negRep

        const circuitInputs2 = {
            epoch: epoch,
            nonce: nonce,
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'], 
            identity_trapdoor: user['identityTrapdoor'],
            user_state_root: userStateRoot,
            GST_path_index: GSTreeProof.indices,
            GST_path_elements: GSTreeProof.pathElements,
            GST_root: GSTreeRoot,
            nullifier_tree_root: nullifierTreeRoot,
            nullifier_path_elements: epkNullifierProof,
            attester_id: attesterId,
            pos_rep: reputationRecords[attesterId]['posRep'],
            neg_rep: reputationRecords[attesterId]['negRep'],
            graffiti: reputationRecords[attesterId]['graffiti'],
            UST_path_elements: USTPathElements,
            min_pos_rep: MIN_POS_REP,
            max_neg_rep: wrongMaxNegRep,
            graffiti_pre_image: reputationRecords[attesterId]['graffitiPreImage']
        }

        try {
            await executeCircuit(circuit, circuitInputs2)
        } catch (e) {
            error = e
            expect(true).to.be.true
        } finally {
            if (!error) throw Error("Mismatch reputation record should throw error")
        }
    })

    it('prove reputation with wrong graffiti pre image should fail', async () => {
        const attesterIds = Object.keys(reputationRecords)
        const attesterId = Number(attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)])
        const USTPathElements = await userStateTree.getMerkleProof(BigInt(attesterId))
        const wrongGraffitiPreImage = genRandomSalt()

        const circuitInputs = {
            epoch: epoch,
            nonce: nonce,
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'], 
            identity_trapdoor: user['identityTrapdoor'],
            user_state_root: userStateRoot,
            GST_path_index: GSTreeProof.indices,
            GST_path_elements: GSTreeProof.pathElements,
            GST_root: GSTreeRoot,
            nullifier_tree_root: nullifierTreeRoot,
            nullifier_path_elements: epkNullifierProof,
            attester_id: attesterId,
            pos_rep: reputationRecords[attesterId]['posRep'],
            neg_rep: reputationRecords[attesterId]['negRep'],
            graffiti: reputationRecords[attesterId]['graffiti'],
            UST_path_elements: USTPathElements,
            min_pos_rep: MIN_POS_REP,
            max_neg_rep: MAX_NEG_REP,
            graffiti_pre_image: wrongGraffitiPreImage
        }

        let error
        try {
            await executeCircuit(circuit, circuitInputs)
        } catch (e) {
            error = e
            expect(true).to.be.true
        } finally {
            if (!error) throw Error("Wrong graffiti pre-image should throw error")
        }
    })

    it('prove reputation with epoch key nullifier seen before should fail', async () => {
        const attesterIds = Object.keys(reputationRecords)
        const attesterId = Number(attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)])
        const USTPathElements = await userStateTree.getMerkleProof(BigInt(attesterId))
        // Create another nullifier tree that inserted the epoch key nullifier
        const _nullifierTree = await genNewNullifierTree("circuit")
        await _nullifierTree.update(BigInt(attesterId), SMT_ONE_LEAF)
        const _nullifierTreeRoot = _nullifierTree.getRootHash()


        const circuitInputs = {
            epoch: epoch,
            nonce: nonce,
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'], 
            identity_trapdoor: user['identityTrapdoor'],
            user_state_root: userStateRoot,
            GST_path_index: GSTreeProof.indices,
            GST_path_elements: GSTreeProof.pathElements,
            GST_root: GSTreeRoot,
            nullifier_tree_root: _nullifierTreeRoot,
            nullifier_path_elements: epkNullifierProof,
            attester_id: attesterId,
            pos_rep: reputationRecords[attesterId]['posRep'],
            neg_rep: reputationRecords[attesterId]['negRep'],
            graffiti: reputationRecords[attesterId]['graffiti'],
            UST_path_elements: USTPathElements,
            min_pos_rep: MIN_POS_REP,
            max_neg_rep: MAX_NEG_REP,
            graffiti_pre_image: reputationRecords[attesterId]['graffitiPreImage']
        }

        let error
        try {
            await executeCircuit(circuit, circuitInputs)
        } catch (e) {
            error = e
            expect(true).to.be.true
        } finally {
            if (!error) throw Error("Seen epoch key nullifier should throw error")
        }
    })
})