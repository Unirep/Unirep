export declare class SparseMerkleTree {
    protected db: any;
    private height;
    protected root?: BigInt;
    private zeroHashes;
    readonly numLeaves: BigInt;
    static create(db: any, height: number, zeroHash: BigInt): Promise<SparseMerkleTree>;
    constructor(db: any, height: number);
    private init;
    getHeight(): number;
    getRootHash(): BigInt;
    getZeroHash(index: number): BigInt;
    update(leafKey: BigInt, leafHash: BigInt): Promise<void>;
    getMerkleProof(leafKey: BigInt): Promise<BigInt[]>;
    verifyMerkleProof(leafKey: BigInt, proof: BigInt[]): Promise<boolean>;
    private populateZeroHashesAndRoot;
}
