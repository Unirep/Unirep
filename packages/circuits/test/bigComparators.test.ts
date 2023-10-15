import { expect } from 'chai'
import { genProofAndVerify } from './utils'
import randomf from 'randomf'
import { CircuitConfig } from '../src'

const { MAX_SAFE_BITS, REPL_NONCE_BITS } = CircuitConfig.default

describe('Compare large numbers', function () {
    this.timeout(30000)
    it('should compare equal lower bits', async () => {
        const FIELD_BITS = MAX_SAFE_BITS - BigInt(REPL_NONCE_BITS)
        const n = randomf(BigInt(2) ** BigInt(REPL_NONCE_BITS))
        const n1 =
            n + (randomf(BigInt(2) ** FIELD_BITS) << BigInt(REPL_NONCE_BITS))
        const n2 =
            n + (randomf(BigInt(2) ** FIELD_BITS) << BigInt(REPL_NONCE_BITS))
        {
            const { isValid, publicSignals } = await genProofAndVerify(
                'lowerComparators' as any,
                {
                    in: [n1.toString(), n2.toString()],
                }
            )
            expect(isValid).to.be.true
            expect(publicSignals[0].toString()).to.equal('0')
        }
        {
            const { isValid, publicSignals } = await genProofAndVerify(
                'lowerComparators' as any,
                {
                    in: [n2.toString(), n1.toString()],
                }
            )
            expect(isValid).to.be.true
            expect(publicSignals[0].toString()).to.equal('0')
        }
    })

    it('should compare upper bits', async () => {
        for (let x = 0; x < 20; x++) {
            const n1 = randomf(BigInt(2) ** MAX_SAFE_BITS)
            const n2 = randomf(BigInt(2) ** MAX_SAFE_BITS)
            const { isValid, publicSignals } = await genProofAndVerify(
                'lowerComparators' as any,
                {
                    in: [n1.toString(), n2.toString()],
                }
            )
            const n1Lower =
                n1 & (BigInt(2) ** BigInt(REPL_NONCE_BITS) - BigInt(1))
            const n2Lower =
                n2 & (BigInt(2) ** BigInt(REPL_NONCE_BITS) - BigInt(1))
            const result = n1Lower < n2Lower ? '1' : '0'
            expect(isValid).to.be.true
            expect(publicSignals[0].toString()).to.equal(result)
        }
    })
})
