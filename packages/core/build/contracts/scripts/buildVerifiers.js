"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
const argparse = __importStar(require("argparse"));
const fs = __importStar(require("fs"));
const circuits_1 = require("@unirep/circuits");
const genVerifier_1 = require("./genVerifier");
const main = async () => {
    const parser = new argparse.ArgumentParser({
        description: 'Compile a circom circuit and generate its proving key, verification key, and Solidity verifier'
    });
    parser.add_argument('-s', '--sol-out', {
        help: 'The filepath to save the Solidity verifier contract',
        required: true
    });
    parser.add_argument('-cn', '--circuit-name', {
        help: 'The name of the vkey',
        required: true
    });
    parser.add_argument('-vs', '--verifier-name', {
        help: 'The desired name of the verifier contract',
        required: true
    });
    const args = parser.parse_args();
    const solOut = args.sol_out;
    const verifierName = args.verifier_name;
    const circuitName = args.circuit_name;
    const vKey = await (0, circuits_1.getVKey)(circuitName);
    console.log('Exporting verification contract...');
    const verifier = (0, genVerifier_1.genSnarkVerifierSol)(verifierName, vKey);
    fs.writeFileSync(solOut, verifier);
    return 0;
};
(async () => {
    let exitCode;
    try {
        exitCode = await main();
    }
    catch (err) {
        console.error(err);
        exitCode = 1;
    }
    process.exit(exitCode);
})();
