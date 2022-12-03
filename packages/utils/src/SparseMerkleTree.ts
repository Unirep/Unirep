import assert from 'assert'
import { poseidon } from './crypto'

/**
 * The SparseMerkleTree class is a TypeScript implementation of sparse merkle tree with specified tree depth and it provides all the functions to create efficient trees and to generate and verify proofs of membership.
 */
export class SparseMerkleTree {
    protected _root: bigint
    protected arity: number
    private zeroHashes!: bigint[]
    private node: { [key: string]: bigint }[]

    public readonly numLeaves: bigint

    /**
     * Initialize the sparse merkle tree with customized depth and default value of leaves
     * @param _height The fixed depth of the sparse merkle tree
     * @param zeroHash The default value of empty leaves
     */
    constructor(
        private _height: number,
        zeroHash: bigint = BigInt(0),
        arity: number = 2
    ) {
        assert(_height > 0, 'SMT height needs to be > 0')
        assert(
            arity >= 2 && arity <= 16,
            'arity must be between 2 and 16 inclusive'
        )
        // prevent get method returns undefined
        this._root = BigInt(0)
        this.arity = arity
        this._height = _height
        this.node = Array(this._height)
            .fill(null)
            .map(() => ({}))
        this.init(zeroHash)

        this.numLeaves = BigInt(BigInt(arity) ** BigInt(_height))
    }

    /**
     * Compute the sparse merkle tree root of given `zeroHash`
     * @param zeroHash The default value of empty leaves
     */
    private init(zeroHash: bigint): void {
        const hashes = Array(this.height).fill(null)
        hashes[0] = zeroHash
        for (let i = 1; i < this.height; i++) {
            const inputs = Array(this.arity)
                .fill(null)
                .map(() => hashes[i - 1])
            hashes[i] = poseidon(inputs)
        }
        this.zeroHashes = hashes
        this._root = poseidon(
            Array(this.arity)
                .fill(null)
                .map(() => hashes[this.height - 1])
        )
    }

    /**
     * Get the depth of the sparse merkle tree
     * @returns The depth of the sparse merkle tree
     */
    get height() {
        return this._height
    }

    /**
     * Get current sparse merkle tree root
     * @returns Current sparse mekle tree root
     */
    get root() {
        return this._root
    }

    /**
     * Get the value of default leaf that are hashed for `index` times
     * if index =`0`, return the default leaf value
     * @param index The index of the `zeroHashes` array, which indicates the `zeroHash` has been hased for `index` times
     * @returns return the hash value of `zeroHashes` array
     */
    public getZeroHash(index: number): bigint {
        return this.zeroHashes[index]
    }

    /**
     * Insert a value into a specified index of the sparse merkle tree
     * @param leafKey The index of the tree leaves that user wants to insert the leaf
     * @param leafValue The value of the leaf that the user wants to insert
     */
    public update(leafKey: bigint, leafValue: bigint): void {
        assert(
            leafKey < this.numLeaves,
            `leaf key ${leafKey} exceeds total number of leaves ${this.numLeaves}`
        )

        let nodeIndex = leafKey.valueOf()
        let hash = leafValue.valueOf()

        for (let i = 0; i < this.height; i++) {
            this.node[i][nodeIndex.toString()] = hash
            const nodeSiblingIndex = nodeIndex % BigInt(this.arity)
            const startIndex = nodeIndex - nodeSiblingIndex
            const inputs = [] as bigint[]
            for (let j = 0; j < this.arity; j++) {
                if (BigInt(j) === nodeSiblingIndex) {
                    inputs.push(hash)
                } else {
                    inputs.push(
                        this.node[i][(startIndex + BigInt(j)).toString()] ??
                            this.zeroHashes[i]
                    )
                }
            }
            hash = poseidon(inputs)
            nodeIndex = nodeIndex / BigInt(this.arity)
        }
        this._root = hash
    }

    public getLeaf(index: bigint): bigint {
        return this.node[0][index.toString()] ?? this.zeroHashes[0]
    }

    /**
     * Creates a merkle proof to prove the membership of a tree entry.
     * @param leafKey A key of an existing or a non-existing entry.
     * @returns A merkle proof of a given `leafKey`
     */
    public createProof(leafKey: bigint): bigint[][] {
        assert(
            leafKey < this.numLeaves,
            `leaf key ${leafKey} exceeds total number of leaves ${this.numLeaves}`
        )

        const siblingNodeHashes: bigint[][] = Array(this.height)
            .fill(null)
            .map(() => [])
        let nodeIndex = leafKey.valueOf()
        for (let i = 0; i < this.height; i++) {
            const nodeSiblingIndex = nodeIndex % BigInt(this.arity)
            const startIndex = nodeIndex - nodeSiblingIndex
            for (let j = 0; j < this.arity; j++) {
                if (BigInt(j) === nodeSiblingIndex) {
                    siblingNodeHashes[i].push(BigInt(0))
                } else {
                    siblingNodeHashes[i].push(
                        this.node[i][(startIndex + BigInt(j)).toString()] ??
                            this.zeroHashes[i]
                    )
                }
            }
            nodeIndex = nodeIndex / BigInt(this.arity)
        }
        assert(
            siblingNodeHashes.length == this.height,
            'Incorrect number of proof entries'
        )
        return siblingNodeHashes
    }

    /**
     * Verifies a membership proof.
     * @param leafKey  A key of an existing or a non-existing entry.
     * @param proof The merkle proof of given `leafkey`
     * @returns True if the proof is valid, false otherwise
     */
    public verifyProof(leafKey: bigint, proof: bigint[][]): boolean {
        assert(
            leafKey < this.numLeaves,
            `leaf key ${leafKey} exceeds total number of leaves ${this.numLeaves}`
        )
        assert(proof.length == this.height, 'Incorrect number of proof entries')

        let nodeIndex = leafKey.valueOf()
        let nodeHash = this.node[0][nodeIndex.toString()] ?? this.zeroHashes[0]
        for (let sibNodeHashes of proof) {
            const leafIndex = nodeIndex % BigInt(this.arity)
            const inputs = sibNodeHashes.map((v, i) => {
                return BigInt(i) === leafIndex ? nodeHash : v
            })
            nodeHash = poseidon(inputs)
            nodeIndex = nodeIndex / BigInt(this.arity)
        }
        return nodeHash === this.root
    }
}
