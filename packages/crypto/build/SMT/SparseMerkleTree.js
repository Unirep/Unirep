"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SparseMerkleTreeImpl = void 0;
/* External Imports */
const assert_1 = __importDefault(require("assert"));
/* Internal Imports */
const crypto_1 = require("../crypto");
class SparseMerkleTreeImpl {
    constructor(db, height) {
        this.db = db;
        this.height = height;
        (0, assert_1.default)(height > 0, 'SMT height needs to be > 0');
        this.numLeaves = BigInt(2 ** height);
    }
    static async create(db, height, zeroHash) {
        const tree = new SparseMerkleTreeImpl(db, height);
        await tree.init(zeroHash);
        return tree;
    }
    async init(zeroHash) {
        await this.populateZeroHashesAndRoot(zeroHash);
    }
    getHeight() {
        return this.height;
    }
    getRootHash() {
        return this.root;
    }
    getZeroHash(index) {
        return this.zeroHashes[index];
    }
    async update(leafKey, leafHash) {
        (0, assert_1.default)(leafKey < this.numLeaves, `leaf key ${leafKey} exceeds total number of leaves ${this.numLeaves}`);
        let nodeIndex = leafKey.valueOf() + this.numLeaves.valueOf();
        let nodeHash;
        const nodeHashString = await this.db.get(nodeIndex.toString());
        if (nodeHashString === leafHash.toString())
            return;
        else
            nodeHash = leafHash;
        await this.db.set(nodeIndex.toString(), nodeHash.toString());
        let isLeftNode = nodeIndex % BigInt(2) === BigInt(0) ? true : false;
        let sibNodeIndex = isLeftNode ? nodeIndex + BigInt(1) : nodeIndex - BigInt(1);
        let sibNodeHash;
        let parentNodeIndex, parentHash;
        for (let i = 0; i < this.height; i++) {
            const sibNodeHashString = await this.db.get(sibNodeIndex.toString());
            if (!sibNodeHashString)
                sibNodeHash = this.zeroHashes[i];
            else
                sibNodeHash = BigInt(sibNodeHashString);
            parentNodeIndex = nodeIndex / BigInt(2);
            parentHash = isLeftNode ? (0, crypto_1.newWrappedPoseidonT3Hash)(nodeHash, sibNodeHash) : (0, crypto_1.newWrappedPoseidonT3Hash)(sibNodeHash, nodeHash);
            await this.db.set(parentNodeIndex.toString(), parentHash.toString());
            nodeIndex = parentNodeIndex;
            nodeHash = parentHash;
            isLeftNode = nodeIndex % BigInt(2) === BigInt(0) ? true : false;
            sibNodeIndex = isLeftNode ? nodeIndex + BigInt(1) : nodeIndex - BigInt(1);
        }
        (0, assert_1.default)(nodeIndex === BigInt(1), "Root node index must be 1");
        this.root = parentHash;
    }
    async getMerkleProof(leafKey) {
        (0, assert_1.default)(leafKey < this.numLeaves, `leaf key ${leafKey} exceeds total number of leaves ${this.numLeaves}`);
        const siblingNodeHashes = [];
        let nodeIndex = leafKey.valueOf() + this.numLeaves.valueOf();
        let isLeftNode = nodeIndex % BigInt(2) === BigInt(0) ? true : false;
        let sibNodeIndex = isLeftNode ? nodeIndex + BigInt(1) : nodeIndex - BigInt(1);
        let sibNodeHash;
        for (let i = 0; i < this.height; i++) {
            const sibNodeHashString = await this.db.get(sibNodeIndex.toString());
            if (!sibNodeHashString)
                sibNodeHash = this.zeroHashes[i];
            else
                sibNodeHash = BigInt(sibNodeHashString);
            siblingNodeHashes.push(sibNodeHash);
            nodeIndex = nodeIndex / BigInt(2);
            isLeftNode = nodeIndex % BigInt(2) === BigInt(0) ? true : false;
            sibNodeIndex = isLeftNode ? nodeIndex + BigInt(1) : nodeIndex - BigInt(1);
        }
        (0, assert_1.default)(siblingNodeHashes.length == this.height, "Incorrect number of proof entries");
        return siblingNodeHashes;
    }
    async verifyMerkleProof(leafKey, proof) {
        (0, assert_1.default)(leafKey < this.numLeaves, `leaf key ${leafKey} exceeds total number of leaves ${this.numLeaves}`);
        (0, assert_1.default)(proof.length == this.height, "Incorrect number of proof entries");
        let nodeIndex = leafKey.valueOf() + this.numLeaves.valueOf();
        let nodeHash;
        const nodeHashString = await this.db.get(nodeIndex.toString());
        if (!nodeHashString)
            nodeHash = this.zeroHashes[0];
        else
            nodeHash = BigInt(nodeHashString);
        let isLeftNode = nodeIndex % BigInt(2) === BigInt(0) ? true : false;
        for (let sibNodeHash of proof) {
            nodeHash = isLeftNode ? (0, crypto_1.newWrappedPoseidonT3Hash)(nodeHash, sibNodeHash) : (0, crypto_1.newWrappedPoseidonT3Hash)(sibNodeHash, nodeHash);
            nodeIndex = nodeIndex / BigInt(2);
            isLeftNode = nodeIndex % BigInt(2) === BigInt(0) ? true : false;
        }
        if (nodeHash === this.root)
            return true;
        else
            return false;
    }
    async populateZeroHashesAndRoot(zeroHash) {
        const hashes = [
            zeroHash,
        ];
        for (let i = 1; i < this.height; i++) {
            hashes[i] = (0, crypto_1.newWrappedPoseidonT3Hash)(hashes[i - 1], hashes[i - 1]);
        }
        this.zeroHashes = hashes;
        this.root = (0, crypto_1.newWrappedPoseidonT3Hash)(hashes[this.height - 1], hashes[this.height - 1]);
    }
}
exports.SparseMerkleTreeImpl = SparseMerkleTreeImpl;
