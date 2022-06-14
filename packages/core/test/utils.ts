// The reason for the ts-ignore below is that if we are executing the code via `ts-node` instead of `hardhat`,
// it can not read the hardhat config and error ts-2503 will be reported.
// @ts-ignore
import { expect } from 'chai'
import { BigNumber, BigNumberish, ethers } from 'ethers'
import {
    IncrementalMerkleTree,
    hashLeftRight,
    genRandomSalt,
    stringifyBigInts,
    ZkIdentity,
} from '@unirep/crypto'
import { Circuit, verifyProof } from '@unirep/circuits'
import {
    Attestation,
    ProcessAttestationsProof,
    StartTransitionProof,
    UserTransitionProof,
} from '@unirep/contracts'

import { MAX_REPUTATION_BUDGET } from '@unirep/circuits/config'

import {
    computeEmptyUserStateRoot,
    genEpochKey,
    genNewSMT,
    genUnirepState,
    genUserState,
    IUserState,
    Reputation,
    UnirepState,
    UserState,
} from '../src'
import {
    genEpochKeyCircuitInput,
    genNewEpochTree,
    genNewUserStateTree,
    toCompleteHexString,
} from '../../circuits/test/utils'

const genNewGST = (
    GSTDepth: number,
    USTDepth: number
): IncrementalMerkleTree => {
    const emptyUserStateRoot = computeEmptyUserStateRoot(USTDepth)
    const defaultGSTLeaf = hashLeftRight(BigInt(0), emptyUserStateRoot)
    const GST = new IncrementalMerkleTree(GSTDepth, defaultGSTLeaf)
    return GST
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

const genReputationCircuitInput = (
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
    const repNullifiersAmount = _repNullifiersAmount ?? 0
    const minRep = _minRep ?? 0
    const proveGraffiti = _proveGraffiti ?? 0
    let graffitiPreImage
    if (proveGraffiti === 1 && reputationRecords[attesterId]) {
        graffitiPreImage = reputationRecords[attesterId]['graffitiPreImage']
    }
    graffitiPreImage = _graffitiPreImage ?? 0
    if (reputationRecords[attesterId] === undefined) {
        reputationRecords[attesterId] = Reputation.default()
    }

    // User state tree
    const userStateTree = genNewUserStateTree()
    for (const attester of Object.keys(reputationRecords)) {
        userStateTree.update(
            BigInt(attester),
            reputationRecords[attester].hash()
        )
    }
    const userStateRoot = userStateTree.root
    const USTPathElements = userStateTree.createProof(BigInt(attesterId))

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

const genProveSignUpCircuitInput = (
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
    const userStateTree = genNewUserStateTree()
    for (const attester of Object.keys(reputationRecords)) {
        userStateTree.update(
            BigInt(attester),
            reputationRecords[attester].hash()
        )
    }
    const userStateRoot = userStateTree.root
    const USTPathElements = userStateTree.createProof(BigInt(attesterId))

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

const submitUSTProofs = async (
    contract: ethers.Contract,
    { startTransitionProof, processAttestationProofs, finalTransitionProof }
) => {
    const proofIndexes: number[] = []

    {
        // submit proofs
        const input = new StartTransitionProof(
            startTransitionProof.publicSignals,
            startTransitionProof.proof
        )
        const isValid = await input.verify()
        expect(isValid).to.be.true
        const tx = await contract.startUserStateTransition(
            input.publicSignals,
            input.proof
        )
        const receipt = await tx.wait()
        expect(receipt.status).to.equal(1)

        // submit twice should fail
        await expect(
            contract.startUserStateTransition(input.publicSignals, input.proof)
        ).to.be.revertedWith('NullilierAlreadyUsed')

        const hashedProof = input.hash()
        proofIndexes.push(Number(await contract.getProofIndex(hashedProof)))
    }

    for (let i = 0; i < processAttestationProofs.length; i++) {
        const input = new ProcessAttestationsProof(
            processAttestationProofs[i].publicSignals,
            processAttestationProofs[i].proof
        )
        const isValid = await input.verify()
        expect(isValid).to.be.true

        const tx = await contract.processAttestations(
            input.publicSignals,
            input.proof
        )
        const receipt = await tx.wait()
        expect(receipt.status).to.equal(1)

        // submit twice should fail
        await expect(
            contract.processAttestations(input.publicSignals, input.proof)
        ).to.be.revertedWith('NullilierAlreadyUsed')

        const hashedProof = input.hash()
        proofIndexes.push(Number(await contract.getProofIndex(hashedProof)))
    }

    {
        const input = new UserTransitionProof(
            finalTransitionProof.publicSignals,
            finalTransitionProof.proof
        )
        const isValid = await input.verify()
        expect(isValid).to.be.true
        const tx = await contract.updateUserStateRoot(
            input.publicSignals,
            input.proof,
            proofIndexes
        )
        const receipt = await tx.wait()
        expect(receipt.status).to.equal(1)

        // submit twice should fail
        await expect(
            contract.updateUserStateRoot(
                input.publicSignals,
                input.proof,
                proofIndexes
            )
        ).to.be.revertedWith('NullilierAlreadyUsed')
    }
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
    const epochTree1 = usWithNoStorage.getUnirepStateEpochTree(epoch)

    const usWithStorage = await genUserState(
        provider,
        address,
        userId,
        savedUserState
    )
    const epochTree2 = await usWithStorage.getUnirepStateEpochTree(epoch)

    const usFromJSON = UserState.fromJSON(userId, usWithStorage.toJSON())
    const epochTree3 = usFromJSON.getUnirepStateEpochTree(epoch)

    expect(epochTree1.root).to.equal(epochTree2.root)
    expect(epochTree1.root).to.equal(epochTree3.root)

    return usWithNoStorage.toJSON()
}

export {
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
    submitUSTProofs,
    compareStates,
    compareEpochTrees,
}
