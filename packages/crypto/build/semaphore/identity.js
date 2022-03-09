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
Object.defineProperty(exports, "__esModule", { value: true });
exports.unSerialiseIdentity = exports.serialiseIdentity = exports.genIdentityCommitment = exports.genIdentity = exports.genPubKey = void 0;
const circomlib = __importStar(require("circomlib"));
const bigintConversion = __importStar(require("bigint-conversion"));
const crypto = __importStar(require("crypto"));
const genRandomBuffer = (numBytes = 32) => {
    return crypto.randomBytes(numBytes);
};
const genPubKey = (privKey) => {
    const pubKey = circomlib.eddsa.prv2pub(privKey);
    return pubKey;
};
exports.genPubKey = genPubKey;
const genEddsaKeyPair = (privKey = genRandomBuffer()) => {
    const pubKey = genPubKey(privKey);
    return { pubKey, privKey };
};
const genIdentity = (privKey = genRandomBuffer(32)) => {
    // The identity nullifier and identity trapdoor are separate random 31-byte
    // values
    return {
        keypair: genEddsaKeyPair(privKey),
        identityNullifier: bigintConversion.bufToBigint(genRandomBuffer(31)),
        identityTrapdoor: bigintConversion.bufToBigint(genRandomBuffer(31)),
    };
};
exports.genIdentity = genIdentity;
const serializeIdentity = (identity) => {
    const data = [
        identity.keypair.privKey.toString('hex'),
        identity.identityNullifier.toString(16),
        identity.identityTrapdoor.toString(16),
    ];
    return JSON.stringify(data);
};
const unSerializeIdentity = (serialisedIdentity) => {
    const data = JSON.parse(serialisedIdentity);
    return {
        keypair: genEddsaKeyPair(Buffer.from(data[0], 'hex')),
        identityNullifier: bigintConversion.hexToBigint(data[1]),
        identityTrapdoor: bigintConversion.hexToBigint(data[2]),
    };
};
const serialiseIdentity = serializeIdentity;
exports.serialiseIdentity = serialiseIdentity;
const unSerialiseIdentity = unSerializeIdentity;
exports.unSerialiseIdentity = unSerialiseIdentity;
const genIdentityCommitment = (identity) => {
    return circomlib.poseidon([
        circomlib.babyJub.mulPointEscalar(identity.keypair.pubKey, 8)[0],
        identity.identityNullifier,
        identity.identityTrapdoor,
    ]);
};
exports.genIdentityCommitment = genIdentityCommitment;
