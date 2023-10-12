import { SnarkProof, SnarkPublicSignals } from '@unirep/utils'
import { version } from '../package.json'

const KEY_URL = `https://keys.unirep.io/${version}/`

/**
 * The circuits package includes a browser compatible prover. This prover loads the proving keys from a remote URL.
 * By default this url is https://keys.unirep.io/${version}/.
 *
 * The server is expected to serve the `zkey`, `wasm`, and `vkey` files at their respective names in the provided subpath.
 * e.g. for the above url the signup zkey is at https://keys.unirep.io/${version}/signup.zkey`.
 * @param serverUrl The server url to the `zkey`, `wasm`, and `vkey` files.
 * Default: `https://keys.unirep.io/${version}/`
 *
 * @note
 * :::caution
 * The keys included are not safe for production use. A phase 2 trusted setup needs to be done before use.
 * :::
 *
 * @example
 * **Default key server**
 * ```ts
 * import { Circuit } from '@unirep/circuits'
 * import prover from '@unirep/circuits/provers/web'
 *
 * await prover.genProofAndPublicSignals(Circuit.signup, {
 *  // circuit inputs
 * })
 * ```
 *
 * **Custom key server**
 * ```ts
 * import { Circuit } from '@unirep/circuits'
 * import { WebProver } from '@unirep/circuits/provers/web'
 *
 * // For a local key server
 * const prover = new WebProver('http://localhost:8000/keys/')
 * await prover.genProofAndPublicSignals(Circuit.signup, {
 *  // circuit inputs
 * })
 * ```
 *
 */
export class WebProver {
    cache: { [key: string]: any } = {}
    url: string

    constructor(serverUrl: string = KEY_URL) {
        this.url = serverUrl.endsWith('/') ? serverUrl : `${serverUrl}/`
    }

    /**
     * Get key object from the server.
     * @param circuitUrl The url to the a `vkey`, a `zkey`s or a `wasm`.
     * @returns The `vkey`, the `zkey`s or the `wasm` object.
     */
    async getKey(circuitUrl: string) {
        if (this.cache[circuitUrl]) return this.cache[circuitUrl]
        const res = fetch(circuitUrl).then((r) => r.arrayBuffer())
        this.cache[circuitUrl] = res
        return res
    }

    /**
     * Load proving keys for a circuit into memory. Future proofs using these keys will not need to wait for download.
     * :::tip
     * Use this function without `await` to start the download in the background.
     * :::
     * @param circuitName Name of the circuit, which can be chosen from `Circuit`
     * @example
     * ```ts
     * await webProver.warmKeys(circuitName: string)
     * ```
     */
    async warmKeys(circuitName: string) {
        const wasmUrl = new URL(`${circuitName}.wasm`, this.url).toString()
        const zkeyUrl = new URL(`${circuitName}.zkey`, this.url).toString()
        await Promise.all([this.getKey(wasmUrl), this.getKey(zkeyUrl)])
    }

    /**
     * The function should returns true if the proof of the circuit is valid, false otherwise.
     * @param circuitName Name of the circuit, which can be chosen from `Circuit`
     * @param publicSignals The snark public signals that is generated from `genProofAndPublicSignals`
     * @param proof The snark proof that is generated from `genProofAndPublicSignals`
     * @returns True if the proof is valid, false otherwise
     */
    async verifyProof(
        circuitName: string,
        publicSignals: SnarkPublicSignals,
        proof: SnarkProof
    ) {
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
     * @param circuitName
     * @param inputs Name of the circuit, which can be chosen from `Circuit`
     * @returns Snark proof and public signals
     */
    async genProofAndPublicSignals(circuitName: string, inputs) {
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
     * Get vkey from a remote URL.
     * @param circuitName Name of the circuit, which can be chosen from `Circuit`
     * @returns vkey of the circuit
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
