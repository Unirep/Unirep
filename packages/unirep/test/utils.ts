// The reason for the ts-ignore below is that if we are executing the code via `ts-node` instead of `hardhat`,
// it can not read the hardhat config and error ts-2503 will be reported.
// @ts-ignore
import { BigNumber, ethers } from 'ethers'
import Keyv from "keyv"
import { IncrementalQuinTree, hash5, hashLeftRight, SparseMerkleTreeImpl, add0x, genRandomSalt, stringifyBigInts, Identity } from '@unirep/crypto'
import { Circuit, verifyProof } from '@unirep/circuits'
import { circuitEpochTreeDepth, circuitGlobalStateTreeDepth, circuitUserStateTreeDepth, epochTreeDepth, globalStateTreeDepth, maxReputationBudget, userStateTreeDepth} from '../config/testLocal'
import { Attestation, genEpochKey, Reputation, UnirepState } from '../core'

const toCompleteHexString = (str: string, len?: number): string => {
    str = add0x(str)
    if (len) str = ethers.utils.hexZeroPad(str, len)
    return str
}

const SMT_ZERO_LEAF = hashLeftRight(BigInt(0), BigInt(0))
const SMT_ONE_LEAF = hashLeftRight(BigInt(1), BigInt(0))

const genNewSMT = async (treeDepth: number, defaultLeafHash: BigInt): Promise<SparseMerkleTreeImpl> => {
    return SparseMerkleTreeImpl.create(
        new Keyv(),
        treeDepth,
        defaultLeafHash,
    )
}

const genNewEpochTree = async (deployEnv: string = "contract"): Promise<SparseMerkleTreeImpl> => {
    let _epochTreeDepth
    if (deployEnv === 'contract') {
        _epochTreeDepth = epochTreeDepth
    } else if (deployEnv === 'circuit') {
        _epochTreeDepth = circuitEpochTreeDepth
    } else {
        throw new Error('Only contract and circuit testing env are supported')
    }
    const defaultOTSMTHash = SMT_ONE_LEAF
    return genNewSMT(_epochTreeDepth, defaultOTSMTHash)
}

const getTreeDepthsForTesting = (deployEnv: string = "circuit") => {
    if (deployEnv === 'contract') {
        return {
            "userStateTreeDepth": userStateTreeDepth,
            "globalStateTreeDepth": globalStateTreeDepth,
            "epochTreeDepth": epochTreeDepth,
        }
    } else if (deployEnv === 'circuit') {
        return {
            "userStateTreeDepth": circuitUserStateTreeDepth,
            "globalStateTreeDepth": circuitGlobalStateTreeDepth,
            "epochTreeDepth": circuitEpochTreeDepth,
        }
    } else {
        throw new Error('Only contract and circuit testing env are supported')
    }
}

const defaultUserStateLeaf = hash5([BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0)])

const computeEmptyUserStateRoot = (treeDepth: number): BigInt => {
    const t = new IncrementalQuinTree(
        treeDepth,
        defaultUserStateLeaf,
        2,
    )
    return t.root
}

const genNewGST = (GSTDepth: number, USTDepth: number): IncrementalQuinTree => {
    const emptyUserStateRoot = computeEmptyUserStateRoot(USTDepth)
    const defaultGSTLeaf = hashLeftRight(BigInt(0), emptyUserStateRoot)
    const GST = new IncrementalQuinTree(
        GSTDepth,
        defaultGSTLeaf,
        2,
    )
    return GST
}

const genNewUserStateTree = async (deployEnv: string = "circuit"): Promise<SparseMerkleTreeImpl> => {
    let _userStateTreeDepth
    if (deployEnv === 'contract') {
        _userStateTreeDepth = userStateTreeDepth
    } else if (deployEnv === 'circuit') {
        _userStateTreeDepth = circuitUserStateTreeDepth
    } else {
        throw new Error('Only contract and circuit testing env are supported')
    }

    return genNewSMT(_userStateTreeDepth, defaultUserStateLeaf)
}

