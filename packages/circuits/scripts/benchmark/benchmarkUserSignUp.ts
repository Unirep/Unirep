import path from 'path'
import { exit } from 'process'
import { executeTimeOf } from './baseScript'
import * as crypto from '@unirep/crypto'

import { MAX_REPUTATION_BUDGET } from '../../config'

import {
    genProveSignUpCircuitInput,
    genReputationCircuitInput,
    Reputation,
} from '../../test/utils'

function createProveUserSignUp(
    GST_tree_depth: number,
    UST_tree_depth: number,
    epoch_tree_depth: number,
    EPOCH_KEY_NONCE_PER_EPOCH: number
): string {
    const componentPath = path.join(
        __dirname,
        '../../circuits/proveUserSignUp.circom'
    )
    // GST_tree_depth, user_state_tree_depth, epoch_tree_depth, EPOCH_KEY_NONCE_PER_EPOCH, MAX_REPUTATION_BUDGET, MAX_REPUTATION_SCORE_BITS
    return `
        include "${componentPath}";
        component main = ProveUserSignUp(${GST_tree_depth}, ${UST_tree_depth},  ${epoch_tree_depth},${EPOCH_KEY_NONCE_PER_EPOCH});
    `
}

const EPOCH_TREE_DEPTH = 252

async function main() {
    for (let gst = 10; gst <= 32; gst += 2) {
        const ust = 27
        console.log(
            `Benchmark for reputation proof (with gst = ${gst}, ust = ${ust}): ${await executeTimeOf(
                'signupUser',
                createProveUserSignUp(gst, ust, EPOCH_TREE_DEPTH, 3),
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
    const inputs = genProveSignUpCircuitInput(
        new crypto.ZkIdentity(),
        epoch,
        {
            1: r,
        },
        attesterId,
        gst,
        ust
    )
    return inputs
}
