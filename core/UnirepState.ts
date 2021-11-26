import assert from 'assert'
import { ethers } from 'ethers'
import { IncrementalQuinTree, hash5, hashLeftRight, SparseMerkleTreeImpl, stringifyBigInts } from '@unirep/crypto'
import { genNewSMT, SMT_ONE_LEAF, } from './utils'

interface IEpochTreeLeaf {
    epochKey: BigInt;
    hashchainResult: BigInt;
}

interface IAttestation {
    attesterId: BigInt;
    posRep: BigInt;
    negRep: BigInt;
    graffiti: BigInt;
    signUp: BigInt;
    hash(): BigInt;
    toJSON(): string;
}

interface ISettings {
    readonly globalStateTreeDepth: number;
    readonly userStateTreeDepth: number;
    readonly epochTreeDepth: number;
    readonly attestingFee: ethers.BigNumber;
    readonly epochLength: number;
    readonly numEpochKeyNoncePerEpoch: number;
    readonly maxReputationBudget: number;
    readonly defaultGSTLeaf: BigInt;
}

interface IUnirepState {
    readonly settings: ISettings;
    currentEpoch: number;
    latestProcessedBlock: number;
    GSTLeaves: {[key: string]: string[]};
    epochTreeLeaves: {[key: string]: string[]};
    latestEpochKeyToAttestationsMap: {[key: string]: string[]};
    nullifiers: string[];
}

class Attestation implements IAttestation {
    public attesterId: BigInt
    public posRep: BigInt
    public negRep: BigInt
    public graffiti: BigInt
    public signUp: BigInt

    constructor(
        _attesterId: BigInt,
        _posRep: BigInt,
        _negRep: BigInt,
        _graffiti: BigInt,
        _signUp: BigInt,
    ) {
        this.attesterId = _attesterId
        this.posRep = _posRep
        this.negRep = _negRep
        this.graffiti = _graffiti
        this.signUp = _signUp
    }

    public hash = (): BigInt => {
        return hash5([
            this.attesterId,
            this.posRep,
            this.negRep,
            this.graffiti,
            this.signUp,
        ])
    }

    public toJSON = (space = 0): string => {
        return JSON.stringify(
            {
                attesterId: this.attesterId.toString(),
                posRep: this.posRep.toString(),
                negRep: this.negRep.toString(),
                graffiti: this.graffiti.toString(),
                signUp: this.signUp.toString(),
            },
            null,
            space
        )
    }
}

class UnirepState {
    public setting: ISettings
    
    public currentEpoch: number
    private epochTreeRoot: {[key: number]: BigInt} = {}
    private GSTLeaves: {[key: number]: BigInt[]} = {}
    private epochTreeLeaves: {[key: number]: IEpochTreeLeaf[]} = {}
    private nullifiers: {[key: string]: boolean} = {}
    private globalStateTree: {[key: number]: IncrementalQuinTree} = {}
    private epochTree: {[key: number]: SparseMerkleTreeImpl} = {}

    private latestProcessedBlock: number = 0
    private epochKeyInEpoch: {[key: number]: Map<string, boolean>} = {}
    private epochKeyToAttestationsMap: {[key: string]: IAttestation[]} = {}
    private epochGSTRootMap: {[key: number]: Map<string, boolean>} = {}

