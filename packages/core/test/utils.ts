// The reason for the ts-ignore below is that if we are executing the code via `ts-node` instead of `hardhat`,
// it can not read the hardhat config and error ts-2503 will be reported.
// @ts-ignore
import { expect } from 'chai'
import { BigNumber, BigNumberish, ethers } from 'ethers'
import {
    IncrementalMerkleTree,
    hash5,
    hashLeftRight,
    SparseMerkleTree,
    genRandomNumber,
    stringifyBigInts,
    ZkIdentity,
} from '@unirep/crypto'
import { Circuit, verifyProof } from '@unirep/circuits'
import { Attestation } from '@unirep/contracts'
import {
    USER_STATE_TREE_DEPTH,
    EPOCH_TREE_DEPTH,
    MAX_REPUTATION_BUDGET,
} from '@unirep/circuits/config'

import {
    genEpochKey,
    genUnirepState,
    genUserState,
    IUserState,
    Reputation,
    UnirepState,
    UserState,
} from '../src'

const toCompleteHexString = (str: string, len?: number): string => {
    str = str.startsWith('0x') ? str : '0x' + str
    if (len) str = ethers.utils.hexZeroPad(str, len)
    return str
}

const SMT_ZERO_LEAF = hashLeftRight(BigInt(0), BigInt(0))
const SMT_ONE_LEAF = hashLeftRight(BigInt(1), BigInt(0))

const genNewSMT = (
    treeDepth: number,
    defaultLeafHash: bigint
): SparseMerkleTree => {
    return new SparseMerkleTree(treeDepth, defaultLeafHash)
}

const genNewEpochTree = (): SparseMerkleTree => {
    const defaultOTSMTHash = SMT_ONE_LEAF
    return genNewSMT(EPOCH_TREE_DEPTH, defaultOTSMTHash)
}

const defaultUserStateLeaf = hash5([
    BigInt(0),
    BigInt(0),
    BigInt(0),
    BigInt(0),
    BigInt(0),
])

const computeEmptyUserStateRoot = (treeDepth: number): bigint => {
    const t = new IncrementalMerkleTree(treeDepth, defaultUserStateLeaf, 2)
    return t.root
}

const genNewGST = (
    GSTDepth: number,
    USTDepth: number
): IncrementalMerkleTree => {
    const emptyUserStateRoot = computeEmptyUserStateRoot(USTDepth)
    const defaultGSTLeaf = hashLeftRight(BigInt(0), emptyUserStateRoot)
    const GST = new IncrementalMerkleTree(GSTDepth, defaultGSTLeaf)
    return GST
}

const genNewUserStateTree = (): SparseMerkleTree => {
    return genNewSMT(USER_STATE_TREE_DEPTH, defaultUserStateLeaf)
}

const genRandomAttestation = (): Attestation => {
    const attesterId = Math.ceil(Math.random() * 10)
    const attestation = new Attestation(
        BigInt(attesterId),
        BigInt(Math.floor(Math.random() * 100)),
        BigInt(Math.floor(Math.random() * 100)),
        BigNumber.from(genRandomNumber()),
        BigInt(Math.floor(Math.random() * 2))
    )
    return attestation
}

const genRandomList = (length): BigNumberish[] => {
    const array: BigNumberish[] = []
    for (let i = 0; i < length; i++) {
        array.push(BigNumber.from(genRandomNumber()))
    }
    return array
}

const computeEpochKeyProofHash = (epochKeyProof: any) => {
    const abiEncoder = ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'uint256', 'uint256', 'uint256[8]'],
        epochKeyProof
    )
    return ethers.utils.keccak256(abiEncoder)
}

const verifyStartTransitionProof = async (
    startTransitionProof
): Promise<boolean> => {
    return await verifyProof(
        Circuit.startTransition,
        startTransitionProof.proof,
        startTransitionProof.publicSignals
    )
}

