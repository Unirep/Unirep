import { BigNumber, Event } from 'ethers'
import Keyv from 'keyv'
import path from 'path'
import circuit, { CircuitConfig, CircuitName } from '@unirep/circuits'
import {
    hash5,
    hashLeftRight,
    IncrementalMerkleTree,
    SnarkBigInt,
    SparseMerkleTree,
    SnarkProof,
    SnarkPublicSignals,
} from '@unirep/crypto'

import Reputation from './Reputation'

export class UnirepProtocol {
    static EPOCH_KEY_NULLIFIER_DOMAIN = BigInt(1)
    static REPUTATION_NULLIFIER_DOMAIN = BigInt(2)
    static DEFAULT_USER_LEAF = hash5([
        BigInt(0),
        BigInt(0),
        BigInt(0),
        BigInt(0),
        BigInt(0),
    ])
    static SMT_ZERO_LEAF = hashLeftRight(BigInt(0), BigInt(0))
    static SMT_ONE_LEAF = hashLeftRight(BigInt(1), BigInt(0))

    public config: CircuitConfig
    private zkFilesPath: string

    /**
     * Set Unirep protocol paramters from a given circuit directory path
     * @param _zkFilesPath The path to the circuit keys and config
     */
    constructor(_zkFilesPath: string) {
        this.zkFilesPath = _zkFilesPath
        this.config = require(path.join(this.zkFilesPath, 'config.json'))
    }

    /**
     * Compute epoch key from a given identity nullifier, epoch and epoch key nonce
     * @param idNullifier The identity nullifier of ZKIdentity
     * @param epoch The given epoch
     * @param nonce Given epoch key nonce
     * @returns Output the epoch key
     */
    public genEpochKey(
        idNullifier: SnarkBigInt,
        epoch: number | bigint,
        nonce: number | bigint
    ) {
        const values: any[] = [idNullifier, epoch, nonce, BigInt(0), BigInt(0)]
        let epochKey = hash5(values).toString()
        // Adjust epoch key size according to epoch tree depth
        const epochKeyModed =
            BigInt(epochKey) % BigInt(2 ** this.config.epochTreeDepth)
        return epochKeyModed
    }

    /**
     * Compute epoch key nullifier from a given identity nullifier, epoch and epoch key nonce
     * Epoch key nullifier is used to prevent double user state transition
     * @param idNullifier The identity nullifier of ZKIdentity
     * @param epoch The given epoch
     * @param nonce Given epoch key nonce
     * @returns Output the epoch key nullifier
     */
    public static genEpochKeyNullifier(
        identityNullifier: SnarkBigInt,
        epoch: number,
        nonce: number
    ) {
        return hash5([
            UnirepProtocol.EPOCH_KEY_NULLIFIER_DOMAIN,
            identityNullifier,
            BigInt(epoch),
            BigInt(nonce),
            BigInt(0),
        ])
    }

    /**
     * Compute reputation nullifier from a given identity nullifier, epoch, epoch key nonce from a given attester
     * Reputation nullifier is used to prevent double spending of reputation
     * @param idNullifier The identity nullifier of ZKIdentity
     * @param epoch The given epoch
     * @param nonce Given epoch key nonce
     * @param attesterId The reputation is spent from the attester ID
     * @returns Output the reputation nullifier
     */
    public static genReputationNullifier(
        identityNullifier: SnarkBigInt,
        epoch: number,
        nonce: number,
        attesterId: BigInt
    ) {
        return hash5([
            UnirepProtocol.REPUTATION_NULLIFIER_DOMAIN,
            identityNullifier,
            BigInt(epoch),
            BigInt(nonce),
            attesterId,
        ])
    }

    /**
     * Output an empty user state tree
     * User state tree is used to store how much reputation the user has
     * @returns Empty user state tree
     */
    public async genNewUST(): Promise<SparseMerkleTree> {
        return SparseMerkleTree.create(
            new Keyv(),
            this.config.userStateTreeDepth,
            UnirepProtocol.DEFAULT_USER_LEAF
        )
    }

