import { expect } from "chai"
import { genRandomSalt, hashLeftRight, genIdentity, genIdentityCommitment, SparseMerkleTreeImpl, stringifyBigInts, IncrementalQuinTree, hashOne, } from "@unirep/crypto"
import { Circuit, genProofAndPublicSignals, verifyProof } from "@unirep/circuits"
import { circuitEpochTreeDepth, circuitGlobalStateTreeDepth, } from "../../config/testLocal"
import { genEpochKey } from '../../core/utils'
import { genNewUserStateTree } from '../utils'
import { Reputation } from '../../core'

describe('Prove user has signed up circuit', function () {
    this.timeout(300000)

    const epoch = 1
    const nonce = 0
    const user = genIdentity()
    const epochKey = genEpochKey(user['identityNullifier'], epoch, nonce, circuitEpochTreeDepth)

    let GSTZERO_VALUE = 0, GSTree, GSTreeRoot, GSTreeProof
    let userStateTree: SparseMerkleTreeImpl, userStateRoot
    let hashedLeaf

    let reputationRecords = {}
    const MIN_POS_REP = 20
    const MAX_NEG_REP = 10
    const signUp = 1
    const notSignUp = 0
    const signedUpAttesterId = 1
    const nonSignedUpAttesterId = 2

    before(async () => {
        // User state
        userStateTree = await genNewUserStateTree("circuit")

        // Bootstrap user state
        const graffitiPreImage = genRandomSalt()
        reputationRecords[signedUpAttesterId] = new Reputation(
            BigInt(Math.floor(Math.random() * 100) + MIN_POS_REP),
            BigInt(Math.floor(Math.random() * MAX_NEG_REP)),
            hashOne(graffitiPreImage),
            BigInt(signUp)
        )
        reputationRecords[signedUpAttesterId].addGraffitiPreImage(graffitiPreImage)
        await userStateTree.update(BigInt(signedUpAttesterId), reputationRecords[signedUpAttesterId].hash())

        reputationRecords[nonSignedUpAttesterId] = new Reputation(
            BigInt(Math.floor(Math.random() * 100) + MIN_POS_REP),
            BigInt(Math.floor(Math.random() * MAX_NEG_REP)),
            hashOne(graffitiPreImage),
            BigInt(notSignUp)
        )
        reputationRecords[nonSignedUpAttesterId].addGraffitiPreImage(graffitiPreImage)
        await userStateTree.update(BigInt(nonSignedUpAttesterId), reputationRecords[nonSignedUpAttesterId].hash())

        userStateRoot = userStateTree.getRootHash()
        // Global state tree
        GSTree = new IncrementalQuinTree(circuitGlobalStateTreeDepth, GSTZERO_VALUE, 2)
        const commitment = genIdentityCommitment(user)
        hashedLeaf = hashLeftRight(commitment, userStateRoot)
        GSTree.insert(hashedLeaf)
        GSTreeProof = GSTree.genMerklePath(0)
        GSTreeRoot = GSTree.root
    })

    it('successfully prove a user has signed up', async () => {
        const attesterId = signedUpAttesterId
        const USTPathElements = await userStateTree.getMerkleProof(BigInt(attesterId))

        const circuitInputs = {
            epoch: epoch,
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
        }
        const startTime = new Date().getTime()
        const results = await genProofAndPublicSignals(Circuit.proveUserSignUp,stringifyBigInts(circuitInputs))
        const endTime = new Date().getTime()
        console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
        const isValid = await verifyProof(Circuit.proveUserSignUp,results['proof'], results['publicSignals'])
        expect(isValid).to.be.true
    })

    it('user does not sign up should success as well', async () => {
        const attesterId = nonSignedUpAttesterId
        const USTPathElements = await userStateTree.getMerkleProof(BigInt(attesterId))

        const circuitInputs = {
            epoch: epoch,
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
        }
        const startTime = new Date().getTime()
        const results = await genProofAndPublicSignals(Circuit.proveUserSignUp,stringifyBigInts(circuitInputs))
        const endTime = new Date().getTime()
        console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
        const isValid = await verifyProof(Circuit.proveUserSignUp,results['proof'], results['publicSignals'])
        expect(isValid).to.be.true
    })

    it('prove with wrong attester id should fail', async () => {
        const attesterId = nonSignedUpAttesterId
        const wrongAttesterId = signedUpAttesterId
        const USTPathElements = await userStateTree.getMerkleProof(BigInt(attesterId))

        const circuitInputs = {
            epoch: epoch,
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
        }
        const startTime = new Date().getTime()
        const results = await genProofAndPublicSignals(Circuit.proveUserSignUp,stringifyBigInts(circuitInputs))
        const endTime = new Date().getTime()
        console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
        const isValid = await verifyProof(Circuit.proveUserSignUp,results['proof'], results['publicSignals'])
        expect(isValid).to.be.false
    })

    it('prove with differnt epoch key should fail', async () => {
        const attesterId = signedUpAttesterId
        const USTPathElements = await userStateTree.getMerkleProof(BigInt(attesterId))
        const wrongNonce = 1
        const wrongEpochKey = genEpochKey(user['identityNullifier'], epoch, wrongNonce, circuitEpochTreeDepth)

        const circuitInputs = {
            epoch: epoch,
            epoch_key: wrongEpochKey,
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
        }
        const startTime = new Date().getTime()
        const results = await genProofAndPublicSignals(Circuit.proveUserSignUp,stringifyBigInts(circuitInputs))
        const endTime = new Date().getTime()
        console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
        const isValid = await verifyProof(Circuit.proveUserSignUp,results['proof'], results['publicSignals'])
        expect(isValid).to.be.false
    })

    it('forge signed up info should fail', async () => {
        const attesterId = nonSignedUpAttesterId
        const USTPathElements = await userStateTree.getMerkleProof(BigInt(attesterId))
        const wrongSignUpInfo = 1

        const circuitInputs = {
            epoch: epoch,
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
            sign_up: wrongSignUpInfo,
            UST_path_elements: USTPathElements,
        }
        const startTime = new Date().getTime()
        const results = await genProofAndPublicSignals(Circuit.proveUserSignUp,stringifyBigInts(circuitInputs))
        const endTime = new Date().getTime()
        console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
        const isValid = await verifyProof(Circuit.proveUserSignUp,results['proof'], results['publicSignals'])
        expect(isValid).to.be.false
    })
})