const verifyProcessAttestationsProof = async (
    processAttestationProof
): Promise<boolean> => {
    return await verifyProof(
        Circuit.processAttestations,
        processAttestationProof.proof,
        processAttestationProof.publicSignals
    )
}

const getReputationRecords = (id: ZkIdentity, unirepState: UnirepState) => {
    const currentEpoch = unirepState.currentEpoch
    const reputaitonRecord = {}
    for (let i = 0; i < currentEpoch; i++) {
        for (
            let j = 0;
            j < unirepState.settings.numEpochKeyNoncePerEpoch;
            j++
        ) {
            const epk = genEpochKey(id.identityNullifier, i, j)
            const attestations = unirepState.getAttestations(epk.toString())
            for (let attestation of attestations) {
                const attesterId = attestation.attesterId.toString()
                if (reputaitonRecord[attesterId] === undefined) {
                    reputaitonRecord[attesterId] = new Reputation(
                        attestation.posRep,
                        attestation.negRep,
                        attestation.graffiti,
                        attestation.signUp
                    )
                } else {
                    reputaitonRecord[attesterId].update(
                        attestation.posRep,
                        attestation.negRep,
                        attestation.graffiti,
                        attestation.signUp
                    )
                }
            }
        }
    }
    return reputaitonRecord
}

const genEpochKeyCircuitInput = (
    id: ZkIdentity,
    tree: IncrementalMerkleTree,
    leafIndex: number,
    ustRoot: bigint,
    epoch: number,
    nonce: number
) => {
    const proof = tree.createProof(leafIndex)
    const root = tree.root
    const epk = genEpochKey(id.identityNullifier, epoch, nonce)

    const circuitInputs = {
        GST_path_elements: proof.siblings,
        GST_path_index: proof.pathIndices,
        GST_root: root,
        identity_nullifier: id.identityNullifier,
        identity_trapdoor: id.trapdoor,
        user_tree_root: ustRoot,
        nonce: nonce,
        epoch: epoch,
        epoch_key: epk,
    }
    return stringifyBigInts(circuitInputs)
}

const genReputationCircuitInput = async (
    id: ZkIdentity,
    epoch: number,
    nonce: number,
    GSTree: IncrementalMerkleTree,
    leafIdx: number,
    reputationRecords,
    attesterId,
    _repNullifiersAmount?,
    _minRep?,
    _proveGraffiti?,
    _graffitiPreImage?
) => {
    const epk = genEpochKey(id.identityNullifier, epoch, nonce)
    const repNullifiersAmount =
        _repNullifiersAmount === undefined ? 0 : _repNullifiersAmount
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
        await userStateTree.update(
            BigInt(attester),
            reputationRecords[attester].hash()
        )
    }
    const userStateRoot = userStateTree.root
    const USTPathElements = await userStateTree.createProof(BigInt(attesterId))

    // Global state tree
    const GSTreeProof = GSTree.createProof(leafIdx) // if there is only one GST leaf, the index is 0
    const GSTreeRoot = GSTree.root

    // selectors and karma nonce
    const nonceStarter = 0
    const selectors: bigint[] = []
    const nonceList: bigint[] = []
    for (let i = 0; i < repNullifiersAmount; i++) {
        nonceList.push(BigInt(nonceStarter + i))
        selectors.push(BigInt(1))
    }
    for (let i = repNullifiersAmount; i < MAX_REPUTATION_BUDGET; i++) {
        nonceList.push(BigInt(0))
        selectors.push(BigInt(0))
    }

    const circuitInputs = {
        epoch: epoch,
        epoch_key_nonce: nonce,
        epoch_key: epk,
        identity_nullifier: id.identityNullifier,
        identity_trapdoor: id.trapdoor,
        user_tree_root: userStateRoot,
        GST_path_index: GSTreeProof.pathIndices,
        GST_path_elements: GSTreeProof.siblings,
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
        graffiti_pre_image: graffitiPreImage,
    }
    return stringifyBigInts(circuitInputs)
}

