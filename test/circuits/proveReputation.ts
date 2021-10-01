import { expect } from "chai"
import { genRandomSalt, hashLeftRight, genIdentity, genIdentityCommitment, SparseMerkleTreeImpl, stringifyBigInts, IncrementalQuinTree, hashOne, } from "@unirep/crypto"
import { genProofAndPublicSignals, verifyProof } from "@unirep/circuits"
import { circuitEpochTreeDepth, circuitGlobalStateTreeDepth, circuitUserStateTreeDepth, maxReputationBudget } from "../../config/testLocal"
import { genEpochKey } from '../../core/utils'
import { genNewUserStateTree } from '../utils'
import { Reputation } from '../../core'

describe('Prove reputation from attester circuit', function () {
    this.timeout(300000)

    const epoch = 1
    const nonce = 1
    const user = genIdentity()
    const epochKey = genEpochKey(user['identityNullifier'], epoch, nonce, circuitEpochTreeDepth)
    const NUM_ATTESTERS = 10

    let GSTZERO_VALUE = 0, GSTree, GSTreeRoot, GSTreeProof
    let userStateTree: SparseMerkleTreeImpl, userStateRoot
    let hashedLeaf

    let reputationRecords = {}
    const MIN_POS_REP = 20
    const MAX_NEG_REP = 10
    const repNullifiersAmount = 3
    const nonceStarter = 0
    const selectors: BigInt[] = []
    const nonceList: BigInt[] = []
    let minRep = MIN_POS_REP - MAX_NEG_REP
    const prove_graffiti = 1
    const signUp = 1

    before(async () => {
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
                BigInt(signUp)
            )
            reputationRecords[attesterId].addGraffitiPreImage(graffitiPreImage)
            await userStateTree.update(BigInt(attesterId), reputationRecords[attesterId].hash())
        }

        userStateRoot = userStateTree.getRootHash()
        // Global state tree
        GSTree = new IncrementalQuinTree(circuitGlobalStateTreeDepth, GSTZERO_VALUE, 2)
        const commitment = genIdentityCommitment(user)
        hashedLeaf = hashLeftRight(commitment, userStateRoot)
        GSTree.insert(hashedLeaf)
        GSTreeProof = GSTree.genMerklePath(0)
        GSTreeRoot = GSTree.root

        // selectors and karma nonce
        for (let i = 0; i < repNullifiersAmount; i++) {
            nonceList.push( BigInt(nonceStarter + i) )
            selectors.push(BigInt(1));
        }
        for (let i = repNullifiersAmount ; i < maxReputationBudget; i++) {
            nonceList.push(BigInt(0))
            selectors.push(BigInt(0))
        }
    })

    it('successfully prove a random generated reputation', async () => {
        const attesterIds = Object.keys(reputationRecords)
        const attesterId = attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)]
        const USTPathElements = await userStateTree.getMerkleProof(BigInt(attesterId))

        const circuitInputs = {
            epoch: epoch,
            epoch_key_nonce: nonce,
            epoch_key: epochKey,
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'], 
            identity_trapdoor: user['identityTrapdoor'],
            user_tree_root: userStateRoot,
            GST_path_index: GSTreeProof.indices,
            GST_path_elements: GSTreeProof.pathElements,
            GST_root: GSTreeRoot,
            attester_id: attesterId,
            pos_rep: reputationRecords[attesterId]['posRep'],
            neg_rep: reputationRecords[attesterId]['negRep'],
            graffiti: reputationRecords[attesterId]['graffiti'],
            sign_up: reputationRecords[attesterId]['signUp'],
            UST_path_elements: USTPathElements,
            rep_nullifiers_amount: repNullifiersAmount,
            selectors: selectors,
            rep_nonce: nonceList,
            min_rep: minRep,
            prove_graffiti: prove_graffiti,
            graffiti_pre_image: reputationRecords[attesterId]['graffitiPreImage']
        }

        const startTime = new Date().getTime()
        const results = await genProofAndPublicSignals('proveReputation',stringifyBigInts(circuitInputs))
        const endTime = new Date().getTime()
        console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
        const isValid = await verifyProof('proveReputation',results['proof'], results['publicSignals'])
        expect(isValid).to.be.true
    })

    it('successfully prove a reputation with equal positive and negative repuataion', async () => {
        const attesterIds = Object.keys(reputationRecords)
        const attesterId = attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)]
        const USTPathElements = await userStateTree.getMerkleProof(BigInt(attesterId))

        const circuitInputs = {
            epoch: epoch,
            epoch_key_nonce: nonce,
            epoch_key: epochKey,
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'], 
            identity_trapdoor: user['identityTrapdoor'],
            user_tree_root: userStateRoot,
            GST_path_index: GSTreeProof.indices,
            GST_path_elements: GSTreeProof.pathElements,
            GST_root: GSTreeRoot,
            attester_id: attesterId,
            pos_rep: reputationRecords[attesterId]['posRep'],
            neg_rep: reputationRecords[attesterId]['negRep'],
            graffiti: reputationRecords[attesterId]['graffiti'],
            sign_up: reputationRecords[attesterId]['signUp'],
            UST_path_elements: USTPathElements,
            rep_nullifiers_amount: repNullifiersAmount,
            selectors: selectors,
            rep_nonce: nonceList,
            min_rep: reputationRecords[attesterId]['posRep'] - reputationRecords[attesterId]['negRep'],
            prove_graffiti: prove_graffiti,
            graffiti_pre_image: reputationRecords[attesterId]['graffitiPreImage']
        }

        const startTime = new Date().getTime()
        const results = await genProofAndPublicSignals('proveReputation',stringifyBigInts(circuitInputs))
        const endTime = new Date().getTime()
        console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
        const isValid = await verifyProof('proveReputation',results['proof'], results['publicSignals'])
        expect(isValid).to.be.true
    })

    it('successfully choose to prove only minimun positive reputation', async () => {
        const attesterIds = Object.keys(reputationRecords)
        const attesterId = attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)]
        const USTPathElements = await userStateTree.getMerkleProof(BigInt(attesterId))
        const zeroRepNullifiersAmount = 0
        const zeroSelector: number[] = []
        for (let i = 0; i < maxReputationBudget; i++) {
            zeroSelector.push(0)
        }

        const circuitInputs = {
            epoch: epoch,
            epoch_key_nonce: nonce,
            epoch_key: epochKey,
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'], 
            identity_trapdoor: user['identityTrapdoor'],
            user_tree_root: userStateRoot,
            GST_path_index: GSTreeProof.indices,
            GST_path_elements: GSTreeProof.pathElements,
            GST_root: GSTreeRoot,
            attester_id: attesterId,
            pos_rep: reputationRecords[attesterId]['posRep'],
            neg_rep: reputationRecords[attesterId]['negRep'],
            graffiti: reputationRecords[attesterId]['graffiti'],
            sign_up: reputationRecords[attesterId]['signUp'],
            UST_path_elements: USTPathElements,
            rep_nullifiers_amount: zeroRepNullifiersAmount,
            selectors: zeroSelector,
            rep_nonce: nonceList,
            min_rep: minRep,
            prove_graffiti: prove_graffiti,
            graffiti_pre_image: reputationRecords[attesterId]['graffitiPreImage']
        }

        const startTime = new Date().getTime()
        const results = await genProofAndPublicSignals('proveReputation',stringifyBigInts(circuitInputs))
        const endTime = new Date().getTime()
        console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
        const isValid = await verifyProof('proveReputation',results['proof'], results['publicSignals'])
        expect(isValid).to.be.true
    })

    it('successfully choose to prove only reputation nullifiers', async () => {
        const attesterIds = Object.keys(reputationRecords)
        const attesterId = attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)]
        const USTPathElements = await userStateTree.getMerkleProof(BigInt(attesterId))
        const zeroMinRep = 0

        const circuitInputs = {
            epoch: epoch,
            epoch_key_nonce: nonce,
            epoch_key: epochKey,
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'], 
            identity_trapdoor: user['identityTrapdoor'],
            user_tree_root: userStateRoot,
            GST_path_index: GSTreeProof.indices,
            GST_path_elements: GSTreeProof.pathElements,
            GST_root: GSTreeRoot,
            attester_id: attesterId,
            pos_rep: reputationRecords[attesterId]['posRep'],
            neg_rep: reputationRecords[attesterId]['negRep'],
            graffiti: reputationRecords[attesterId]['graffiti'],
            sign_up: reputationRecords[attesterId]['signUp'],
            UST_path_elements: USTPathElements,
            rep_nullifiers_amount: repNullifiersAmount,
            selectors: selectors,
            rep_nonce: nonceList,
            min_rep: zeroMinRep,
            prove_graffiti: prove_graffiti,
            graffiti_pre_image: reputationRecords[attesterId]['graffitiPreImage']
        }

        const startTime = new Date().getTime()
        const results = await genProofAndPublicSignals('proveReputation',stringifyBigInts(circuitInputs))
        const endTime = new Date().getTime()
        console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
        const isValid = await verifyProof('proveReputation',results['proof'], results['publicSignals'])
        expect(isValid).to.be.true
    })

    it('successfully choose not to prove graffiti with wrong value', async () => {
        const attesterIds = Object.keys(reputationRecords)
        const attesterId = attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)]
        const USTPathElements = await userStateTree.getMerkleProof(BigInt(attesterId))
        const notProveGraffiti = 0
        const wrongGraffitiPreImage = genRandomSalt()

        const circuitInputs = {
            epoch: epoch,
            epoch_key_nonce: nonce,
            epoch_key: epochKey,
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'], 
            identity_trapdoor: user['identityTrapdoor'],
            user_tree_root: userStateRoot,
            GST_path_index: GSTreeProof.indices,
            GST_path_elements: GSTreeProof.pathElements,
            GST_root: GSTreeRoot,
            attester_id: attesterId,
            pos_rep: reputationRecords[attesterId]['posRep'],
            neg_rep: reputationRecords[attesterId]['negRep'],
            graffiti: reputationRecords[attesterId]['graffiti'],
            sign_up: reputationRecords[attesterId]['signUp'],
            UST_path_elements: USTPathElements,
            rep_nullifiers_amount: repNullifiersAmount,
            selectors: selectors,
            rep_nonce: nonceList,
            min_rep: minRep,
            prove_graffiti: notProveGraffiti,
            graffiti_pre_image: wrongGraffitiPreImage
        }

        const startTime = new Date().getTime()
        const results = await genProofAndPublicSignals('proveReputation',stringifyBigInts(circuitInputs))
        const endTime = new Date().getTime()
        console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
        const isValid = await verifyProof('proveReputation',results['proof'], results['publicSignals'])
        expect(isValid).to.be.true
    })

    it('prove reputation with wrong attester Id should fail', async () => {
        const attesterIds = Object.keys(reputationRecords)
        const attesterId = Number(attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)])
        const USTPathElements = await userStateTree.getMerkleProof(BigInt(attesterId))
        const wrongAttesterId = attesterId < (NUM_ATTESTERS - 1) ? attesterId + 1 : attesterId - 1

        const circuitInputs = {
            epoch: epoch,
            epoch_key_nonce: nonce,
            epoch_key: epochKey,
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'], 
            identity_trapdoor: user['identityTrapdoor'],
            user_tree_root: userStateRoot,
            GST_path_index: GSTreeProof.indices,
            GST_path_elements: GSTreeProof.pathElements,
            GST_root: GSTreeRoot,
            attester_id: wrongAttesterId,
            pos_rep: reputationRecords[attesterId]['posRep'],
            neg_rep: reputationRecords[attesterId]['negRep'],
            graffiti: reputationRecords[attesterId]['graffiti'],
            sign_up: reputationRecords[attesterId]['signUp'],
            UST_path_elements: USTPathElements,
            rep_nullifiers_amount: repNullifiersAmount,
            selectors: selectors,
            rep_nonce: nonceList,
            min_rep: minRep,
            prove_graffiti: prove_graffiti,
            graffiti_pre_image: reputationRecords[attesterId]['graffitiPreImage']
        }

        const startTime = new Date().getTime()
        const results = await genProofAndPublicSignals('proveReputation',stringifyBigInts(circuitInputs))
        const endTime = new Date().getTime()
        console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
        const isValid = await verifyProof('proveReputation',results['proof'], results['publicSignals'])
        expect(isValid).to.be.false
    })

    it('prove reputation with not exist user state should fail', async () => {
        const attesterIds = Object.keys(reputationRecords)
        const attesterId = Number(attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)])
        const USTPathElements = await userStateTree.getMerkleProof(BigInt(attesterId))
        const wrongUserStateRoot = genRandomSalt()

        const circuitInputs = {
            epoch: epoch,
            epoch_key_nonce: nonce,
            epoch_key: epochKey,
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'], 
            identity_trapdoor: user['identityTrapdoor'],
            user_tree_root: wrongUserStateRoot,
            GST_path_index: GSTreeProof.indices,
            GST_path_elements: GSTreeProof.pathElements,
            GST_root: GSTreeRoot,
            attester_id: attesterId,
            pos_rep: reputationRecords[attesterId]['posRep'],
            neg_rep: reputationRecords[attesterId]['negRep'],
            graffiti: reputationRecords[attesterId]['graffiti'],
            sign_up: reputationRecords[attesterId]['signUp'],
            UST_path_elements: USTPathElements,
            rep_nullifiers_amount: repNullifiersAmount,
            selectors: selectors,
            rep_nonce: nonceList,
            min_rep: minRep,
            prove_graffiti: prove_graffiti,
            graffiti_pre_image: reputationRecords[attesterId]['graffitiPreImage']
        }

        const startTime = new Date().getTime()
        const results = await genProofAndPublicSignals('proveReputation',stringifyBigInts(circuitInputs))
        const endTime = new Date().getTime()
        console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
        const isValid = await verifyProof('proveReputation',results['proof'], results['publicSignals'])
        expect(isValid).to.be.false
    })

    it('prove reputation nullifiers with insufficient rep score', async () => {
        // User state
        const insufficientUserStateTree = await genNewUserStateTree("circuit")

        // Bootstrap user state
        let insufficientAttesterId = Math.ceil(Math.random() * (2 ** circuitUserStateTreeDepth - 1))
        while (reputationRecords[insufficientAttesterId] !== undefined) insufficientAttesterId = Math.floor(Math.random() * (2 ** circuitUserStateTreeDepth))
        const insufficientPosRep = 5
        const insufficientNegRep = 10
        const insufficientGraffitiPreImage = genRandomSalt()
        reputationRecords[insufficientAttesterId] = new Reputation(
            BigInt(insufficientPosRep),
            BigInt(insufficientNegRep),
            hashOne(insufficientGraffitiPreImage),
            BigInt(signUp)
        )
        await insufficientUserStateTree.update(BigInt(insufficientAttesterId), reputationRecords[insufficientAttesterId].hash())
        
        const USTPathElements = await insufficientUserStateTree.getMerkleProof(BigInt(insufficientAttesterId))
        const insufficientUserStateRoot = insufficientUserStateTree.getRootHash()
        // Global state tree
        const insufficientGSTree = new IncrementalQuinTree(circuitGlobalStateTreeDepth, GSTZERO_VALUE, 2)
        const commitment = genIdentityCommitment(user)
        hashedLeaf = hashLeftRight(commitment, insufficientUserStateRoot)
        insufficientGSTree.insert(hashedLeaf)
        const insufficientGSTreeProof = insufficientGSTree.genMerklePath(0)
        const insufficientGSTreeRoot = insufficientGSTree.root

        const circuitInputs1 = {
            epoch: epoch,
            epoch_key_nonce: nonce,
            epoch_key: epochKey,
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'], 
            identity_trapdoor: user['identityTrapdoor'],
            user_tree_root: insufficientUserStateRoot,
            GST_path_index: insufficientGSTreeProof.indices,
            GST_path_elements: insufficientGSTreeProof.pathElements,
            GST_root: insufficientGSTreeRoot,
            attester_id: insufficientAttesterId,
            pos_rep: reputationRecords[insufficientAttesterId]['posRep'],
            neg_rep: reputationRecords[insufficientAttesterId]['negRep'],
            graffiti: reputationRecords[insufficientAttesterId]['graffiti'],
            sign_up: reputationRecords[insufficientAttesterId]['signUp'],
            UST_path_elements: USTPathElements,
            rep_nullifiers_amount: repNullifiersAmount,
            selectors: selectors,
            rep_nonce: nonceList,
            min_rep: minRep,
            prove_graffiti: prove_graffiti,
            graffiti_pre_image: insufficientGraffitiPreImage
        }

        let startTime = new Date().getTime()
        let results = await genProofAndPublicSignals('proveReputation',stringifyBigInts(circuitInputs1))
        let endTime = new Date().getTime()
        console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
        let isValid = await verifyProof('proveReputation',results['proof'], results['publicSignals'])
        expect(isValid).to.be.false

        // only prove minRep should fail
        const zeroRepNullifiersAmount = 0
        const zeroSelector: number[] = []
        for (let i = 0; i < maxReputationBudget; i++) {
            zeroSelector.push(0)
        }
        const circuitInputs2 = {
            epoch: epoch,
            epoch_key_nonce: nonce,
            epoch_key: epochKey,
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'], 
            identity_trapdoor: user['identityTrapdoor'],
            user_tree_root: insufficientUserStateRoot,
            GST_path_index: insufficientGSTreeProof.indices,
            GST_path_elements: insufficientGSTreeProof.pathElements,
            GST_root: insufficientGSTreeRoot,
            attester_id: insufficientAttesterId,
            pos_rep: reputationRecords[insufficientAttesterId]['posRep'],
            neg_rep: reputationRecords[insufficientAttesterId]['negRep'],
            graffiti: reputationRecords[insufficientAttesterId]['graffiti'],
            sign_up: reputationRecords[insufficientAttesterId]['signUp'],
            UST_path_elements: USTPathElements,
            rep_nullifiers_amount: zeroRepNullifiersAmount,
            selectors: zeroSelector,
            rep_nonce: nonceList,
            min_rep: minRep,
            prove_graffiti: prove_graffiti,
            graffiti_pre_image: insufficientGraffitiPreImage
        }

        startTime = new Date().getTime()
        results = await genProofAndPublicSignals('proveReputation',stringifyBigInts(circuitInputs2))
        endTime = new Date().getTime()
        console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
        isValid = await verifyProof('proveReputation',results['proof'], results['publicSignals'])
        expect(isValid).to.be.false

        // only prove graffiti should success
        const zeroMinRep = 0
        const circuitInputs3 = {
            epoch: epoch,
            epoch_key_nonce: nonce,
            epoch_key: epochKey,
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'], 
            identity_trapdoor: user['identityTrapdoor'],
            user_tree_root: insufficientUserStateRoot,
            GST_path_index: insufficientGSTreeProof.indices,
            GST_path_elements: insufficientGSTreeProof.pathElements,
            GST_root: insufficientGSTreeRoot,
            attester_id: insufficientAttesterId,
            pos_rep: reputationRecords[insufficientAttesterId]['posRep'],
            neg_rep: reputationRecords[insufficientAttesterId]['negRep'],
            graffiti: reputationRecords[insufficientAttesterId]['graffiti'],
            sign_up: reputationRecords[insufficientAttesterId]['signUp'],
            UST_path_elements: USTPathElements,
            rep_nullifiers_amount: zeroRepNullifiersAmount,
            selectors: zeroSelector,
            rep_nonce: nonceList,
            min_rep: zeroMinRep,
            prove_graffiti: prove_graffiti,
            graffiti_pre_image: insufficientGraffitiPreImage
        }

        startTime = new Date().getTime()
        results = await genProofAndPublicSignals('proveReputation',stringifyBigInts(circuitInputs3))
        endTime = new Date().getTime()
        console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
        isValid = await verifyProof('proveReputation',results['proof'], results['publicSignals'])
        expect(isValid).to.be.true
    })

    it('prove reputation nullifiers with incorrect nonce should fail', async () => {
        const attesterIds = Object.keys(reputationRecords)
        const attesterId = Number(attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)])
        const USTPathElements = await userStateTree.getMerkleProof(BigInt(attesterId))
        const posRep = reputationRecords[attesterId]['posRep']
        const negRep = reputationRecords[attesterId]['negRep']
        const wrongNonceStarter = Number(posRep - negRep) + 1
        const wrongNonceList: number[] = []
        for (let i = 0; i < repNullifiersAmount; i++) {
            wrongNonceList.push(wrongNonceStarter + i)
        }
        for (let i = repNullifiersAmount; i < maxReputationBudget; i++) {
            wrongNonceList.push(0)
        }

        const circuitInputs = {
            epoch: epoch,
            epoch_key_nonce: nonce,
            epoch_key: epochKey,
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'], 
            identity_trapdoor: user['identityTrapdoor'],
            user_tree_root: userStateRoot,
            GST_path_index: GSTreeProof.indices,
            GST_path_elements: GSTreeProof.pathElements,
            GST_root: GSTreeRoot,
            attester_id: attesterId,
            pos_rep: reputationRecords[attesterId]['posRep'],
            neg_rep: reputationRecords[attesterId]['negRep'],
            graffiti: reputationRecords[attesterId]['graffiti'],
            sign_up: reputationRecords[attesterId]['signUp'],
            UST_path_elements: USTPathElements,
            rep_nullifiers_amount: repNullifiersAmount,
            selectors: selectors,
            rep_nonce: wrongNonceList,
            min_rep: minRep,
            prove_graffiti: prove_graffiti,
            graffiti_pre_image: reputationRecords[attesterId]['graffitiPreImage']
        }

        const startTime = new Date().getTime()
        const results = await genProofAndPublicSignals('proveReputation',stringifyBigInts(circuitInputs))
        const endTime = new Date().getTime()
        console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
        const isValid = await verifyProof('proveReputation',results['proof'], results['publicSignals'])
        expect(isValid).to.be.false
    })

    it('mismatch nullifier amount and selectors should fail', async () => {
        const attesterIds = Object.keys(reputationRecords)
        const attesterId = Number(attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)])
        const USTPathElements = await userStateTree.getMerkleProof(BigInt(attesterId))
        const wrongRepNullifiersAmount = repNullifiersAmount - 1
        const wrongNonceList: number[] = []
        for (let i = 0; i < repNullifiersAmount; i++) {
            wrongNonceList.push(nonceStarter + i)
        }
        for (let i = repNullifiersAmount; i < maxReputationBudget; i++) {
            wrongNonceList.push(0)
        }

        const circuitInputs = {
            epoch: epoch,
            epoch_key_nonce: nonce,
            epoch_key: epochKey,
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'], 
            identity_trapdoor: user['identityTrapdoor'],
            user_tree_root: userStateRoot,
            GST_path_index: GSTreeProof.indices,
            GST_path_elements: GSTreeProof.pathElements,
            GST_root: GSTreeRoot,
            attester_id: attesterId,
            pos_rep: reputationRecords[attesterId]['posRep'],
            neg_rep: reputationRecords[attesterId]['negRep'],
            graffiti: reputationRecords[attesterId]['graffiti'],
            sign_up: reputationRecords[attesterId]['signUp'],
            UST_path_elements: USTPathElements,
            rep_nullifiers_amount: wrongRepNullifiersAmount,
            selectors: selectors,
            rep_nonce: wrongNonceList,
            min_rep: minRep,
            prove_graffiti: prove_graffiti,
            graffiti_pre_image: reputationRecords[attesterId]['graffitiPreImage']
        }

        const startTime = new Date().getTime()
        const results = await genProofAndPublicSignals('proveReputation',stringifyBigInts(circuitInputs))
        const endTime = new Date().getTime()
        console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
        const isValid = await verifyProof('proveReputation',results['proof'], results['publicSignals'])
        expect(isValid).to.be.false
    })

    it('prove reputation with incorrect reputation should fail', async () => {
        const attesterIds = Object.keys(reputationRecords)
        const attesterId = Number(attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)])
        const posRep = reputationRecords[attesterId]['posRep']
        const negRep = reputationRecords[attesterId]['negRep']
        const USTPathElements = await userStateTree.getMerkleProof(BigInt(attesterId))
        const wrongMinRep = Number(posRep - negRep) + 1

        const circuitInputs = {
            epoch: epoch,
            epoch_key_nonce: nonce,
            epoch_key: epochKey,
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'], 
            identity_trapdoor: user['identityTrapdoor'],
            user_tree_root: userStateRoot,
            GST_path_index: GSTreeProof.indices,
            GST_path_elements: GSTreeProof.pathElements,
            GST_root: GSTreeRoot,
            attester_id: attesterId,
            pos_rep: reputationRecords[attesterId]['posRep'],
            neg_rep: reputationRecords[attesterId]['negRep'],
            graffiti: reputationRecords[attesterId]['graffiti'],
            sign_up: reputationRecords[attesterId]['signUp'],
            UST_path_elements: USTPathElements,
            rep_nullifiers_amount: repNullifiersAmount,
            selectors: selectors,
            rep_nonce: nonceList,
            min_rep: wrongMinRep,
            prove_graffiti: prove_graffiti,
            graffiti_pre_image: reputationRecords[attesterId]['graffitiPreImage']
        }

        const startTime = new Date().getTime()
        const results = await genProofAndPublicSignals('proveReputation',stringifyBigInts(circuitInputs))
        const endTime = new Date().getTime()
        console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
        const isValid = await verifyProof('proveReputation',results['proof'], results['publicSignals'])
        expect(isValid).to.be.false
    })

    it('prove reputation with wrong graffiti pre image should fail', async () => {
        const attesterIds = Object.keys(reputationRecords)
        const attesterId = Number(attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)])
        const USTPathElements = await userStateTree.getMerkleProof(BigInt(attesterId))
        const wrongGraffitiPreImage = genRandomSalt()

        const circuitInputs = {
            epoch: epoch,
            epoch_key_nonce: nonce,
            epoch_key: epochKey,
            identity_pk: user['keypair']['pubKey'],
            identity_nullifier: user['identityNullifier'], 
            identity_trapdoor: user['identityTrapdoor'],
            user_tree_root: userStateRoot,
            GST_path_index: GSTreeProof.indices,
            GST_path_elements: GSTreeProof.pathElements,
            GST_root: GSTreeRoot,
            attester_id: attesterId,
            pos_rep: reputationRecords[attesterId]['posRep'],
            neg_rep: reputationRecords[attesterId]['negRep'],
            graffiti: reputationRecords[attesterId]['graffiti'],
            sign_up: reputationRecords[attesterId]['signUp'],
            UST_path_elements: USTPathElements,
            rep_nullifiers_amount: repNullifiersAmount,
            selectors: selectors,
            rep_nonce: nonceList,
            min_rep: minRep,
            prove_graffiti: prove_graffiti,
            graffiti_pre_image: wrongGraffitiPreImage
        }

        const startTime = new Date().getTime()
        const results = await genProofAndPublicSignals('proveReputation',stringifyBigInts(circuitInputs))
        const endTime = new Date().getTime()
        console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
        const isValid = await verifyProof('proveReputation',results['proof'], results['publicSignals'])
        expect(isValid).to.be.false
    })
})