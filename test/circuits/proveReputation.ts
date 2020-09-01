import chai from "chai"

const { expect } = chai

import {
    compileAndLoadCircuit,
} from './utils'
import { computeAttestationHash, computeNullifier, getNewSMT, bufToBigInt, bigIntToBuf } from '../utils'

import {
    IncrementalQuinTree,
    genRandomSalt,
    hash5,
    hashLeftRight,
    SnarkBigInt,
    hashOne,
    bigInt,
} from 'maci-crypto'
import { genIdentity, genIdentityCommitment } from 'libsemaphore'
import { BigNumber as smtBN, SparseMerkleTreeImpl } from "../../crypto/SMT"
import { circuitGlobalStateTreeDepth } from "../../config/testLocal"

const circuitUserStateTreeDepth = 4

describe('Prove reputation from attester circuit', () => {
    let circuit

    const user = genIdentity()
    const NUM_ATTESTERS = 10

    let GSTZERO_VALUE = 0, GSTree, GSTreeRoot, GSTreeProof
    let userStateTree: SparseMerkleTreeImpl, userStateRoot
    const ONE_LEAF = bigIntToBuf(hashLeftRight(1, 0))

    let attestationRecords = {}

    before(async () => {
        circuit = await compileAndLoadCircuit('test/proveReputation_test.circom')

        // User state
        const defaultUserStateLeaf = hash5([0, 0, 0, 0, 0])
        userStateTree = await getNewSMT(circuitUserStateTreeDepth, defaultUserStateLeaf)
        // Reserve leaf 0
        let result 
        result = await userStateTree.update(new smtBN(0), ONE_LEAF, true)
        expect(result).to.be.true
        // Bootstrap user state
        for (let i = 0; i < NUM_ATTESTERS; i++) {
            let attesterId = Math.floor(Math.random() * (2 ** circuitUserStateTreeDepth))
            while (attestationRecords[attesterId] !== undefined) attesterId = Math.floor(Math.random() * (2 ** circuitUserStateTreeDepth))
            const graffitiPreImage = genRandomSalt()
            attestationRecords[attesterId] = {
                posRep: Math.floor(Math.random() * 100),
                negRep: Math.floor(Math.random() * 100),
                graffitiPreImage: graffitiPreImage,
                graffiti: hashOne(graffitiPreImage),
            }
            const newAttestationRecord = hash5([
                attestationRecords[attesterId]['posRep'],
                attestationRecords[attesterId]['negRep'],
                attestationRecords[attesterId]['graffiti'],
                0,
                0
            ])
            attestationRecords[attesterId]['recordHash'] = newAttestationRecord
            const result = await userStateTree.update(new smtBN(attesterId), bigIntToBuf(newAttestationRecord), true)
            expect(result).to.be.true
        }

        userStateRoot = bufToBigInt(userStateTree.getRootHash())
        // Global state tree
        GSTree = new IncrementalQuinTree(circuitGlobalStateTreeDepth, GSTZERO_VALUE, 2)
        const commitment = genIdentityCommitment(user)
        const hashedStateLeaf = hashLeftRight(commitment, userStateRoot)
        GSTree.insert(hashedStateLeaf)
        GSTreeProof = GSTree.genMerklePath(0)
        GSTreeRoot = GSTree.root
    })

    it('successfully prove reputation', async () => {
        const attesterIds = Object.keys(attestationRecords)
        const attesterId = attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)]
        const posRep = attestationRecords[attesterId]['posRep']
        const negRep = attestationRecords[attesterId]['negRep']
        const attestationProof = await userStateTree.getMerkleProof(new smtBN(attesterId), bigIntToBuf(attestationRecords[attesterId]['recordHash']), true)
        const pathElements = attestationProof.siblings.map((p) => bufToBigInt(p))

        const circuitInputs = {
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'], 
            identity_trapdoor: user['identityTrapdoor'],
            user_state_root: userStateRoot,
            GST_path_index: GSTreeProof.indices,
            GST_path_elements: GSTreeProof.pathElements,
            GST_root: GSTreeRoot,
            attester_id: attesterId,
            pos_rep: attestationRecords[attesterId]['posRep'],
            neg_rep: attestationRecords[attesterId]['negRep'],
            graffiti: attestationRecords[attesterId]['graffiti'],
            UST_path_elements: pathElements,
            min_pos_rep: posRep - 10,
            max_neg_rep: negRep + 10,
            graffiti_pre_image: attestationRecords[attesterId]['graffitiPreImage']
        }

        const witness = circuit.calculateWitness(circuitInputs)
        expect(circuit.checkWitness(witness)).to.be.true
    })

    it('prove reputation with wrong attester Id should fail', async () => {
        const attesterIds = Object.keys(attestationRecords)
        const attesterId = Number(attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)])
        const posRep = attestationRecords[attesterId]['posRep']
        const negRep = attestationRecords[attesterId]['negRep']
        const attestationProof = await userStateTree.getMerkleProof(new smtBN(attesterId), bigIntToBuf(attestationRecords[attesterId]['recordHash']), true)
        const pathElements = attestationProof.siblings.map((p) => bufToBigInt(p))
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
            pos_rep: attestationRecords[attesterId]['posRep'],
            neg_rep: attestationRecords[attesterId]['negRep'],
            graffiti: attestationRecords[attesterId]['graffiti'],
            UST_path_elements: pathElements,
            min_pos_rep: posRep - 10,
            max_neg_rep: negRep + 10,
            graffiti_pre_image: attestationRecords[attesterId]['graffitiPreImage']
        }

        const rootNotMatchRegExp = RegExp('.+ -> ' + userStateRoot + ' != .+$')
        expect(() => {
            circuit.calculateWitness(circuitInputs)
        }).to.throw(rootNotMatchRegExp)
    })

    it('prove reputation with not exist user state should fail', async () => {
        const attesterIds = Object.keys(attestationRecords)
        const attesterId = Number(attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)])
        const posRep = attestationRecords[attesterId]['posRep']
        const negRep = attestationRecords[attesterId]['negRep']
        const attestationProof = await userStateTree.getMerkleProof(new smtBN(attesterId), bigIntToBuf(attestationRecords[attesterId]['recordHash']), true)
        const pathElements = attestationProof.siblings.map((p) => bufToBigInt(p))
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
            pos_rep: attestationRecords[attesterId]['posRep'],
            neg_rep: attestationRecords[attesterId]['negRep'],
            graffiti: attestationRecords[attesterId]['graffiti'],
            UST_path_elements: pathElements,
            min_pos_rep: posRep - 10,
            max_neg_rep: negRep + 10,
            graffiti_pre_image: attestationRecords[attesterId]['graffitiPreImage']
        }

        const rootNotMatchRegExp = RegExp('.+ -> ' + GSTreeRoot + ' != .+$')
        expect(() => {
            circuit.calculateWitness(circuitInputs)
        }).to.throw(rootNotMatchRegExp)
    })

    it('prove reputation with incorrect reputation should fail', async () => {
        const attesterIds = Object.keys(attestationRecords)
        const attesterId = Number(attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)])
        const posRep = attestationRecords[attesterId]['posRep']
        const negRep = attestationRecords[attesterId]['negRep']
        const attestationProof = await userStateTree.getMerkleProof(new smtBN(attesterId), bigIntToBuf(attestationRecords[attesterId]['recordHash']), true)
        const pathElements = attestationProof.siblings.map((p) => bufToBigInt(p))
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
            pos_rep: attestationRecords[attesterId]['posRep'],
            neg_rep: attestationRecords[attesterId]['negRep'],
            graffiti: attestationRecords[attesterId]['graffiti'],
            UST_path_elements: pathElements,
            min_pos_rep: wrongMinPosRep,
            max_neg_rep: negRep + 10,
            graffiti_pre_image: attestationRecords[attesterId]['graffitiPreImage']
        }

        const equalityCheckFailedRegExp = RegExp('.+ -> 0 != 1$')
        expect(() => {
            circuit.calculateWitness(circuitInputs1)
        }).to.throw(equalityCheckFailedRegExp)

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
            pos_rep: attestationRecords[attesterId]['posRep'],
            neg_rep: attestationRecords[attesterId]['negRep'],
            graffiti: attestationRecords[attesterId]['graffiti'],
            UST_path_elements: pathElements,
            min_pos_rep: posRep - 10,
            max_neg_rep: wrongMaxNegRep,
            graffiti_pre_image: attestationRecords[attesterId]['graffitiPreImage']
        }

        expect(() => {
            circuit.calculateWitness(circuitInputs2)
        }).to.throw(equalityCheckFailedRegExp)
    })

    it('prove reputation with wrong graffiti pre image should fail', async () => {
        const attesterIds = Object.keys(attestationRecords)
        const attesterId = Number(attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)])
        const posRep = attestationRecords[attesterId]['posRep']
        const negRep = attestationRecords[attesterId]['negRep']
        const attestationProof = await userStateTree.getMerkleProof(new smtBN(attesterId), bigIntToBuf(attestationRecords[attesterId]['recordHash']), true)
        const pathElements = attestationProof.siblings.map((p) => bufToBigInt(p))
        const graffiti = attestationRecords[attesterId]['graffiti']
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
            pos_rep: attestationRecords[attesterId]['posRep'],
            neg_rep: attestationRecords[attesterId]['negRep'],
            graffiti: attestationRecords[attesterId]['graffiti'],
            UST_path_elements: pathElements,
            min_pos_rep: posRep - 10,
            max_neg_rep: negRep + 10,
            graffiti_pre_image: wrongGraffitiPreImage
        }

        const preImageNotMatchRegExp = RegExp('.+ -> .+ != ' + graffiti + '$')
        expect(() => {
            circuit.calculateWitness(circuitInputs)
        }).to.throw(preImageNotMatchRegExp)
    })
})