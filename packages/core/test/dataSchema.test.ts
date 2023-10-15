// @ts-ignore
import { expect } from 'chai'
import { DataSchema, SchemaField } from '../src/DataSchema'
import { poseidon1 } from 'poseidon-lite'
import { CircuitConfig } from '@unirep/circuits'
const { REP_BITS, REPL_FIELD_BITS } = CircuitConfig.default

const smallRandom = (x: number) => Math.floor(Math.random() * x)
const random = () => poseidon1([smallRandom(10000000)])

const schema: SchemaField[] = [
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
                'Field must be 205 bits'
            )
        }
    })
})

describe('Build an attestation', function () {
    it('successfully update sum fields', () => {
        const d = new DataSchema(schema)
        Array(8)
            .fill(0)
            .forEach(() => {
                for (const field of d.schema) {
                    if (field.updateBy !== 'sum') return
                    const rand =
                        random() % (BigInt(1) << BigInt(field.bits - 3))
                    const change = { name: field.name, val: rand }
                    const a = d.buildAttestation(change)
                    const x = rand << BigInt(field.offset)
                    expect(a.change).to.equal(x)
                }
            })
    })
    it('successfully update multiple fields', () => {
        const d = new DataSchema(schema)
        let changes: any[] = []
        let ar = new Array(schema.length).fill(BigInt(0))
        Array(8)
            .fill(0)
            .forEach(() => {
                for (const field of d.schema) {
                    const rand =
                        random() % (BigInt(1) << BigInt(field.bits - 3))
                    const change = { name: field.name, val: rand }
                    changes.push(change)

                    const x = d.buildAttestation(change)
                    ar[x.fieldIndex] =
                        field.updateBy === 'sum'
                            ? ar[x.fieldIndex] + x.change
                            : x.change
                }
            })

        const a = d.buildAttestations(changes)

        for (const field of a) {
            expect(field.change).to.equal(ar[field.fieldIndex])
        }
    })
    it('successfully update replacement fields', () => {
        const d = new DataSchema(schema)
        Array(8)
            .fill(0)
            .forEach(() => {
                for (const field of d.schema) {
                    if (field.updateBy !== 'replace') return
                    const rand =
                        random() % (BigInt(1) << BigInt(field.bits - 3))
                    const change = { name: field.name, val: rand }
                    const a = d.buildAttestation(change)
                    const x = rand << BigInt(field.offset)
                    expect(a.change).to.equal(x)
                }
            })
    })
    it('fails to use exceedingly large number', () => {
        {
            const d = new DataSchema(schema)
            expect(() =>
                d.buildAttestation({
                    name: 'posRep',
                    val: BigInt(1) << REP_BITS,
                })
            ).to.throw('posRep exceeds allocated space')
        }
        {
            const d = new DataSchema(schema)
            expect(() =>
                d.buildAttestation({
                    name: 'graffiti',
                    val: BigInt(1) << BigInt(REPL_FIELD_BITS),
                })
            ).to.throw('graffiti exceeds allocated space')
        }
    })

    it('fail to combine multiple attestations that collectively exceed allocate space', () => {
        const d = new DataSchema(schema)
        const a = new Array(4).fill({
            name: 'posRep',
            val: BigInt(1) << BigInt(62),
        })
        expect(() => d.buildAttestations(a)).to.throw(
            'posRep exceeds allocated space'
        )
    })

    it('fail to attest to an illegal field', () => {
        {
            const d = new DataSchema(schema)
            expect(() =>
                d.buildAttestation({
                    name: 'invalidField',
                    val: BigInt(0),
                })
            ).to.throw('invalidField not found')
        }
        {
            const d = new DataSchema(schema)
            expect(() =>
                d.buildAttestations([
                    {
                        name: 'posRep',
                        val: BigInt(0),
                    },
                    {
                        name: 'invalidField',
                        val: BigInt(0),
                    },
                ])
            ).to.throw('invalidField not found')
        }
    })
})

describe('Parse encoded data', () => {
    it('Parse data', () => {
        const d = new DataSchema(schema)
        let v = new Array(schema.length).fill(BigInt(0))
        let changes: any = []
        let schemaVal = {}
        Array(8)
            .fill(0)
            .forEach(() => {
                for (const field of d.schema) {
                    const rand =
                        random() % (BigInt(1) << BigInt(field.bits - 3))
                    const change = { name: field.name, val: rand }
                    changes.push(change)

                    schemaVal[field.name] =
                        rand +
                        (field.updateBy === 'sum' && field.name in schemaVal
                            ? schemaVal[field.name]
                            : BigInt(0))
                }
            })
        const a = d.buildAttestations(changes)
        for (const field of a) {
            v[field.fieldIndex] = field.change
        }

        const p = d.parseData(v)
        for (const field of Object.keys(p)) {
            expect(p[field]).to.equal(schemaVal[field])
        }
    })
})
