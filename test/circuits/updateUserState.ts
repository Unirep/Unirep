import chai from "chai"

const { expect } = chai

import { genIdentity, genIdentityCommitment } from 'libsemaphore'
import {
    IncrementalQuinTree,
    SnarkBigInt,
    genRandomSalt,
    hash5,
    hashLeftRight,
} from 'maci-crypto'

import {
    compileAndLoadCircuit,
} from './utils'
import { BigNumber as smtBN } from "../../crypto/SMT"
import { globalStateTreeDepth } from "../../config/testLocal"
import { bigIntToBuf, bufToBigInt, computeAttestationHash, getNewSMT, genEpochKey, computeNullifier } from "../utils"

const circuitEpochTreeDepth = 8
const circuitNullifierTreeDepth = 8

describe('Update User State circuits', function () {
    this.timeout(120000)

    let circuit

    const MAX_NONCE = 2
    const NUM_ATTESTATIONS = 10

    const epoch = 1
    const nonce = 2
    const user = genIdentity()
    const epochKey: SnarkBigInt = genEpochKey(user['identityNullifier'], epoch, nonce, circuitEpochTreeDepth)

    let GSTZERO_VALUE = 0, GSTree, GSTreeRoot, oldUserStateRoot, GSTreeProof
    let epochTree, epochTreeRoot, epochTreePathElements
    let nullifierTree, intermediateNullifierTreeRoot, nullifierTreePathElements
    const NUL_TREE_ZERO_LEAF = bigIntToBuf(hashLeftRight(0, 0))
    const NUL_TREE_ONE_LEAF = bigIntToBuf(hashLeftRight(1, 0))

    let attesterIds: SnarkBigInt[], posReps: number[], negReps: number[], graffities: SnarkBigInt[], overwriteGraffitis: boolean[]
    let selectors: number[] = []
    let hashChainResult: SnarkBigInt

    before(async () => {
        const startCompileTime = Math.floor(new Date().getTime() / 1000)
        circuit = await compileAndLoadCircuit('test/userStateTransition_test.circom')
        const endCompileTime = Math.floor(new Date().getTime() / 1000)
        console.log(`Compile time: ${endCompileTime - startCompileTime} seconds`)

        GSTree = new IncrementalQuinTree(globalStateTreeDepth, GSTZERO_VALUE, 2)
        oldUserStateRoot = genRandomSalt()
        const commitment = genIdentityCommitment(user)
        const hashedStateLeaf = hashLeftRight(commitment, oldUserStateRoot)
        GSTree.insert(hashedStateLeaf)
        GSTreeProof = GSTree.genMerklePath(0)
        GSTreeRoot = GSTree.root

        epochTree = await getNewSMT(circuitEpochTreeDepth)

        intermediateNullifierTreeRoot = []
        nullifierTreePathElements = []
        nullifierTree = await getNewSMT(circuitNullifierTreeDepth)
        // Reserve leaf 0
        let result 
        result = await nullifierTree.update(new smtBN(0), NUL_TREE_ONE_LEAF, true)
        expect(result).to.be.true
        intermediateNullifierTreeRoot.push(bufToBigInt(nullifierTree.getRootHash()))

        attesterIds = []
        posReps = []
        negReps = []
        graffities = []
        overwriteGraffitis = []

        hashChainResult = 0
        for (let i = 0; i < NUM_ATTESTATIONS; i++) {
            const attestation = {
                attesterId: i + 1,
                posRep: Math.floor(Math.random() * 100),
                negRep: Math.floor(Math.random() * 100),
                graffiti: genRandomSalt(),
                overwriteGraffiti: true,
            }
            attesterIds.push(attestation['attesterId'])
            posReps.push(attestation['posRep'])
            negReps.push(attestation['negRep'])
            graffities.push(attestation['graffiti'])
            overwriteGraffitis.push(attestation['overwriteGraffiti'])

            const sel = Math.floor(Math.random() * 2)
            selectors.push(sel)
            
            if ( sel == 1) {
                const attestation_hash = computeAttestationHash(attestation)
                hashChainResult = hashLeftRight(attestation_hash, hashChainResult)
                
                const nullifier = computeNullifier(user['identityNullifier'], attestation['attesterId'], epoch, circuitNullifierTreeDepth)
                const nullifierTreeProof = await nullifierTree.getMerkleProof(new smtBN(nullifier.toString(16), 'hex'), NUL_TREE_ZERO_LEAF, true)
                nullifierTreePathElements.push(nullifierTreeProof.siblings.map((p) => bufToBigInt(p)))

                result = await nullifierTree.update(new smtBN(nullifier.toString(16), 'hex'), NUL_TREE_ONE_LEAF, true)
                expect(result).to.be.true
            } else {
                const nullifierTreeProof = await nullifierTree.getMerkleProof(new smtBN(0), NUL_TREE_ONE_LEAF, true)
                nullifierTreePathElements.push(nullifierTreeProof.siblings.map((p) => bufToBigInt(p)))
            }
            intermediateNullifierTreeRoot.push(bufToBigInt(nullifierTree.getRootHash()))
        }
        hashChainResult = hashLeftRight(1, hashChainResult)

        result = await epochTree.update(new smtBN(epochKey.toString(16), 'hex'), bigIntToBuf(hashChainResult), true)
        expect(result).to.be.true
        
        const epochTreeProof = await epochTree.getMerkleProof(new smtBN(epochKey.toString(16), 'hex'), bigIntToBuf(hashChainResult), true)
        epochTreePathElements = epochTreeProof.siblings.map((p) => bufToBigInt(p))
        epochTreeRoot = bufToBigInt(epochTree.getRootHash())
    })

    it('Valid user state update inputs should work', async () => {
        const circuitInputs = {
            epoch: epoch,
            nonce: nonce,
            max_nonce: MAX_NONCE,
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'],
            identity_trapdoor: user['identityTrapdoor'],
            old_user_state_root: oldUserStateRoot,
            GST_path_elements: GSTreeProof.pathElements,
            GST_path_index: GSTreeProof.indices,
            GST_root: GSTreeRoot,
            attester_ids: attesterIds,
            pos_reps: posReps,
            neg_reps: negReps,
            graffities: graffities,
            overwrite_graffitis: overwriteGraffitis,
            epk_path_elements: epochTreePathElements,
            selectors: selectors,
            hash_chain_result: hashChainResult,
            epoch_tree_root: epochTreeRoot,
            intermediate_nullifier_tree_root: intermediateNullifierTreeRoot,
            nullifier_tree_path_elements: nullifierTreePathElements
        }

        const witness = circuit.calculateWitness(circuitInputs)
        expect(circuit.checkWitness(witness)).to.be.true
    })
})