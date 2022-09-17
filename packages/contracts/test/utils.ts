// The reason for the ts-ignore below is that if we are executing the code via `ts-node` instead of `hardhat`,
// it can not read the hardhat config and error ts-2503 will be reported.
// @ts-ignore
import { BigNumberish } from 'ethers'
import * as crypto from '@unirep/crypto'
import { Circuit, formatProofForVerifierContract } from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

export type Field = BigNumberish

export {}