    /**
     * Output an empty epoch tree
     * Epoch tree is used to record the epoch key and corresponding attestations in a given epoch
     * @returns Empty epoch tree
     */
    public async genNewEpochTree(): Promise<SparseMerkleTree> {
        return SparseMerkleTree.create(
            new Keyv(),
            this.config.epochTreeDepth,
            UnirepProtocol.SMT_ONE_LEAF
        )
    }

    /**
     * Compute a tree root of an empty user state tree
     * @returns The tree root of the empty user state tree
     */
    public computeEmptyUserStateRoot(): BigInt {
        // the same as computed by IncrementalMerkleTree if all leaves are the same
        const t = new IncrementalMerkleTree(
            this.config.userStateTreeDepth,
            UnirepProtocol.DEFAULT_USER_LEAF,
            2
        )
        return t.root
    }

    /**
     * Compute a tree root of the user state tree when user signs up
     * If the leafIdx and airdropPosRep are not given, it computes the empty user state tree
     * @param leafIdx The leaf index to insert the airdrop reputation, it also means the attester ID
     * @param airdropPosRep The airdrop amount from a given attester
     * @returns The tree root of the user state tree
     */
    public async computeInitUserStateRoot(
        leafIdx?: number,
        airdropPosRep?: number
    ): Promise<BigInt> {
        const t = await this.genNewUST()
        if (leafIdx && airdropPosRep) {
            const airdropReputation = new Reputation(
                BigInt(airdropPosRep),
                BigInt(0),
                BigInt(0),
                BigInt(1)
            )
            const leafValue = airdropReputation.hash()
            await t.update(BigInt(leafIdx), leafValue)
        }
        return t.getRootHash()
    }

    /**
     * Compute the initial global state tree.
     * It computes the user state tree root from `computeEmptyUserStateRoot`.
     * And default GST leaf is computed by `hash(0, emptyUserStateRoot)`
     * @returns The initial global state tree
     */
    public genNewGST(): IncrementalMerkleTree {
        const emptyUserStateRoot = this.computeEmptyUserStateRoot()
        const defaultGSTLeaf = hashLeftRight(BigInt(0), emptyUserStateRoot)
        const GST = new IncrementalMerkleTree(
            this.config.globalStateTreeDepth,
            defaultGSTLeaf,
            2
        )
        return GST
    }

    /**
     * Generate a full proof of the circuit
     * @param circuitName The name of the circuit
     * @param inputs The input of the proof
     * @returns The proof and the public signals of the snark proof
     */
    public async genProof(circuitName: CircuitName, inputs: any) {
        return circuit.genProof(this.zkFilesPath, circuitName, inputs)
    }

    /**
     * Verify the snark proof
     * @param circuitName The name of the circuit
     * @param proof The proof of the snark proof
     * @param publicSignals The public signals of the snark proof
     * @returns
     */
    public async verifyProof(
        circuitName: CircuitName,
        proof: SnarkProof,
        publicSignals: SnarkPublicSignals
    ): Promise<boolean> {
        return circuit.verifyProof(
            this.zkFilesPath,
            circuitName,
            proof,
            publicSignals
        )
    }

