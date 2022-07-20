import * as path from 'path'
import { expect } from 'chai'
import {
    genRandomSalt,
    ZkIdentity,
    hashOne,
    hashLeftRight,
    hash5,
    SparseMerkleTree,
    IncrementalMerkleTree,
} from '@unirep/crypto'
import { Circuit, executeCircuit } from '../src'
import {
    Reputation,
    compileAndLoadCircuit,
    genReputationCircuitInput,
    throwError,
    genProofAndVerify,
} from './utils'
import {
    proveNegativeReputationCircuitPath,
    USER_STATE_TREE_DEPTH,
    GLOBAL_STATE_TREE_DEPTH,
    MAX_REPUTATION_BUDGET,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    EPOCH_TREE_DEPTH,
} from '../config'
import { defaultProver } from '../provers/defaultProver'

const circuitPath = path.join(__dirname, proveNegativeReputationCircuitPath)

const genInput = (
    id,
    epoch: number,
    reputation: Reputation,
    attesterId: number,
    maxRep: number
) => {
    const defaultUserStateLeaf = hash5([
        BigInt(0),
        BigInt(0),
        BigInt(0),
        BigInt(0),
        BigInt(0),
    ])
    const userStateTree = new SparseMerkleTree(
        USER_STATE_TREE_DEPTH,
        defaultUserStateLeaf
    )
    userStateTree.update(BigInt(attesterId), reputation.hash())
    const userStateRoot = userStateTree.root
    const USTPathElements = userStateTree.createProof(BigInt(attesterId))

    // Global state tree
    const GSTree = new IncrementalMerkleTree(GLOBAL_STATE_TREE_DEPTH)
    const commitment = id.genIdentityCommitment()
    const hashedLeaf = hashLeftRight(commitment, userStateRoot)
    GSTree.insert(hashedLeaf)
    const GSTreeProof = GSTree.createProof(0) // if there is only one GST leaf, the index is 0
    return {
        inputs: {
            maxRep,
            epoch: epoch,
            identity_nullifier: id.identityNullifier,
            identity_trapdoor: id.trapdoor,
            user_tree_root: userStateRoot,
            UST_path_elements: USTPathElements,
            GST_path_index: GSTreeProof.pathIndices,
            GST_path_elements: GSTreeProof.siblings,
            attester_id: attesterId,
            pos_rep: reputation.posRep,
            neg_rep: reputation.negRep,
            graffiti: reputation.graffiti,
            sign_up: reputation.signUp,
        },
        GSTRoot: GSTree.root,
    }
}

describe('Prove negative reputation', function () {
    this.timeout(300000)
    let circuit
    before(async () => {
        const startCompileTime = Math.floor(new Date().getTime() / 1000)
        circuit = await compileAndLoadCircuit(circuitPath)
        const endCompileTime = Math.floor(new Date().getTime() / 1000)
        console.log(
            `Compile time: ${endCompileTime - startCompileTime} seconds`
        )
    })

    it('successfully prove negative reputation', async () => {
        const rep = new Reputation(BigInt(10), BigInt(11), BigInt(0), BigInt(1))
        const attesterId = 10
        const id = new ZkIdentity()
        const epoch = 1
        const maxRep = 0
        const { GSTRoot, inputs } = genInput(id, epoch, rep, attesterId, maxRep)

        await executeCircuit(circuit, inputs)

        const { proof, publicSignals } =
            await defaultProver.genProofAndPublicSignals(
                Circuit.proveNegativeReputation,
                inputs
            )
        const isValid = await defaultProver.verifyProof(
            Circuit.proveNegativeReputation,
            publicSignals,
            proof
        )
        expect(isValid).to.be.true
        for (let x = 0; x < NUM_EPOCH_KEY_NONCE_PER_EPOCH; x++) {
            const epochKey =
                hash5([
                    id.identityNullifier,
                    BigInt(epoch),
                    BigInt(x),
                    BigInt(0),
                    BigInt(0),
                ]).valueOf() % BigInt(2 ** EPOCH_TREE_DEPTH)
            expect(publicSignals[x]).to.equal(epochKey.toString())
        }
        expect(publicSignals[NUM_EPOCH_KEY_NONCE_PER_EPOCH]).to.equal(
            GSTRoot.toString()
        )
        expect(publicSignals[NUM_EPOCH_KEY_NONCE_PER_EPOCH + 1]).to.equal(
            epoch.toString()
        )
        expect(publicSignals[NUM_EPOCH_KEY_NONCE_PER_EPOCH + 2]).to.equal(
            attesterId.toString()
        )
        expect(publicSignals[NUM_EPOCH_KEY_NONCE_PER_EPOCH + 3]).to.equal(
            maxRep.toString()
        )
    })

    it('fail to prove non-negative reputation', async () => {
        const rep = new Reputation(BigInt(10), BigInt(9), BigInt(0), BigInt(1))
        const attesterId = 10
        const id = new ZkIdentity()
        const epoch = 1
        const { inputs } = genInput(id, epoch, rep, attesterId, 0)
        await throwError(circuit, inputs, 'Postive rep should throw error')
    })
})
