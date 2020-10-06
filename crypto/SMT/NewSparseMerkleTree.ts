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

    // public async getMerkleProof(
    //     leafKey: BigNumber,
    //     leafValue: Buffer,
    //     unknownValue: boolean = false
    // ): Promise<MerkleTreeInclusionProof> {
    //     if (!this.root || !this.root.hash) {
    //         return undefined!
    //     }

    //     let node: MerkleTreeNode = this.root
    //     const siblings: Buffer[] = []
    //     for (
    //         let depth = 0;
    //         depth < (this.height - 1) &&
    //         !!node &&
    //         !!node.value &&
    //         node.value.length === 64;
    //         depth++
    //     ) {
    //         siblings.push(this.getChildSiblingHash(node, depth, leafKey))
    //         node = await this.getChild(node, depth, leafKey)
    //     }

    //     const nodeHash = bufToHexString(node.hash)
    //     const zHashes = this.zeroHashes.map((h) => bufToHexString(h))
    //     const zeroHashIndex = zHashes.indexOf(nodeHash)
    //     // Fill the rest siblings with zeroHashes if
    //     // previous step is stopped because a node with zeroHash is reached
    //     if ( (siblings.length !== this.height - 1) && zeroHashIndex >= 0) {
    //         const numZHashesToFill = this.height - 1 - siblings.length
    //         for ( let i = 0; i < numZHashesToFill; i++ ) {
    //             siblings.push(this.zeroHashes[zeroHashIndex + 1 + i])
    //         }
    //     }
    //     if (siblings.length !== this.height - 1) {
    //         // TODO: A much better way of indicating this
    //         return {
    //             rootHash: undefined!,
    //             key: undefined!,
    //             value: undefined!,
    //             siblings: undefined!,
    //         }
    //     }

    //     // Verify node hash against hash of leaf value if leaf value is known
    //     if (!unknownValue) {
    //         if (!node.hash.equals(newWrappedPoseidonT3Hash(leafValue))) {
    //             // Provided leaf doesn't match stored leaf
    //             return undefined!
    //         }
    //     }

    //     const result: MerkleTreeInclusionProof = {
    //         rootHash: this.root.hash,
    //         key: leafKey,
    //         value: leafValue,
    //         siblings: siblings.reverse(),
    //     }

    //     if (!result || !!result.rootHash) {
    //         return result
    //     }

    //     // If this is for an empty leaf, we can store it and create a MerkleProof
    //     let defaultLeafValue: Buffer
    //     if (this.hasDefaultLeafHash) defaultLeafValue = NewSparseMerkleTreeImpl.unknownLeafValueBuffer
    //     else defaultLeafValue = NewSparseMerkleTreeImpl.emptyBuffer
    //     if (leafValue.equals(defaultLeafValue)) {
    //         if (await this.verifyAndStorePartiallyEmptyPath(leafKey)) {
    //             return this.getMerkleProof(leafKey, leafValue)
    //         }
    //     }
    //     return undefined!
    // }

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