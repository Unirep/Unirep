const KEY_URL = 'https://keys.unirep.io/2-beta-3/'

export class WebProver {
    cache: { [key: string]: any } = {}
    url: string

    constructor(serverUrl: string = KEY_URL) {
        this.url = serverUrl
        // TODO: check that url has trailing slash
    }

    async getKey(circuitUrl: string) {
        if (this.cache[circuitUrl]) return this.cache[circuitUrl]
        const res = fetch(circuitUrl).then((r) => r.arrayBuffer())
        this.cache[circuitUrl] = res
        return res
    }

    /**
    Use this to load keys when you know a proof will be made in the near future.
  **/
    async warmKeys(circuitName: string) {
        const wasmUrl = new URL(`${circuitName}.wasm`, this.url).toString()
        const zkeyUrl = new URL(`${circuitName}.zkey`, this.url).toString()
        await Promise.all([this.getKey(wasmUrl), this.getKey(zkeyUrl)])
    }

    async verifyProof(circuitName: string, publicSignals, proof) {
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
