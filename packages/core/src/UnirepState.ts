import assert from 'assert'
import { BigNumber } from 'ethers'
import {
    IncrementalMerkleTree,
    hashLeftRight,
    SparseMerkleTree,
    stringifyBigInts,
    unstringifyBigInts,
} from '@unirep/crypto'
import { Attestation, IAttestation } from '@unirep/contracts'

import { IEpochTreeLeaf, ISettings, IUnirepState } from './interfaces'
import {
    computeEmptyUserStateRoot,
    computeInitUserStateRoot,
    genNewSMT,
    SMT_ONE_LEAF,
} from './utils'

export default class UnirepState {
    public readonly settings: ISettings

    public currentEpoch: number = 1
    private epochTreeRoot: { [key: number]: bigint } = {}
    private GSTLeaves: { [key: number]: bigint[] } = {}
    private epochTreeLeaves: { [key: number]: IEpochTreeLeaf[] } = {}
    private nullifiers: { [key: string]: boolean } = {}
    private globalStateTree: { [key: number]: IncrementalMerkleTree } = {}
    private epochTree: { [key: number]: SparseMerkleTree } = {}
    private defaultGSTLeaf: bigint

    public latestProcessedBlock: number = 0
    private sealedEpochKey: { [key: string]: boolean } = {}
    private epochKeyInEpoch: { [key: number]: Map<string, boolean> } = {}
    private epochKeyToAttestationsMap: { [key: string]: IAttestation[] } = {}
    private epochGSTRootMap: { [key: number]: Map<string, boolean> } = {}

    constructor(
        _settings: ISettings,
        _currentEpoch?: number,
        _latestBlock?: number,
        _GSTLeaves?: { [key: number]: bigint[] },
        _epochTreeLeaves?: { [key: number]: IEpochTreeLeaf[] },
        _epochKeyToAttestationsMap?: { [key: string]: IAttestation[] },
        _nullifiers?: { [key: string]: boolean }
    ) {
        this.settings = _settings
        if (_currentEpoch !== undefined) this.currentEpoch = _currentEpoch

        if (_latestBlock !== undefined) this.latestProcessedBlock = _latestBlock

        this.epochKeyInEpoch[this.currentEpoch] = new Map()
        this.epochTreeRoot[this.currentEpoch] = BigInt(0)
        const emptyUserStateRoot = computeEmptyUserStateRoot(
            this.settings.userStateTreeDepth
        )
        this.defaultGSTLeaf = hashLeftRight(BigInt(0), emptyUserStateRoot)
        if (_GSTLeaves !== undefined) {
            this.GSTLeaves = _GSTLeaves
            for (let key in this.GSTLeaves) {
                this.globalStateTree[key] = new IncrementalMerkleTree(
                    this.settings.globalStateTreeDepth,
                    this.defaultGSTLeaf,
                    2
                )
                this.epochGSTRootMap[key] = new Map()
                this.GSTLeaves[key].map((n) => {
                    this.globalStateTree[key].insert(n)
                    this.epochGSTRootMap[key].set(
                        this.globalStateTree[key].root.toString(),
                        true
                    )
                })
            }
        } else {
            this.GSTLeaves[this.currentEpoch] = []
            this.globalStateTree[this.currentEpoch] = new IncrementalMerkleTree(
                this.settings.globalStateTreeDepth,
                this.defaultGSTLeaf
            )
            this.epochGSTRootMap[this.currentEpoch] = new Map()
        }

        if (_epochTreeLeaves !== undefined) {
            this.epochTreeLeaves = _epochTreeLeaves
            for (const key in _epochTreeLeaves) {
                for (const leaf of _epochTreeLeaves[key]) {
                    this.sealedEpochKey[leaf.epochKey.toString()] = true
                }
            }
        }

        if (_epochKeyToAttestationsMap !== undefined) {
            this.epochKeyToAttestationsMap = _epochKeyToAttestationsMap
            for (const key in this.epochKeyToAttestationsMap) {
                this.epochKeyInEpoch[this.currentEpoch].set(key, true)
            }
        }

        if (_nullifiers != undefined) this.nullifiers = _nullifiers
    }

