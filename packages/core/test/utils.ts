// The reason for the ts-ignore below is that if we are executing the code via `ts-node` instead of `hardhat`,
// it can not read the hardhat config and error ts-2503 will be reported.
// @ts-ignore
import { expect } from 'chai'
import { BigNumber, BigNumberish, ethers } from 'ethers'
import {
    IncrementalMerkleTree,
    genRandomSalt,
    stringifyBigInts,
    ZkIdentity,
} from '@unirep/crypto'
import { Attestation } from '@unirep/contracts'

import {
    genUnirepState,
    genUserState,
    IUserState,
    Reputation,
    UnirepState,
    UserState,
} from '../src'
import { UnirepProtocol } from '../src/UnirepProtocol'
import { Unirep } from '@unirep/contracts'

const toCompleteHexString = (str: string, len?: number): string => {
    str = str.startsWith('0x') ? str : '0x' + str
    if (len) str = ethers.utils.hexZeroPad(str, len)
    return str
}

const attesterSignUp = async (
    account: ethers.Signer,
    unirepContract: Unirep
) => {
    const attester = new Object()
    attester['acct'] = account
    attester['addr'] = await attester['acct'].getAddress()
    const unirepContractCalledByAttester = unirepContract.connect(
        attester['acct']
    )
    let tx = await unirepContractCalledByAttester.attesterSignUp()
    let receipt = await tx.wait()
    expect(receipt.status, 'Attester signs up failed').to.equal(1)

    return {
        attester,
        unirepContractCalledByAttester,
    }
}

const attesterSetAirdrop = async (
    account: ethers.Signer,
    unirepContract: Unirep,
    airdropPosRep: number
) => {
    const attester = new Object()
    attester['acct'] = account
    attester['addr'] = await attester['acct'].getAddress()
    const unirepContractCalledByAttester = unirepContract.connect(
        attester['acct']
    )
    const tx = await unirepContractCalledByAttester.setAirdropAmount(
        airdropPosRep
    )
    const receipt = await tx.wait()
    expect(receipt.status).equal(1)
    const airdroppedAmount = await unirepContract.airdropAmount(
        attester['addr']
    )
    expect(airdroppedAmount.toNumber()).equal(airdropPosRep)
}

const genRandomAttestation = (): Attestation => {
    const attesterId = Math.ceil(Math.random() * 10)
    const attestation = new Attestation(
        BigInt(attesterId),
        BigInt(Math.floor(Math.random() * 100)),
        BigInt(Math.floor(Math.random() * 100)),
        BigNumber.from(genRandomSalt()),
        BigInt(Math.floor(Math.random() * 2))
    )
    return attestation
}

const genRandomList = (length): BigNumberish[] => {
    const array: BigNumberish[] = []
    for (let i = 0; i < length; i++) {
        array.push(BigNumber.from(genRandomSalt()))
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

const getReputationRecords = (id: ZkIdentity, unirepState: UnirepState) => {
    const currentEpoch = unirepState.currentEpoch
    const reputaitonRecord = {}
    for (let i = 0; i < currentEpoch; i++) {
        for (let j = 0; j < unirepState.config.numEpochKeyNoncePerEpoch; j++) {
            const epk = unirepState.genEpochKey(id.identityNullifier, i, j)
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
    protocol: UnirepProtocol,
    id: ZkIdentity,
    tree: IncrementalMerkleTree,
    leafIndex: number,
    ustRoot: BigInt,
    epoch: number,
    nonce: number
) => {
    const proof = tree.createProof(leafIndex)
    const root = tree.root
    const epk = protocol.genEpochKey(id.identityNullifier, epoch, nonce)

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
    protocol: UnirepProtocol,
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
    const epk = protocol.genEpochKey(id.identityNullifier, epoch, nonce)
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
    const userStateTree = await protocol.genNewUST()
    for (const attester of Object.keys(reputationRecords)) {
        await userStateTree.update(
            BigInt(attester),
            reputationRecords[attester].hash()
        )
    }
    const userStateRoot = userStateTree.getRootHash()
    const USTPathElements = await userStateTree.getMerkleProof(
        BigInt(attesterId)
    )

    // Global state tree
    const GSTreeProof = GSTree.createProof(leafIdx) // if there is only one GST leaf, the index is 0
    const GSTreeRoot = GSTree.root

    // selectors and karma nonce
    const nonceStarter = 0
    const selectors: BigInt[] = []
    const nonceList: BigInt[] = []
    for (let i = 0; i < repNullifiersAmount; i++) {
        nonceList.push(BigInt(nonceStarter + i))
        selectors.push(BigInt(1))
    }
    for (
        let i = repNullifiersAmount;
        i < protocol.config.maxReputationBudget;
        i++
    ) {
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
    protocol: UnirepProtocol,
    id: ZkIdentity,
    epoch: number,
    GSTree: IncrementalMerkleTree,
    leafIdx: number,
    reputationRecords,
    attesterId,
    _signUp?: number
) => {
    const nonce = 0
    const epk = protocol.genEpochKey(id.identityNullifier, epoch, nonce)
    if (reputationRecords[attesterId] === undefined) {
        reputationRecords[attesterId] = Reputation.default()
    }

    // User state tree
    const userStateTree = await protocol.genNewUST()
    for (const attester of Object.keys(reputationRecords)) {
        await userStateTree.update(
            BigInt(attester),
            reputationRecords[attester].hash()
        )
    }
    const userStateRoot = userStateTree.getRootHash()
    const USTPathElements = await userStateTree.getMerkleProof(
        BigInt(attesterId)
    )

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
    protocol: UnirepProtocol,
    provider: ethers.providers.Provider,
    address: string,
    userId: ZkIdentity,
    savedUserState: IUserState
) => {
    const usWithNoStorage = await genUserState(
        protocol,
        provider,
        address,
        userId
    )
    const unirepStateWithNoStorage = await genUnirepState(
        protocol,
        provider,
        address
    )

    const usWithStorage = await genUserState(
        protocol,
        provider,
        address,
        userId,
        savedUserState
    )
    const unirepStateWithStorage = await genUnirepState(
        protocol,
        provider,
        address,
        savedUserState
    )

    const usFromJSON = UserState.fromJSONAndID(userId, usWithStorage.toJSON())
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
    protocol: UnirepProtocol,
    provider: ethers.providers.Provider,
    address: string,
    userId: ZkIdentity,
    savedUserState: any,
    epoch: number
) => {
    const usWithNoStorage = await genUserState(
        protocol,
        provider,
        address,
        userId
    )
    const epochTree1 = await usWithNoStorage.genEpochTree(epoch)

    const usWithStorage = await genUserState(
        protocol,
        provider,
        address,
        userId,
        savedUserState
    )
    const epochTree2 = await usWithStorage.genEpochTree(epoch)

    const usFromJSON = UserState.fromJSONAndID(userId, usWithStorage.toJSON())
    const epochTree3 = await usFromJSON.genEpochTree(epoch)

    expect(epochTree1.getRootHash()).to.equal(epochTree2.getRootHash())
    expect(epochTree1.getRootHash()).to.equal(epochTree3.getRootHash())

    return usWithNoStorage.toJSON()
}

export {
    attesterSignUp,
    attesterSetAirdrop,
    genRandomAttestation,
    genRandomList,
    toCompleteHexString,
    computeEpochKeyProofHash,
    getReputationRecords,
    genEpochKeyCircuitInput,
    genReputationCircuitInput,
    genProveSignUpCircuitInput,
    compareStates,
    compareEpochTrees,
}
