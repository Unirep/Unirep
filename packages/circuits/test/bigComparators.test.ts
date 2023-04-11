import { expect } from 'chai'
import { genProofAndVerify } from './utils'
import { hash1 } from '@unirep/utils'

const random = () => hash1([smallRandom()])
const smallRandom = () => Math.floor(Math.random() * 1000000000)

describe('Compare large numbers', function () {
    this.timeout(30000)
    it('should compare small numbers', async () => {
        for (let x = 0; x < 10; x++) {
            const n1 = random()
            const n2 = random()
            const { isValid, publicSignals } = await genProofAndVerify(
                'bigComparators' as any,
                {
                    in: [n1.toString(), n2.toString()],
                }
            )
            expect(isValid).to.be.true
            expect(publicSignals[0].toString()).to.equal(n1 < n2 ? '1' : '0')
        }
    })

    it('should compare large numbers', async () => {
        for (let x = 0; x < 10; x++) {
            const n1 = BigInt(2) ** BigInt(200) + BigInt(smallRandom())
            const n2 = BigInt(2) ** BigInt(200) + BigInt(smallRandom())
            const { isValid, publicSignals } = await genProofAndVerify(
                'bigComparators' as any,
                {
                    in: [n1.toString(), n2.toString()],
                }
            )
            expect(isValid).to.be.true
            expect(publicSignals[0].toString()).to.equal(n1 < n2 ? '1' : '0')
        }
    })

    it('should compare numbers across boundary', async () => {
        for (let x = 0; x < 4; x++) {
            const n1 = BigInt(2) ** BigInt(100) + BigInt(smallRandom())
            const n2 = BigInt(2) ** BigInt(200) + BigInt(smallRandom())
            const { isValid, publicSignals } = await genProofAndVerify(
                'bigComparators' as any,
                {
                    in: [n1.toString(), n2.toString()],
                }
            )
            expect(isValid).to.be.true
            expect(publicSignals[0].toString()).to.equal('1')
        }
        for (let x = 0; x < 4; x++) {
            const n1 = BigInt(2) ** BigInt(200) + BigInt(smallRandom())
            const n2 = BigInt(2) ** BigInt(100) + BigInt(smallRandom())
            const { isValid, publicSignals } = await genProofAndVerify(
                'bigComparators' as any,
                {
                    in: [n1.toString(), n2.toString()],
                }
            )
            expect(isValid).to.be.true
            expect(publicSignals[0].toString()).to.equal('0')
        }
    })

    it('should compare boundary numbers', async () => {
        const { isValid, publicSignals } = await genProofAndVerify(
            'bigComparators' as any,
            {
                in: [BigInt(2) ** BigInt(127), BigInt(2) ** BigInt(127)],
            }
        )
        expect(isValid).to.be.true
        expect(publicSignals[0].toString()).to.equal('0')
    })

    it('should compare numbers with unequal higher bits', async () => {
        {
            const n1 = BigInt(2) ** BigInt(200)
            const n2 = BigInt(2) ** BigInt(201)
            const { isValid, publicSignals } = await genProofAndVerify(
                'bigComparators' as any,
                {
                    in: [n1.toString(), n2.toString()],
                }
            )
            expect(isValid).to.be.true
            expect(publicSignals[0].toString()).to.equal('1')
        }
        {
            const n1 = BigInt(2) ** BigInt(201) + BigInt(smallRandom())
            const n2 = BigInt(2) ** BigInt(200) + BigInt(smallRandom())
            const { isValid, publicSignals } = await genProofAndVerify(
                'bigComparators' as any,
                {
                    in: [n1.toString(), n2.toString()],
                }
            )
            expect(isValid).to.be.true
            expect(publicSignals[0].toString()).to.equal('0')
        }
    })

    it('should compare equal numbers', async () => {
        {
            const n = random()
            const { isValid, publicSignals } = await genProofAndVerify(
                'bigComparators' as any,
                {
                    in: [n.toString(), n.toString()],
                }
            )
            expect(isValid).to.be.true
            expect(publicSignals[0].toString()).to.equal('0')
        }
        {
            const n = BigInt(2) ** BigInt(200) + BigInt(smallRandom())
            const { isValid, publicSignals } = await genProofAndVerify(
                'bigComparators' as any,
                {
                    in: [n.toString(), n.toString()],
                }
            )
            expect(isValid).to.be.true
            expect(publicSignals[0].toString()).to.equal('0')
        }
    })

    it('should compare equal upper bits', async () => {
        const n = random() >> BigInt(64)
        const { isValid, publicSignals } = await genProofAndVerify(
            'upperComparators' as any,
            {
                in: [n.toString(), n.toString()],
            }
        )
        expect(isValid).to.be.true
        expect(publicSignals[0].toString()).to.equal('0')
    })

    it('should compare upper bits', async () => {
        for (let x = 0; x < 20; x++) {
            const n1 = random()
            const n2 = random()
            const { isValid, publicSignals } = await genProofAndVerify(
                'upperComparators' as any,
                {
                    in: [n1.toString(), n2.toString()],
                }
            )
            const n1Upper = n1 >> BigInt(190)
            const n2Upper = n2 >> BigInt(190)
            const result = n1Upper < n2Upper ? '1' : '0'
            expect(isValid).to.be.true
            expect(publicSignals[0].toString()).to.equal(result)
        }
    })
})
