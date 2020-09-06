import chai from "chai"

const { expect } = chai

import { genIdentity, genIdentityCommitment } from 'libsemaphore'
import {
    IncrementalQuinTree,
    SnarkBigInt,
    genRandomSalt,
    hash5,
    hashLeftRight,
    bigInt,
} from 'maci-crypto'

import {
    compileAndLoadCircuit,
} from './utils'
import { BigNumber as smtBN } from "../../crypto/SMT"
import { globalStateTreeDepth } from "../../config/testLocal"
import { bigIntToBuf, bufToBigInt, computeAttestationHash, getNewSMT, genEpochKey, computeNullifier } from "../utils"

const circuitEpochTreeDepth = 8
const circuitNullifierTreeDepth = 8
const circuitUserStateTreeDepth = 4

describe('User State Transition circuits', function () {
    this.timeout(200000)

    let circuit

    const MAX_NONCE = 2
    const NUM_ATTESTATIONS = 10

    const epoch = 1
    const nonce = 2
    const user = genIdentity()
    const epochKey: SnarkBigInt = genEpochKey(user['identityNullifier'], epoch, nonce, circuitEpochTreeDepth)

    let GSTZERO_VALUE = 0, GSTree, GSTreeRoot, GSTreeProof, newGSTLeaf
    let epochTree, epochTreeRoot, epochTreePathElements
    let nullifierTree, nullifierTreeRoot, nullifierTreePathElements
    const NUL_TREE_ZERO_LEAF = bigIntToBuf(hashLeftRight(0, 0))
    const NUL_TREE_ONE_LEAF = bigIntToBuf(hashLeftRight(1, 0))
    let userStateTree
    let intermediateUserStateTreeRoots, userStateTreePathElements, noAttestationUserStateTreePathElements
    let oldPosReps, oldNegReps, oldGraffities
    const UST_ONE_LEAF = NUL_TREE_ONE_LEAF

    let attestationRecords = {}
    let attesterIds: SnarkBigInt[], posReps: number[], negReps: number[], graffities: SnarkBigInt[], overwriteGraffitis: boolean[]
    let selectors: number[] = []
    let nullifiers: SnarkBigInt[]
    let hashChainResult: SnarkBigInt

    before(async () => {
        const startCompileTime = Math.floor(new Date().getTime() / 1000)
        circuit = await compileAndLoadCircuit('test/userStateTransition_test.circom')
        const endCompileTime = Math.floor(new Date().getTime() / 1000)
        console.log(`Compile time: ${endCompileTime - startCompileTime} seconds`)

        // Epoch tree
        epochTree = await getNewSMT(circuitEpochTreeDepth)

        // Nullifier tree
        nullifierTreePathElements = []
        nullifierTree = await getNewSMT(circuitNullifierTreeDepth)
        // Reserve leaf 0
        let result 
        result = await nullifierTree.update(new smtBN(0), NUL_TREE_ONE_LEAF, true)
        expect(result).to.be.true
        nullifierTreeRoot = bufToBigInt(nullifierTree.getRootHash())

        // User state tree
        const defaultUserStateLeaf = hash5([0, 0, 0, 0, 0])
        userStateTree = await getNewSMT(circuitUserStateTreeDepth, defaultUserStateLeaf)
        intermediateUserStateTreeRoots = []
        userStateTreePathElements = []
        noAttestationUserStateTreePathElements = []
        oldPosReps = []
        oldNegReps = []
        oldGraffities = []
        // Reserve leaf 0
        result = await userStateTree.update(new smtBN(0), UST_ONE_LEAF, true)
        expect(result).to.be.true
        // Bootstrap user state
        for (let i = 0; i < NUM_ATTESTATIONS; i++) {
            const  attesterId = i + 1
            if (attestationRecords[attesterId] === undefined) {
                attestationRecords[attesterId] = {
                    posRep: Math.floor(Math.random() * 100),
                    negRep: Math.floor(Math.random() * 100),
                    graffiti: genRandomSalt(),
                }
            }
            const newAttestationRecord = hash5([
                attestationRecords[attesterId]['posRep'],
                attestationRecords[attesterId]['negRep'],
                attestationRecords[attesterId]['graffiti'],
                0,
                0
            ])
            const result = await userStateTree.update(new smtBN(attesterId), bigIntToBuf(newAttestationRecord), true)
            expect(result).to.be.true
        }
        intermediateUserStateTreeRoots.push(bufToBigInt(userStateTree.getRootHash()))
        const USTLeafZeroProof = await userStateTree.getMerkleProof(new smtBN(0), UST_ONE_LEAF, true)
        const USTLeafZeroPathElements = USTLeafZeroProof.siblings.map((p) => bufToBigInt(p))
        for (let i = 0; i < NUM_ATTESTATIONS; i++) noAttestationUserStateTreePathElements.push(USTLeafZeroPathElements)

        // Global state tree
        GSTree = new IncrementalQuinTree(globalStateTreeDepth, GSTZERO_VALUE, 2)
        const commitment = genIdentityCommitment(user)
        const hashedStateLeaf = hashLeftRight(commitment, bufToBigInt(userStateTree.getRootHash()))
        GSTree.insert(hashedStateLeaf)
        GSTreeProof = GSTree.genMerklePath(0)
        GSTreeRoot = GSTree.root

        attesterIds = []
        posReps = []
        negReps = []
        graffities = []
        overwriteGraffitis = []

        // Ensure as least one of the selectors is true
        const selTrue = Math.floor(Math.random() * NUM_ATTESTATIONS)
        for (let i = 0; i < NUM_ATTESTATIONS; i++) {
            if (i == selTrue) selectors.push(1)
            else selectors.push(Math.floor(Math.random() * 2))
        }

        nullifiers = []
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

            oldPosReps.push(attestationRecords[attestation['attesterId']]['posRep'])
            oldNegReps.push(attestationRecords[attestation['attesterId']]['negRep'])
            oldGraffities.push(attestationRecords[attestation['attesterId']]['graffiti'])

            // If nullifier tree is too small, it's likely that nullifier would be zero.
            // In this case, force selector to be zero.
            const nullifier = computeNullifier(user['identityNullifier'], attestation['attesterId'], epoch, circuitNullifierTreeDepth)
            if ( nullifier == 0) {
                selectors[i] = 0
                // If unfortunately this is the selector forced to be true,
                // then we force next selector to be true instead.
                if (i == selTrue) selectors[i + 1] = 1
            }

            if ( selectors[i] == 1) {
                // Get old attestation record
                const oldAttestationRecord = hash5([
                    attestationRecords[attestation['attesterId']]['posRep'],
                    attestationRecords[attestation['attesterId']]['negRep'],
                    attestationRecords[attestation['attesterId']]['graffiti'],
                    0,
                    0
                ])
                const oldAttestationRecordProof = await userStateTree.getMerkleProof(new smtBN(attestation['attesterId']), bigIntToBuf(oldAttestationRecord), true)
                userStateTreePathElements.push(oldAttestationRecordProof.siblings.map((p) => bufToBigInt(p)))

                // Update attestation record
                attestationRecords[attestation['attesterId']]['posRep'] += attestation['posRep']
                attestationRecords[attestation['attesterId']]['negRep'] += attestation['negRep']
                if (attestation['overwriteGraffiti']) attestationRecords[attestation['attesterId']]['graffiti'] = attestation['graffiti']
                const newAttestationRecord = hash5([
                    attestationRecords[attestation['attesterId']]['posRep'],
                    attestationRecords[attestation['attesterId']]['negRep'],
                    attestationRecords[attestation['attesterId']]['graffiti'],
                    0,
                    0
                ])
                result = await userStateTree.update(new smtBN(attestation['attesterId']), bigIntToBuf(newAttestationRecord), true)
                expect(result).to.be.true

                const attestation_hash = computeAttestationHash(attestation)
                hashChainResult = hashLeftRight(attestation_hash, hashChainResult)

                nullifiers.push(nullifier)
                const nullifierTreeProof = await nullifierTree.getMerkleProof(new smtBN(nullifier.toString(16), 'hex'), NUL_TREE_ZERO_LEAF, true)
                nullifierTreePathElements.push(nullifierTreeProof.siblings.map((p) => bufToBigInt(p)))
            } else {
                const USTLeafZeroProof = await userStateTree.getMerkleProof(new smtBN(0), UST_ONE_LEAF, true)
                const USTLeafZeroPathElements = USTLeafZeroProof.siblings.map((p) => bufToBigInt(p))
                userStateTreePathElements.push(USTLeafZeroPathElements)

                nullifiers.push(bigInt(0))
                const nullifierTreeProof = await nullifierTree.getMerkleProof(new smtBN(0), NUL_TREE_ONE_LEAF, true)
                nullifierTreePathElements.push(nullifierTreeProof.siblings.map((p) => bufToBigInt(p)))
            }
            intermediateUserStateTreeRoots.push(bufToBigInt(userStateTree.getRootHash()))
        }
        hashChainResult = hashLeftRight(1, hashChainResult)

        newGSTLeaf = hashLeftRight(commitment, intermediateUserStateTreeRoots[NUM_ATTESTATIONS])

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
            intermediate_user_state_tree_roots: intermediateUserStateTreeRoots,
            old_pos_reps: oldPosReps,
            old_neg_reps: oldNegReps,
            old_graffities: oldGraffities,
            UST_path_elements: userStateTreePathElements,
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'],
            identity_trapdoor: user['identityTrapdoor'],
            GST_path_elements: GSTreeProof.pathElements,
            GST_path_index: GSTreeProof.indices,
            GST_root: GSTreeRoot,
            selectors: selectors,
            attester_ids: attesterIds,
            pos_reps: posReps,
            neg_reps: negReps,
            graffities: graffities,
            overwrite_graffitis: overwriteGraffitis,
            epk_path_elements: epochTreePathElements,
            hash_chain_result: hashChainResult,
            epoch_tree_root: epochTreeRoot,
            nullifier_tree_root: nullifierTreeRoot,
            nullifier_tree_path_elements: nullifierTreePathElements
        }

        const witness = circuit.calculateWitness(circuitInputs, true)
        expect(circuit.checkWitness(witness)).to.be.true
        for (let i = 0; i < NUM_ATTESTATIONS; i++) {
            expect(witness[circuit.getSignalIdx('main.nullifiers[' + i + ']')])
                .to.equal(nullifiers[i])
        }
        expect(witness[circuit.getSignalIdx('main.new_GST_leaf')])
            .to.equal(newGSTLeaf)
    })
})