    public toJSON = (): IUnirepState => {
        const epochKeys = this.getEpochKeys(this.currentEpoch)
        const attestationsMapToString: { [key: string]: string[] } = {}
        for (const key of epochKeys) {
            attestationsMapToString[key] = this.epochKeyToAttestationsMap[
                key
            ].map((n: any) => JSON.stringify(n))
        }
        const epochTreeLeavesToString = {}
        for (let index in this.epochTreeLeaves) {
            epochTreeLeavesToString[index] = this.epochTreeLeaves[index].map(
                (l: any) =>
                    `${l.epochKey.toString()}: ${l.hashchainResult.toString()}`
            )
        }
        return {
            settings: {
                globalStateTreeDepth: this.settings.globalStateTreeDepth,
                userStateTreeDepth: this.settings.userStateTreeDepth,
                epochTreeDepth: this.settings.epochTreeDepth,
                attestingFee: this.settings.attestingFee,
                epochLength: this.settings.epochLength,
                numEpochKeyNoncePerEpoch:
                    this.settings.numEpochKeyNoncePerEpoch,
                maxReputationBudget: this.settings.maxReputationBudget,
            },
            currentEpoch: this.currentEpoch,
            latestProcessedBlock: this.latestProcessedBlock,
            GSTLeaves: stringifyBigInts(this.GSTLeaves),
            epochTreeLeaves: Object(epochTreeLeavesToString),
            latestEpochKeyToAttestationsMap: attestationsMapToString,
            nullifiers: Object.keys(this.nullifiers),
        }
    }

    public static fromJSON = (data: IUnirepState) => {
        const _unirepState = typeof data === 'string' ? JSON.parse(data) : data
        const parsedGSTLeaves = {}
        const parsedEpochTreeLeaves = {}
        const parsedNullifiers = {}
        const parsedAttestationsMap = {}

        for (let key in _unirepState.GSTLeaves) {
            parsedGSTLeaves[key] = unstringifyBigInts(
                _unirepState.GSTLeaves[key]
            )
        }

        for (let key in _unirepState.epochTreeLeaves) {
            const leaves: IEpochTreeLeaf[] = []
            _unirepState.epochTreeLeaves[key].map((n: any) => {
                const splitStr = n.split(': ')
                const epochTreeLeaf: IEpochTreeLeaf = {
                    epochKey: BigInt(splitStr[0]),
                    hashchainResult: BigInt(splitStr[1]),
                }
                leaves.push(epochTreeLeaf)
            })
            parsedEpochTreeLeaves[key] = leaves
        }

        for (let n of _unirepState.nullifiers) {
            parsedNullifiers[n] = true
        }
        for (let key in _unirepState.latestEpochKeyToAttestationsMap) {
            const parsedAttestations: IAttestation[] = []
            for (const attestation of _unirepState
                .latestEpochKeyToAttestationsMap[key]) {
                const jsonAttestation = JSON.parse(attestation)
                const attestClass = new Attestation(
                    jsonAttestation.attesterId,
                    jsonAttestation.posRep,
                    jsonAttestation.negRep,
                    jsonAttestation.graffiti,
                    jsonAttestation.signUp
                )
                parsedAttestations.push(attestClass)
            }
            parsedAttestationsMap[key] = parsedAttestations
        }
        const unirepState = new this(
            _unirepState.settings,
            _unirepState.currentEpoch,
            _unirepState.latestProcessedBlock,
            parsedGSTLeaves,
            parsedEpochTreeLeaves,
            parsedAttestationsMap,
            parsedNullifiers
        )

        return unirepState
    }

    /**
     * Get the number of GST leaves of given epoch
     */
    public getNumGSTLeaves = (epoch: number): number => {
        this._checkValidEpoch(epoch)

        return this.GSTLeaves[epoch].length
    }

    /**
     * Get the attestations of given epoch key
     */
    public getAttestations = (epochKey: string): IAttestation[] => {
        this._checkEpochKeyRange(epochKey)

        const attestations = this.epochKeyToAttestationsMap[epochKey]
        if (!attestations) return []
        else return attestations
    }

    /**
     * Get all epoch keys of given epoch key
     */
    public getEpochKeys = (epoch: number): string[] => {
        this._checkValidEpoch(epoch)
        if (this.epochKeyInEpoch[epoch] == undefined) return []
        return Array.from(this.epochKeyInEpoch[epoch].keys())
    }

    /**
     * Check if given nullifier exists in Unirep State
     */
    public nullifierExist = (nullifier: bigint): boolean => {
        // Nullifier 0 exists because it is reserved
        if (nullifier === BigInt(0)) return true
        if (this.nullifiers[nullifier.toString()]) return true
        return false
    }

    /**
     * If one of the nullifiers exist in Unirep state, return true
     */
    public nullifiersExist = (nullifiers: bigint[]): boolean => {
        let exist = false
        for (let nullifier of nullifiers) {
            exist = this.nullifierExist(nullifier)
        }
        return exist
    }

