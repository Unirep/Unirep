import { utils, BigNumber, BigNumberish } from 'ethers'
import { hash5, SnarkProof } from '@unirep/crypto'
import {
    Circuit,
    formatProofForSnarkjsVerification,
    formatProofForVerifierContract,
    Prover,
} from '@unirep/circuits'

import {
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    MAX_REPUTATION_BUDGET,
} from '@unirep/circuits'

enum Event {
    UserSignedUp,
    UserStateTransitioned,
    AttestationSubmitted,
    EpochEnded,
}

enum AttestationEvent {
    SendAttestation,
    Airdrop,
    SpendReputation,
}

interface IAttestation {
    attesterId: BigNumber
    posRep: BigNumber
    negRep: BigNumber
    graffiti: BigNumber
    signUp: BigNumber
    hash(): BigInt
}

interface IEpochKeyProof {
    globalStateTree: BigNumberish
    epoch: BigNumberish
    epochKey: BigNumberish
    proof: BigNumberish[]
}

interface IReputationProof {
    repNullifiers: BigNumberish[]
    epoch: BigNumberish
    epochKey: BigNumberish
    globalStateTree: BigNumberish
    attesterId: BigNumberish
    proveReputationAmount: BigNumberish
    minRep: BigNumberish
    proveGraffiti: BigNumberish
    graffitiPreImage: BigNumberish
    proof: BigNumberish[]
}

interface ISignUpProof {
    epoch: BigNumberish
    epochKey: BigNumberish
    globalStateTree: BigNumberish
    attesterId: BigNumberish
    userHasSignedUp: BigNumberish
    proof: BigNumberish[]
}

interface IUserTransitionProof {
    newGlobalStateTreeLeaf: BigNumberish
    epkNullifiers: BigNumberish[]
    transitionFromEpoch: BigNumberish
    blindedUserStates: BigNumberish[]
    fromGlobalStateTree: BigNumberish
    blindedHashChains: BigNumberish[]
    fromEpochTree: BigNumberish
    proof: BigNumberish[]
}

class BaseProof {
    readonly publicSignals: BigNumberish[]
    public proof: BigNumberish[]
    protected circuit?: Circuit
    public prover?: Prover

    constructor(
        publicSignals: BigNumberish[],
        proof: SnarkProof,
        prover?: Prover
    ) {
        const formattedProof: any[] = formatProofForVerifierContract(proof)
        this.proof = formattedProof
        this.publicSignals = publicSignals
        this.prover = prover
    }

    public async verify(): Promise<boolean> {
        if (!this.prover) {
            throw new Error('No prover set')
        }
        if (!this.circuit) {
            throw new Error('No circuit specified')
        }
        const proof_ = formatProofForSnarkjsVerification(
            this.proof.map((n) => n.toString())
        )
        return this.prover.verifyProof(
            this.circuit,
            this.publicSignals.map((n) => BigInt(n.toString())),
            proof_
        )
    }
}

class Attestation implements IAttestation {
    public attesterId: BigNumber
    public posRep: BigNumber
    public negRep: BigNumber
    public graffiti: BigNumber
    public signUp: BigNumber

    constructor(
        _attesterId: BigInt | BigNumberish,
        _posRep: BigInt | BigNumberish,
        _negRep: BigInt | BigNumberish,
        _graffiti: BigInt | BigNumberish,
        _signUp: BigInt | BigNumberish
    ) {
        this.attesterId = BigNumber.from(_attesterId)
        this.posRep = BigNumber.from(_posRep)
        this.negRep = BigNumber.from(_negRep)
        this.graffiti = BigNumber.from(_graffiti)
        this.signUp = BigNumber.from(_signUp)
    }

    public hash = (): BigInt => {
        return hash5([
            this.attesterId.toBigInt(),
            this.posRep.toBigInt(),
            this.negRep.toBigInt(),
            this.graffiti.toBigInt(),
            this.signUp.toBigInt(),
        ])
    }
}

// the struct EpochKeyProof in UnirepTypes
class EpochKeyProof extends BaseProof implements IEpochKeyProof {
    public globalStateTree: BigNumberish
    public epoch: BigNumberish
    public epochKey: BigNumberish

