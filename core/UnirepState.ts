import assert from 'assert'
import { ethers } from 'ethers'
import {
    IncrementalQuinTree,
    hash5,
} from 'maci-crypto'
import { SparseMerkleTreeImpl } from '../crypto/SMT'
import { computeEmptyUserStateRoot, genNewSMT, SMT_ONE_LEAF, SMT_ZERO_LEAF } from './utils'

interface IEpochTreeLeaf {
    epochKey: BigInt;
    hashchainResult: BigInt;
}

interface IAttestation {
    attesterId: BigInt;
    posRep: BigInt;
    negRep: BigInt;
    graffiti: BigInt;
    overwriteGraffiti: boolean;
}

class Attestation implements IAttestation {
    public attesterId: BigInt
    public posRep: BigInt
    public negRep: BigInt
    public graffiti: BigInt
    public overwriteGraffiti: boolean

    constructor(
        _attesterId: BigInt,
        _posRep: BigInt,
        _negRep: BigInt,
        _graffiti: BigInt,
        _overwriteGraffiti: boolean,
    ) {
        this.attesterId = _attesterId
        this.posRep = _posRep
        this.negRep = _negRep
        this.graffiti = _graffiti
        this.overwriteGraffiti = _overwriteGraffiti
    }

    public hash = (): BigInt => {
        return hash5([
            this.attesterId,
            this.posRep,
            this.negRep,
            this.graffiti,
            BigInt(this.overwriteGraffiti),
        ])
    }

