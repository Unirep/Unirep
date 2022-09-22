import path from 'path'
import { exit } from 'process'
import { executeTimeOf } from './baseScript'
import * as crypto from '@unirep/crypto'

import { MAX_REPUTATION_BUDGET } from '../../config'

import { genReputationCircuitInput, Reputation } from '../../test/utils'

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
    for (let gst = 10; gst <= 32; gst += 2) {
        const ust = 27
        console.log(
            `Benchmark for reputation proof (with gst = ${gst}, ust = ${ust}): ${await executeTimeOf(
                'proveRep',
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

function getInput(gst: number, ust: number) {
    const r = new Reputation(
        BigInt(100),
        BigInt(10),
        BigInt(289891289),
        BigInt(1)
    )

    const attesterId = 1
    const epoch = 1
    const nonce = 1
    const inputs = genReputationCircuitInput(
        new crypto.ZkIdentity(),
        epoch,
        nonce,
        {
            1: r,
        },
        attesterId,
        0,
        0,
        0,
        0,
        gst,
        MAX_REPUTATION_BUDGET,
        ust
    )
    return inputs
}
