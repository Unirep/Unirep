/* External Imports */
import assert from 'assert'
import { BigNumber } from "ethers"

/* Internal Imports */
import { newWrappedPoseidonT3Hash } from '../crypto'


export class NewSparseMerkleTreeImpl {
    protected root?: BigInt
    private zeroHashes!: BigInt[]

    public readonly numLeaves: BigNumber

    public static async create(
        db,
        height: number,
        zeroHash: BigInt,
    ): Promise<NewSparseMerkleTreeImpl> {
        const tree = new NewSparseMerkleTreeImpl(db, height)
        await tree.init(zeroHash)
        return tree
    }

    constructor(
        protected db,
        private height: number,
    ) {
        assert(height > 0, 'SMT height needs to be > 0')

        this.numLeaves = BigNumber.from(1).shl(height)
    }

    private async init(zeroHash: BigInt): Promise<void> {
        await this.populateZeroHashesAndRoot(zeroHash)
    }

    public getHeight(): number {
        return this.height
    }

    public getRootHash(): BigInt|undefined {
        return this.root
    }

    public getZeroHash(index: number): BigInt {
        return this.zeroHashes[index]
    }

    public async update(
        leafKey: BigNumber,
        leafHash: BigInt,
    ): Promise<void> {
        assert(leafKey.lt(this.numLeaves), `leaf key ${leafKey.toString()} exceeds total number of leaves ${this.numLeaves.toString()}`)

        let nodeIndex = leafKey.add(this.numLeaves)
        let nodeHash
        const nodeHashString = await this.db.get(nodeIndex.toString())
        if (nodeHashString === leafHash.toString()) return
        else nodeHash = leafHash

        await this.db.set(nodeIndex.toString(), nodeHash.toString())
        
        let isLeftNode = nodeIndex.and(1).eq(0) ? true : false
        let sibNodeIndex = isLeftNode ? nodeIndex.add(1) : nodeIndex.sub(1)
        let sibNodeHash
        let parentNodeIndex, parentHash
        for (let i = 0; i < this.height; i++) {
            const sibNodeHashString = await this.db.get(sibNodeIndex.toString())
            if (!sibNodeHashString) sibNodeHash = this.zeroHashes[i]
            else sibNodeHash = BigInt(sibNodeHashString)
            
            parentNodeIndex = nodeIndex.div(2)
            parentHash = isLeftNode ? newWrappedPoseidonT3Hash(nodeHash, sibNodeHash) : newWrappedPoseidonT3Hash(sibNodeHash, nodeHash)
            await this.db.set(parentNodeIndex.toString(), parentHash.toString())

            nodeIndex = parentNodeIndex
            nodeHash = parentHash
            isLeftNode = nodeIndex.and(1).eq(0) ? true : false
            sibNodeIndex = isLeftNode ? nodeIndex.add(1) : nodeIndex.sub(1)
        }
        assert(nodeIndex.eq(1), "Root node index must be 1")
        this.root = parentHash
    }

    public async getMerkleProof(
        leafKey: BigNumber,
    ): Promise<BigInt[]> {
        assert(leafKey.lt(this.numLeaves), `leaf key ${leafKey.toString()} exceeds total number of leaves ${this.numLeaves.toString()}`)

        const siblingNodeHashes: BigInt[] = []
        let nodeIndex = leafKey.add(this.numLeaves)
        let isLeftNode = nodeIndex.and(1).eq(0) ? true : false
        let sibNodeIndex = isLeftNode ? nodeIndex.add(1) : nodeIndex.sub(1)
        let sibNodeHash
        for (let i = 0; i < this.height; i++) {
            const sibNodeHashString = await this.db.get(sibNodeIndex.toString())
            if (!sibNodeHashString) sibNodeHash = this.zeroHashes[i]
            else sibNodeHash = BigInt(sibNodeHashString)
            siblingNodeHashes.push(sibNodeHash)
            
            nodeIndex = nodeIndex.div(2)
            isLeftNode = nodeIndex.and(1).eq(0) ? true : false
            sibNodeIndex = isLeftNode ? nodeIndex.add(1) : nodeIndex.sub(1)
        }
        assert(siblingNodeHashes.length == this.height, "Incorrect number of proof entries")
        return siblingNodeHashes
    }

    public async verifyMerkleProof(
        leafKey: BigNumber,
        proof: BigInt[]
    ): Promise<boolean> {
        assert(leafKey.lt(this.numLeaves), `leaf key ${leafKey.toString()} exceeds total number of leaves ${this.numLeaves.toString()}`)
        assert(proof.length == this.height, "Incorrect number of proof entries")

        let nodeIndex = leafKey.add(this.numLeaves)
        let nodeHash
        const nodeHashString = await this.db.get(nodeIndex.toString())
        if (!nodeHashString) nodeHash = this.zeroHashes[0]
        else nodeHash = BigInt(nodeHashString)
        let isLeftNode = nodeIndex.and(1).eq(0) ? true : false
        for (let sibNodeHash of proof) {
            nodeHash = isLeftNode ? newWrappedPoseidonT3Hash(nodeHash, sibNodeHash) : newWrappedPoseidonT3Hash(sibNodeHash, nodeHash)
            
            nodeIndex = nodeIndex.div(2)
            isLeftNode = nodeIndex.and(1).eq(0) ? true : false
        }
        if (nodeHash === this.root) return true
        else return false
    }

    private async populateZeroHashesAndRoot(zeroHash: BigInt): Promise<void> {
        const hashes: BigInt[] = [
            zeroHash,
        ]

        for (let i = 1; i < this.height; i++) {
            hashes[i] = newWrappedPoseidonT3Hash(hashes[i - 1], hashes[i - 1])
        }

        this.zeroHashes = hashes

        this.root = hashes[this.height - 1]
    }
}