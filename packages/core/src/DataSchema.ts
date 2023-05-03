import { CircuitConfig } from '@unirep/circuits'

export type SchemaField = {
    name: string
    type: string
    updateBy: 'sum' | 'replace'
}

export type Attestation = {
    fieldIndex: number
    change: bigint
}
export class DataSchema {
    public schema: SchemaField[]
    public config: CircuitConfig

    constructor(schema, config = CircuitConfig.default) {
        this.config = config
        this.schema = this.parseSchema(schema)
    }

    parseSchema(schema: SchemaField[]): any[] {
        let sumOffset = 0
        let replOffset = 0
        const maxSumOffset = 253 * this.config.SUM_FIELD_COUNT
        const maxReplOffset =
            253 * (this.config.FIELD_COUNT - this.config.SUM_FIELD_COUNT)

        return schema.map((field, idx) => {
            const { name, type, updateBy, ...extraFields } = field
            const match = type.match(/^uint(\d+)$/)
            if (match === null)
                throw new Error(`Invalid type for field ${name}: "${type}"`)
            if (Object.keys(extraFields).length !== 0) {
                throw new Error(
                    `Invalid fields included for field ${name}: [${Object.keys(
                        extraFields
                    )}]`
                )
            }

            const duplicateEntry = schema.find(
                (x, i) => x.name == field.name && idx != i
            )
            if (duplicateEntry) {
                throw Error(
                    `Schema includes a duplicate entry: "${duplicateEntry.name}"`
                )
            }

            const bits = +match[1]
            if (bits < 1 || bits > 253)
                throw new Error(`Invalid uint size for field ${name}: ${bits}`)
            if (updateBy === 'sum') {
                if (
                    Math.floor(sumOffset / 253) !==
                    Math.floor((sumOffset + bits - 1) / 253)
                ) {
                    sumOffset += 253 - (sumOffset % 253)
                }
                if (sumOffset + bits > maxSumOffset) {
                    throw new Error(
                        `Invalid schema, field "${name}" exceeds available storage`
                    )
                }
                const dataIndex = Math.floor(sumOffset / 253)
                const offset = sumOffset % 253
                sumOffset += bits
                return { ...field, dataIndex, offset, bits }
            } else if (updateBy === 'replace') {
                if (bits !== 253 - this.config.REPL_NONCE_BITS)
                    throw new Error(
                        `Field must be ${
                            253 - this.config.REPL_NONCE_BITS
                        } bits`
                    )
                if (replOffset + bits > maxReplOffset) {
                    throw new Error(
                        `Invalid schema, field "${name}" exceeds available storage`
                    )
                }

                const dataIndex =
                    this.config.SUM_FIELD_COUNT + Math.floor(replOffset / 253)
                const offset = replOffset % 253
                replOffset += bits
                return { ...field, dataIndex, offset, bits }
            }
            throw new Error(
                `Invalid updateBy strategy for field ${name}: "${updateBy}"`
            )
        })
    }

    buildAttestation(change: { name: string; v: bigint }): Attestation {
        const field: any = this.schema.find((f) => f.name === change.name)

        if (field === undefined) {
            throw new Error(`${change.name} not found`)
        }
        const fieldIndex: number = field.dataIndex
        const x: bigint = change.v << BigInt(field.offset)

        const maxVal: bigint = (BigInt(1) << BigInt(field.bits)) - BigInt(1)

        if (x > maxVal << BigInt(field.offset)) {
            throw new Error(`${change.name} exceeds allocated space`)
        }

        const attestation: Attestation = {
            fieldIndex,
            change: x,
        }

        return attestation
    }

    buildAttestations(changes: { name: string; v: bigint }[]): Attestation[] {
        let attestations: Attestation[] = Array(this.schema.length).fill(null)
        for (const change of changes) {
            const field: any = this.schema.find((f) => f.name === change.name)

            if (field === undefined) {
                throw new Error(`${change.name} not found`)
            }

            const fieldIndex: number = field.dataIndex
            let v: bigint = change.v << BigInt(field.offset)
            const maxVal: bigint = (BigInt(1) << BigInt(field.bits)) - BigInt(1)

            if (attestations[fieldIndex] !== null) {
                v =
                    change.v +
                    (field.updateBy === 'sum'
                        ? (attestations[fieldIndex].change >>
                              BigInt(field.offset)) &
                          maxVal
                        : BigInt(0))
            }

            if (v > maxVal << BigInt(field.offset)) {
                throw new Error(`${change.name} exceeds allocated space`)
            }

            if (attestations[fieldIndex] !== null)
                v =
                    (attestations[fieldIndex].change &
                        ~(maxVal << BigInt(field.offset))) |
                    ((v & maxVal) << BigInt(field.offset))

            attestations[fieldIndex] = {
                fieldIndex,
                change: v,
            }
        }

        return attestations.filter((attestation) => attestation !== null)
    }

    parseData(data: bigint[]): any {
        const parsed = {}

        for (const field of this.schema) {
            const { name, /* type, updateBy, */ dataIndex, bits, offset } =
                field
            parsed[name] =
                (data[dataIndex] >> BigInt(offset)) &
                ((BigInt(1) << BigInt(bits)) - BigInt(1))
        }

        return parsed
    }
}
