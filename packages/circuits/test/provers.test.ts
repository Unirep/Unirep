import { expect } from 'chai'
import { defaultProver } from '../provers/defaultProver'
import webProver from '../provers/web'
import fetch from 'node-fetch'

// define the global to simulate web
global.fetch = fetch

const provers = [
    { name: 'default', prover: defaultProver },
    { name: 'web', prover: webProver },
]

for (const { name, prover } of provers) {
    describe(`${name} prover`, function () {
        it('should load a vkey', async () => {
            const vkey = await prover.getVKey('signup')
            expect(typeof vkey).to.equal('object')
            expect(vkey.protocol).to.equal('groth16')
            expect(vkey.curve).to.equal('bn128')
            expect(vkey.vk_alpha_1).to.exist
            expect(vkey.vk_beta_2).to.exist
            expect(vkey.vk_gamma_2).to.exist
            expect(vkey.vk_alphabeta_12).to.exist
            expect(vkey.IC).to.exist
        })

        it('should make a proof', async () => {
            const { publicSignals, proof } =
                await prover.genProofAndPublicSignals('signup', {
                    attester_id: 0,
                    epoch: 0,
                    identity_nullifier: 0,
                    identity_trapdoor: 0,
                })
            expect(publicSignals).to.exist
            expect(Array.isArray(publicSignals)).to.be.true
            expect(typeof proof).to.equal('object')
            expect(proof.pi_a).to.exist
            expect(proof.pi_b).to.exist
        })

        it('should make and verify a proof', async () => {
            const { publicSignals, proof } =
                await prover.genProofAndPublicSignals('signup', {
                    attester_id: 0,
                    epoch: 0,
                    identity_nullifier: 0,
                    identity_trapdoor: 0,
                })
            const valid = await prover.verifyProof(
                'signup',
                publicSignals,
                proof
            )
            expect(valid).to.be.true
        })
    })
}