    constructor(
        _publicSignals: BigNumberish[],
        _proof: SnarkProof,
        prover?: Prover
    ) {
        super(_publicSignals, _proof, prover)
        this.globalStateTree = _publicSignals[0]
        this.epoch = _publicSignals[1]
        this.epochKey = _publicSignals[2]
        this.circuit = Circuit.verifyEpochKey
    }

    public hash() {
        const abiEncoder = utils.defaultAbiCoder.encode(
            [
                `tuple(
                    uint256 globalStateTree,
                    uint256 epoch,
                    uint256 epochKey,
                    uint256[8] proof
                  )
            `,
            ],
            [this]
        )
        return utils.keccak256(abiEncoder)
    }
}

class ReputationProof extends BaseProof implements IReputationProof {
    public repNullifiers: BigNumberish[]
    public epoch: BigNumberish
    public epochKey: BigNumberish
    public globalStateTree: BigNumberish
    public attesterId: BigNumberish
    public proveReputationAmount: BigNumberish
    public minRep: BigNumberish
    public proveGraffiti: BigNumberish
    public graffitiPreImage: BigNumberish

    private maxReputationBudget: number

    constructor(
        _publicSignals: BigNumberish[],
        _proof: SnarkProof,
        prover?: Prover,
        maxRepBudget = MAX_REPUTATION_BUDGET
    ) {
        super(_publicSignals, _proof, prover)
        this.repNullifiers = _publicSignals.slice(0, maxRepBudget)
        this.epoch = _publicSignals[maxRepBudget]
        this.epochKey = _publicSignals[maxRepBudget + 1]
        this.globalStateTree = _publicSignals[maxRepBudget + 2]
        this.attesterId = _publicSignals[maxRepBudget + 3]
        this.proveReputationAmount = _publicSignals[maxRepBudget + 4]
        this.minRep = _publicSignals[maxRepBudget + 5]
        this.proveGraffiti = _publicSignals[maxRepBudget + 6]
        this.graffitiPreImage = _publicSignals[maxRepBudget + 7]
        this.circuit = Circuit.proveReputation
        this.maxReputationBudget = maxRepBudget
    }

    public hash() {
        // array length should be fixed
        const abiEncoder = utils.defaultAbiCoder.encode(
            [
                `tuple(uint256[${this.maxReputationBudget}] repNullifiers,
                    uint256 epoch,
                    uint256 epochKey,
                    uint256 globalStateTree,
                    uint256 attesterId,
                    uint256 proveReputationAmount,
                    uint256 minRep,
                    uint256 proveGraffiti,
                    uint256 graffitiPreImage,
                    uint256[8] proof)
            `,
            ],
            [this]
        )
        return utils.keccak256(abiEncoder)
    }
}

class SignUpProof extends BaseProof implements ISignUpProof {
    public epoch: BigNumberish
    public epochKey: BigNumberish
    public globalStateTree: BigNumberish
    public attesterId: BigNumberish
    public userHasSignedUp: BigNumberish

    constructor(
        _publicSignals: BigNumberish[],
        _proof: SnarkProof,
        prover?: Prover
    ) {
        super(_publicSignals, _proof, prover)
        this.epoch = _publicSignals[0]
        this.epochKey = _publicSignals[1]
        this.globalStateTree = _publicSignals[2]
        this.attesterId = _publicSignals[3]
        this.userHasSignedUp = _publicSignals[4]
        this.circuit = Circuit.proveUserSignUp
    }

    public hash() {
        const abiEncoder = utils.defaultAbiCoder.encode(
            [
                `tuple(
                    uint256 epoch,
                    uint256 epochKey,
                    uint256 globalStateTree,
                    uint256 attesterId,
                    uint256 userHasSignedUp,
                    uint256[8] proof
                  )
            `,
            ],
            [this]
        )
        return utils.keccak256(abiEncoder)
    }
}

class UserTransitionProof extends BaseProof implements IUserTransitionProof {
    public newGlobalStateTreeLeaf: BigNumberish
    public epkNullifiers: BigNumberish[]
    public transitionFromEpoch: BigNumberish
    public blindedUserStates: BigNumberish[]
    public fromGlobalStateTree: BigNumberish
    public blindedHashChains: BigNumberish[]
    public fromEpochTree: BigNumberish

