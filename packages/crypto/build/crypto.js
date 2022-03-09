"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newWrappedPoseidonT3Hash = exports.wrappedPoseidonT3Hash = exports.IncrementalQuinTree = exports.unstringifyBigInts = exports.stringifyBigInts = exports.hashLeftRight = exports.hashOne = exports.hash5 = exports.genRandomSalt = exports.SNARK_FIELD_SIZE = exports.NOTHING_UP_MY_SLEEVE = void 0;
const ethers_1 = require("ethers");
const maci_crypto_1 = require("maci-crypto");
Object.defineProperty(exports, "SNARK_FIELD_SIZE", { enumerable: true, get: function () { return maci_crypto_1.SNARK_FIELD_SIZE; } });
Object.defineProperty(exports, "genRandomSalt", { enumerable: true, get: function () { return maci_crypto_1.genRandomSalt; } });
Object.defineProperty(exports, "hash5", { enumerable: true, get: function () { return maci_crypto_1.hash5; } });
Object.defineProperty(exports, "hashOne", { enumerable: true, get: function () { return maci_crypto_1.hashOne; } });
Object.defineProperty(exports, "hashLeftRight", { enumerable: true, get: function () { return maci_crypto_1.hashLeftRight; } });
Object.defineProperty(exports, "stringifyBigInts", { enumerable: true, get: function () { return maci_crypto_1.stringifyBigInts; } });
Object.defineProperty(exports, "unstringifyBigInts", { enumerable: true, get: function () { return maci_crypto_1.unstringifyBigInts; } });
Object.defineProperty(exports, "IncrementalQuinTree", { enumerable: true, get: function () { return maci_crypto_1.IncrementalQuinTree; } });
// A nothing-up-my-sleeve zero value
// Should be equal to 16916383162496104613127564537688207714240750091683495371401923915264313510848
const NOTHING_UP_MY_SLEEVE = BigInt(ethers_1.ethers.utils.solidityKeccak256(['bytes'], [ethers_1.ethers.utils.toUtf8Bytes('Unirep')])) % maci_crypto_1.SNARK_FIELD_SIZE;
exports.NOTHING_UP_MY_SLEEVE = NOTHING_UP_MY_SLEEVE;
const newWrappedPoseidonT3Hash = (...elements) => {
    let result;
    if (elements.length == 1) {
        result = (0, maci_crypto_1.hashOne)(elements[0]);
    }
    else if (elements.length == 2) {
        result = (0, maci_crypto_1.hashLeftRight)(elements[0], elements[1]);
    }
    else {
        throw new Error(`elements length should not greater than 2, got ${elements.length}`);
    }
    return result;
};
exports.newWrappedPoseidonT3Hash = newWrappedPoseidonT3Hash;
const wrappedPoseidonT3Hash = (...elements) => {
    let result;
    if (elements.length == 1) {
        result = (0, maci_crypto_1.hashOne)(elements[0]);
    }
    else if (elements.length == 2) {
        result = (0, maci_crypto_1.hashLeftRight)(elements[0], elements[1]);
    }
    else {
        throw new Error(`elements length should not greater than 2, got ${elements.length}`);
    }
    return ethers_1.ethers.utils.hexZeroPad('0x' + result.toString(16), 32);
};
exports.wrappedPoseidonT3Hash = wrappedPoseidonT3Hash;
