// @ts-ignore
import { expect } from 'chai'
import { DataSchema } from '../src/DataSchema'

const smallRandom = (x: number) => Math.floor(Math.random() * x)

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
        type: 'uint205',
        updateBy: 'replace',
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
]

describe('Check schema parsing', function () {
    it('should have a valid schema', () => {
        expect(new DataSchema(schema)).to.not.throw
    })

    it('fail to parse schema with invalid key', () => {
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
        expect(() => new DataSchema(invalidSchema)).to.throw(
            'Invalid fields included for field averageVote: [invalidKey]'
        )
    })

    it('fail to parse schema with duplicate entry', () => {
        const invalidSchema = [
            {
                name: 'posRep',
                type: 'uint64',
                updateBy: 'sum',
            },
            {
                name: 'posRep',
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
        expect(() => new DataSchema(invalidSchema)).to.throw(
            'Schema includes a duplicate entry: "posRep"'
        )
    })

    it('check schema with invalid type', () => {
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
        expect(() => new DataSchema(invalidSchema)).to.throw(
            'Invalid type for field negRep: "uint8x"'
        )
    })

    it('fail to use schema to excessive storage', () => {
        {
            const invalidSchema = [
                {
                    name: 'posRep',
                    type: 'uint253',
                    updateBy: 'sum',
                },
                {
                    name: 'posRep1',
                    type: 'uint253',
                    updateBy: 'sum',
                },
                {
                    name: 'posRep2',
                    type: 'uint253',
                    updateBy: 'sum',
                },
                {
                    name: 'posRep3',
                    type: 'uint253',
                    updateBy: 'sum',
                },
                {
                    name: 'posRep4',
                    type: 'uint253',
                    updateBy: 'sum',
                },
                {
                    name: 'posRep5',
                    type: 'uint253',
                    updateBy: 'sum',
                },
                {
                    name: 'posRep6',
                    type: 'uint253',
                    updateBy: 'sum',
                },
            ]
            expect(() => new DataSchema(invalidSchema)).to.throw(
                'Invalid schema, field "posRep4" exceeds available storage'
            )
        }
        {
            const invalidSchema = [
                {
                    name: 'graffiti',
                    type: 'uint205',
                    updateBy: 'replace',
                },
                {
                    name: 'graffiti1',
                    type: 'uint205',
                    updateBy: 'replace',
                },
                {
                    name: 'graffiti2',
                    type: 'uint205',
                    updateBy: 'replace',
                },
            ]
            expect(() => new DataSchema(invalidSchema)).to.throw(
                'Invalid schema, field "graffiti2" exceeds available storage'
            )
        }
    })

    it('fail to use invalid `updateBy` strategy', () => {
        const invalidSchema = [
            {
                name: 'posRep',
                type: 'uint253',
                updateBy: 'invalidUpdateStrategy',
            },
            {
                name: 'graffiti',
                type: 'uint205',
                updateBy: 'replace',
            },
        ]
        expect(() => new DataSchema(invalidSchema)).to.throw(
            'Invalid updateBy strategy for field posRep: "invalidUpdateStrategy"'
        )
    })

    it('fail to use invalid uint size', () => {
        {
            const invalidSchema = [
                {
                    name: 'posRep',
                    type: 'uint254',
                    updateBy: 'sum',
                },
                {
                    name: 'graffiti',
                    type: 'uint205',
                    updateBy: 'replace',
                },
            ]
            expect(() => new DataSchema(invalidSchema)).to.throw(
                'Invalid uint size for field posRep: 254'
            )
        }
        {
            const invalidSchema = [
                {
                    name: 'posRep',
                    type: 'uint253',
                    updateBy: 'sum',
                },
                {
                    name: 'graffiti',
                    type: 'uint206',
                    updateBy: 'replace',
                },
            ]
            expect(() => new DataSchema(invalidSchema)).to.throw(
                'Invalid uint size for field graffiti: 206'
            )
        }
    })
})

describe('Check `update`', function () {
    it('successfully update sum fields', () => {
        let x = Array(schema.length).fill(BigInt(0))
        const d = new DataSchema(schema)
        Array(10)
            .fill(0)
            .forEach(() => {
                d.parseSchema(schema).forEach((field, i) => {
                    if (field.updateBy !== 'sum') return
                    const rand = smallRandom(field.bits)
                    d.update(field.name, BigInt(rand))
                    x[i] += BigInt(rand)
                    expect(BigInt(d.parseData(d.data)[field.name])).to.equal(
                        x[i]
                    )
                })
            })
    })
    it('successfully update replacement fields', () => {
        const d = new DataSchema(schema)
        Array(10)
            .fill(0)
            .forEach(() => {
                d.parseSchema(schema).forEach((field) => {
                    if (field.updateBy !== 'replace') return
                    const rand = smallRandom(field.bits)
                    d.update(field.name, BigInt(rand))
                    expect(d.parseData(d.data)[field.name]).to.equal(rand)
                })
            })
    })
    it('fails to use exceedingly large number', () => {
        {
            const d = new DataSchema(schema)
            expect(() => d.update('posRep', BigInt(1) << BigInt(254))).to.throw(
                'posRep value exceeds allocated storage'
            )
        }
        {
            const d = new DataSchema(schema)
            expect(() =>
                d.update('graffiti', BigInt(1) << BigInt(206))
            ).to.throw('graffiti value exceeds allocated storage')
        }
    })
})

describe('Parse encoded data', () => {
    it('Parse data', () => {
        const d = new DataSchema(schema)
        let x = Array(schema.length).fill(BigInt(0))
        Array(10)
            .fill(0)
            .forEach(() => {
                d.parseSchema(schema).forEach((field, i) => {
                    const rand = smallRandom(field.bits)
                    d.update(field.name, BigInt(rand))
                    x[i] =
                        field.updateBy === 'sum'
                            ? x[i] + BigInt(rand)
                            : BigInt(rand)
                })
            })

        const data = d.parseData(d.data)
        Object.keys(data).forEach((field, i) => {
            expect(data[field]).to.equal(x[i])
        })
    })
})