    private numEpochKeyNoncePerEpoch: number

    constructor(
        _publicSignals: BigNumberish[],
        _proof: SnarkProof,
        prover?: Prover,
        numEpochKeyNoncePerEpoch = NUM_EPOCH_KEY_NONCE_PER_EPOCH
    ) {
        super(_publicSignals, _proof, prover)
        this.numEpochKeyNoncePerEpoch = numEpochKeyNoncePerEpoch
        this.newGlobalStateTreeLeaf = _publicSignals[0]
        this.epkNullifiers = []
        this.blindedUserStates = []
        this.blindedHashChains = []
        for (let i = 0; i < this.numEpochKeyNoncePerEpoch; i++) {
            this.epkNullifiers.push(_publicSignals[1 + i])
        }
        this.transitionFromEpoch =
            _publicSignals[1 + this.numEpochKeyNoncePerEpoch]
        this.blindedUserStates.push(
            _publicSignals[2 + this.numEpochKeyNoncePerEpoch]
        )
        this.blindedUserStates.push(
            _publicSignals[3 + this.numEpochKeyNoncePerEpoch]
        )
        this.fromGlobalStateTree =
            _publicSignals[4 + this.numEpochKeyNoncePerEpoch]
        for (let i = 0; i < this.numEpochKeyNoncePerEpoch; i++) {
            this.blindedHashChains.push(
                _publicSignals[5 + this.numEpochKeyNoncePerEpoch + i]
            )
        }
        this.fromEpochTree =
            _publicSignals[5 + this.numEpochKeyNoncePerEpoch * 2]
        this.circuit = Circuit.userStateTransition
    }

    public hash() {
        // array length should be fixed
        const abiEncoder = utils.defaultAbiCoder.encode(
            [
                `tuple(uint256 newGlobalStateTreeLeaf,
                    uint256[${this.numEpochKeyNoncePerEpoch}] epkNullifiers,
                    uint256 transitionFromEpoch,
                    uint256[2] blindedUserStates,
                    uint256 fromGlobalStateTree,
                    uint256[${this.numEpochKeyNoncePerEpoch}] blindedHashChains,
                    uint256 fromEpochTree,
                    uint256[8] proof)
            `,
            ],
            [this]
        )
        return utils.keccak256(abiEncoder)
    }
}

const computeStartTransitionProofHash = (
    blindedUserState: BigNumberish,
    blindedHashChain: BigNumberish,
    globalStateTree: BigNumberish,
    proof: BigNumberish[]
) => {
    const abiEncoder = utils.defaultAbiCoder.encode(
        [
            `tuple(
                    uint256 blindedUserState,
                    uint256 blindedHashChain,
                    uint256 globalStateTree,
                    uint256[8] memory proof
                )
            `,
        ],
        [{ blindedUserState, blindedHashChain, globalStateTree, proof }]
    )
    return utils.keccak256(abiEncoder)
}

const computeProcessAttestationsProofHash = (
    outputBlindedUserState: BigNumberish,
    outputBlindedHashChain: BigNumberish,
    inputBlindedUserState: BigNumberish,
    proof: BigNumberish[]
) => {
    const abiEncoder = utils.defaultAbiCoder.encode(
        [
            `tuple(
                    uint256 outputBlindedUserState,
                    uint256 outputBlindedHashChain,
                    uint256 inputBlindedUserState,
                    uint256[8] calldata proof
                )
            `,
        ],
        [
            {
                outputBlindedUserState,
                outputBlindedHashChain,
                inputBlindedUserState,
                proof,
            },
        ]
    )
    return utils.keccak256(abiEncoder)
}

export {
    Event,
    AttestationEvent,
    IAttestation,
    IEpochKeyProof,
    IReputationProof,
    ISignUpProof,
    IUserTransitionProof,
    Attestation,
    EpochKeyProof,
    ReputationProof,
    SignUpProof,
    UserTransitionProof,
    computeStartTransitionProofHash,
    computeProcessAttestationsProofHash,
}