const genRandomAttestation = () => {
    const attesterId = Math.ceil(Math.random() * 10)
    const attestation = new Attestation(
        BigInt(attesterId),
        BigInt(Math.floor(Math.random() * 100)),
        BigInt(Math.floor(Math.random() * 100)),
        BigNumber.from(genRandomSalt()),
        BigInt(Math.floor(Math.random() * 2)),
    )
    return attestation
}

const genRandomList = (length): BigInt[] => {
    const array: BigInt[] = []
    for (let i = 0; i < length; i++) {
        array.push(genRandomSalt())
    }
    return array
}

const computeEpochKeyProofHash = (epochKeyProof: any) => {
    const abiEncoder = ethers.utils.defaultAbiCoder.encode([ "uint256", "uint256", "uint256", "uint256[8]" ], epochKeyProof)
    return ethers.utils.keccak256(abiEncoder)
}

const verifyNewGSTProofByIndex = async(unirepContract: ethers.Contract, proofIndex: number | ethers.BigNumber): Promise<ethers.Event | undefined> => {
    const signUpFilter = unirepContract.filters.UserSignUp(proofIndex)
    const signUpEvents = await unirepContract.queryFilter(signUpFilter)
    // found user sign up event, then continue
    if (signUpEvents.length == 1) return signUpEvents[0]

    // 2. verify user state transition proof
    const transitionFilter = unirepContract.filters.UserStateTransitionProof(proofIndex)
    const transitionEvents = await unirepContract.queryFilter(transitionFilter)
    if(transitionEvents.length == 0) return
    // proof index is supposed to be unique, therefore it should be only one event found
    const transitionArgs = transitionEvents[0]?.args?.userTransitionedData
    // backward verification
    const isValid = await unirepContract.verifyUserStateTransition(
        transitionArgs.newGlobalStateTreeLeaf,
        transitionArgs.epkNullifiers,
        transitionArgs.transitionFromEpoch,
        transitionArgs.blindedUserStates,
        transitionArgs.fromGlobalStateTree,
        transitionArgs.blindedHashChains,
        transitionArgs.fromEpochTree,
        transitionArgs.proof,
    )
    if(!isValid) return
    
    const _proofIndexes = transitionEvents[0]?.args?._proofIndexRecords
    // Proof index 0 should be the start transition proof
    const startTransitionFilter = unirepContract.filters.StartedTransitionProof(_proofIndexes[0], transitionArgs.blindedUserStates[0], transitionArgs.fromGlobalStateTree)
    const startTransitionEvents = await unirepContract.queryFilter(startTransitionFilter)
    if(startTransitionEvents.length == 0) return

    const startTransitionArgs = startTransitionEvents[0]?.args
    const isStartTransitionProofValid = await unirepContract.verifyStartTransitionProof(
        startTransitionArgs?._blindedUserState,
        startTransitionArgs?._blindedHashChain,
        startTransitionArgs?._globalStateTree,
        startTransitionArgs?._proof,
    )
    if(!isStartTransitionProofValid) return

    // process attestations proofs
    const isProcessAttestationValid = await verifyProcessAttestationEvents(unirepContract, transitionArgs.blindedUserStates[0], transitionArgs.blindedUserStates[1], _proofIndexes)
    if(!isProcessAttestationValid) return

    return transitionEvents[0]
}


const verifyNewGSTLeafEvents = async(unirepContract: ethers.Contract, currentEpoch: number | ethers.BigNumber): Promise<BigInt[]> => {
    const newLeafFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
    const newLeafEvents = await unirepContract.queryFilter(newLeafFilter)

    const newLeaves: BigInt[] = []
    for(const event of newLeafEvents){
        const args = event?.args
        const proofIndex = args?._proofIndex
        
        // New leaf events are from user sign up and user state transition
        // 1. check user sign up
        const isProofValid = await verifyNewGSTProofByIndex(unirepContract, proofIndex)

        // all verification is done
        if (isProofValid){
            newLeaves.push(BigInt(args?._hashedLeaf))
        }
    }

    return newLeaves
}

