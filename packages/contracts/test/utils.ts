// The reason for the ts-ignore below is that if we are executing the code via `ts-node` instead of `hardhat`,
// it can not read the hardhat config and error ts-2503 will be reported.
// @ts-ignore
import { hash2 } from '@unirep/crypto'
import { BigNumberish } from 'ethers'

export type Field = BigNumberish
export const defaultEpochTreeLeaf = hash2([0, 0])

export {}
