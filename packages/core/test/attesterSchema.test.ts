// @ts-ignore
import { expect } from 'chai'
import { CircuitConfig } from '@unirep/circuits'
import { AttesterSchema, parseSchema } from '../src/AttesterSchema'

const EPOCH_LENGTH = 1000

const schema = [
    {
        name: 'posRep',
        type: 'uint64',
        updateBy: 'sum',
    },
    {
        name: 'negRep',
        type: 'uint64',
        updateBy: 'sum',
    },
    {
        name: 'graffiti',
        type: 'uint206',
    },
    {
        name: 'postCount',
        type: 'uint49',
        updateBy: 'sum',
    },
    {
        name: 'commentCount',
        type: 'uint49',
        updateBy: 'sum',
    },
    {
        name: 'voteCount',
        type: 'uint49',
        updateBy: 'sum',
    },
    {
        name: 'averageVote',
        type: 'uint8',
    },
]

const { FIELD_COUNT, EPOCH_TREE_DEPTH, SUM_FIELD_COUNT, REPL_NONCE_BITS } =
    CircuitConfig.default

const smallRandom = (x: number) => Math.floor(Math.random() * x)

describe('Check schema parsing', function () {
    it('Check good schema', () => {
        expect(new AttesterSchema(schema)).to.not.throw
    })

    it('Check schema with invalid key', () => {
        const invalidSchema = [
            {
                name: 'posRep',
                type: 'uint64',
                updateBy: 'sum',
            },
            {
                name: 'negRep',
                type: 'uint64',
                updateBy: 'sum',
            },
            {
                name: 'averageVote',
                type: 'uint64',
                updateBy: 'sum',
                invalidKey: 'invalidValue',
            },
        ]
        expect(() => parseSchema(invalidSchema)).to.throw(
            'Schema includes an invalid key'
        )
    })

    it('Check schema with invalid type', () => {
        const invalidSchema = [
            {
                name: 'posRep',
                type: 'uint64',
                updateBy: 'sum',
            },
            {
                name: 'negRep',
                type: 'uint8x',
                updateBy: 'sum',
            },
        ]
        expect(() => parseSchema(invalidSchema)).to.throw(
            'Schema includes an invalid type'
        )
    })
})

describe('Print Details', function () {
    it('Print details of a schema', () => {
        const a = new AttesterSchema(schema)
        const schemaDetails = a.getSchemaDetails()

        expect(Object.keys(schemaDetails).length).to.equal(4)
    })
})

describe('Encode Attestation Data', function () {
    it('test add', () => {
        for (let i = 0; i < 10; i++) {
            const a = new AttesterSchema(schema)
            let cur = Array(5).fill(BigInt(0))
            const rand = [64, 64, 49, 49, 49].map((x) => BigInt(smallRandom(x)))

            const attestations = [
                'posRep',
                'negRep',
                'postCount',
                'commentCount',
                'voteCount',
            ]

            attestations.forEach((x, i) => {
                a.update(x, rand[i])
                cur[i] += rand[i]
                expect(a.getValue(x)).to.equal(cur[i])
            })
        }
    })

    it('fail to add an exceedingly large number', () => {
        const a = new AttesterSchema(schema)
        a.update('posRep', BigInt(2) ** BigInt(64) - BigInt(1))
        expect(a.getValue('posRep')).to.equal(
            BigInt(2) ** BigInt(64) - BigInt(1)
        )
        expect(() => a.update('posRep', BigInt(1))).to.throw(
            'Summation overflows uint64'
        )
    })

    it('test replace', () => {
        for (let i = 0; i < 10; i++) {
            const a = new AttesterSchema(schema)
            let cur = Array(5).fill(BigInt(0))
            const rand = [245, 8].map((x) => BigInt(smallRandom(x)))

            const attestations = ['graffiti', 'averageVote']

            attestations.forEach((x, i) => {
                a.update(x, rand[i])
                cur[i] += rand[i]
                expect(a.getValue(x)).to.equal(cur[i])
            })
        }
    })

    it('fail to replace with an exceedingly large number', () => {
        const a = new AttesterSchema(schema)
        a.update(
            'graffiti',
            BigInt(2) ** BigInt(254 - REPL_NONCE_BITS) - BigInt(1)
        )
        expect(a.getValue('graffiti')).to.equal(
            BigInt(2) ** BigInt(254 - REPL_NONCE_BITS) - BigInt(1)
        )
        expect(() =>
            a.update(
                'graffiti',
                BigInt(2) ** BigInt(254 - REPL_NONCE_BITS) + BigInt(1)
            )
        ).to.throw('Replacement overflows uint206')
    })
})
