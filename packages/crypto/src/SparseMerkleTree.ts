import assert from 'assert'
import { hashLeftRight } from './crypto'

/**
 * The SparseMerkleTree class is a TypeScript implementation of sparse merkle tree with specified tree depth and it provides all the functions to create efficient trees and to generate and verify proofs of membership.
 */
export class SparseMerkleTree {
    protected _root: BigInt
    private zeroHashes!: BigInt[]
    private node: { [key: string]: BigInt }[]

    public readonly numLeaves: BigInt

    /**
     * Initialize the sparse merkle tree with customized depth and default value of leaves
     * @param _height The fixed depth of the sparse merkle tree
     * @param zeroHash The default value of empty leaves
     */
    constructor(private _height: number, zeroHash: BigInt = BigInt(0)) {
        assert(_height > 0, 'SMT height needs to be > 0')
        // prevent get method returns undefined
        this._root = BigInt(0)
        this._height = _height
        this.node = Array(this._height)
            .fill(null)
            .map(() => ({}))
        this.init(zeroHash)

        this.numLeaves = BigInt(2 ** _height)
    }

    /**
     * Compute the sparse merkle tree root of given `zeroHash`
     * @param zeroHash The default value of empty leaves
     */
    private init(zeroHash: BigInt): void {
        const hashes = Array(this.height).fill(null) as BigInt[]
        hashes[0] = zeroHash
        for (let i = 1; i < this.height; i++) {
            hashes[i] = hashLeftRight(hashes[i - 1], hashes[i - 1])
        }
        this.zeroHashes = hashes
        this._root = hashLeftRight(
            hashes[this.height - 1],
            hashes[this.height - 1]
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
    public getZeroHash(index: number): BigInt {
        return this.zeroHashes[index]
    }

    /**
     * Insert a value into a specified index of the sparse merkle tree
     * @param leafKey The index of the tree leaves that user wants to insert the leaf
     * @param leafValue The value of the leaf that the user wants to insert
     */
    public update(leafKey: BigInt, leafValue: BigInt): void {
        assert(
            leafKey < this.numLeaves,
            `leaf key ${leafKey} exceeds total number of leaves ${this.numLeaves}`
        )

        let nodeIndex = leafKey.valueOf()

        let hash = leafValue.valueOf()
        for (let i = 0; i < this.height; i++) {
            this.node[i][nodeIndex.toString()] = hash
            if (nodeIndex % BigInt(2) === BigInt(0)) {
                const sibling =
                    this.node[i][(nodeIndex + BigInt(1)).toString()] ??
                    this.zeroHashes[i]
                hash = hashLeftRight(hash, sibling)
            } else {
                const sibling =
                    this.node[i][(nodeIndex - BigInt(1)).toString()] ??
                    this.zeroHashes[i]
                hash = hashLeftRight(sibling, hash)
            }
            nodeIndex /= BigInt(2)
        }
        this._root = hash
    }

    /**
     * Creates a merkle proof to prove the membership of a tree entry.
     * @param leafKey A key of an existing or a non-existing entry.
     * @returns A merkle proof of a given `leafKey`
     */
    public createProof(leafKey: BigInt): BigInt[] {
        assert(
            leafKey < this.numLeaves,
            `leaf key ${leafKey} exceeds total number of leaves ${this.numLeaves}`
        )

        const siblingNodeHashes: BigInt[] = []
        let nodeIndex = leafKey.valueOf()
        for (let i = 0; i < this.height; i++) {
            if (nodeIndex % BigInt(2) === BigInt(0)) {
                const sibling =
                    this.node[i][(nodeIndex + BigInt(1)).toString()] ??
                    this.zeroHashes[i]
                siblingNodeHashes.push(sibling)
            } else {
                const sibling =
                    this.node[i][(nodeIndex - BigInt(1)).toString()] ??
                    this.zeroHashes[i]
                siblingNodeHashes.push(sibling)
            }
            nodeIndex /= BigInt(2)
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
    public verifyProof(leafKey: BigInt, proof: BigInt[]): boolean {
        assert(
            leafKey < this.numLeaves,
            `leaf key ${leafKey} exceeds total number of leaves ${this.numLeaves}`
        )
        assert(proof.length == this.height, 'Incorrect number of proof entries')

        let nodeIndex = leafKey.valueOf()
        let nodeHash = this.node[0][nodeIndex.toString()] ?? this.zeroHashes[0]
        for (let sibNodeHash of proof) {
            const isLeftNode = nodeIndex % BigInt(2) === BigInt(0)
            nodeHash = isLeftNode
                ? hashLeftRight(nodeHash, sibNodeHash)
                : hashLeftRight(sibNodeHash, nodeHash)
            nodeIndex = nodeIndex / BigInt(2)
        }
        return nodeHash === this.root
    }
}
