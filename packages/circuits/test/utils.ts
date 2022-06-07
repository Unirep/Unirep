// The reason for the ts-ignore below is that if we are executing the code via `ts-node` instead of `hardhat`,
// it can not read the hardhat config and error ts-2503 will be reported.
// @ts-ignore
import path from 'path'
import assert from 'assert'
import { ethers } from 'ethers'
import Keyv from 'keyv'
import { expect } from 'chai'
import * as crypto from '@unirep/crypto'
const snarkjs = require('snarkjs')
const circom = require('circom')

import { CircuitConfig, CircuitName } from '../src'
import { SnarkProof, SnarkPublicSignals } from '@unirep/crypto'
import { exportBuildPath } from './config'
const config = require(path.join(exportBuildPath, 'config.json'))

const SMT_ZERO_LEAF = crypto.hashLeftRight(BigInt(0), BigInt(0))
const SMT_ONE_LEAF = crypto.hashLeftRight(BigInt(1), BigInt(0))
const EPOCH_KEY_NULLIFIER_DOMAIN = BigInt(1)

interface IAttestation {
    attesterId: BigInt
    posRep: BigInt
    negRep: BigInt
    graffiti: BigInt
    signUp: BigInt
    hash(): BigInt
}

class Attestation implements IAttestation {
    public attesterId: BigInt
    public posRep: BigInt
    public negRep: BigInt
    public graffiti: BigInt
    public signUp: BigInt

    constructor(
        _attesterId: BigInt,
        _posRep: BigInt,
        _negRep: BigInt,
        _graffiti: BigInt,
        _signUp: BigInt
    ) {
        this.attesterId = _attesterId
        this.posRep = _posRep
        this.negRep = _negRep
        this.graffiti = _graffiti
        this.signUp = _signUp
    }

    public hash = (): BigInt => {
        return crypto.hash5([
            this.attesterId,
            this.posRep,
            this.negRep,
            this.graffiti,
            this.signUp,
        ])
    }

    public toJSON = (space = 0): string => {
        return JSON.stringify(
            {
                attesterId: this.attesterId.toString(),
                posRep: this.posRep.toString(),
                negRep: this.negRep.toString(),
                graffiti: this.graffiti.toString(),
                signUp: this.signUp.toString(),
            },
            null,
            space
        )
    }
}

interface IReputation {
    posRep: BigInt
    negRep: BigInt
    graffiti: BigInt
}

class Reputation implements IReputation {
    public posRep: BigInt
    public negRep: BigInt
    public graffiti: BigInt
    public graffitiPreImage: BigInt = BigInt(0)
    public signUp: BigInt

    constructor(
        _posRep: BigInt,
        _negRep: BigInt,
        _graffiti: BigInt,
        _signUp: BigInt
    ) {
        this.posRep = _posRep
        this.negRep = _negRep
        this.graffiti = _graffiti
        this.signUp = _signUp
    }

    public static default(): Reputation {
        return new Reputation(BigInt(0), BigInt(0), BigInt(0), BigInt(0))
    }

    public update = (
        _posRep: BigInt,
        _negRep: BigInt,
        _graffiti: BigInt,
        _signUp: BigInt
    ): Reputation => {
        this.posRep = BigInt(Number(this.posRep) + Number(_posRep))
        this.negRep = BigInt(Number(this.negRep) + Number(_negRep))
        if (_graffiti != BigInt(0)) {
            this.graffiti = _graffiti
        }
        this.signUp = this.signUp || _signUp
        return this
    }

    public addGraffitiPreImage = (_graffitiPreImage: BigInt) => {
        assert(
            crypto.hashOne(_graffitiPreImage) === this.graffiti,
            'Graffiti pre-image does not match'
        )
        this.graffitiPreImage = _graffitiPreImage
    }

    public hash = (): BigInt => {
        return crypto.hash5([
            this.posRep,
            this.negRep,
            this.graffiti,
            this.signUp,
            BigInt(0),
        ])
    }

    public toJSON = (space = 0): string => {
        return JSON.stringify(
            {
                posRep: this.posRep.toString(),
                negRep: this.negRep.toString(),
                graffiti: this.graffiti.toString(),
                graffitiPreImage: this.graffitiPreImage.toString(),
                signUp: this.signUp.toString(),
            },
            null,
            space
        )
    }
}