const genProveSignUpCircuitInput = async (
    id: ZkIdentity,
    epoch: number,
    GSTree: IncrementalMerkleTree,
    leafIdx: number,
    reputationRecords,
    attesterId,
    _signUp?: number
) => {
    const nonce = 0
    const epk = genEpochKey(id.identityNullifier, epoch, nonce)
    if (reputationRecords[attesterId] === undefined) {
        reputationRecords[attesterId] = Reputation.default()
    }

    // User state tree
    const userStateTree = await genNewUserStateTree()
    for (const attester of Object.keys(reputationRecords)) {
        await userStateTree.update(
            BigInt(attester),
            reputationRecords[attester].hash()
        )
    }
    const userStateRoot = userStateTree.root
    const USTPathElements = await userStateTree.createProof(BigInt(attesterId))

    // Global state tree
    const GSTreeProof = GSTree.createProof(leafIdx) // if there is only one GST leaf, the index is 0
    const GSTreeRoot = GSTree.root

    const circuitInputs = {
        epoch: epoch,
        epoch_key: epk,
        identity_nullifier: id.identityNullifier,
        identity_trapdoor: id.trapdoor,
        user_tree_root: userStateRoot,
        GST_path_index: GSTreeProof.pathIndices,
        GST_path_elements: GSTreeProof.siblings,
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

const compareStates = async (
    provider: ethers.providers.Provider,
    address: string,
    userId: ZkIdentity,
    savedUserState: IUserState
) => {
    const usWithNoStorage = await genUserState(provider, address, userId)
    const unirepStateWithNoStorage = await genUnirepState(provider, address)

    const usWithStorage = await genUserState(
        provider,
        address,
        userId,
        savedUserState
    )
    const unirepStateWithStorage = await genUnirepState(
        provider,
        address,
        savedUserState.unirepState
    )

    const usFromJSON = UserState.fromJSON(userId, usWithStorage.toJSON())
    const unirepFromJSON = UnirepState.fromJSON(unirepStateWithStorage.toJSON())

    expect(usWithNoStorage.toJSON()).to.deep.equal(usWithStorage.toJSON())
    expect(usWithNoStorage.toJSON()).to.deep.equal(usFromJSON.toJSON())
    expect(unirepStateWithNoStorage.toJSON()).to.deep.equal(
        unirepStateWithStorage.toJSON()
    )
    expect(unirepStateWithNoStorage.toJSON()).to.deep.equal(
        unirepFromJSON.toJSON()
    )

    return usWithNoStorage.toJSON()
}

const compareEpochTrees = async (
    provider: ethers.providers.Provider,
    address: string,
    userId: ZkIdentity,
    savedUserState: any,
    epoch: number
) => {
    const usWithNoStorage = await genUserState(provider, address, userId)
    const epochTree1 = await usWithNoStorage.getUnirepStateEpochTree(epoch)

    const usWithStorage = await genUserState(
        provider,
        address,
        userId,
        savedUserState
    )
    const epochTree2 = await usWithStorage.getUnirepStateEpochTree(epoch)

    const usFromJSON = UserState.fromJSON(userId, usWithStorage.toJSON())
    const epochTree3 = await usFromJSON.getUnirepStateEpochTree(epoch)

    expect(epochTree1.root).to.equal(epochTree2.root)
    expect(epochTree1.root).to.equal(epochTree3.root)

    return usWithNoStorage.toJSON()
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
    genRandomAttestation,
    genRandomList,
    toCompleteHexString,
    computeEpochKeyProofHash,
    verifyStartTransitionProof,
    verifyProcessAttestationsProof,
    getReputationRecords,
    genEpochKeyCircuitInput,
    genReputationCircuitInput,
    genProveSignUpCircuitInput,
    compareStates,
    compareEpochTrees,
}
