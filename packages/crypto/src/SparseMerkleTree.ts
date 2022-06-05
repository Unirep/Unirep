/* External Imports */
import assert from 'assert'

/* Internal Imports */
import * as crypto from './crypto'

const newWrappedPoseidonT3Hash = (
    ...elements: crypto.SnarkBigInt[]
): crypto.SnarkBigInt => {
    let result: crypto.SnarkBigInt
    if (elements.length == 1) {
        result = crypto.hashOne(elements[0])
    } else if (elements.length == 2) {
        result = crypto.hashLeftRight(elements[0], elements[1])
    } else {
        throw new Error(
            `elements length should not greater than 2, got ${elements.length}`
        )
    }

    return result
}

export class SparseMerkleTree {
    protected _root?: BigInt
    private zeroHashes!: BigInt[]

    public readonly numLeaves: BigInt

    public static async create(
        db,
        _height: number,
        zeroHash: BigInt
    ): Promise<SparseMerkleTree> {
        const tree = new SparseMerkleTree(db, _height)
        await tree.init(zeroHash)
        return tree
    }

    constructor(protected db, private _height: number) {
        assert(_height > 0, 'SMT height needs to be > 0')

        this.numLeaves = BigInt(2 ** _height)
    }

    private async init(zeroHash: BigInt): Promise<void> {
        await this.populateZeroHashesAndRoot(zeroHash)
    }

    get height() {
        return this._height
    }

    get root() {
        return this._root
    }

    public getZeroHash(index: number): BigInt {
        return this.zeroHashes[index]
    }

    public async update(leafKey: BigInt, leafHash: BigInt): Promise<void> {
        assert(
            leafKey < this.numLeaves,
            `leaf key ${leafKey} exceeds total number of leaves ${this.numLeaves}`
        )

        let nodeIndex = leafKey.valueOf() + this.numLeaves.valueOf()
        let nodeHash
        const nodeHashString = await this.db.get(nodeIndex.toString())
        if (nodeHashString === leafHash.toString()) return
        else nodeHash = leafHash

        await this.db.set(nodeIndex.toString(), nodeHash.toString())

        let isLeftNode = nodeIndex % BigInt(2) === BigInt(0) ? true : false
        let sibNodeIndex = isLeftNode
            ? nodeIndex + BigInt(1)
            : nodeIndex - BigInt(1)
        let sibNodeHash
        let parentNodeIndex, parentHash
        for (let i = 0; i < this.height; i++) {
            const sibNodeHashString = await this.db.get(sibNodeIndex.toString())
            if (!sibNodeHashString) sibNodeHash = this.zeroHashes[i]
            else sibNodeHash = BigInt(sibNodeHashString)

            parentNodeIndex = nodeIndex / BigInt(2)
            parentHash = isLeftNode
                ? newWrappedPoseidonT3Hash(nodeHash, sibNodeHash)
                : newWrappedPoseidonT3Hash(sibNodeHash, nodeHash)
            await this.db.set(parentNodeIndex.toString(), parentHash.toString())

            nodeIndex = parentNodeIndex
            nodeHash = parentHash
            isLeftNode = nodeIndex % BigInt(2) === BigInt(0) ? true : false
            sibNodeIndex = isLeftNode
                ? nodeIndex + BigInt(1)
                : nodeIndex - BigInt(1)
        }
        assert(nodeIndex === BigInt(1), 'Root node index must be 1')
        this._root = parentHash
    }

    public async createProof(leafKey: BigInt): Promise<BigInt[]> {
        assert(
            leafKey < this.numLeaves,
            `leaf key ${leafKey} exceeds total number of leaves ${this.numLeaves}`
        )

        const siblingNodeHashes: BigInt[] = []
        let nodeIndex = leafKey.valueOf() + this.numLeaves.valueOf()
        let isLeftNode = nodeIndex % BigInt(2) === BigInt(0) ? true : false
        let sibNodeIndex = isLeftNode
            ? nodeIndex + BigInt(1)
            : nodeIndex - BigInt(1)
        let sibNodeHash
        for (let i = 0; i < this.height; i++) {
            const sibNodeHashString = await this.db.get(sibNodeIndex.toString())
            if (!sibNodeHashString) sibNodeHash = this.zeroHashes[i]
            else sibNodeHash = BigInt(sibNodeHashString)
            siblingNodeHashes.push(sibNodeHash)

            nodeIndex = nodeIndex / BigInt(2)
            isLeftNode = nodeIndex % BigInt(2) === BigInt(0) ? true : false
            sibNodeIndex = isLeftNode
                ? nodeIndex + BigInt(1)
                : nodeIndex - BigInt(1)
        }
        assert(
            siblingNodeHashes.length == this.height,
            'Incorrect number of proof entries'
        )
        return siblingNodeHashes
    }

    public async verifyMerkleProof(
        leafKey: BigInt,
        proof: BigInt[]
    ): Promise<boolean> {
        assert(
            leafKey < this.numLeaves,
            `leaf key ${leafKey} exceeds total number of leaves ${this.numLeaves}`
        )
        assert(proof.length == this.height, 'Incorrect number of proof entries')

        let nodeIndex = leafKey.valueOf() + this.numLeaves.valueOf()
        let nodeHash
        const nodeHashString = await this.db.get(nodeIndex.toString())
        if (!nodeHashString) nodeHash = this.zeroHashes[0]
        else nodeHash = BigInt(nodeHashString)
        let isLeftNode = nodeIndex % BigInt(2) === BigInt(0) ? true : false
        for (let sibNodeHash of proof) {
            nodeHash = isLeftNode
                ? newWrappedPoseidonT3Hash(nodeHash, sibNodeHash)
                : newWrappedPoseidonT3Hash(sibNodeHash, nodeHash)

            nodeIndex = nodeIndex / BigInt(2)
            isLeftNode = nodeIndex % BigInt(2) === BigInt(0) ? true : false
        }
        if (nodeHash === this.root) return true
        else return false
    }

    private async populateZeroHashesAndRoot(zeroHash: BigInt): Promise<void> {
        const hashes: BigInt[] = [zeroHash]

        for (let i = 1; i < this.height; i++) {
            hashes[i] = newWrappedPoseidonT3Hash(hashes[i - 1], hashes[i - 1])
        }

        this.zeroHashes = hashes

        this._root = newWrappedPoseidonT3Hash(
            hashes[this.height - 1],
            hashes[this.height - 1]
        )
    }
}
