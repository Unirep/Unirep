import { CircuitConfig } from '@unirep/circuits'
import { BigNumber } from 'ethers'

export type ContractConfig = {
    attestingFee: BigNumber
    epochLength: number
    maxUsers: number
    maxAttesters: number
} & CircuitConfig