    /**
     * Check if the block has been processed
     */
    private _checkBlockNumber = (blockNumber: number | undefined) => {
        if (
            blockNumber !== undefined &&
            blockNumber < this.latestProcessedBlock
        )
            return
        else
            this.latestProcessedBlock = blockNumber
                ? blockNumber
                : this.latestProcessedBlock
    }

    /**
     * Check if epoch matches current epoch
     */
    private _checkCurrentEpoch = (epoch: number) => {
        assert(
            epoch === this.currentEpoch,
            `UnirepState: Epoch (${epoch}) must be the same as the current epoch ${this.currentEpoch}`
        )
    }

    /**
     * Check if epoch is less than the current epoch
     */
    private _checkValidEpoch = (epoch: number) => {
        assert(
            epoch <= this.currentEpoch,
            `UnirepState: Epoch (${epoch}) must be less than the current epoch ${this.currentEpoch}`
        )
    }

    /**
     * Check if nullifier has been submitted before
     */
    private _checkNullifier = (nullifier: bigint) => {
        assert(
            this.nullifierExist(nullifier) === false,
            `UnirepState: Nullifier ${nullifier.toString()} has been submitted before`
        )
    }

    /**
     * Check if epoch key is greater than max epoch tree leaf value
     */
    private _checkEpochKeyRange = (epochKey: string) => {
        assert(
            BigInt(epochKey) < BigInt(2 ** this.settings.epochTreeDepth),
            `UnirepState: Epoch key (${epochKey}) greater than max leaf value(2**epochTreeDepth)`
        )
    }

    /**
     * Check if epoch key has been sealed
     */
    private _isEpochKeySealed = (epochKey: string) => {
        assert(
            this.sealedEpochKey[epochKey] !== true,
            `UnirepState: Epoch key (${epochKey}) has been sealed`
        )
    }

    /**
     * Update Unirep global state tree in the given epoch
     */
    private _updateGSTree = (epoch: number, GSTLeaf: bigint) => {
        // Only insert non-zero GST leaf (zero GST leaf means the user has epoch keys left to process)
        if (GSTLeaf <= BigInt(0)) return
        this.GSTLeaves[epoch].push(GSTLeaf)

        // update GST when new leaf is inserted
        // keep track of each GST root when verifying proofs
        this.globalStateTree[epoch].insert(GSTLeaf)
        this.epochGSTRootMap[epoch].set(
            this.globalStateTree[epoch].root.toString(),
            true
        )
    }

    /**
     * Computes the global state tree of given epoch
     */
    public genGSTree = (epoch: number): IncrementalMerkleTree => {
        this._checkValidEpoch(epoch)
        return this.globalStateTree[epoch]
    }

    /**
     * Computes the epoch tree of given epoch
     */
    public genEpochTree = async (epoch: number): Promise<SparseMerkleTree> => {
        this._checkValidEpoch(epoch)
        const epochTree = genNewSMT(this.settings.epochTreeDepth, SMT_ONE_LEAF)

        const leaves = this.epochTreeLeaves[epoch]
        if (!leaves) return epochTree
        else {
            for (const leaf of leaves) {
                await epochTree.update(leaf.epochKey, leaf.hashchainResult)
            }
            return epochTree
        }
    }

    /**
     * Check if the root is one of the Global state tree roots in the given epoch
     */
    public GSTRootExists = (
        GSTRoot: bigint | string,
        epoch: number
    ): boolean => {
        this._checkValidEpoch(epoch)
        return this.epochGSTRootMap[epoch].has(GSTRoot.toString())
    }

    /**
     * Check if the root is one of the epoch tree roots in the given epoch
     */
    public epochTreeRootExists = async (
        _epochTreeRoot: bigint | string,
        epoch: number
    ): Promise<boolean> => {
        this._checkValidEpoch(epoch)
        if (this.epochTreeRoot[epoch] == undefined) {
            const epochTree = await this.genEpochTree(epoch)
            this.epochTreeRoot[epoch] = epochTree.root
        }
        return this.epochTreeRoot[epoch].toString() == _epochTreeRoot.toString()
    }

