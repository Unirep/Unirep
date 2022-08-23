import {
    genRandomSalt,
    hashLeftRight,
    IncrementalMerkleTree,
    ZkIdentity,
} from '@unirep/crypto'
import path from 'path'
import { exit } from 'process'
import { genEpochKeyCircuitInput } from '../../test/utils'
import { executeTimeOf } from './baseScript'

function createEKPCircuit(
    GST_tree_depth: number,
    epoch_tree_depth: number,
    EPOCH_KEY_NONCE_PER_EPOCH: number
): string {
    const componentPath = path.join(
        __dirname,
        '../../circuits/verifyEpochKey.circom'
    )
    return `
        include "${componentPath}";
        component main = VerifyEpochKey(${GST_tree_depth}, ${epoch_tree_depth}, ${EPOCH_KEY_NONCE_PER_EPOCH});
    `
}

async function main() {
    const EPOCH_KEY_NONCE_PER_EPOCH = 10
    const epoch_tree_depth = 64

    for (let gst = 10; gst <= 32; ++gst) {
        const tree = new IncrementalMerkleTree(gst)
        const id = new ZkIdentity()
        const commitment = id.genIdentityCommitment()
        const stateRoot = genRandomSalt()

        const hashedStateLeaf = hashLeftRight(
            commitment.toString(),
            stateRoot.toString()
        )
        tree.insert(BigInt(hashedStateLeaf.toString()))
        const leafIndex = 0
        const nonce = 0
        const currentEpoch = 1

        console.log(
            `Benchmark for epoch key proof (with gst = ${gst}): ${await executeTimeOf(
                'epochKeyProof',
                createEKPCircuit(
                    gst,
                    epoch_tree_depth,
                    EPOCH_KEY_NONCE_PER_EPOCH
                ),
                genEpochKeyCircuitInput,
                [id, tree, leafIndex, stateRoot, currentEpoch, nonce]
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
