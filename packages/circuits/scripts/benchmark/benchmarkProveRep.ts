import {
    genRandomSalt,
    hashLeftRight,
    IncrementalMerkleTree,
    ZkIdentity,
} from '@unirep/crypto'
import path from 'path'
import { exit } from 'process'
import { executeTimeOf } from './baseScript'
import * as crypto from '@unirep/crypto'

import {
    MAX_REPUTATION_BUDGET,
    USER_STATE_TREE_DEPTH,
    GLOBAL_STATE_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
} from '../../config'

function createProveRepCircuit(
    GST_tree_depth: number,
    UST_tree_depth: number,
    epoch_tree_depth: number,
    EPOCH_KEY_NONCE_PER_EPOCH: number,
    MAX_REPUTATION_BUDGET: number,
    MAX_REPUTATION_SCORE_BITS: number
): string {
    const componentPath = path.join(
        __dirname,
        '../../circuits/proveReputation.circom'
    )
    // GST_tree_depth, user_state_tree_depth, epoch_tree_depth, EPOCH_KEY_NONCE_PER_EPOCH, MAX_REPUTATION_BUDGET, MAX_REPUTATION_SCORE_BITS
    return `
        include "${componentPath}";
        component main = ProveReputation(${GST_tree_depth}, ${UST_tree_depth},  ${epoch_tree_depth},${EPOCH_KEY_NONCE_PER_EPOCH}, ${MAX_REPUTATION_BUDGET}, ${MAX_REPUTATION_SCORE_BITS});
    `
}

const EPOCH_TREE_DEPTH = 252

async function main() {
    for (let gst = 10; gst <= 32; ++gst) {
        const ust = 27
        console.log(
            `Benchmark for reputation proof (with gst = ${gst}, ust = ${ust}): ${await executeTimeOf(
                'epochKeyProof',
                createProveRepCircuit(gst, ust, EPOCH_TREE_DEPTH, 3, 10, 252),
                getInput,
                [gst, ust]
            )}`
        )
    }
}

main()
    .then(() => {
        exit(0)
    })
    .catch((e) => {
        console.log(e)
        exit(1)
    })

function genReputationCircuitInput(
    id: crypto.ZkIdentity,
    epoch: number,
    nonce: number,
    reputationRecords,
    attesterId,
    gstDepth,
    ustDepth
) {
    const epk = genEpochKey(id.identityNullifier, epoch, nonce)
    const repNullifiersAmount = 0
    const minRep = 0
    const proveGraffiti = 0
    let graffitiPreImage
    graffitiPreImage = 0
    if (reputationRecords[attesterId] === undefined) {
        reputationRecords[attesterId] = Reputation.default()
    }

    // User state tree
    const userStateTree = genNewUserStateTree(ustDepth)
    for (const attester of Object.keys(reputationRecords)) {
        userStateTree.update(
            BigInt(attester),
            reputationRecords[attester].hash()
        )
    }
    const userStateRoot = userStateTree.root
    const USTPathElements = userStateTree.createProof(BigInt(attesterId))

    // Global state tree
    const GSTree = new crypto.IncrementalMerkleTree(gstDepth)
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
        start_rep_nonce: nonceStarter,
        min_rep: minRep,
        prove_graffiti: proveGraffiti,
        graffiti_pre_image: graffitiPreImage,
    }
    return crypto.stringifyBigInts(circuitInputs)
}

class Reputation {
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
        if (crypto.hashOne(_graffitiPreImage) !== this.graffiti)
            throw new Error('Graffiti pre-image does not match')
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

const genEpochKey = (
    identityNullifier: BigInt,
    epoch: number,
    nonce: number,
    _epochTreeDepth: number = EPOCH_TREE_DEPTH
): BigInt => {
    const epochKey = crypto
        .hash2([(identityNullifier as any) + BigInt(nonce), epoch])
        .valueOf()
    // Adjust epoch key size according to epoch tree depth
    const epochKeyModed = epochKey % BigInt(2 ** _epochTreeDepth)
    return epochKeyModed
}

const defaultUserStateLeaf = crypto.hash5([
    BigInt(0),
    BigInt(0),
    BigInt(0),
    BigInt(0),
    BigInt(0),
])

const genNewUserStateTree = (
    _userStateTreeDepth: number = USER_STATE_TREE_DEPTH
) => {
    return new crypto.SparseMerkleTree(
        _userStateTreeDepth,
        defaultUserStateLeaf
    )
}

function getInput(gst, ust) {
    const r = new Reputation(
        BigInt(100),
        BigInt(10),
        BigInt(289891289),
        BigInt(1)
    )
    const inputs = genReputationCircuitInput(
        new crypto.ZkIdentity(),
        1,
        0,
        {
            1: r,
        },
        1,
        gst,
        ust
    )
    return inputs
}