class UnirepCircuit {
    /**
     * Get circuit config from given zkFilesPath
     * @param zkFilesPath
     * @returns circuit config
     */
    public static getConfig = (zkFilesPath: string): CircuitConfig => {
        const circuitConfig: CircuitConfig = require(path.join(
            zkFilesPath,
            'config.json'
        ))
        return circuitConfig
    }
    /**
     * Get VKey of given circuit
     * @param zkFilesPath The path of built zk files
     * @param circuitName The name of circuit
     * @returns Vkey of the circuit
     */
    public static getVKey = (zkFilesPath: string, circuitName: CircuitName) => {
        const VKeyPath = path.join(zkFilesPath, `${circuitName}.vkey.json`)
        const vkey = require(VKeyPath)
        return vkey
    }

    /**
     * Get the value of given variable in witness
     * @param circuit The snarkjs circuit
     * @param witness The witness of the circuit
     * @param signal The name of the variable
     * @returns The value of the variable in witness
     */
    public static getSignalByName = (
        circuit: any,
        witness: any,
        signal: string
    ): any => {
        return witness[circuit.symbols[signal].varIdx]
    }

    /**
     * Compile a .circom file with circom compiler
     * @param circuitPath The path to the .circom file
     * @returns The compiled circuit
     */
    public static compileAndLoadCircuit = async (circuitPath: string) => {
        const circuit = await circom.tester(circuitPath)
        await circuit.loadSymbols()

        return circuit
    }

    /**
     * Execute a snarkjs circuit with given inputs
     * @param circuit The snarkjs circuit
     * @param inputs Input of the circuit
     * @returns Witness of the circuit
     */
    public static executeCircuit = async (
        circuit: any,
        inputs: any
    ): Promise<any> => {
        const witness = await circuit.calculateWitness(inputs, true)
        await circuit.checkConstraints(witness)
        await circuit.loadSymbols()

        return witness
    }

    /**
     * Generate a full proof of the circuit
     * @param zkFilesPath The path to the built zk files
     * @param circuitName The name of the circuit
     * @param inputs The input of the proof
     * @returns The proof and the public signals of the snark proof
     */
    public static genProof = async (
        zkFilesPath: string,
        circuitName: CircuitName,
        inputs: any
    ) => {
        const circuitWasmPath = path.join(zkFilesPath, `${circuitName}.wasm`)
        const zkeyPath = path.join(zkFilesPath, `${circuitName}.zkey`)
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            inputs,
            circuitWasmPath,
            zkeyPath
        )

        return { proof, publicSignals }
    }

    /**
     * Verify the snark proof
     * @param zkFilesPath The path to the built zk files
     * @param circuitName The name of the circuit
     * @param proof The proof of the snark proof
     * @param publicSignals The public signals of the snark proof
     * @returns
     */
    public static verifyProof = async (
        zkFilesPath: string,
        circuitName: CircuitName,
        proof: SnarkProof,
        publicSignals: SnarkPublicSignals
    ): Promise<boolean> => {
        const vkey = this.getVKey(zkFilesPath, circuitName)
        return snarkjs.groth16.verify(vkey, publicSignals, proof)
    }

    /**
     * Format the proof for verifier contract
     * @param proof The output of the snarkjs proof
     * @returns The array of the stringified proof
     */
    public static formatProofForVerifierContract = (
        proof: SnarkProof
    ): string[] => {
        return [
            proof.pi_a[0],
            proof.pi_a[1],
            proof.pi_b[0][1],
            proof.pi_b[0][0],
            proof.pi_b[1][1],
            proof.pi_b[1][0],
            proof.pi_c[0],
            proof.pi_c[1],
        ].map((x) => x.toString())
    }

    /**
     * Format the proof for snarkjs verification
     * @param proof The stringified array of the the proof
     * @returns The SnarkProof type of the proof
     */
    public static formatProofForSnarkjsVerification = (
        proof: string[]
    ): SnarkProof => {
        return {
            pi_a: [BigInt(proof[0]), BigInt(proof[1]), BigInt('1')],
            pi_b: [
                [BigInt(proof[3]), BigInt(proof[2])],
                [BigInt(proof[5]), BigInt(proof[4])],
                [BigInt('1'), BigInt('0')],
            ],
            pi_c: [BigInt(proof[6]), BigInt(proof[7]), BigInt('1')],
        }
    }
}

const toCompleteHexString = (str: string, len?: number): string => {
    str = str.startsWith('0x') ? str : '0x' + str
    if (len) str = ethers.utils.hexZeroPad(str, len)
    return str
}

