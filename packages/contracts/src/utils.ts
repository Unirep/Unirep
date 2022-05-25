import { BigNumber, ethers } from 'ethers'
import { UnirepABI } from './abis/Unirep'

const computeStartTransitionProofHash = (
    blindedUserState: BigNumber,
    blindedHashChain: BigNumber,
    globalStateTree: BigNumber,
    proof: BigNumber[]
) => {
    const iface = new ethers.utils.Interface(UnirepABI)
    const abiEncoder = iface.encodeFunctionData('hashStartTransitionProof', [
        blindedUserState,
        blindedHashChain,
        globalStateTree,
        proof,
    ])
    return ethers.utils.keccak256(rmFuncSigHash(abiEncoder))
}

const computeProcessAttestationsProofHash = (
    outputBlindedUserState: BigNumber,
    outputBlindedHashChain: BigNumber,
    inputBlindedUserState: BigNumber,
    proof: BigNumber[]
) => {
    const iface = new ethers.utils.Interface(UnirepABI)
    const abiEncoder = iface.encodeFunctionData(
        'hashProcessAttestationsProof',
        [
            outputBlindedUserState,
            outputBlindedHashChain,
            inputBlindedUserState,
            proof,
        ]
    )
    return ethers.utils.keccak256(rmFuncSigHash(abiEncoder))
}

const rmFuncSigHash = (abiEncoder: string) => {
    return '0x' + abiEncoder.slice(10)
}

export {
    computeStartTransitionProofHash,
    computeProcessAttestationsProofHash,
    rmFuncSigHash,
}
