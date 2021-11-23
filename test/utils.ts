// The reason for the ts-ignore below is that if we are executing the code via `ts-node` instead of `hardhat`,
// it can not read the hardhat config and error ts-2503 will be reported.
// @ts-ignore
import { ethers } from 'ethers'
import Keyv from "keyv"
import { IncrementalQuinTree, hash5, hashLeftRight, SparseMerkleTreeImpl, add0x } from '@unirep/crypto'
import { circuitEpochTreeDepth, circuitUserStateTreeDepth, epochTreeDepth, userStateTreeDepth} from '../config/testLocal'

const toCompleteHexString = (str: string, len?: number): string => {
    str = add0x(str)
    if (len) str = ethers.utils.hexZeroPad(str, len)
    return str
}

const SMT_ZERO_LEAF = hashLeftRight(BigInt(0), BigInt(0))
const SMT_ONE_LEAF = hashLeftRight(BigInt(1), BigInt(0))

const genNewSMT = async (treeDepth: number, defaultLeafHash: BigInt): Promise<SparseMerkleTreeImpl> => {
    return SparseMerkleTreeImpl.create(
        new Keyv(),
        treeDepth,
        defaultLeafHash,
    )
}

const genNewEpochTree = async (deployEnv: string = "contract"): Promise<SparseMerkleTreeImpl> => {
    let _epochTreeDepth
    if (deployEnv === 'contract') {
        _epochTreeDepth = epochTreeDepth
    } else if (deployEnv === 'circuit') {
        _epochTreeDepth = circuitEpochTreeDepth
    } else {
        throw new Error('Only contract and circuit testing env are supported')
    }
    const defaultOTSMTHash = SMT_ONE_LEAF
    return genNewSMT(_epochTreeDepth, defaultOTSMTHash)
}

const defaultUserStateLeaf = hash5([BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0)])

const computeEmptyUserStateRoot = (treeDepth: number): BigInt => {
    const t = new IncrementalQuinTree(
        treeDepth,
        defaultUserStateLeaf,
        2,
    )
    return t.root
}    

const genNewUserStateTree = async (deployEnv: string = "contract"): Promise<SparseMerkleTreeImpl> => {
    let _userStateTreeDepth
    if (deployEnv === 'contract') {
        _userStateTreeDepth = userStateTreeDepth
    } else if (deployEnv === 'circuit') {
        _userStateTreeDepth = circuitUserStateTreeDepth
    } else {
        throw new Error('Only contract and circuit testing env are supported')
    }

    return genNewSMT(_userStateTreeDepth, defaultUserStateLeaf)
}

const computeEpochKeyProofHash = (epochKeyProof: any) => {
    const abiEncoder = ethers.utils.defaultAbiCoder.encode([ "uint256", "uint256", "uint256", "uint256[8]" ], epochKeyProof)
    return ethers.utils.keccak256(abiEncoder)
}

const verifyNewGSTProofByIndex = async(unirepContract: ethers.Contract, proofIndex: number | ethers.BigNumber): Promise<ethers.Event | undefined> => {
    const signUpFilter = unirepContract.filters.UserSignUp(proofIndex)
    const signUpEvents = await unirepContract.queryFilter(signUpFilter)
    // found user sign up event, then continue
    if (signUpEvents.length == 1) return signUpEvents[0]

    // 2. verify user state transition proof
    const transitionFilter = unirepContract.filters.UserStateTransitionProof(proofIndex)
    const transitionEvents = await unirepContract.queryFilter(transitionFilter)
    if(transitionEvents.length == 0) return
    // proof index is supposed to be unique, therefore it should be only one event found
    const transitionArgs = transitionEvents[0]?.args?.userTransitionedData
    // backward verification
    const isValid = await unirepContract.verifyUserStateTransition(
        transitionArgs.newGlobalStateTreeLeaf,
        transitionArgs.epkNullifiers,
        transitionArgs.transitionFromEpoch,
        transitionArgs.blindedUserStates,
        transitionArgs.fromGlobalStateTree,
        transitionArgs.blindedHashChains,
        transitionArgs.fromEpochTree,
        transitionArgs.proof,
    )
    if(!isValid) return
    
    const _proofIndexes = transitionEvents[0]?.args?._proofIndexRecords
    // Proof index 0 should be the start transition proof
    const startTransitionFilter = unirepContract.filters.StartedTransitionProof(_proofIndexes[0], transitionArgs.blindedUserStates[0], transitionArgs.fromGlobalStateTree)
    const startTransitionEvents = await unirepContract.queryFilter(startTransitionFilter)
    if(startTransitionEvents.length == 0) return

    const startTransitionArgs = startTransitionEvents[0]?.args
    const isStartTransitionProofValid = await unirepContract.verifyStartTransitionProof(
        startTransitionArgs?._blindedUserState,
        startTransitionArgs?._blindedHashChain,
        startTransitionArgs?._globalStateTree,
        startTransitionArgs?._proof,
    )
    if(!isStartTransitionProofValid) return

    // process attestations proofs
    const isProcessAttestationValid = await verifyProcessAttestationEvents(unirepContract, transitionArgs.blindedUserStates[0], transitionArgs.blindedUserStates[1], _proofIndexes)
    if(!isProcessAttestationValid) return

    return transitionEvents[0]
}


const verifyNewGSTLeafEvents = async(unirepContract: ethers.Contract, currentEpoch: number | ethers.BigNumber): Promise<BigInt[]> => {
    const newLeafFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
    const newLeafEvents = await unirepContract.queryFilter(newLeafFilter)

    const newLeaves: BigInt[] = []
    for(const event of newLeafEvents){
        const args = event?.args
        const proofIndex = args?._proofIndex
        
        // New leaf events are from user sign up and user state transition
        // 1. check user sign up
        const isProofValid = await verifyNewGSTProofByIndex(unirepContract, proofIndex)

        // all verification is done
        if (isProofValid){
            newLeaves.push(BigInt(args?._hashedLeaf))
        }
    }

    return newLeaves
}

const verifyProcessAttestationEvents = async(unirepContract: ethers.Contract, startBlindedUserState: ethers.BigNumber, finalBlindedUserState: ethers.BigNumber, _proofIndexes: ethers.BigNumber[]): Promise<boolean> => {

    let currentBlindedUserState = startBlindedUserState
    // The rest are process attestations proofs
    for (let i = 1; i < _proofIndexes.length; i++) {
        const processAttestationsFilter = unirepContract.filters.ProcessedAttestationsProof(_proofIndexes[i], currentBlindedUserState)
        const processAttestationsEvents = await unirepContract.queryFilter(processAttestationsFilter)
        if(processAttestationsEvents.length == 0) return false

        const args = processAttestationsEvents[0]?.args
        const isValid = await unirepContract.verifyProcessAttestationProof(
            args?._outputBlindedUserState,
            args?._outputBlindedHashChain,
            args?._inputBlindedUserState,
            args?._proof
        )
        if(!isValid) return false
        currentBlindedUserState = args?._outputBlindedUserState
    }
    return currentBlindedUserState.eq(finalBlindedUserState)
}

export {
    SMT_ONE_LEAF,
    SMT_ZERO_LEAF,
    computeEmptyUserStateRoot,
    defaultUserStateLeaf,
    genNewEpochTree,
    genNewUserStateTree,
    genNewSMT,
    toCompleteHexString,
    computeEpochKeyProofHash,
    verifyNewGSTProofByIndex,
    verifyNewGSTLeafEvents,
    verifyProcessAttestationEvents,
}