const genNewSMT = (treeDepth: number, defaultLeafHash: BigInt) => {
    return new crypto.SparseMerkleTree(new Keyv(), treeDepth, defaultLeafHash)
}

const genNewEpochTree = (_epochTreeDepth: number = config.epochTreeDepth) => {
    const defaultOTSMTHash = SMT_ONE_LEAF
    return genNewSMT(_epochTreeDepth, defaultOTSMTHash)
}

const defaultUserStateLeaf = crypto.hash5([
    BigInt(0),
    BigInt(0),
    BigInt(0),
    BigInt(0),
    BigInt(0),
])

const computeEmptyUserStateRoot = (treeDepth: number): BigInt => {
    const t = new crypto.IncrementalMerkleTree(treeDepth, defaultUserStateLeaf)
    return t.root
}

const genNewUserStateTree = async (
    _userStateTreeDepth: number = config.userStateTreeDepth
) => {
    return genNewSMT(_userStateTreeDepth, defaultUserStateLeaf)
}

const genEpochKey = (
    identityNullifier: crypto.SnarkBigInt,
    epoch: number,
    nonce: number,
    _epochTreeDepth: number = config.epochTreeDepth
): crypto.SnarkBigInt => {
    const values: any[] = [
        identityNullifier,
        epoch,
        nonce,
        BigInt(0),
        BigInt(0),
    ]
    let epochKey = crypto.hash5(values).toString()
    // Adjust epoch key size according to epoch tree depth
    const epochKeyModed = BigInt(epochKey) % BigInt(2 ** _epochTreeDepth)
    return epochKeyModed
}

const genEpochKeyCircuitInput = (
    id: crypto.ZkIdentity,
    tree: crypto.IncrementalMerkleTree,
    leafIndex: number,
    ustRoot: BigInt,
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
    return crypto.stringifyBigInts(circuitInputs)
}

const genStartTransitionCircuitInput = (
    id: crypto.ZkIdentity,
    tree: crypto.IncrementalMerkleTree,
    leafIndex: number,
    ustRoot: BigInt,
    epoch: number,
    nonce: number
) => {
    const proof = tree.createProof(leafIndex)
    const root = tree.root

    const circuitInputs = {
        epoch: epoch,
        nonce: nonce,
        user_tree_root: ustRoot,
        identity_nullifier: id.identityNullifier,
        identity_trapdoor: id.trapdoor,
        GST_path_elements: proof.siblings,
        GST_path_index: proof.pathIndices,
        GST_root: root,
    }
    return crypto.stringifyBigInts(circuitInputs)
}

const bootstrapRandomUSTree = async (): Promise<crypto.SparseMerkleTree> => {
    const expectedNumAttestationsMade = 5
    const userStateTree = await genNewUserStateTree()
    let reputationRecords = {}
    // Bootstrap user state for the first `expectedNumAttestationsMade` attesters
    for (let i = 1; i < expectedNumAttestationsMade; i++) {
        const attesterId = BigInt(
            Math.ceil(Math.random() * (2 ** config.userStateTreeDepth - 1))
        )
        if (reputationRecords[attesterId.toString()] === undefined) {
            const signUp = Math.floor(Math.random() * 2)
            reputationRecords[attesterId.toString()] = new Reputation(
                BigInt(Math.floor(Math.random() * 100)),
                BigInt(Math.floor(Math.random() * 100)),
                crypto.genRandomSalt(),
                BigInt(signUp)
            )
        }
        await userStateTree.update(
            BigInt(attesterId),
            reputationRecords[attesterId.toString()].hash()
        )
    }
    return userStateTree
}

