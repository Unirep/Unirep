import { CircuitConfig } from '@unirep/circuits'

export class DataSchema {
    public schema: any[]
    public config: CircuitConfig
    public data: bigint[]

    constructor(schema, config = CircuitConfig.default) {
        this.config = config
        this.schema = this.parseSchema(schema)
        this.data = new Array(config.FIELD_COUNT).fill(BigInt(0))
    }

    parseSchema(schema: any[]): any[] {
        let sumOffset = 0
        let replOffset = 0
        const maxSumOffset = 253 * this.config.SUM_FIELD_COUNT
        const maxReplOffset =
            253 * (this.config.FIELD_COUNT - this.config.SUM_FIELD_COUNT)

        return schema.map((field, idx) => {
            const { name, type, updateBy, ...extranousFields } = field
            const match = type.match(/^uint(\d+)$/)
            if (match === null)
                throw new Error(`Invalid type for field ${name}: "${type}"`)
            if (Object.keys(extranousFields).length !== 0) {
                throw new Error(
                    `Invalid fields included for field ${name}: [${Object.keys(
                        extranousFields
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
                        `Invalid uint size for field ${name}: ${bits}`
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

    update(name: string, v: bigint): bigint {
        const field = this.schema.find((f) => f.name === name)
        const idx = field.dataIndex
        const maxVal: bigint = (BigInt(1) << BigInt(field.bits)) - BigInt(1)

        if (field.updateBy === 'sum') {
            v += (this.data[idx] >> BigInt(field.offset)) & maxVal
        }

        if (v > maxVal) {
            throw new Error(`${name} value exceeds allocated storage`)
        }

        this.data[idx] =
            (this.data[idx] & ~(maxVal << BigInt(field.offset))) |
            ((v & maxVal) << BigInt(field.offset))

        return this.data[idx]
    }

    parseData(data: bigint[]): {} {
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
