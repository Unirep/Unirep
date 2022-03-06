import { SnarkProof, SnarkPublicSignals } from '@unirep/crypto';
import { Circuit } from '../config/index';
declare const executeCircuit: (circuit: any, inputs: any) => Promise<any>;
declare const getVKey: (circuitName: Circuit) => Promise<{
    protocol: string;
    curve: string;
    nPublic: number;
    vk_alpha_1: string[];
    vk_beta_2: string[][];
    vk_gamma_2: string[][];
    vk_delta_2: string[][];
    vk_alphabeta_12: string[][][];
    IC: string[][];
} | undefined>;
declare const getSignalByName: (circuit: any, witness: any, signal: string) => any;
declare const genProofAndPublicSignals: (circuitName: Circuit, inputs: any) => Promise<{
    proof: any;
    publicSignals: any;
}>;
declare const verifyProof: (circuitName: Circuit, proof: SnarkProof, publicSignals: SnarkPublicSignals) => Promise<boolean>;
declare const formatProofForVerifierContract: (_proof: SnarkProof) => string[];
declare const formatProofForSnarkjsVerification: (_proof: string[]) => SnarkProof;
export { Circuit, executeCircuit, formatProofForVerifierContract, formatProofForSnarkjsVerification, getVKey, getSignalByName, genProofAndPublicSignals, verifyProof, };
