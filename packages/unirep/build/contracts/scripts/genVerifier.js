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
exports.genSnarkVerifierSol = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const genSnarkVerifierSol = (contractName, vk) => {
    const templatePath = path.join(__dirname, './verifier_groth16.sol');
    let template = fs.readFileSync(templatePath).toString();
    template = template.replace('<%contract_name%>', contractName);
    const vkalpha1 = `uint256(${vk.vk_alpha_1[0].toString()}),` +
        `uint256(${vk.vk_alpha_1[1].toString()})`;
    template = template.replace('<%vk_alpha1%>', vkalpha1);
    const vkbeta2 = `[uint256(${vk.vk_beta_2[0][1].toString()}),` +
        `uint256(${vk.vk_beta_2[0][0].toString()})], ` +
        `[uint256(${vk.vk_beta_2[1][1].toString()}),` +
        `uint256(${vk.vk_beta_2[1][0].toString()})]`;
    template = template.replace('<%vk_beta2%>', vkbeta2);
    const vkgamma2 = `[uint256(${vk.vk_gamma_2[0][1].toString()}),` +
        `uint256(${vk.vk_gamma_2[0][0].toString()})], ` +
        `[uint256(${vk.vk_gamma_2[1][1].toString()}),` +
        `uint256(${vk.vk_gamma_2[1][0].toString()})]`;
    template = template.replace('<%vk_gamma2%>', vkgamma2);
    const vkdelta2 = `[uint256(${vk.vk_delta_2[0][1].toString()}),` +
        `uint256(${vk.vk_delta_2[0][0].toString()})], ` +
        `[uint256(${vk.vk_delta_2[1][1].toString()}),` +
        `uint256(${vk.vk_delta_2[1][0].toString()})]`;
    template = template.replace('<%vk_delta2%>', vkdelta2);
    template = template.replace('<%vk_input_length%>', (vk.IC.length - 1).toString());
    template = template.replace('<%vk_ic_length%>', vk.IC.length.toString());
    let vi = '';
    for (let i = 0; i < vk.IC.length; i++) {
        if (vi.length !== 0) {
            vi = vi + '        ';
        }
        vi = vi + `vk.IC[${i}] = Pairing.G1Point(uint256(${vk.IC[i][0].toString()}),` +
            `uint256(${vk.IC[i][1].toString()}));\n`;
    }
    template = template.replace('<%vk_ic_pts%>', vi);
    return template;
};
exports.genSnarkVerifierSol = genSnarkVerifierSol;
