import * as path from 'path'
import * as fs from 'fs'
import * as circom from 'circom'
import * as snarkjs from 'snarkjs'
import * as utils from '@unirep/utils'
import * as fastFile from 'fastfile'
import { performance } from 'perf_hooks'
import { EPOCH_TREE_DEPTH, NUM_EPOCH_KEY_NONCE_PER_EPOCH } from '../config'

const dirpath = fs.mkdtempSync('/tmp/unirep')

;(async () => {
    // proveRepuation circuit
    const circomPath = path.join(__dirname, proveReputationCircuitPath)
    const provePath = path.join(__dirname, '../circuits/proveReputation.circom')

    for (let x = 10; x <= 32; x += 2) {
        // create .circom file
        const GST = 27
        const UST = 9
        const testCircuitContent = `include "${provePath}" \n\ncomponent main = ProveReputation(${x}, ${UST}, ${EPOCH_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH}, ${MAX_REPUTATION_BUDGET}, 252)`
        fs.writeFileSync(circomPath, testCircuitContent)
        const r1cs = path.join(dirpath, 'proveRep.r1cs')
        const zkey = path.join(dirpath, 'proveRep.zkey')
        const wasmOut = path.join(dirpath, 'proveRep.wasm')

        // Compile the .circom file
        const options = {
            wasmFile: await fastFile.createOverride(wasmOut),
            r1csFileName: r1cs,
            // symWriteStream: fs.createWriteStream(symOut),
        }
        await circom.compiler(circomPath, options)
        // console.log('Generated', circuitOut, 'and', wasmOut)

        const ptau = path.join(
            __dirname,
            '../zksnarkBuild/powersOfTau28_hez_final_17.ptau'
        )
        await snarkjs.zKey.newZKey(r1cs, ptau, zkey)
        const vkeyJson = await snarkjs.zKey.exportVerificationKey(zkey)
        const TOTAL_RUNS = 5
        let totalTime = 0
        for (let y = -1; y < TOTAL_RUNS; y++) {
            const r = new Reputation(
                BigInt(100),
                BigInt(10),
                BigInt(289891289),
                BigInt(1)
            )
            const inputs = await genReputationCircuitInput(
                new utils.ZkIdentity(),
                1,
                0,
                {
                    1: r,
                },
                1,
                x,
                UST
            )
            const startTime = performance.now()
            const { proof, publicSignals } = await snarkjs.groth16.fullProve(
                inputs,
                wasmOut,
                zkey
            )
            // discard the first run to warm up the caches
            if (y > -1) {
                totalTime += +performance.now() - startTime
            }
            const isValid = await snarkjs.groth16.verify(
                vkeyJson,
                publicSignals,
                proof
            )
            if (!isValid) throw new Error('invalid')
        }
        const average = Math.floor(totalTime / TOTAL_RUNS)
        console.log(
            `GST depth ${x}, UST depth ${UST}: ${average} ms (${
                average / 1000
            } s)`
        )
    }
    process.exit()
})()

function genReputationCircuitInput(
    id: utils.ZkIdentity,
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
    const stateTree = new utils.IncrementalMerkleTree(gstDepth)
    const commitment = id.genIdentityCommitment()
    const hashedLeaf = utils.hashLeftRight(commitment, userStateRoot)
    stateTree.insert(hashedLeaf)
    const stateTreeProof = stateTree.createProof(0) // if there is only one GST leaf, the index is 0
    const stateTreeRoot = stateTree.root

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
        GST_path_index: stateTreeProof.pathIndices,
        GST_path_elements: stateTreeProof.siblings,
        GST_root: stateTreeRoot,
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
    return utils.stringifyBigInts(circuitInputs)
}

class Reputation {
    public posRep: bigint
    public negRep: bigint
    public graffiti: bigint
    public graffitiPreImage: bigint = BigInt(0)
    public signUp: bigint

    constructor(
        _posRep: bigint,
        _negRep: bigint,
        _graffiti: bigint,
        _signUp: bigint
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
        _posRep: bigint,
        _negRep: bigint,
        _graffiti: bigint,
        _signUp: bigint
    ): Reputation => {
        this.posRep = this.posRep + _posRep
        this.negRep = this.negRep + _negRep
        if (_graffiti != BigInt(0)) {
            this.graffiti = _graffiti
        }
        this.signUp = this.signUp || _signUp
        return this
    }

    public addGraffitiPreImage = (_graffitiPreImage: bigint) => {
        if (utils.hashOne(_graffitiPreImage) !== this.graffiti)
            throw new Error('Graffiti pre-image does not match')
        this.graffitiPreImage = _graffitiPreImage
    }

    public hash = (): bigint => {
        return utils.hash5([
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
    identityNullifier: bigint,
    epoch: number,
    nonce: number,
    _epochTreeDepth: number = EPOCH_TREE_DEPTH
): bigint => {
    const epochKey = utils.hash2([identityNullifier + BigInt(nonce), epoch])
    // Adjust epoch key size according to epoch tree depth
    const epochKeyModed = epochKey % BigInt(2 ** _epochTreeDepth)
    return epochKeyModed
}

const defaultUserStateLeaf = utils.hash5([
    BigInt(0),
    BigInt(0),
    BigInt(0),
    BigInt(0),
    BigInt(0),
])

const genNewUserStateTree = (
    _userStateTreeDepth: number = USER_STATE_TREE_DEPTH
) => {
    return new utils.SparseMerkleTree(_userStateTreeDepth, defaultUserStateLeaf)
}
