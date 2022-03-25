"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SparseMerkleTree = void 0;
/* External Imports */
const assert_1 = __importDefault(require("assert"));
/* Internal Imports */
const crypto = __importStar(require("./crypto"));
const newWrappedPoseidonT3Hash = (...elements) => {
    let result;
    if (elements.length == 1) {
        result = crypto.hashOne(elements[0]);
    }
    else if (elements.length == 2) {
        result = crypto.hashLeftRight(elements[0], elements[1]);
    }
    else {
        throw new Error(`elements length should not greater than 2, got ${elements.length}`);
    }
    return result;
};
class SparseMerkleTree {
    constructor(db, height) {
        this.db = db;
        this.height = height;
        (0, assert_1.default)(height > 0, 'SMT height needs to be > 0');
        this.numLeaves = BigInt(2 ** height);
    }
    static async create(db, height, zeroHash) {
        const tree = new SparseMerkleTree(db, height);
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
        let sibNodeIndex = isLeftNode
            ? nodeIndex + BigInt(1)
            : nodeIndex - BigInt(1);
        let sibNodeHash;
        let parentNodeIndex, parentHash;
        for (let i = 0; i < this.height; i++) {
            const sibNodeHashString = await this.db.get(sibNodeIndex.toString());
            if (!sibNodeHashString)
                sibNodeHash = this.zeroHashes[i];
            else
                sibNodeHash = BigInt(sibNodeHashString);
            parentNodeIndex = nodeIndex / BigInt(2);
            parentHash = isLeftNode
                ? newWrappedPoseidonT3Hash(nodeHash, sibNodeHash)
                : newWrappedPoseidonT3Hash(sibNodeHash, nodeHash);
            await this.db.set(parentNodeIndex.toString(), parentHash.toString());
            nodeIndex = parentNodeIndex;
            nodeHash = parentHash;
            isLeftNode = nodeIndex % BigInt(2) === BigInt(0) ? true : false;
            sibNodeIndex = isLeftNode
                ? nodeIndex + BigInt(1)
                : nodeIndex - BigInt(1);
        }
        (0, assert_1.default)(nodeIndex === BigInt(1), 'Root node index must be 1');
        this.root = parentHash;
    }
    async getMerkleProof(leafKey) {
        (0, assert_1.default)(leafKey < this.numLeaves, `leaf key ${leafKey} exceeds total number of leaves ${this.numLeaves}`);
        const siblingNodeHashes = [];
        let nodeIndex = leafKey.valueOf() + this.numLeaves.valueOf();
        let isLeftNode = nodeIndex % BigInt(2) === BigInt(0) ? true : false;
        let sibNodeIndex = isLeftNode
            ? nodeIndex + BigInt(1)
            : nodeIndex - BigInt(1);
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
            sibNodeIndex = isLeftNode
                ? nodeIndex + BigInt(1)
                : nodeIndex - BigInt(1);
        }
        (0, assert_1.default)(siblingNodeHashes.length == this.height, 'Incorrect number of proof entries');
        return siblingNodeHashes;
    }
    async verifyMerkleProof(leafKey, proof) {
        (0, assert_1.default)(leafKey < this.numLeaves, `leaf key ${leafKey} exceeds total number of leaves ${this.numLeaves}`);
        (0, assert_1.default)(proof.length == this.height, 'Incorrect number of proof entries');
        let nodeIndex = leafKey.valueOf() + this.numLeaves.valueOf();
        let nodeHash;
        const nodeHashString = await this.db.get(nodeIndex.toString());
        if (!nodeHashString)
            nodeHash = this.zeroHashes[0];
        else
            nodeHash = BigInt(nodeHashString);
        let isLeftNode = nodeIndex % BigInt(2) === BigInt(0) ? true : false;
        for (let sibNodeHash of proof) {
            nodeHash = isLeftNode
                ? newWrappedPoseidonT3Hash(nodeHash, sibNodeHash)
                : newWrappedPoseidonT3Hash(sibNodeHash, nodeHash);
            nodeIndex = nodeIndex / BigInt(2);
            isLeftNode = nodeIndex % BigInt(2) === BigInt(0) ? true : false;
        }
        if (nodeHash === this.root)
            return true;
        else
            return false;
    }
    async populateZeroHashesAndRoot(zeroHash) {
        const hashes = [zeroHash];
        for (let i = 1; i < this.height; i++) {
            hashes[i] = newWrappedPoseidonT3Hash(hashes[i - 1], hashes[i - 1]);
        }
        this.zeroHashes = hashes;
        this.root = newWrappedPoseidonT3Hash(hashes[this.height - 1], hashes[this.height - 1]);
    }
}
exports.SparseMerkleTree = SparseMerkleTree;
