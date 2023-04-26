import { expect } from 'chai'
import { AttesterSchema, parseSchema } from '../src/AttesterSchema'

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
        type: 'uint245',
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
describe('Check schema parsing', function () {
    it('Check good schema', () => {
        expect(new AttesterSchema(schema, 6, 4)).to.not.throw
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
        const a = new AttesterSchema(schema, 6, 4)
        const schemaDetails = a.getSchemaDetails()

        expect(Object.keys(schemaDetails).length).to.equal(3)
    })
})

describe('Encode Attestation Data', function () {
    it('test add', () => {
        {
            const a = new AttesterSchema(schema, 6, 4)

            let cur = BigInt(0)
            const inc = BigInt(50)

            for (let i = 0; i < 10; i++) {
                a.update('posRep', inc)
                cur += inc
                expect(a.getValue('posRep')).to.equal(cur)
            }
        }

        {
            const a = new AttesterSchema(schema, 6, 4)

            let cur = BigInt(0)
            const inc = BigInt(32)

            for (let i = 0; i < 10; i++) {
                a.update('voteCount', inc)
                cur += inc
                expect(a.getValue('voteCount')).to.equal(cur)
            }
        }
    })

    it('fail to add number too big', () => {
        const a = new AttesterSchema(schema, 6, 4)
        a.update('posRep', BigInt(2) ** BigInt(64) - BigInt(1))
        expect(a.decodeDataArray()[0]['value']).to.equal(
            BigInt(2) ** BigInt(64) - BigInt(1)
        )
        expect(() => a.update('posRep', BigInt(1))).to.throw(
            'Summation overflows uint64'
        )
    })

    it('test replace', () => {
        const a = new AttesterSchema(schema, 6, 4)
        a.update('graffiti', BigInt(100))
        expect(a.getValue('graffiti')).to.equal(100)
        a.update('graffiti', BigInt(10))
        expect(a.getValue('graffiti')).to.equal(10)
        a.update('graffiti', BigInt(100))
        expect(a.getValue('graffiti')).to.equal(100)
    })
})