const verifyProcessAttestationEvents = async(unirepContract: ethers.Contract, startBlindedUserState: ethers.BigNumber, finalBlindedUserState: ethers.BigNumber, _proofIndexes: ethers.BigNumber[]): Promise<boolean> => {

    let currentBlindedUserState = startBlindedUserState
    // The rest are process attestations proofs
    for (let i = 1; i < _proofIndexes.length; i++) {
        const processAttestationsFilter = unirepContract.filters.ProcessedAttestationsProof(_proofIndexes[i], currentBlindedUserState)
        const processAttestationsEvents = await unirepContract.queryFilter(processAttestationsFilter)
        if(processAttestationsEvents.length == 0) return false

        const args = processAttestationsEvents[0]?.args
        const isValid = await unirepContract.verifyProcessAttestationProof(
            args?._outputBlindedUserState,
            args?._outputBlindedHashChain,
            args?._inputBlindedUserState,
            args?._proof
        )
        if(!isValid) return false
        currentBlindedUserState = args?._outputBlindedUserState
    }
    return currentBlindedUserState.eq(finalBlindedUserState)
}

const verifyStartTransitionProof = async (startTransitionProof): Promise<boolean> => {
    return await verifyProof(
        Circuit.startTransition,
        startTransitionProof.proof,
        startTransitionProof.publicSignals
    )
}

const verifyProcessAttestationsProof = async (processAttestationProof): Promise<boolean> => {
    return await verifyProof(
        Circuit.processAttestations,
        processAttestationProof.proof,
        processAttestationProof.publicSignals
    )
}

const getReputationRecords = (id: Identity, unirepState: UnirepState) => {
    const currentEpoch = unirepState.currentEpoch
    let reputaitonRecord = {}
    for (let i = 0; i < currentEpoch; i++) {
        for (let j = 0; j < unirepState.setting.numEpochKeyNoncePerEpoch; j++) {
            const epk = genEpochKey(id.identityNullifier, i, j)
            const attestations = unirepState.getAttestations(epk.toString())
            for (let attestation of attestations) {
                const attesterId = attestation.attesterId.toString()
                if(reputaitonRecord[attesterId] === undefined) {
                    reputaitonRecord[attesterId] = new Reputation (
                        attestation.posRep as BigInt,
                        attestation.negRep as BigInt,
                        attestation.graffiti as BigInt,
                        attestation.signUp as BigInt
                    )
                } else {
                    reputaitonRecord[attesterId].update(
                        attestation.posRep as BigInt,
                        attestation.negRep as BigInt,
                        attestation.graffiti as BigInt,
                        attestation.signUp as BigInt
                    )
                }
            }
        }
    }
    return reputaitonRecord
}

const genEpochKeyCircuitInput = (
    id: Identity, 
    tree: IncrementalQuinTree, 
    leafIndex: number, 
    ustRoot: BigInt, 
    epoch: number, 
    nonce: number
) => {
    const proof = tree.genMerklePath(leafIndex)
    const root = tree.root
    const epk = genEpochKey(id['identityNullifier'], epoch, nonce)

    const circuitInputs = {
        GST_path_elements: proof.pathElements,
        GST_path_index: proof.indices,
        GST_root: root,
        identity_pk: id['keypair']['pubKey'],
        identity_nullifier: id['identityNullifier'], 
        identity_trapdoor: id['identityTrapdoor'],
        user_tree_root: ustRoot,
        nonce: nonce,
        epoch: epoch,
        epoch_key: epk,
    }
    return stringifyBigInts(circuitInputs)
}

