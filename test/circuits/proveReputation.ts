import chai from "chai"

const { expect } = chai

import {
    compileAndLoadCircuit,
    executeCircuit,
    genVerifyReputationProofAndPublicSignals,
    verifyProveReputationProof,
} from './utils'
import { genNewUserStateTree } from '../utils'

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
import { circuitGlobalStateTreeDepth, circuitUserStateTreeDepth } from "../../config/testLocal"

describe('Prove reputation from attester circuit', function () {
    this.timeout(300000)

    let circuit

    const user = genIdentity()
    const NUM_ATTESTERS = 10

    let GSTZERO_VALUE = 0, GSTree, GSTreeRoot, GSTreeProof
    let userStateTree: SparseMerkleTreeImpl, userStateRoot

    let reputationRecords = {}

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
            reputationRecords[attesterId] = {
                posRep: Math.floor(Math.random() * 100),
                negRep: Math.floor(Math.random() * 100),
                graffitiPreImage: graffitiPreImage,
                graffiti: hashOne(graffitiPreImage),
            }
            const newReputationRecord = hash5([
                reputationRecords[attesterId]['posRep'],
                reputationRecords[attesterId]['negRep'],
                reputationRecords[attesterId]['graffiti'],
                BigInt(0),
                BigInt(0)
            ])
            reputationRecords[attesterId]['recordHash'] = newReputationRecord
            await userStateTree.update(BigInt(attesterId), newReputationRecord)
        }

        userStateRoot = userStateTree.getRootHash()
        // Global state tree
        GSTree = new IncrementalQuinTree(circuitGlobalStateTreeDepth, GSTZERO_VALUE, 2)
        const commitment = genIdentityCommitment(user)
        const hashedStateLeaf = hashLeftRight(commitment, userStateRoot)
        GSTree.insert(hashedStateLeaf)
        GSTreeProof = GSTree.genMerklePath(0)
        GSTreeRoot = GSTree.root
    })

    it('successfully prove reputation', async () => {
        const attesterIds = Object.keys(reputationRecords)
        const attesterId = attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)]
        const posRep = reputationRecords[attesterId]['posRep']
        const negRep = reputationRecords[attesterId]['negRep']
        const pathElements = await userStateTree.getMerkleProof(BigInt(attesterId))

        const circuitInputs = {
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'], 
            identity_trapdoor: user['identityTrapdoor'],
            user_state_root: userStateRoot,
            GST_path_index: GSTreeProof.indices,
            GST_path_elements: GSTreeProof.pathElements,
            GST_root: GSTreeRoot,
            attester_id: attesterId,
            pos_rep: reputationRecords[attesterId]['posRep'],
            neg_rep: reputationRecords[attesterId]['negRep'],
            graffiti: reputationRecords[attesterId]['graffiti'],
            UST_path_elements: pathElements,
            min_pos_rep: posRep - 10,
            max_neg_rep: negRep + 10,
            graffiti_pre_image: reputationRecords[attesterId]['graffitiPreImage']
        }

        const witness = await executeCircuit(circuit, circuitInputs)
        const startTime = Math.floor(new Date().getTime() / 1000)
        const results = await genVerifyReputationProofAndPublicSignals(stringifyBigInts(circuitInputs), circuit)
        const endTime = Math.floor(new Date().getTime() / 1000)
        console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
        const isValid = await verifyProveReputationProof(results['proof'], results['publicSignals'])
        expect(isValid).to.be.true
    })

    it('prove reputation with wrong attester Id should fail', async () => {
        const attesterIds = Object.keys(reputationRecords)
        const attesterId = Number(attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)])
        const posRep = reputationRecords[attesterId]['posRep']
        const negRep = reputationRecords[attesterId]['negRep']
        const pathElements = await userStateTree.getMerkleProof(BigInt(attesterId))
        const wrongAttesterId = attesterId < (NUM_ATTESTERS - 1) ? attesterId + 1 : attesterId - 1

        const circuitInputs = {
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'], 
            identity_trapdoor: user['identityTrapdoor'],
            user_state_root: userStateRoot,
            GST_path_index: GSTreeProof.indices,
            GST_path_elements: GSTreeProof.pathElements,
            GST_root: GSTreeRoot,
            attester_id: wrongAttesterId,
            pos_rep: reputationRecords[attesterId]['posRep'],
            neg_rep: reputationRecords[attesterId]['negRep'],
            graffiti: reputationRecords[attesterId]['graffiti'],
            UST_path_elements: pathElements,
            min_pos_rep: posRep - 10,
            max_neg_rep: negRep + 10,
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
        const posRep = reputationRecords[attesterId]['posRep']
        const negRep = reputationRecords[attesterId]['negRep']
        const pathElements = await userStateTree.getMerkleProof(BigInt(attesterId))
        const wrongUserStateRoot = genRandomSalt()

        const circuitInputs = {
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'], 
            identity_trapdoor: user['identityTrapdoor'],
            user_state_root: wrongUserStateRoot,
            GST_path_index: GSTreeProof.indices,
            GST_path_elements: GSTreeProof.pathElements,
            GST_root: GSTreeRoot,
            attester_id: attesterId,
            pos_rep: reputationRecords[attesterId]['posRep'],
            neg_rep: reputationRecords[attesterId]['negRep'],
            graffiti: reputationRecords[attesterId]['graffiti'],
            UST_path_elements: pathElements,
            min_pos_rep: posRep - 10,
            max_neg_rep: negRep + 10,
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
        const pathElements = await userStateTree.getMerkleProof(BigInt(attesterId))
        const wrongMinPosRep = posRep

        const circuitInputs1 = {
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'], 
            identity_trapdoor: user['identityTrapdoor'],
            user_state_root: userStateRoot,
            GST_path_index: GSTreeProof.indices,
            GST_path_elements: GSTreeProof.pathElements,
            GST_root: GSTreeRoot,
            attester_id: attesterId,
            pos_rep: reputationRecords[attesterId]['posRep'],
            neg_rep: reputationRecords[attesterId]['negRep'],
            graffiti: reputationRecords[attesterId]['graffiti'],
            UST_path_elements: pathElements,
            min_pos_rep: wrongMinPosRep,
            max_neg_rep: negRep + 10,
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
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'], 
            identity_trapdoor: user['identityTrapdoor'],
            user_state_root: userStateRoot,
            GST_path_index: GSTreeProof.indices,
            GST_path_elements: GSTreeProof.pathElements,
            GST_root: GSTreeRoot,
            attester_id: attesterId,
            pos_rep: reputationRecords[attesterId]['posRep'],
            neg_rep: reputationRecords[attesterId]['negRep'],
            graffiti: reputationRecords[attesterId]['graffiti'],
            UST_path_elements: pathElements,
            min_pos_rep: posRep - 10,
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
        const posRep = reputationRecords[attesterId]['posRep']
        const negRep = reputationRecords[attesterId]['negRep']
        const pathElements = await userStateTree.getMerkleProof(BigInt(attesterId))
        const wrongGraffitiPreImage = genRandomSalt()

        const circuitInputs = {
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'], 
            identity_trapdoor: user['identityTrapdoor'],
            user_state_root: userStateRoot,
            GST_path_index: GSTreeProof.indices,
            GST_path_elements: GSTreeProof.pathElements,
            GST_root: GSTreeRoot,
            attester_id: attesterId,
            pos_rep: reputationRecords[attesterId]['posRep'],
            neg_rep: reputationRecords[attesterId]['negRep'],
            graffiti: reputationRecords[attesterId]['graffiti'],
            UST_path_elements: pathElements,
            min_pos_rep: posRep - 10,
            max_neg_rep: negRep + 10,
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
})