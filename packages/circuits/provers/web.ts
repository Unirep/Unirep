import { SnarkProof, SnarkPublicSignals } from '@unirep/utils'
import { version } from '../package.json'

const KEY_URL = `https://keys.unirep.io/${version}/`

/**
 * https://developer.unirep.io/docs/circuits-api/web-prover
 */
export class WebProver {
    cache: { [key: string]: any } = {}
    url: string

    /**
     * Construct a web prover object from a server url.
     * @param serverUrl The server url to the `vkey`s, `zkey`s and `wasm`s. Default: `https://keys.unirep.io/${version}/`
     * @see https://developer.unirep.io/docs/circuits-api/web-prover
     */
    constructor(serverUrl: string = KEY_URL) {
        this.url = serverUrl.endsWith('/') ? serverUrl : `${serverUrl}/`
    }

    /**
     * Get key object from the server.
     * @param circuitUrl The url to the a `vkey`, a `zkey`s or a `wasm`.
     * @returns The `vkey`, the `zkey`s or the `wasm` object.
     * @see https://developer.unirep.io/docs/circuits-api/web-prover
     */
    async getKey(circuitUrl: string): Promise<any> {
        if (this.cache[circuitUrl]) return this.cache[circuitUrl]
        const res = fetch(circuitUrl).then((r) => r.arrayBuffer())
        this.cache[circuitUrl] = res
        return res
    }

    /**
     * Use this to load keys when you know a proof will be made in the near future.
     * @param circuitName Name of the circuit, which can be chosen from `Circuit`
     * @see https://developer.unirep.io/docs/circuits-api/web-prover
     */
    async warmKeys(circuitName: string): Promise<void> {
        const wasmUrl = new URL(`${circuitName}.wasm`, this.url).toString()
        const zkeyUrl = new URL(`${circuitName}.zkey`, this.url).toString()
        await Promise.all([this.getKey(wasmUrl), this.getKey(zkeyUrl)])
    }

    /**
     * Verify the snark proof and public signals with `snarkjs.groth16.verify`
     * @param circuitName Name of the circuit, which can be chosen from `Circuit`
     * @param publicSignals The snark public signals that is generated from `genProofAndPublicSignals`
     * @param proof The snark proof that is generated from `genProofAndPublicSignals`
     * @returns True if the proof is valid, false otherwise
     * @see https://developer.unirep.io/docs/circuits-api/web-prover
     */
    async verifyProof(
        circuitName: string,
        publicSignals: SnarkPublicSignals,
        proof: SnarkProof
    ): Promise<boolean> {
        const _snarkjs = import('snarkjs')
        const url = new URL(`${circuitName}.vkey.json`, this.url).toString()
        const vkeyBuffer = await this.getKey(url)
        const vkeyString = String.fromCharCode.apply(
            null,
            new Uint8Array(vkeyBuffer) as any
        )
        const vkey = JSON.parse(vkeyString)
        const snarkjs = await _snarkjs
        return snarkjs.groth16.verify(vkey, publicSignals, proof)
    }

    /**
     * Generate proof and public signals with `snarkjs.groth16.fullProve`
     * @param circuitName Name of the circuit, which can be chosen from `Circuit`
     * @param inputs The user inputs of the circuit
     * @returns snark proof and public signals
     * @see https://developer.unirep.io/docs/circuits-api/web-prover
     */
    async genProofAndPublicSignals(
        circuitName: string,
        inputs: any
    ): Promise<any> {
        const _snarkjs = import('snarkjs')
        const wasmUrl = new URL(`${circuitName}.wasm`, this.url).toString()
        const zkeyUrl = new URL(`${circuitName}.zkey`, this.url).toString()
        const [wasm, zkey] = await Promise.all([
            this.getKey(wasmUrl),
            this.getKey(zkeyUrl),
        ])
        const snarkjs = await _snarkjs
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            inputs,
            new Uint8Array(wasm),
            new Uint8Array(zkey)
        )
        return { proof, publicSignals }
    }

    /**
     * Get vkey from the key server.
     * @param circuitName Name of the circuit, which can be chosen from `Circuit`
     * @returns The vkey of the circuit
     * @see https://developer.unirep.io/docs/circuits-api/web-prover
     */
    async getVKey(circuitName: string) {
        const url = new URL(`${circuitName}.vkey.json`, this.url).toString()
        const vkeyBuffer = await this.getKey(url)
        const vkeyString = String.fromCharCode.apply(
            null,
            new Uint8Array(vkeyBuffer) as any
        )
        return JSON.parse(vkeyString)
    }
}

export default new WebProver()
