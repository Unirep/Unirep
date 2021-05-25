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
    hashOne,
    stringifyBigInts,
} from 'maci-crypto'
import { genIdentity, genIdentityCommitment } from 'libsemaphore'
import { SparseMerkleTreeImpl } from "../../crypto/SMT"
import { circuitEpochTreeDepth, circuitGlobalStateTreeDepth, circuitNullifierTreeDepth, circuitUserStateTreeDepth } from "../../config/testLocal"
import { Reputation } from "../../core"
import { MAX_KARMA_BUDGET } from "../../config/socialMedia"

describe('Prove reputation circuit', function () {
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
    let hashedLeaf

    let reputationRecords = {}
    const MIN_POS_REP = 10
    const MAX_NEG_REP = 10
    const transitionedPosRep = 5
    const transitionedNegRep = 0
    const proveKarmaAmount = 3
    const epochKeyNonce = 0
    const epochKey = genEpochKey(user['identityNullifier'], epoch, epochKeyNonce, circuitEpochTreeDepth)
    const nonceStarter = 0
    let minRep = null

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
        hashedLeaf = hash5([
            commitment, 
            userStateRoot,
            BigInt(transitionedPosRep),
            BigInt(transitionedNegRep),
            BigInt(0)
        ])
        GSTree.insert(hashedLeaf)
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
        const selectors: BigInt[] = []
        const nonceList: BigInt[] = []
        for (let i = 0; i < proveKarmaAmount; i++) {
            nonceList.push( BigInt(nonceStarter + i) )
            selectors.push(BigInt(1));
        }
        for (let i = proveKarmaAmount ; i < MAX_KARMA_BUDGET; i++) {
            nonceList.push(BigInt(0))
            selectors.push(BigInt(0))
        }

        const circuitInputs = {
            epoch: epoch,
            nonce: nonce,
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'], 
            identity_trapdoor: user['identityTrapdoor'],
            user_tree_root: userStateRoot,
            user_state_hash: hashedLeaf,
            epoch_key_nonce: epochKeyNonce,
            epoch_key: epochKey,
            GST_path_index: GSTreeProof.indices,
            GST_path_elements: GSTreeProof.pathElements,
            GST_root: GSTreeRoot,
            nullifier_tree_root: nullifierTreeRoot,
            nullifier_path_elements: epkNullifierProof,
            selectors: selectors,
            positive_karma: transitionedPosRep,
            negative_karma: transitionedNegRep,
            prove_karma_nullifiers: BigInt(Boolean(proveKarmaAmount)),
            prove_karma_amount: BigInt(proveKarmaAmount),
            karma_nonce: nonceList,
            prove_min_rep: minRep != null ? true: false,
            min_rep: minRep != null ? BigInt(minRep) : BigInt(0),
        }

        const witness = await executeCircuit(circuit, circuitInputs)
        const startTime = new Date().getTime()
        const results = await genVerifyReputationProofAndPublicSignals(stringifyBigInts(circuitInputs))
        const endTime = new Date().getTime()
        console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
        const isValid = await verifyProveReputationProof(results['proof'], results['publicSignals'])
        expect(isValid).to.be.true
    })

    it('successfully prove min reputation', async () => {
        const attesterIds = Object.keys(reputationRecords)
        const attesterId = attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)]
        const selectors: BigInt[] = []
        const nonceList: BigInt[] = []
        for (let i = 0; i < proveKarmaAmount; i++) {
            nonceList.push( BigInt(nonceStarter + i) )
            selectors.push(BigInt(1));
        }
        for (let i = proveKarmaAmount ; i < MAX_KARMA_BUDGET; i++) {
            nonceList.push(BigInt(0))
            selectors.push(BigInt(0))
        }

        const circuitInputs = {
            epoch: epoch,
            nonce: nonce,
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'], 
            identity_trapdoor: user['identityTrapdoor'],
            user_tree_root: userStateRoot,
            user_state_hash: hashedLeaf,
            epoch_key_nonce: epochKeyNonce,
            epoch_key: epochKey,
            GST_path_index: GSTreeProof.indices,
            GST_path_elements: GSTreeProof.pathElements,
            GST_root: GSTreeRoot,
            nullifier_tree_root: nullifierTreeRoot,
            nullifier_path_elements: epkNullifierProof,
            selectors: selectors,
            positive_karma: transitionedPosRep,
            negative_karma: transitionedNegRep,
            prove_karma_nullifiers: BigInt(Boolean(proveKarmaAmount)),
            prove_karma_amount: BigInt(proveKarmaAmount),
            karma_nonce: nonceList,
            prove_min_rep: true,
            min_rep: transitionedPosRep,
        }

        const witness = await executeCircuit(circuit, circuitInputs)
        const startTime = new Date().getTime()
        const results = await genVerifyReputationProofAndPublicSignals(stringifyBigInts(circuitInputs))
        const endTime = new Date().getTime()
        console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
        const isValid = await verifyProveReputationProof(results['proof'], results['publicSignals'])
        expect(isValid).to.be.true
    })

    it('prove reputation with reputation amount less than required amount should fail', async () => {
        const attesterIds = Object.keys(reputationRecords)
        const attesterId = attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)]
        const selectors: BigInt[] = []
        const nonceList: BigInt[] = []
        const wrongProveKarmaAmount = 8
        for (let i = 0; i < wrongProveKarmaAmount; i++) {
            nonceList.push( BigInt(nonceStarter + i) )
            selectors.push(BigInt(1));
        }
        for (let i = wrongProveKarmaAmount ; i < MAX_KARMA_BUDGET; i++) {
            nonceList.push(BigInt(0))
            selectors.push(BigInt(0))
        }

        const circuitInputs = {
            epoch: epoch,
            nonce: nonce,
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'], 
            identity_trapdoor: user['identityTrapdoor'],
            user_tree_root: userStateRoot,
            user_state_hash: hashedLeaf,
            epoch_key_nonce: epochKeyNonce,
            epoch_key: epochKey,
            GST_path_index: GSTreeProof.indices,
            GST_path_elements: GSTreeProof.pathElements,
            GST_root: GSTreeRoot,
            nullifier_tree_root: nullifierTreeRoot,
            nullifier_path_elements: epkNullifierProof,
            selectors: selectors,
            positive_karma: transitionedPosRep,
            negative_karma: transitionedNegRep,
            prove_karma_nullifiers: BigInt(Boolean(proveKarmaAmount)),
            prove_karma_amount: BigInt(wrongProveKarmaAmount),
            karma_nonce: nonceList,
            prove_min_rep: minRep != null ? true: false,
            min_rep: minRep != null ? BigInt(minRep) : BigInt(0),
        }

        let error
        try {
            await executeCircuit(circuit, circuitInputs)
        } catch (e) {
            error = e
            expect(true).to.be.true
        } finally {
            if (!error) throw Error("Wrong reputation amount should throw error")
        }
    })

    it('successfully prove wrong reputation nullifiers when flag is set false', async () => {
        const attesterIds = Object.keys(reputationRecords)
        const attesterId = attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)]
        const selectors: BigInt[] = []
        const nonceList: BigInt[] = []
        const wrongProveKarmaAmount = 8
        for (let i = 0; i < wrongProveKarmaAmount; i++) {
            nonceList.push( BigInt(nonceStarter + i) )
            selectors.push(BigInt(1));
        }
        for (let i = wrongProveKarmaAmount ; i < MAX_KARMA_BUDGET; i++) {
            nonceList.push(BigInt(0))
            selectors.push(BigInt(0))
        }

        const circuitInputs = {
            epoch: epoch,
            nonce: nonce,
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'], 
            identity_trapdoor: user['identityTrapdoor'],
            user_tree_root: userStateRoot,
            user_state_hash: hashedLeaf,
            epoch_key_nonce: epochKeyNonce,
            epoch_key: epochKey,
            GST_path_index: GSTreeProof.indices,
            GST_path_elements: GSTreeProof.pathElements,
            GST_root: GSTreeRoot,
            nullifier_tree_root: nullifierTreeRoot,
            nullifier_path_elements: epkNullifierProof,
            selectors: selectors,
            positive_karma: transitionedPosRep,
            negative_karma: transitionedNegRep,
            prove_karma_nullifiers: false,
            prove_karma_amount: BigInt(wrongProveKarmaAmount),
            karma_nonce: nonceList,
            prove_min_rep: minRep != null ? true: false,
            min_rep: minRep != null ? BigInt(minRep) : BigInt(0),
        }

        const witness = await executeCircuit(circuit, circuitInputs)
        const startTime = new Date().getTime()
        const results = await genVerifyReputationProofAndPublicSignals(stringifyBigInts(circuitInputs))
        const endTime = new Date().getTime()
        console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
        const isValid = await verifyProveReputationProof(results['proof'], results['publicSignals'])
        expect(isValid).to.be.true
    })

    it('prove reputation with reputation amount more than claimed min rep amount should fail', async () => {
        const attesterIds = Object.keys(reputationRecords)
        const attesterId = attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)]
        const selectors: BigInt[] = []
        const nonceList: BigInt[] = []
        for (let i = 0; i < proveKarmaAmount; i++) {
            nonceList.push( BigInt(nonceStarter + i) )
            selectors.push(BigInt(1));
        }
        for (let i = proveKarmaAmount ; i < MAX_KARMA_BUDGET; i++) {
            nonceList.push(BigInt(0))
            selectors.push(BigInt(0))
        }

        const circuitInputs = {
            epoch: epoch,
            nonce: nonce,
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'], 
            identity_trapdoor: user['identityTrapdoor'],
            user_tree_root: userStateRoot,
            user_state_hash: hashedLeaf,
            epoch_key_nonce: epochKeyNonce,
            epoch_key: epochKey,
            GST_path_index: GSTreeProof.indices,
            GST_path_elements: GSTreeProof.pathElements,
            GST_root: GSTreeRoot,
            nullifier_tree_root: nullifierTreeRoot,
            nullifier_path_elements: epkNullifierProof,
            selectors: selectors,
            positive_karma: transitionedPosRep,
            negative_karma: transitionedNegRep,
            prove_karma_nullifiers: BigInt(Boolean(proveKarmaAmount)),
            prove_karma_amount: BigInt(proveKarmaAmount),
            karma_nonce: nonceList,
            prove_min_rep: true,
            min_rep: BigInt(21),
        }

        let error
        try {
            await executeCircuit(circuit, circuitInputs)
        } catch (e) {
            error = e
            expect(true).to.be.true
        } finally {
            if (!error) throw Error("Wrong minimum reputation amount should throw error")
        }
    })

    it('successfully prove wrong min reputation when flag is set false', async () => {
        const attesterIds = Object.keys(reputationRecords)
        const attesterId = attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)]
        const selectors: BigInt[] = []
        const nonceList: BigInt[] = []
        for (let i = 0; i < proveKarmaAmount; i++) {
            nonceList.push( BigInt(nonceStarter + i) )
            selectors.push(BigInt(1));
        }
        for (let i = proveKarmaAmount ; i < MAX_KARMA_BUDGET; i++) {
            nonceList.push(BigInt(0))
            selectors.push(BigInt(0))
        }

        const circuitInputs = {
            epoch: epoch,
            nonce: nonce,
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'], 
            identity_trapdoor: user['identityTrapdoor'],
            user_tree_root: userStateRoot,
            user_state_hash: hashedLeaf,
            epoch_key_nonce: epochKeyNonce,
            epoch_key: epochKey,
            GST_path_index: GSTreeProof.indices,
            GST_path_elements: GSTreeProof.pathElements,
            GST_root: GSTreeRoot,
            nullifier_tree_root: nullifierTreeRoot,
            nullifier_path_elements: epkNullifierProof,
            selectors: selectors,
            positive_karma: transitionedPosRep,
            negative_karma: transitionedNegRep,
            prove_karma_nullifiers: BigInt(Boolean(proveKarmaAmount)),
            prove_karma_amount: BigInt(proveKarmaAmount),
            karma_nonce: nonceList,
            prove_min_rep: false,
            min_rep: BigInt(21),
        }

        const witness = await executeCircuit(circuit, circuitInputs)
        const startTime = new Date().getTime()
        const results = await genVerifyReputationProofAndPublicSignals(stringifyBigInts(circuitInputs))
        const endTime = new Date().getTime()
        console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
        const isValid = await verifyProveReputationProof(results['proof'], results['publicSignals'])
        expect(isValid).to.be.true
    })

    it('prove reputation with epoch key nullifier seen before should fail', async () => {
        const attesterIds = Object.keys(reputationRecords)
        const attesterId = Number(attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)])
        // Create another nullifier tree that inserted the epoch key nullifier
        const _nullifierTree = await genNewNullifierTree("circuit")
        await _nullifierTree.update(BigInt(attesterId), SMT_ONE_LEAF)
        const _nullifierTreeRoot = _nullifierTree.getRootHash()
        const selectors: BigInt[] = []
        const nonceList: BigInt[] = []
        for (let i = 0; i < proveKarmaAmount; i++) {
            nonceList.push( BigInt(nonceStarter + i) )
            selectors.push(BigInt(1));
        }
        for (let i = proveKarmaAmount ; i < MAX_KARMA_BUDGET; i++) {
            nonceList.push(BigInt(0))
            selectors.push(BigInt(0))
        }


        const circuitInputs = {
            epoch: epoch,
            nonce: nonce,
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'], 
            identity_trapdoor: user['identityTrapdoor'],
            user_tree_root: userStateRoot,
            user_state_hash: hashedLeaf,
            epoch_key_nonce: epochKeyNonce,
            epoch_key: epochKey,
            GST_path_index: GSTreeProof.indices,
            GST_path_elements: GSTreeProof.pathElements,
            GST_root: GSTreeRoot,
            nullifier_tree_root: _nullifierTreeRoot,
            nullifier_path_elements: epkNullifierProof,
            selectors: selectors,
            positive_karma: transitionedPosRep,
            negative_karma: transitionedNegRep,
            prove_karma_nullifiers: BigInt(Boolean(proveKarmaAmount)),
            prove_karma_amount: BigInt(proveKarmaAmount),
            karma_nonce: nonceList,
            prove_min_rep: minRep != null ? true: false,
            min_rep: minRep != null ? BigInt(minRep) : BigInt(0),
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