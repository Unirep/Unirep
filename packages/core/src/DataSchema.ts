import { CircuitConfig, shiftBits } from '@unirep/circuits'

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
    public schema: any[]
    public config: CircuitConfig

    constructor(schema, config = CircuitConfig.default) {
        this.config = config
        this.schema = this.parseSchema(schema)
    }

    parseSchema(schema: SchemaField[]): any[] {
        let sumOffset = 0
        let replOffset = 0
        const MAX_SAFE_BITS = Number(this.config.MAX_SAFE_BITS)
        const maxSumOffset = MAX_SAFE_BITS * this.config.SUM_FIELD_COUNT
        const maxReplOffset =
            MAX_SAFE_BITS *
            (this.config.FIELD_COUNT - this.config.SUM_FIELD_COUNT)

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
            if (bits < 1 || bits > MAX_SAFE_BITS)
                throw new Error(`Invalid uint size for field ${name}: ${bits}`)
            if (updateBy === 'sum') {
                if (
                    Math.floor(sumOffset / MAX_SAFE_BITS) !==
                    Math.floor((sumOffset + bits - 1) / MAX_SAFE_BITS)
                ) {
                    sumOffset += MAX_SAFE_BITS - (sumOffset % MAX_SAFE_BITS)
                }
                if (sumOffset + bits > maxSumOffset) {
                    throw new Error(
                        `Invalid schema, field "${name}" exceeds available storage`
                    )
                }
                const dataIndex = Math.floor(sumOffset / MAX_SAFE_BITS)
                const offset = sumOffset % MAX_SAFE_BITS
                sumOffset += bits
                return { ...field, dataIndex, offset, bits }
            } else if (updateBy === 'replace') {
                if (bits !== MAX_SAFE_BITS - this.config.REPL_NONCE_BITS)
                    throw new Error(
                        `Field must be ${
                            MAX_SAFE_BITS - this.config.REPL_NONCE_BITS
                        } bits`
                    )
                if (replOffset + bits > maxReplOffset) {
                    throw new Error(
                        `Invalid schema, field "${name}" exceeds available storage`
                    )
                }

                const dataIndex =
                    this.config.SUM_FIELD_COUNT +
                    Math.floor(replOffset / MAX_SAFE_BITS)
                const offset = replOffset % MAX_SAFE_BITS
                replOffset += bits
                return { ...field, dataIndex, offset, bits }
            }
            throw new Error(
                `Invalid updateBy strategy for field ${name}: "${updateBy}"`
            )
        })
    }

    buildAttestation(change: { name: string; val: bigint }): Attestation {
        const field: any = this.schema.find((f) => f.name === change.name)

        if (field === undefined) {
            throw new Error(`${change.name} not found`)
        }
        const fieldIndex: number = field.dataIndex
        const x: bigint = change.val << BigInt(field.offset)

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

    buildAttestations(changes: { name: string; val: bigint }[]): Attestation[] {
        const attestations: Attestation[] = Array(this.schema.length).fill(null)
        for (const change of changes) {
            const field: any = this.schema.find((f) => f.name === change.name)

            if (field === undefined) {
                throw new Error(`${change.name} not found`)
            }

            const maxVal: bigint = (BigInt(1) << BigInt(field.bits)) - BigInt(1)
            const fieldIndex: number = field.dataIndex
            let v: bigint = change.val << BigInt(field.offset)

            // Get existing attestation sum value
            let prevVal: bigint = BigInt(0)

            if (field.updateBy === 'sum' && attestations[fieldIndex] !== null)
                prevVal =
                    (attestations[fieldIndex].change >> BigInt(field.offset)) &
                    maxVal

            if (v + prevVal > maxVal << BigInt(field.offset)) {
                throw new Error(`${change.name} exceeds allocated space`)
            }

            // Include previous attestation change value in our new attestation
            // This is necessary to get the value of other schema fields in the attestation
            if (attestations[fieldIndex] !== null && field.updateBy === 'sum')
                v += attestations[fieldIndex].change

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
            parsed[name] = shiftBits(
                data[dataIndex].toString(),
                BigInt(offset),
                BigInt(bits)
            )
        }

        return parsed
    }
}