    constructor(
        _setting: ISettings,
        _currentEpoch?: number,
        _latestBlock?: number,
        _GSTLeaves?: {[key: number]: BigInt[]},
        _epochTreeLeaves?: {[key: number]: IEpochTreeLeaf[]},
        _epochKeyToAttestationsMap?: {[key: string]: IAttestation[]},
        _nullifiers?: {[key: string]: boolean},
    ) {
        this.setting = _setting
        if(_currentEpoch !== undefined) this.currentEpoch = _currentEpoch
        else this.currentEpoch = 1
        if(_latestBlock !== undefined) this.latestProcessedBlock = _latestBlock
        this.epochKeyInEpoch[this.currentEpoch] = new Map()
        this.epochTreeRoot[this.currentEpoch] = BigInt(0)
        if(_GSTLeaves !== undefined) {
            this.GSTLeaves = _GSTLeaves
            for (let key in this.GSTLeaves) {
                this.globalStateTree[key] = new IncrementalQuinTree(
                    this.setting.globalStateTreeDepth,
                    this.setting.defaultGSTLeaf,
                    2,
                )
                this.epochGSTRootMap[key] = new Map()
                this.GSTLeaves[key].map(n => {
                    this.globalStateTree[key].insert(n)
                    this.epochGSTRootMap[key].set(this.globalStateTree[key].root.toString(), true)
                })
            }
        }
        else {
            this.GSTLeaves[this.currentEpoch] = []
            this.globalStateTree[this.currentEpoch] = new IncrementalQuinTree(
                this.setting.globalStateTreeDepth,
                this.setting.defaultGSTLeaf,
                2,
            )
            this.epochGSTRootMap[this.currentEpoch] = new Map()
        }
        if(_epochTreeLeaves !== undefined) this.epochTreeLeaves = _epochTreeLeaves
        else this.epochTreeLeaves = {}
        if(_epochKeyToAttestationsMap !== undefined) {
            this.epochKeyToAttestationsMap = _epochKeyToAttestationsMap
            for (const key in this.epochKeyToAttestationsMap) {
                this.epochKeyInEpoch[this.currentEpoch].set(key, true)
            }
        }
        else this.epochKeyToAttestationsMap = {}
        if(_nullifiers != undefined) this.nullifiers = _nullifiers
        else this.nullifiers = {}
    }

    public toJSON = (space = 0): string => {
        const epochKeys = this.getEpochKeys(this.currentEpoch)
        const attestationsMapToString: {[key: string]: string[]} = {}
        for (const key of epochKeys) {
            attestationsMapToString[key] = this.epochKeyToAttestationsMap[key].map((n) => (n.toJSON()))
        }
        const epochTreeLeavesToString = {}
        const GSTRootsToString = {}
        for (let index in this.epochTreeLeaves) {
            epochTreeLeavesToString[index] = this.epochTreeLeaves[index].map((l) => `${l.epochKey.toString()}: ${l.hashchainResult.toString()}`)
        }
        for (let index in this.epochGSTRootMap) {
            GSTRootsToString[index] = Array.from(this.epochGSTRootMap[index].keys())
        }
        return JSON.stringify(
            {
                settings: {
                    globalStateTreeDepth: this.setting.globalStateTreeDepth,
                    userStateTreeDepth: this.setting.userStateTreeDepth,
                    epochTreeDepth: this.setting.epochTreeDepth,
                    attestingFee: this.setting.attestingFee.toString(),
                    epochLength: this.setting.epochLength,
                    numEpochKeyNoncePerEpoch: this.setting.numEpochKeyNoncePerEpoch,
                    maxReputationBudget: this.setting.maxReputationBudget,
                    defaultGSTLeaf: this.setting.defaultGSTLeaf.toString(),
                },
                currentEpoch: this.currentEpoch,
                latestProcessedBlock: this.latestProcessedBlock,
                GSTLeaves: Object(stringifyBigInts(this.GSTLeaves)),
                epochTreeLeaves: Object(epochTreeLeavesToString),
                latestEpochKeyToAttestationsMap: attestationsMapToString,
                globalStateTreeRoots: GSTRootsToString,
                nullifiers: Object.keys(this.nullifiers)
            },
            null,
            space
        )
    }

    /*
     * Get the number of GST leaves of given epoch
     */
    public getNumGSTLeaves = (epoch: number): number => {
        if (epoch > this.currentEpoch) return 0
        return this.GSTLeaves[epoch].length
    }

    // /*
    //  * Get the hash chain result of given epoch key
    //  */
    // public getHashchain = (epochKey: string): BigInt => {
    //     const DefaultHashchainResult = SMT_ONE_LEAF
    //     const hashchain = this.epochKeyToHashchainMap[epochKey]
    //     if (!hashchain) return DefaultHashchainResult
    //     else return hashchain
    // }

    /*
     * Get the attestations of given epoch key
     */
    public getAttestations = (epochKey: string): IAttestation[] => {
        const attestations = this.epochKeyToAttestationsMap[epochKey]
        if (!attestations) return []
        else return attestations
    }