    /**
     * Verify contract events' proof
     * @param circuitName The name of the circuit
     * @param event The event from the unirep contract
     * @returns True if the proof is valid, false otherwise.
     */
    public async verifyProofEvent(
        circuitName: CircuitName,
        event: Event
    ): Promise<boolean> {
        let args = event?.args?.proof
        const emptyArray: BigNumber[] = []
        let formatPublicSignals
        if (circuitName === CircuitName.verifyEpochKey) {
            formatPublicSignals = emptyArray
                .concat(args?.globalStateTree, args?.epoch, args?.epochKey)
                .map((n) => n.toBigInt())
        } else if (circuitName === CircuitName.proveReputation) {
            formatPublicSignals = emptyArray
                .concat(
                    args?.repNullifiers,
                    args?.epoch,
                    args?.epochKey,
                    args?.globalStateTree,
                    args?.attesterId,
                    args?.proveReputationAmount,
                    args?.minRep,
                    args?.proveGraffiti,
                    args?.graffitiPreImage
                )
                .map((n) => n.toBigInt())
        } else if (circuitName === CircuitName.proveUserSignUp) {
            formatPublicSignals = emptyArray
                .concat(
                    args?.epoch,
                    args?.epochKey,
                    args?.globalStateTree,
                    args?.attesterId,
                    args?.userHasSignedUp
                )
                .map((n) => n.toBigInt())
        } else if (circuitName === CircuitName.startTransition) {
            args = event?.args
            formatPublicSignals = emptyArray
                .concat(
                    args?.blindedUserState,
                    args?.blindedHashChain,
                    args?.globalStateTree
                )
                .map((n) => n.toBigInt())
        } else if (circuitName === CircuitName.processAttestations) {
            args = event?.args
            formatPublicSignals = emptyArray
                .concat(
                    args?.outputBlindedUserState,
                    args?.outputBlindedHashChain,
                    args?.inputBlindedUserState
                )
                .map((n) => n.toBigInt())
        } else if (circuitName === CircuitName.userStateTransition) {
            formatPublicSignals = emptyArray
                .concat(
                    args.newGlobalStateTreeLeaf,
                    args.epkNullifiers,
                    args.transitionFromEpoch,
                    args.blindedUserStates,
                    args.fromGlobalStateTree,
                    args.blindedHashChains,
                    args.fromEpochTree
                )
                .map((n) => n.toBigInt())
        } else {
            throw new Error(
                `Unirep protocol: cannot find circuit name ${circuitName}`
            )
        }
        const formatProof = circuit.formatProofForSnarkjsVerification(
            args?.proof
        )
        const isProofValid = await circuit.verifyProof(
            this.zkFilesPath,
            circuitName,
            formatProof,
            formatPublicSignals
        )
        return isProofValid
    }

    /**
     * Verify one user state transition action. It composes of `transitionEvent`, `startTransitionEvent`, and `processAttestationEvent`s.
     * @param transitionEvent The user state transition event
     * @param startTransitionEvent The start transition event
     * @param processAttestationEvents The process attestations event
     * @returns True if all proofs of the events are valid, false otherwise.
     */
    public async verifyUSTEvents(
        transitionEvent: Event,
        startTransitionEvent: Event,
        processAttestationEvents: Event[]
    ): Promise<boolean> {
        // verify the final UST proof
        const isValid = await this.verifyProofEvent(
            CircuitName.userStateTransition,
            transitionEvent
        )
        if (!isValid) return false

        // verify the start transition proof
        const isStartTransitionProofValid = await this.verifyProofEvent(
            CircuitName.startTransition,
            startTransitionEvent
        )
        if (!isStartTransitionProofValid) return false

        // verify process attestations proofs
        const transitionArgs = transitionEvent?.args?.proof
        const isProcessAttestationValid =
            await this.verifyProcessAttestationEvents(
                processAttestationEvents,
                transitionArgs.blindedUserStates[0],
                transitionArgs.blindedUserStates[1]
            )
        if (!isProcessAttestationValid) return false
        return true
    }

    /**
     * Verify all process attestations events. One input blinded user state should be the output of other process attestations proof
     * @param processAttestationEvents All process attestation events
     * @param startBlindedUserState The blinded user state from `startTrantision` proof
     * @param finalBlindedUserState The Final output of the latest `processAttestation` proof
     * @returns True if all events are valid and blinded user state are connected
     */
    public async verifyProcessAttestationEvents(
        processAttestationEvents: Event[],
        startBlindedUserState: BigNumber,
        finalBlindedUserState: BigNumber
    ): Promise<boolean> {
        let currentBlindedUserState = startBlindedUserState
        // The rest are process attestations proofs
        for (let i = 0; i < processAttestationEvents.length; i++) {
            const args = processAttestationEvents[i]?.args
            const isValid = await this.verifyProofEvent(
                CircuitName.processAttestations,
                processAttestationEvents[i]
            )
            if (!isValid) return false
            currentBlindedUserState = args?.outputBlindedUserState
        }
        return currentBlindedUserState.eq(finalBlindedUserState)
    }
}