const genProcessAttestationsCircuitInput = async (
    id: crypto.ZkIdentity,
    epoch: BigInt,
    fromNonce: BigInt,
    toNonce: BigInt,
    _selectors?: number[],
    _hashChainStarter?: BigInt,
    _attestations?: Attestation[]
) => {
    const oldPosReps: BigInt[] = []
    const oldNegReps: BigInt[] = []
    const oldGraffities: BigInt[] = []
    const oldSignUps: BigInt[] = []
    const attesterIds: BigInt[] = []
    const posReps: BigInt[] = []
    const negReps: BigInt[] = []
    const overwriteGraffitis: BigInt[] = []
    const graffities: BigInt[] = []
    const signUps: BigInt[] = []
    let selectors: number[] = []
    const hashChainStarter =
        _hashChainStarter === undefined
            ? crypto.genRandomSalt()
            : _hashChainStarter
    const intermediateUserStateTreeRoots: BigInt[] = []
    const userStateTreePathElements: BigInt[][] = []

    const userStateTree = await genNewUserStateTree()
    let reputationRecords = {}

    // Bootstrap user state
    for (let i = 0; i < config.numAttestationsPerProof; i++) {
        // attester ID cannot be 0
        const attesterId = BigInt(
            Math.ceil(Math.random() * (2 ** config.userStateTreeDepth - 1))
        )
        if (reputationRecords[attesterId.toString()] === undefined) {
            const signUp = Math.floor(Math.random() * 2)
            reputationRecords[attesterId.toString()] = new Reputation(
                BigInt(Math.floor(Math.random() * 100)),
                BigInt(Math.floor(Math.random() * 100)),
                crypto.genRandomSalt(),
                BigInt(signUp)
            )
        }
        await userStateTree.update(
            attesterId,
            reputationRecords[attesterId.toString()].hash()
        )
    }
    intermediateUserStateTreeRoots.push(userStateTree.root)

    // Ensure as least one of the selectors is true
    const selTrue = Math.floor(Math.random() * config.numAttestationsPerProof)
    for (let i = 0; i < config.numAttestationsPerProof; i++) {
        if (i == selTrue) selectors.push(1)
        else selectors.push(Math.floor(Math.random() * 2))
    }
    if (_selectors !== undefined) selectors = _selectors

    let hashChainResult = hashChainStarter
    for (let i = 0; i < config.numAttestationsPerProof; i++) {
        let attesterId
        let attestation: Attestation
        if (_attestations === undefined) {
            // attester ID cannot be 0
            attesterId = BigInt(
                Math.ceil(Math.random() * (2 ** config.userStateTreeDepth - 1))
            )
            const signUp = Math.floor(Math.random() * 2)
            attestation = new Attestation(
                attesterId,
                BigInt(Math.floor(Math.random() * 100)),
                BigInt(Math.floor(Math.random() * 100)),
                BigInt(0),
                BigInt(signUp)
            )
        } else {
            attesterId = _attestations[i].attesterId
            attestation = _attestations[i]
        }

        attesterIds.push(attesterId)
        posReps.push(attestation['posRep'])
        negReps.push(attestation['negRep'])
        graffities.push(attestation['graffiti'])
        signUps.push(attestation['signUp'])
        overwriteGraffitis.push(BigInt(attestation['graffiti'] != BigInt(0)))
        if (reputationRecords[attesterId.toString()] === undefined) {
            reputationRecords[attesterId.toString()] = Reputation.default()
        }

        if (selectors[i] == 1) {
            oldPosReps.push(reputationRecords[attesterId.toString()]['posRep'])
            oldNegReps.push(reputationRecords[attesterId.toString()]['negRep'])
            oldGraffities.push(
                reputationRecords[attesterId.toString()]['graffiti']
            )
            oldSignUps.push(reputationRecords[attesterId.toString()]['signUp'])

            // Get old reputation record proof
            const oldReputationRecordProof = await userStateTree.createProof(
                attesterId
            )
            userStateTreePathElements.push(oldReputationRecordProof)

            // Update reputation record
            reputationRecords[attesterId.toString()].update(
                attestation['posRep'],
                attestation['negRep'],
                attestation['graffiti'],
                attestation['signUp']
            )

            await userStateTree.update(
                attesterId,
                reputationRecords[attesterId.toString()].hash()
            )

            const attestation_hash = attestation.hash()
            hashChainResult = crypto.hashLeftRight(
                attestation_hash,
                hashChainResult
            )
        } else {
            oldPosReps.push(BigInt(0))
            oldNegReps.push(BigInt(0))
            oldGraffities.push(BigInt(0))
            oldSignUps.push(BigInt(0))

            const leafZeroPathElements = await userStateTree.createProof(
                BigInt(0)
            )
            userStateTreePathElements.push(leafZeroPathElements)
        }

        intermediateUserStateTreeRoots.push(userStateTree.root)
    }
    const inputBlindedUserState = crypto.hash5([
        id.identityNullifier,
        intermediateUserStateTreeRoots[0],
        epoch,
        fromNonce,
    ])

    const circuitInputs = {
        epoch: epoch,
        from_nonce: fromNonce,
        to_nonce: toNonce,
        identity_nullifier: id.identityNullifier,
        intermediate_user_state_tree_roots: intermediateUserStateTreeRoots,
        old_pos_reps: oldPosReps,
        old_neg_reps: oldNegReps,
        old_graffities: oldGraffities,
        old_sign_ups: oldSignUps,
        path_elements: userStateTreePathElements,
        attester_ids: attesterIds,
        pos_reps: posReps,
        neg_reps: negReps,
        graffities: graffities,
        overwrite_graffities: overwriteGraffitis,
        sign_ups: signUps,
        selectors: selectors,
        hash_chain_starter: hashChainStarter,
        input_blinded_user_state: inputBlindedUserState,
    }
    return {
        circuitInputs: crypto.stringifyBigInts(circuitInputs),
        hashChainResult: hashChainResult,
    }
}