    /*
     * Get all epoch keys of given epoch key
     */
    public getEpochKeys = (epoch: number): string[] => {
        if(this.epochKeyInEpoch[epoch] == undefined) return []
        return Array.from(this.epochKeyInEpoch[epoch].keys())
    }

    /*
     * Check if given nullifier exists in Unirep State
     */
    public nullifierExist = (nullifier: BigInt): boolean => {
        if (nullifier === BigInt(0)) {
            console.log("Nullifier 0 exists because it is reserved")
            return true
        }
        return this.nullifiers[nullifier.toString()]
    }


    /*
     * Add a new attestation to the list of attestations to the epoch key.
     */
    public addAttestation = (
        epochKey: string,
        attestation: IAttestation,
        blockNumber?: number
    ) => {
        if(blockNumber !== undefined && blockNumber < this.latestProcessedBlock) return
        else this.latestProcessedBlock = blockNumber? blockNumber : this.latestProcessedBlock

        const attestations = this.epochKeyToAttestationsMap[epochKey]
        if (!attestations) this.epochKeyToAttestationsMap[epochKey] = []
        this.epochKeyToAttestationsMap[epochKey].push(attestation)
        this.epochKeyInEpoch[this.currentEpoch].set(epochKey, true)
    }

    /*
    * Add reputation nullifiers to the map state
    */
    public addReputationNullifiers = (
        nullifier: BigInt,
        blockNumber?: number
    ) => {
        if(blockNumber !== undefined && blockNumber < this.latestProcessedBlock) return
        else this.latestProcessedBlock = blockNumber? blockNumber : this.latestProcessedBlock

        if (nullifier > BigInt(0)) {
            this.nullifiers[nullifier.toString()] = true
        }
    }

    /*
     * Computes the global state tree of given epoch
     */
    public genGSTree = (epoch: number): IncrementalQuinTree => {
        return this.globalStateTree[epoch]
    }

    /*
     * Computes the epoch tree of given epoch
     */
    public genEpochTree = async (epoch: number): Promise<SparseMerkleTreeImpl> => {
        const epochTree = await genNewSMT(this.setting.epochTreeDepth, SMT_ONE_LEAF)

        const leaves = this.epochTreeLeaves[epoch]
        if (!leaves) return epochTree
        else {
            for (const leaf of leaves) {
                await epochTree.update(leaf.epochKey, leaf.hashchainResult)
            }
            return epochTree
        }
    }


    /*
     * Add a new state leaf to the list of GST leaves of given epoch.
     */
    public signUp = (
        epoch: number,
        GSTLeaf: BigInt,
        blockNumber?: number,
    ) => {
        assert(epoch == this.currentEpoch, `Epoch(${epoch}) must be the same as current epoch`)
        if(blockNumber !== undefined && blockNumber < this.latestProcessedBlock) return
        else this.latestProcessedBlock = blockNumber? blockNumber : this.latestProcessedBlock

        // Note that we do not insert a state leaf to any state tree here. This
        // is because we want to keep the state minimal, and only compute what
        // is necessary when it is needed. This may change if we run into
        // severe performance issues, but it is currently worth the tradeoff.
        this.GSTLeaves[epoch].push(GSTLeaf)

        // update GST when new leaf is inserted
        // keep track of each GST root when verifying proofs
        this.globalStateTree[epoch].insert(GSTLeaf)
        this.epochGSTRootMap[epoch].set(this.globalStateTree[epoch].root.toString(), true)
    }