const genReputationCircuitInput = async (
    id: Identity, 
    epoch: number, 
    nonce: number, 
    GSTree: IncrementalQuinTree,
    leafIdx: number,
    reputationRecords, 
    attesterId, 
    _repNullifiersAmount?, 
    _minRep?, 
    _proveGraffiti?, 
    _graffitiPreImage?
) => {
    const epk = genEpochKey(id['identityNullifier'], epoch, nonce)
    const repNullifiersAmount = _repNullifiersAmount === undefined ? 0 : _repNullifiersAmount
    const minRep = _minRep === undefined ? 0 : _minRep
    const proveGraffiti = _proveGraffiti === undefined ? 0 : _proveGraffiti
    let graffitiPreImage
    if (proveGraffiti === 1 && reputationRecords[attesterId] !== undefined) {
        graffitiPreImage = reputationRecords[attesterId]['graffitiPreImage']
    }
    graffitiPreImage = graffitiPreImage === undefined ? 0 : graffitiPreImage
    if (reputationRecords[attesterId] === undefined) {
        reputationRecords[attesterId] = Reputation.default()
    }

    // User state tree
    const userStateTree = await genNewUserStateTree()
    for (const attester of Object.keys(reputationRecords)) {
        await userStateTree.update(BigInt(attester), reputationRecords[attester].hash())
    }
    const userStateRoot = userStateTree.getRootHash()
    const USTPathElements = await userStateTree.getMerkleProof(BigInt(attesterId))

    // Global state tree
    const GSTreeProof = GSTree.genMerklePath(leafIdx) // if there is only one GST leaf, the index is 0
    const GSTreeRoot = GSTree.root

    // selectors and karma nonce
    const nonceStarter = 0
    const selectors: BigInt[] = []
    const nonceList: BigInt[] = []
    for (let i = 0; i < repNullifiersAmount; i++) {
        nonceList.push( BigInt(nonceStarter + i) )
        selectors.push(BigInt(1));
    }
    for (let i = repNullifiersAmount ; i < maxReputationBudget; i++) {
        nonceList.push(BigInt(0))
        selectors.push(BigInt(0))
    }

    const circuitInputs = {
        epoch: epoch,
        epoch_key_nonce: nonce,
        epoch_key: epk,
        identity_pk: id['keypair']['pubKey'],
        identity_nullifier: id['identityNullifier'], 
        identity_trapdoor: id['identityTrapdoor'],
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
        prove_graffiti: proveGraffiti,
        graffiti_pre_image: graffitiPreImage
    }
    return stringifyBigInts(circuitInputs)
}

const genProveSignUpCircuitInput = async (
    id: Identity, 
    epoch: number, 
    GSTree: IncrementalQuinTree,
    leafIdx: number,
    reputationRecords, 
    attesterId, 
    _signUp?: number
) => {
    const nonce = 0
    const epk = genEpochKey(id['identityNullifier'], epoch, nonce)
    if(reputationRecords[attesterId] === undefined) {
        reputationRecords[attesterId] = Reputation.default()
    }

    // User state tree
    const userStateTree = await genNewUserStateTree()
    for (const attester of Object.keys(reputationRecords)) {
        await userStateTree.update(BigInt(attester), reputationRecords[attester].hash())
    }
    const userStateRoot = userStateTree.getRootHash()
    const USTPathElements = await userStateTree.getMerkleProof(BigInt(attesterId))

    // Global state tree
    const GSTreeProof = GSTree.genMerklePath(leafIdx) // if there is only one GST leaf, the index is 0
    const GSTreeRoot = GSTree.root

    const circuitInputs = {
        epoch: epoch,
        epoch_key: epk,
        identity_pk: id['keypair']['pubKey'],
        identity_nullifier: id['identityNullifier'], 
        identity_trapdoor: id['identityTrapdoor'],
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
    return stringifyBigInts(circuitInputs)
}

export {
    SMT_ONE_LEAF,
    SMT_ZERO_LEAF,
    computeEmptyUserStateRoot,
    defaultUserStateLeaf,
    genNewEpochTree,
    genNewUserStateTree,
    genNewSMT,
    genNewGST,
    getTreeDepthsForTesting,
    genRandomAttestation,
    genRandomList,
    toCompleteHexString,
    computeEpochKeyProofHash,
    verifyNewGSTProofByIndex,
    verifyNewGSTLeafEvents,
    verifyProcessAttestationEvents,
    verifyStartTransitionProof,
    verifyProcessAttestationsProof,
    getReputationRecords,
    genEpochKeyCircuitInput,
    genReputationCircuitInput,
    genProveSignUpCircuitInput,
}