const genUserStateTransitionCircuitInput = async (
    id: crypto.ZkIdentity,
    epoch: number
) => {
    // config
    const startEpochKeyNonce = Math.floor(
        Math.random() * config.numEpochKeyNoncePerEpoch
    )
    const endEpochKeyNonce =
        (startEpochKeyNonce + config.numEpochKeyNoncePerEpoch - 1) %
        config.numEpochKeyNoncePerEpoch

    // Epoch tree
    const epochTree = genNewEpochTree()

    // User state tree
    const userStateTree = await bootstrapRandomUSTree()
    const intermediateUserStateTreeRoots: BigInt[] = []
    const blindedUserState: BigInt[] = []
    const blindedHashChain: BigInt[] = []
    const epochTreePathElements: BigInt[][] = []

    intermediateUserStateTreeRoots.push(userStateTree.root)
    blindedUserState.push(
        crypto.hash5([
            id.identityNullifier,
            userStateTree.root,
            BigInt(epoch),
            BigInt(startEpochKeyNonce),
        ])
    )

    // Global state tree
    const GSTree = new crypto.IncrementalMerkleTree(config.globalStateTreeDepth)
    const commitment = id.genIdentityCommitment()
    const hashedLeaf = crypto.hashLeftRight(commitment, userStateTree.root)
    GSTree.insert(hashedLeaf)
    const GSTreeProof = GSTree.createProof(0)
    const GSTreeRoot = GSTree.root

    const hashChainResults: BigInt[] = []
    // Begin generating and processing attestations
    for (let nonce = 0; nonce < config.numEpochKeyNoncePerEpoch; nonce++) {
        // Each epoch key has `ATTESTATIONS_PER_EPOCH_KEY` of attestations so
        // interval between starting index of each epoch key is `ATTESTATIONS_PER_EPOCH_KEY`.
        const epochKey = genEpochKey(
            id.identityNullifier,
            epoch,
            nonce,
            config.epochTreeDepth
        )
        const hashChainResult = crypto.genRandomSalt()

        // Blinded hash chain result
        hashChainResults.push(hashChainResult)
        blindedHashChain.push(
            crypto.hash5([
                id.identityNullifier,
                hashChainResult,
                BigInt(epoch),
                BigInt(nonce),
            ])
        )

        // Seal hash chain of this epoch key
        const sealedHashChainResult = crypto.hashLeftRight(
            BigInt(1),
            hashChainResult
        )

        // Update epoch tree
        await epochTree.update(epochKey, sealedHashChainResult)
    }

    const intermediateUserStateTreeRoot = crypto.genRandomSalt()
    intermediateUserStateTreeRoots.push(intermediateUserStateTreeRoot)
    blindedUserState.push(
        crypto.hash5([
            id.identityNullifier,
            intermediateUserStateTreeRoot,
            BigInt(epoch),
            BigInt(endEpochKeyNonce),
        ])
    )

    for (let nonce = 0; nonce < config.numEpochKeyNoncePerEpoch; nonce++) {
        const epochKey = genEpochKey(
            id.identityNullifier,
            epoch,
            nonce,
            config.epochTreeDepth
        )
        // Get epoch tree root and merkle proof for this epoch key
        epochTreePathElements.push(await epochTree.createProof(epochKey))
    }
    const epochTreeRoot = epochTree.root

    const circuitInputs = {
        epoch: epoch,
        blinded_user_state: blindedUserState,
        intermediate_user_state_tree_roots: intermediateUserStateTreeRoots,
        start_epoch_key_nonce: startEpochKeyNonce,
        end_epoch_key_nonce: endEpochKeyNonce,
        identity_nullifier: id.identityNullifier,
        identity_trapdoor: id.trapdoor,
        GST_path_elements: GSTreeProof.siblings,
        GST_path_index: GSTreeProof.pathIndices,
        GST_root: GSTreeRoot,
        epk_path_elements: epochTreePathElements,
        hash_chain_results: hashChainResults,
        blinded_hash_chain_results: blindedHashChain,
        epoch_tree_root: epochTreeRoot,
    }
    return crypto.stringifyBigInts(circuitInputs)
}

