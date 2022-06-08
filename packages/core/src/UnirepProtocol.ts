import Keyv from 'keyv'
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
import {
    CircuitName,
    CircuitConfig,
    ParsedContractInput,
    StartTransitionProof,
    ProcessAttestationProof,
} from './types'
import { UnirepTypes } from '@unirep/contracts'

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
    /**
     * Set Unirep protocol paramters from a given circuit configuration
     * @param _config The circuit configuration
     */
    constructor(_config: CircuitConfig) {
        this.config = _config
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
    public genNewUST(): SparseMerkleTree {
        return new SparseMerkleTree(
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
    public genNewEpochTree(): SparseMerkleTree {
        return new SparseMerkleTree(
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
            UnirepProtocol.DEFAULT_USER_LEAF
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
        return t.root
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
            defaultGSTLeaf
        )
        return GST
    }

    /**
     * Parse snark proof for smart contract input, verifiers
     * @param circuit The circuit name
     * @param proof The snark proof
     * @param publicSignals The public signals of the snark proof
     * @returns The parsed input for smart contract
     */
    public parseProof(
        circuit: CircuitName,
        proof: SnarkProof,
        publicSignals: SnarkPublicSignals
    ): ParsedContractInput {
        let result
        const formattedProof: any[] = [
            proof.pi_a[0],
            proof.pi_a[1],
            proof.pi_b[0][1],
            proof.pi_b[0][0],
            proof.pi_b[1][1],
            proof.pi_b[1][0],
            proof.pi_c[0],
            proof.pi_c[1],
        ]
        if (circuit === CircuitName.proveUserSignUp) {
            result = {
                epoch: publicSignals[0],
                epochKey: publicSignals[1],
                globalStateTree: publicSignals[2],
                attesterId: publicSignals[3],
                userHasSignedUp: publicSignals[4],
            } as UnirepTypes.SignUpProofStruct
        } else if (circuit === CircuitName.verifyEpochKey) {
            result = {
                globalStateTree: publicSignals[0],
                epoch: publicSignals[1],
                epochKey: publicSignals[2],
            } as UnirepTypes.EpochKeyProofStruct
        } else if (circuit === CircuitName.startTransition) {
            result = {
                blindedUserState: publicSignals[0],
                blindedHashChain: publicSignals[1],
                globalStateTree: publicSignals[2],
            } as StartTransitionProof
        } else if (circuit === CircuitName.proveReputation) {
            result = {
                repNullifiers: publicSignals.slice(
                    0,
                    this.config.maxReputationBudget
                ),
                epoch: publicSignals[this.config.maxReputationBudget],
                epochKey: publicSignals[this.config.maxReputationBudget + 1],
                globalStateTree:
                    publicSignals[this.config.maxReputationBudget + 2],
                attesterId: publicSignals[this.config.maxReputationBudget + 3],
                proveReputationAmount:
                    publicSignals[this.config.maxReputationBudget + 4],
                minRep: publicSignals[this.config.maxReputationBudget + 5],
                proveGraffiti:
                    publicSignals[this.config.maxReputationBudget + 6],
                graffitiPreImage:
                    publicSignals[this.config.maxReputationBudget + 7],
            } as UnirepTypes.ReputationProofStruct
        } else if (circuit === CircuitName.processAttestations) {
            result = {
                outputBlindedUserState: publicSignals[0],
                outputBlindedHashChain: publicSignals[1],
                inputBlindedUserState: publicSignals[2],
            } as ProcessAttestationProof
        } else if (circuit === CircuitName.userStateTransition) {
            const epkNullifiers: string[] = []
            const blindedUserStates = [
                publicSignals[2 + this.config.numEpochKeyNoncePerEpoch],
                publicSignals[3 + this.config.numEpochKeyNoncePerEpoch],
            ]
            const blindedHashChains: string[] = []
            for (let i = 0; i < this.config.numEpochKeyNoncePerEpoch; i++) {
                epkNullifiers.push(publicSignals[1 + i].toString())
            }
            for (let i = 0; i < this.config.numEpochKeyNoncePerEpoch; i++) {
                blindedHashChains.push(
                    publicSignals[
                        5 + this.config.numEpochKeyNoncePerEpoch + i
                    ].toString()
                )
            }

            result = {
                newGlobalStateTreeLeaf: publicSignals[0],
                epkNullifiers,
                transitionFromEpoch:
                    publicSignals[1 + this.config.numEpochKeyNoncePerEpoch],
                blindedUserStates,
                fromGlobalStateTree:
                    publicSignals[4 + this.config.numEpochKeyNoncePerEpoch],
                blindedHashChains,
                fromEpochTree:
                    publicSignals[5 + this.config.numEpochKeyNoncePerEpoch * 2],
            } as UnirepTypes.UserTransitionProofStruct
        } else {
            throw new TypeError(`circuit ${circuit} is not defined`)
        }
        return {
            proof: formattedProof,
            ...result,
        }
    }

}