    /**
     * Add a new state leaf to the list of GST leaves of given epoch.
     */
    public signUp = async (
        epoch: number,
        idCommitment: bigint,
        attesterId?: number,
        airdropAmount?: number,
        blockNumber?: number
    ) => {
        this._checkCurrentEpoch(epoch)
        this._checkBlockNumber(blockNumber)

        let GSTLeaf
        const USTRoot = await computeInitUserStateRoot(
            this.settings.userStateTreeDepth,
            attesterId,
            airdropAmount
        )
        GSTLeaf = hashLeftRight(idCommitment, USTRoot)

        this._updateGSTree(epoch, GSTLeaf)
    }

    /**
     * Add a new attestation to the list of attestations to the epoch key.
     */
    public addAttestation = (
        epochKey: string,
        attestation: IAttestation,
        blockNumber?: number
    ) => {
        this._checkBlockNumber(blockNumber)
        this._checkEpochKeyRange(epochKey)
        this._isEpochKeySealed(epochKey)

        const attestations = this.epochKeyToAttestationsMap[epochKey]
        if (!attestations) this.epochKeyToAttestationsMap[epochKey] = []
        this.epochKeyToAttestationsMap[epochKey].push(attestation)
        this.epochKeyInEpoch[this.currentEpoch].set(epochKey, true)
    }

    /**
     * Add reputation nullifiers to the map state
     */
    public addReputationNullifiers = (
        nullifier: bigint,
        blockNumber?: number
    ) => {
        this._checkBlockNumber(blockNumber)
        this._checkNullifier(nullifier)

        this.nullifiers[nullifier.toString()] = true
    }

    /**
     * Add the leaves of epoch tree of given epoch and increment current epoch number
     */
    public epochTransition = async (epoch: number, blockNumber?: number) => {
        this._checkCurrentEpoch(epoch)
        this._checkBlockNumber(blockNumber)

        this.epochTree[epoch] = genNewSMT(
            this.settings.epochTreeDepth,
            SMT_ONE_LEAF
        )
        const epochTreeLeaves: IEpochTreeLeaf[] = []

        // seal all epoch keys in current epoch
        for (let epochKey of this.epochKeyInEpoch[epoch].keys()) {
            this._checkEpochKeyRange(epochKey)
            this._isEpochKeySealed(epochKey)

            let hashChain: bigint = BigInt(0)
            for (
                let i = 0;
                i < this.epochKeyToAttestationsMap[epochKey].length;
                i++
            ) {
                hashChain = hashLeftRight(
                    BigNumber.from(
                        this.epochKeyToAttestationsMap[epochKey][i].hash()
                    ).toBigInt(),
                    hashChain
                )
            }
            const sealedHashChainResult = hashLeftRight(BigInt(1), hashChain)
            const epochTreeLeaf: IEpochTreeLeaf = {
                epochKey: BigInt(epochKey),
                hashchainResult: sealedHashChainResult,
            }
            epochTreeLeaves.push(epochTreeLeaf)
            this.sealedEpochKey[epochKey] = true
        }

        // Add to epoch key hash chain map
        for (let leaf of epochTreeLeaves) {
            await this.epochTree[epoch].update(
                leaf.epochKey,
                leaf.hashchainResult
            )
        }
        this.epochTreeLeaves[epoch] = epochTreeLeaves.slice()
        this.epochTreeRoot[epoch] = this.epochTree[epoch].root
        this.currentEpoch++
        this.GSTLeaves[this.currentEpoch] = []
        this.epochKeyInEpoch[this.currentEpoch] = new Map()
        this.globalStateTree[this.currentEpoch] = new IncrementalMerkleTree(
            this.settings.globalStateTreeDepth,
            this.defaultGSTLeaf
        )
        this.epochGSTRootMap[this.currentEpoch] = new Map()
    }

    /**
     * Add a new state leaf to the list of GST leaves in the current epoch.
     */
    public userStateTransition = (
        fromEpoch: number,
        GSTLeaf: bigint,
        nullifiers: bigint[],
        blockNumber?: number
    ) => {
        this._checkValidEpoch(fromEpoch)
        this._checkBlockNumber(blockNumber)
        assert(
            nullifiers.length === this.settings.numEpochKeyNoncePerEpoch,
            `UnirepState: wrong epoch key nullifiers amount.
            Expect (${this.settings.numEpochKeyNoncePerEpoch}) nullifiers`
        )

        // Check if all nullifiers are not duplicated then update Unirep state
        for (let nullifier of nullifiers) {
            this._checkNullifier(nullifier)
        }

        // Update Unirep state when all nullifiers are not submitted before
        for (let nullifier of nullifiers) {
            this.nullifiers[nullifier.toString()] = true
        }
        this._updateGSTree(this.currentEpoch, GSTLeaf)
    }
}