const genReputationCircuitInput = async (
    id: crypto.ZkIdentity,
    epoch: number,
    nonce: number,
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
    const graffitiPreImage =
        _graffitiPreImage === undefined ? 0 : _graffitiPreImage

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
    const GSTree = new crypto.IncrementalMerkleTree(config.globalStateTreeDepth)
    const commitment = id.genIdentityCommitment()
    const hashedLeaf = crypto.hashLeftRight(commitment, userStateRoot)
    GSTree.insert(hashedLeaf)
    const GSTreeProof = GSTree.createProof(0) // if there is only one GST leaf, the index is 0
    const GSTreeRoot = GSTree.root

    // selectors and karma nonce
    const nonceStarter = 0
    const selectors: BigInt[] = []
    const nonceList: BigInt[] = []
    for (let i = 0; i < repNullifiersAmount; i++) {
        nonceList.push(BigInt(nonceStarter + i))
        selectors.push(BigInt(1))
    }
    for (let i = repNullifiersAmount; i < config.maxReputationBudget; i++) {
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
    return crypto.stringifyBigInts(circuitInputs)
}

const genProveSignUpCircuitInput = async (
    id: crypto.ZkIdentity,
    epoch: number,
    reputationRecords,
    attesterId,
    _signUp?: number
) => {
    const nonce = 0
    const epk = genEpochKey(id.identityNullifier, epoch, nonce)

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
    const GSTree = new crypto.IncrementalMerkleTree(config.globalStateTreeDepth)
    const commitment = id.genIdentityCommitment()
    const hashedLeaf = crypto.hashLeftRight(commitment, userStateRoot)
    GSTree.insert(hashedLeaf)
    const GSTreeProof = GSTree.createProof(0) // if there is only one GST leaf, the index is 0
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
    return crypto.stringifyBigInts(circuitInputs)
}

const genProofAndVerify = async (circuit: CircuitName, circuitInputs) => {
    const startTime = new Date().getTime()
    const { proof, publicSignals } = await UnirepCircuit.genProof(
        exportBuildPath,
        circuit,
        circuitInputs
    )
    const endTime = new Date().getTime()
    console.log(
        `Gen Proof time: ${endTime - startTime} ms (${Math.floor(
            (endTime - startTime) / 1000
        )} s)`
    )
    const isValid = await UnirepCircuit.verifyProof(
        exportBuildPath,
        circuit,
        proof,
        publicSignals
    )
    return isValid
}

const genEpochKeyNullifier = (
    identityNullifier: crypto.SnarkBigInt,
    epoch: number,
    nonce: number
): crypto.SnarkBigInt => {
    return crypto.hash5([
        EPOCH_KEY_NULLIFIER_DOMAIN,
        identityNullifier,
        BigInt(epoch),
        BigInt(nonce),
        BigInt(0),
    ])
}

const throwError = async (
    circuit: any,
    circuitInputs: any,
    errorMsg: string
) => {
    let error
    try {
        await UnirepCircuit.executeCircuit(circuit, circuitInputs)
    } catch (e) {
        error = e
        expect(true).to.be.true
    } finally {
        if (!error) throw Error(errorMsg)
    }
}

export {
    Attestation,
    Reputation,
    SMT_ONE_LEAF,
    SMT_ZERO_LEAF,
    UnirepCircuit,
    computeEmptyUserStateRoot,
    defaultUserStateLeaf,
    genNewEpochTree,
    genNewUserStateTree,
    genNewSMT,
    toCompleteHexString,
    genEpochKey,
    bootstrapRandomUSTree,
    genEpochKeyCircuitInput,
    genStartTransitionCircuitInput,
    genProcessAttestationsCircuitInput,
    genUserStateTransitionCircuitInput,
    genReputationCircuitInput,
    genProveSignUpCircuitInput,
    genEpochKeyNullifier,
    genProofAndVerify,
    throwError,
}