    public toJSON = (space = 0): string => {
        return JSON.stringify(
            {
                attesterId: this.attesterId.toString(),
                posRep: this.posRep.toString(),
                negRep: this.negRep.toString(),
                graffiti: this.graffiti.toString(),
                overwriteGraffiti: this.overwriteGraffiti
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
    public nullifierTreeDepth: number
    
    public attestingFee: ethers.BigNumber
    public epochLength: number
    public numEpochKeyNoncePerEpoch: number
    public numAttestationsPerEpochKey: number
    
    public currentEpoch: number
    public defaultGSTLeaf: BigInt
    private GSTLeaves: {[key: number]: BigInt[]} = {}
    private epochTreeLeaves: {[key: number]: IEpochTreeLeaf[]} = {}
    private nullifiers: BigInt[] = []

    private epochKeyToHashchainMap: {[key: string]: BigInt} = {}
    private epochKeyToAttestationsMap: {[key: string]: IAttestation[]} = {}
    public karmaNullifiersMap: {[key: string]: boolean} = {}

    constructor(
        _globalStateTreeDepth: number,
        _userStateTreeDepth: number,
        _epochTreeDepth: number,
        _nullifierTreeDepth: number,
        _attestingFee: ethers.BigNumber,
        _epochLength: number,
        _numEpochKeyNoncePerEpoch: number,
        _numAttestationsPerEpochKey: number,
    ) {

        this.globalStateTreeDepth = _globalStateTreeDepth
        this.userStateTreeDepth = _userStateTreeDepth
        this.epochTreeDepth = _epochTreeDepth
        this.nullifierTreeDepth =_nullifierTreeDepth
        this.attestingFee = _attestingFee
        this.epochLength = _epochLength
        this.numEpochKeyNoncePerEpoch = _numEpochKeyNoncePerEpoch
        this.numAttestationsPerEpochKey = _numAttestationsPerEpochKey

        this.currentEpoch = 1
        this.GSTLeaves[this.currentEpoch] = []
        const emptyUserStateRoot = computeEmptyUserStateRoot(_userStateTreeDepth)
        this.defaultGSTLeaf = hash5([
            BigInt(0),  // zero identityCommitment
            emptyUserStateRoot,  // zero user state root
            BigInt(0), // default airdropped karma
            BigInt(0), // default negative karma
            BigInt(0)
        ])
    }

    public toJSON = (space = 0): string => {
        let latestEpochTreeLeaves
        if (this.currentEpoch == 1) latestEpochTreeLeaves = []
        else latestEpochTreeLeaves = this.epochTreeLeaves[this.currentEpoch - 1].map((l) => `${l.epochKey.toString()}: ${l.hashchainResult.toString()}`)
        return JSON.stringify(
            {
                settings: {
                    globalStateTreeDepth: this.globalStateTreeDepth,
                    userStateTreeDepth: this.userStateTreeDepth,
                    epochTreeDepth: this.epochTreeDepth,
                    nullifierTreeDepth: this.nullifierTreeDepth,
                    attestingFee: this.attestingFee.toString(),
                    epochLength: this.epochLength,
                    numEpochKeyNoncePerEpoch: this.numEpochKeyNoncePerEpoch,
                    numAttestationsPerEpochKey: this.numAttestationsPerEpochKey,
                    defaultGSTLeaf: this.defaultGSTLeaf.toString(),
                },
                currentEpoch: this.currentEpoch,
                latestEpochGSTLeaves: this.GSTLeaves[this.currentEpoch].map((l) => l.toString()),
                latestEpochTreeLeaves: latestEpochTreeLeaves,
                nullifiers: this.nullifiers.map((n) => n.toString())
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
     * Check if given nullifier exists in nullifier tree
     */
    public nullifierExist = (nullifier: BigInt): boolean => {
        if (nullifier === BigInt(0)) {
            console.log("Nullifier 0 exists because it is reserved")
            return true
        }
        return (this.nullifiers.indexOf(nullifier) !== -1)
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
    }

    /*
    * Add karma nullifiers to the map state
    */
    public addKarmaNullifiers = (
        nullifier: BigInt
    ) => {
        if (nullifier > BigInt(0)) {
            this.karmaNullifiersMap[nullifier.toString()] = true
        }
    }

    /*
     * Computes the global state tree of given epoch
     */
    public genGSTree = (epoch: number): IncrementalQuinTree => {
        const GSTree = new IncrementalQuinTree(
            this.globalStateTreeDepth,
            this.defaultGSTLeaf,
            2,
        )

        const leaves = this.GSTLeaves[epoch]
        for (const leaf of leaves) {
            GSTree.insert(leaf)
        }
        return GSTree
    }

    /*
     * Computes the epoch tree of given epoch
     */
    public genEpochTree = async (epoch: number): Promise<SparseMerkleTreeImpl> => {
        const epochTree = await genNewSMT(this.epochTreeDepth, SMT_ONE_LEAF)

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
     * Computes the epoch tree of given epoch
     */
    public genNullifierTree = async (): Promise<SparseMerkleTreeImpl> => {
        const nullifierTree = await genNewSMT(this.nullifierTreeDepth, SMT_ZERO_LEAF)
        // Reserve leaf 0
        await nullifierTree.update(BigInt(0), SMT_ONE_LEAF)

        const leaves = this.nullifiers
        if (leaves.length == 0) return nullifierTree
        else {
            for (const leaf of leaves) {
                await nullifierTree.update(leaf, SMT_ONE_LEAF)
            }
            return nullifierTree
        }
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
    }

    /*
     * Add the leaves of epoch tree of given epoch and increment current epoch number
     */
    public epochTransition = (
        epoch: number,
        epochTreeLeaves: IEpochTreeLeaf[],
    ) => {
        assert(epoch == this.currentEpoch, `Epoch(${epoch}) must be the same as current epoch`)

        // Add to epoch key hash chain map
        for (let leaf of epochTreeLeaves) {
            assert(leaf.epochKey < BigInt(2 ** this.epochTreeDepth), `Epoch key(${leaf.epochKey}) greater than max leaf value(2**epochTreeDepth)`)
            if (this.epochKeyToHashchainMap[leaf.epochKey.toString()] !== undefined) console.log(`The epoch key(${leaf.epochKey}) is seen before`)
            else this.epochKeyToHashchainMap[leaf.epochKey.toString()] = leaf.hashchainResult
        }
        this.epochTreeLeaves[epoch] = epochTreeLeaves.slice()
        this.currentEpoch ++
        this.GSTLeaves[this.currentEpoch] = []
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

        // Only insert non-zero GST leaf (zero GST leaf means the user has epoch keys left to process)
        if (GSTLeaf > BigInt(0)) this.GSTLeaves[epoch].push(GSTLeaf)

        for (let nullifier of nullifiers) {
            if (nullifier > BigInt(0)) {
                assert(nullifier < BigInt(2 ** this.nullifierTreeDepth), `Nullifier(${nullifier}) larger than max leaf value(2**nullifierTreeDepth)`)
                assert(this.nullifiers.indexOf(nullifier) == -1, `Nullifier(${nullifier}) seen before`)
                this.nullifiers.push(nullifier)
            }
        }
    }
}

export {
    Attestation,
    IAttestation,
    IEpochTreeLeaf,
    UnirepState,
}