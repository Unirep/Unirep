import assert from 'assert'
import { ethers } from 'ethers'
import { IncrementalQuinTree, hash5, hashLeftRight, SparseMerkleTreeImpl } from '@unirep/crypto'
import { computeEmptyUserStateRoot, genNewSMT, SMT_ONE_LEAF, } from './utils'

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
    public globalStateTreeDepth: number
    public userStateTreeDepth: number
    public epochTreeDepth: number

    public attestingFee: ethers.BigNumber
    public epochLength: number
    public numEpochKeyNoncePerEpoch: number
    public maxReputationBudget: number
    
    public currentEpoch: number
    public defaultGSTLeaf: BigInt
    public epochTreeRoot: {[key: number]: BigInt} = {}
    private GSTLeaves: {[key: number]: BigInt[]} = {}
    private epochTreeLeaves: {[key: number]: IEpochTreeLeaf[]} = {}
    private nullifiers: {[key: string]: boolean} = {}
    private globalStateTree: {[key: number]: IncrementalQuinTree} = {}
    private epochTree: {[key: number]: SparseMerkleTreeImpl} = {}

    private epochKeyInEpoch: {[key: number]: Map<string, boolean>} = {}
    private epochKeyToHashchainMap: {[key: string]: BigInt} = {}
    private epochKeyToAttestationsMap: {[key: string]: IAttestation[]} = {}
    private epochGSTRootMap: {[key: number]: Map<string, boolean>} = {}

    constructor(
        _globalStateTreeDepth: number,
        _userStateTreeDepth: number,
        _epochTreeDepth: number,
        _attestingFee: ethers.BigNumber,
        _epochLength: number,
        _numEpochKeyNoncePerEpoch: number,
        _maxReputationBudget: number,
    ) {

        this.globalStateTreeDepth = _globalStateTreeDepth
        this.userStateTreeDepth = _userStateTreeDepth
        this.epochTreeDepth = _epochTreeDepth
        this.attestingFee = _attestingFee
        this.epochLength = _epochLength
        this.numEpochKeyNoncePerEpoch = _numEpochKeyNoncePerEpoch
        this.maxReputationBudget = _maxReputationBudget

        this.currentEpoch = 1
        this.GSTLeaves[this.currentEpoch] = []
        this.epochKeyInEpoch[this.currentEpoch] = new Map()
        this.epochTreeRoot[this.currentEpoch] = BigInt(0)
        const emptyUserStateRoot = computeEmptyUserStateRoot(_userStateTreeDepth)
        this.defaultGSTLeaf = hashLeftRight(BigInt(0), emptyUserStateRoot)
        this.globalStateTree[this.currentEpoch] = new IncrementalQuinTree(
            this.globalStateTreeDepth,
            this.defaultGSTLeaf,
            2,
        )
        this.epochGSTRootMap[this.currentEpoch] = new Map()
    }

    public toJSON = (space = 0): string => {
        let latestEpochTreeLeaves
        let latestEpothTreeRoot
        if (this.currentEpoch == 1) { 
            latestEpochTreeLeaves = []
            latestEpothTreeRoot = BigInt(0).toString()
        }
        else {
            latestEpochTreeLeaves = this.epochTreeLeaves[this.currentEpoch - 1].map((l) => `${l.epochKey.toString()}: ${l.hashchainResult.toString()}`)
            latestEpothTreeRoot = this.epochTreeRoot[this.currentEpoch - 1].toString()
        }
        return JSON.stringify(
            {
                settings: {
                    globalStateTreeDepth: this.globalStateTreeDepth,
                    userStateTreeDepth: this.userStateTreeDepth,
                    epochTreeDepth: this.epochTreeDepth,
                    attestingFee: this.attestingFee.toString(),
                    epochLength: this.epochLength,
                    numEpochKeyNoncePerEpoch: this.numEpochKeyNoncePerEpoch,
                    maxReputationBudget: this.maxReputationBudget,
                    defaultGSTLeaf: this.defaultGSTLeaf.toString(),
                },
                currentEpoch: this.currentEpoch,
                latestEpochGSTLeaves: this.GSTLeaves[this.currentEpoch].map((l) => l.toString()),
                latestEpochTreeLeaves: latestEpochTreeLeaves,
                latestEpochTreeRoot: latestEpothTreeRoot,
                globalStateTreeRoots: Array.from(this.epochGSTRootMap[this.currentEpoch].keys()),
                nullifiers: this.nullifiers
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

    /*
     * Get the hash chain result of given epoch key
     */
    public getHashchain = (epochKey: string): BigInt => {
        const DefaultHashchainResult = SMT_ONE_LEAF
        const hashchain = this.epochKeyToHashchainMap[epochKey]
        if (!hashchain) return DefaultHashchainResult
        else return hashchain
    }

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
    ) => {
        const attestations = this.epochKeyToAttestationsMap[epochKey]
        if (!attestations) this.epochKeyToAttestationsMap[epochKey] = []
        this.epochKeyToAttestationsMap[epochKey].push(attestation)
        this.epochKeyInEpoch[this.currentEpoch].set(epochKey, true)
        if (this.epochKeyToHashchainMap[epochKey] == undefined){
            this.epochKeyToHashchainMap[epochKey] = BigInt(0)
        }
        this.epochKeyToHashchainMap[epochKey] = hashLeftRight(
            attestation.hash(),
            this.epochKeyToHashchainMap[epochKey],
        )
    }

    /*
    * Add reputation nullifiers to the map state
    */
    public addReputationNullifiers = (
        nullifier: BigInt
    ) => {
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
    public genEpochTree = (epoch: number): SparseMerkleTreeImpl => {
        return this.epochTree[epoch]
    }


    /*
     * Add a new state leaf to the list of GST leaves of given epoch.
     */
    public signUp = (
        epoch: number,
        GSTLeaf: BigInt,
    ) => {
        assert(epoch == this.currentEpoch, `Epoch(${epoch}) must be the same as current epoch`)

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
    ) => {
        assert(epoch == this.currentEpoch, `Epoch(${epoch}) must be the same as current epoch`)
        this.epochTree[epoch] = await genNewSMT(this.epochTreeDepth, SMT_ONE_LEAF)
        const epochTreeLeaves: IEpochTreeLeaf[] = []

        // seal all epoch keys in current epoch
        const epochKeys = this.getEpochKeys(epoch)
        for (let epochKey of epochKeys) {
            this.epochKeyToHashchainMap[epochKey] = hashLeftRight(
                BigInt(1),
                this.epochKeyToHashchainMap[epochKey]
            )
            const epochTreeLeaf: IEpochTreeLeaf = {
                epochKey: BigInt(epochKey),
                hashchainResult: this.epochKeyToHashchainMap[epochKey]
            }
            epochTreeLeaves.push(epochTreeLeaf)
        }

        // Add to epoch key hash chain map
        for (let leaf of epochTreeLeaves) {
            assert(leaf.epochKey < BigInt(2 ** this.epochTreeDepth), `Epoch key(${leaf.epochKey}) greater than max leaf value(2**epochTreeDepth)`)
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
            this.globalStateTreeDepth,
            this.defaultGSTLeaf,
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
    ) => {
        assert(epoch == this.currentEpoch, `Epoch(${epoch}) must be the same as current epoch`)

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
    public epochTreeRootExists = (
        _epochTreeRoot: BigInt | string,
        epoch: number,
    ): boolean => {
        return this.epochTreeRoot[epoch].toString() == _epochTreeRoot.toString()
    }
}

export {
    Attestation,
    IAttestation,
    IEpochTreeLeaf,
    UnirepState,
}