    /*
     * Add the leaves of epoch tree of given epoch and increment current epoch number
     */
    public epochTransition = async (
        epoch: number,
        blockNumber?: number,
    ) => {
        assert(epoch == this.currentEpoch, `Epoch(${epoch}) must be the same as current epoch`)
        if(blockNumber !== undefined && blockNumber < this.latestProcessedBlock) return
        else this.latestProcessedBlock = blockNumber? blockNumber : this.latestProcessedBlock

        this.epochTree[epoch] = await genNewSMT(this.setting.epochTreeDepth, SMT_ONE_LEAF)
        const epochTreeLeaves: IEpochTreeLeaf[] = []

        // seal all epoch keys in current epoch
        for (let epochKey of this.epochKeyInEpoch[epoch].keys()) {
            let hashChain: BigInt = BigInt(0)
            for (let i = 0; i < this.epochKeyToAttestationsMap[epochKey].length; i++) {
                hashChain = hashLeftRight(this.epochKeyToAttestationsMap[epochKey][i].hash(), hashChain)
            }
            const sealedHashChainResult = hashLeftRight(BigInt(1), hashChain)
            const epochTreeLeaf: IEpochTreeLeaf = {
                epochKey: BigInt(epochKey),
                hashchainResult: sealedHashChainResult
            }
            epochTreeLeaves.push(epochTreeLeaf)
        }

        // Add to epoch key hash chain map
        for (let leaf of epochTreeLeaves) {
            assert(leaf.epochKey < BigInt(2 ** this.setting.epochTreeDepth), `Epoch key(${leaf.epochKey}) greater than max leaf value(2**epochTreeDepth)`)
            // if (this.epochKeyToHashchainMap[leaf.epochKey.toString()] !== undefined) console.log(`The epoch key(${leaf.epochKey}) is seen before`)
            // else this.epochKeyToHashchainMap[leaf.epochKey.toString()] = leaf.hashchainResult
            await this.epochTree[epoch].update(leaf.epochKey, leaf.hashchainResult)
        }
        this.epochTreeLeaves[epoch] = epochTreeLeaves.slice()
        this.epochTreeRoot[epoch] = this.epochTree[epoch].getRootHash()
        this.currentEpoch ++
        this.GSTLeaves[this.currentEpoch] = []
        this.epochKeyInEpoch[this.currentEpoch] = new Map()
        this.globalStateTree[this.currentEpoch] = new IncrementalQuinTree(
            this.setting.globalStateTreeDepth,
            this.setting.defaultGSTLeaf,
            2,
        )
        this.epochGSTRootMap[this.currentEpoch] = new Map()
    }

    /*
     * Add a new state leaf to the list of GST leaves of given epoch.
     */
    public userStateTransition = (
        epoch: number,
        GSTLeaf: BigInt,
        nullifiers: BigInt[],
        blockNumber?: number,
    ) => {
        assert(epoch == this.currentEpoch, `Epoch(${epoch}) must be the same as current epoch`)
        if(blockNumber !== undefined && blockNumber < this.latestProcessedBlock) return
        else this.latestProcessedBlock = blockNumber? blockNumber : this.latestProcessedBlock

        // Check if all nullifiers are not duplicated then update Unirep state
        for (let nullifier of nullifiers) {
            if (nullifier > BigInt(0)) {
                if(this.nullifiers[nullifier.toString()]) return
            }
        }

        // Update Unirep state when all nullifiers are not submitted before
        for (let nullifier of nullifiers) {
            if (nullifier > BigInt(0)) this.nullifiers[nullifier.toString()] = true
        }
        // Only insert non-zero GST leaf (zero GST leaf means the user has epoch keys left to process)
        if (GSTLeaf > BigInt(0)) {
            this.GSTLeaves[epoch].push(GSTLeaf)
            this.globalStateTree[epoch].insert(GSTLeaf)
            this.epochGSTRootMap[epoch].set(this.globalStateTree[epoch].root.toString(), true)
        }
    }

    /*
     * Check if the root is one of the Global state tree roots in the given epoch
     */
    public GSTRootExists = (
        GSTRoot: BigInt | string,
        epoch: number,
    ): boolean => {
        return this.epochGSTRootMap[epoch].has(GSTRoot.toString())
    }

    /*
     * Check if the root is one of the epoch tree roots in the given epoch
     */
    public epochTreeRootExists = async (
        _epochTreeRoot: BigInt | string,
        epoch: number,
    ): Promise<boolean> => {
        if(this.epochTreeRoot[epoch] == undefined) {
            const epochTree = await this.genEpochTree(epoch)
            this.epochTreeRoot[epoch] = epochTree.getRootHash()
        }
        return this.epochTreeRoot[epoch].toString() == _epochTreeRoot.toString()
    }
}

export {
    Attestation,
    IAttestation,
    IEpochTreeLeaf,
    ISettings,
    IUnirepState,
    UnirepState,
}