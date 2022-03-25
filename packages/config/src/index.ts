/**
 * Default config use in unirep package
 */

import { ethers } from 'ethers'

export const ATTESTTING_FEE = ethers.utils.parseEther('0.1')

export const NUM_EPOCH_KEY_NONCE_PER_EPOCH = 3

export const NUM_ATTESTATIONS_PER_PROOF = 5

export const EPOCH_LENGTH = 30 // 30 seconds

export const CIRCUIT_GLOBAL_STATE_TREE_DEPTH = 4

export const CIRCUIT_USER_STATE_TREE_DEPTH = 4

export const CIRCUIT_EPOCH_TREE_DEPTH = 32

export const GLOBAL_STATE_TREE_DEPTH = CIRCUIT_GLOBAL_STATE_TREE_DEPTH

export const USER_STATE_TREE_DEPTH = CIRCUIT_USER_STATE_TREE_DEPTH

export const EPOCH_TREE_DEPTH = CIRCUIT_EPOCH_TREE_DEPTH

export const MAX_REPUTATION_BUDGET = 10

export const MAX_USERS = 2 ** CIRCUIT_GLOBAL_STATE_TREE_DEPTH - 1

export const MAX_ATTESTERS = 2 ** CIRCUIT_USER_STATE_TREE_DEPTH - 1
