// The reason for the ts-ignore below is that if we are executing the code via `ts-node` instead of `hardhat`,
// it can not read the hardhat config and error ts-2503 will be reported.
// @ts-ignore
import assert from 'assert'
import { ethers } from 'ethers'
import * as circom from 'circom'
import * as crypto from '@unirep/crypto'

import {
    executeCircuit,
    Circuit,
    EPOCH_TREE_DEPTH,
    GLOBAL_STATE_TREE_DEPTH,
    NUM_ATTESTATIONS_PER_PROOF,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    VerifyEpochKeyInput,
    ProveReputationInput,
    ProveUserSignUpInput,
    CircuitInput,
} from '../src'
import { defaultProver } from '../provers/defaultProver'
import { expect } from 'chai'

const SMT_ZERO_LEAF = crypto.hashLeftRight(BigInt(0), BigInt(0))
const SMT_ONE_LEAF = crypto.hashLeftRight(BigInt(1), BigInt(0))

interface IAttestation {
    attesterId: BigInt
    posRep: BigInt
    negRep: BigInt
    graffiti: BigInt
    signUp: BigInt
    hash: BigInt | string
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

    get hash() {
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
    signUp: BigInt
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

const toCompleteHexString = (str: string, len?: number): string => {
    str = str.startsWith('0x') ? str : '0x' + str
    if (len) str = ethers.utils.hexZeroPad(str, len)
    return str
}

const genNewSMT = (treeDepth: number, defaultLeafHash: BigInt = BigInt(0)) => {
    return new crypto.SparseMerkleTree(treeDepth, defaultLeafHash)
}

const genNewEpochTree = (_epochTreeDepth: number = EPOCH_TREE_DEPTH) => {
    const defaultLeaf = crypto.hash2([BigInt(0), BigInt(0)])
    return genNewSMT(_epochTreeDepth, defaultLeaf)
}

// TODO: needs to be updated
const genEpochKey = (
    identityNullifier: BigInt,
    attesterId: number,
    epoch: number,
    nonce: number,
    _epochTreeDepth: number = EPOCH_TREE_DEPTH
): BigInt => {
    const epochKey = crypto
        .hash4([identityNullifier as any, BigInt(attesterId), epoch, nonce])
        .valueOf()
    // Adjust epoch key size according to epoch tree depth
    const epochKeyModed = epochKey % BigInt(2 ** _epochTreeDepth)
    return epochKeyModed
}

const genEpochKeyCircuitInput = (config: {
    id: crypto.ZkIdentity
    tree: crypto.IncrementalMerkleTree
    leafIndex: number
    epoch: number
    nonce: number
    attesterId: number
    posRep: number
    negRep: number
}) => {
    const { id, tree, leafIndex, epoch, nonce, attesterId, posRep, negRep } =
        config
    const proof = tree.createProof(leafIndex)
    const circuitInputs = {
        gst_path_elements: proof.siblings,
        gst_path_index: proof.pathIndices,
        identity_nullifier: id.identityNullifier,
        nonce: nonce,
        epoch: epoch,
        pos_rep: posRep,
        neg_rep: negRep,
        attester_id: attesterId,
    }
    return crypto.stringifyBigInts(circuitInputs)
}

const genEpochTransitionCircuitInput = (config: {
    id: crypto.ZkIdentity
    fromEpoch: number
    toEpoch: number
    tree: crypto.IncrementalMerkleTree
    leafIndex: number
    attesterId: number
    startBalance: { posRep: any; negRep: any }
    epochKeyBalances?: { [key: string]: { posRep: number; negRep: number } }
}) => {
    const {
        id,
        fromEpoch,
        toEpoch,
        attesterId,
        startBalance,
        tree,
        leafIndex,
        epochKeyBalances,
    } = Object.assign(
        {
            epochKeyBalances: {},
        },
        config
    )
    const epochTree = genNewEpochTree(EPOCH_TREE_DEPTH)
    for (const [key, val] of Object.entries(epochKeyBalances)) {
        const { posRep, negRep } = val
        epochTree.update(BigInt(key), crypto.hash2([posRep, negRep]))
    }
    const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
        .fill(null)
        .map((_, i) =>
            genEpochKey(
                id.identityNullifier,
                attesterId,
                fromEpoch,
                i,
                EPOCH_TREE_DEPTH
            )
        )

    const GSTreeProof = tree.createProof(leafIndex)
    const circuitInputs = {
        from_epoch: fromEpoch,
        to_epoch: toEpoch,
        identity_nullifier: id.identityNullifier,
        GST_path_index: GSTreeProof.pathIndices,
        GST_path_elements: GSTreeProof.siblings,
        attester_id: attesterId,
        pos_rep: startBalance.posRep,
        neg_rep: startBalance.negRep,
        new_pos_rep: epochKeys.map(
            (k) => epochKeyBalances[k.toString()]?.posRep ?? BigInt(0)
        ),
        new_neg_rep: epochKeys.map(
            (k) => epochKeyBalances[k.toString()]?.negRep ?? BigInt(0)
        ),
        epoch_tree_elements: epochKeys.map((k) => epochTree.createProof(k)),
        epoch_tree_root: epochTree.root,
    }
    return crypto.stringifyBigInts(circuitInputs)
}

const genReputationCircuitInput = (config: {
    id: crypto.ZkIdentity
    epoch: number
    nonce: number
    attesterId: number
    startBalance: { posRep: any; negRep: any }
    minRep?: number
    epochKeyBalances?: { [key: string]: { posRep: number; negRep: number } }
}) => {
    const {
        id,
        epoch,
        nonce,
        attesterId,
        startBalance,
        minRep,
        epochKeyBalances,
    } = Object.assign(
        {
            epochKeyBalances: {},
            minRep: 0,
        },
        config
    )

    const epochTree = genNewEpochTree(EPOCH_TREE_DEPTH)
    for (const [key, val] of Object.entries(epochKeyBalances)) {
        const { posRep, negRep } = val
        epochTree.update(BigInt(key), crypto.hash2([posRep, negRep]))
    }
    const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
        .fill(null)
        .map((_, i) =>
            genEpochKey(
                id.identityNullifier,
                attesterId,
                epoch,
                i,
                EPOCH_TREE_DEPTH
            )
        )

    // Global state tree
    const GSTree = new crypto.IncrementalMerkleTree(GLOBAL_STATE_TREE_DEPTH)
    const hashedLeaf = crypto.hash5([
        id.identityNullifier,
        attesterId,
        epoch,
        startBalance.posRep,
        startBalance.negRep,
    ])
    GSTree.insert(hashedLeaf)
    const GSTreeProof = GSTree.createProof(0) // if there is only one GST leaf, the index is 0

    const circuitInputs = {
        epoch: epoch,
        epoch_key_nonce: nonce,
        identity_nullifier: id.identityNullifier,
        GST_path_index: GSTreeProof.pathIndices,
        GST_path_elements: GSTreeProof.siblings,
        attester_id: attesterId,
        pos_rep: startBalance.posRep,
        neg_rep: startBalance.negRep,
        min_rep: minRep,
        new_pos_rep: epochKeys.map(
            (k) => epochKeyBalances[k.toString()]?.posRep ?? BigInt(0)
        ),
        new_neg_rep: epochKeys.map(
            (k) => epochKeyBalances[k.toString()]?.negRep ?? BigInt(0)
        ),
        epoch_tree_elements: epochKeys.map((k) => epochTree.createProof(k)),
        epoch_tree_root: epochTree.root,
    }
    return crypto.stringifyBigInts(circuitInputs)
}

const genProofAndVerify = async (
    circuit: Circuit,
    circuitInputs: CircuitInput
) => {
    const startTime = new Date().getTime()
    const { proof, publicSignals } =
        await defaultProver.genProofAndPublicSignals(circuit, circuitInputs)
    const endTime = new Date().getTime()
    console.log(
        `Gen Proof time: ${endTime - startTime} ms (${Math.floor(
            (endTime - startTime) / 1000
        )} s)`
    )
    const isValid = await defaultProver.verifyProof(
        circuit,
        publicSignals,
        proof
    )
    return { isValid, proof, publicSignals }
}

const genEpochTransitionNullifier = (
    identityNullifier: BigInt,
    epoch: number,
    attesterId: number
): BigInt => {
    return crypto.hash3([
        BigInt(attesterId),
        BigInt(epoch),
        identityNullifier as any,
    ])
}

/*
 * @param circuitPath The subpath to the circuit file (e.g.
 *     test/userStateTransition_test.circom)
 */
const compileAndLoadCircuit = async (circuitPath: string) => {
    const circuit = await circom.tester(circuitPath)

    await circuit.loadSymbols()

    return circuit
}

const throwError = async (
    circuit: any,
    circuitInputs: any,
    errorMsg: string
) => {
    let error
    try {
        await executeCircuit(circuit, circuitInputs)
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
    genNewEpochTree,
    genNewSMT,
    toCompleteHexString,
    genEpochKey,
    genEpochKeyCircuitInput,
    genReputationCircuitInput,
    genEpochTransitionCircuitInput,
    genEpochTransitionNullifier,
    genProofAndVerify,
    compileAndLoadCircuit,
    throwError,
}
