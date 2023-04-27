import { CircuitConfig } from '@unirep/circuits'

const { FIELD_COUNT, EPOCH_TREE_DEPTH, SUM_FIELD_COUNT, REPL_NONCE_BITS } =
    CircuitConfig.default
class DataField {
    public field: string[]
    public fieldOffset: number[]
    public currentFieldSize: number

    private maxFieldSize: number

    constructor() {
        this.field = []
        this.fieldOffset = []
        this.currentFieldSize = 0

        this.maxFieldSize = 254
    }

    public addOrPass(entry: string, size: number): boolean {
        if (this.currentFieldSize + size > this.maxFieldSize) {
            return false
        }
        this.fieldOffset.push(Number(this.currentFieldSize))
        this.currentFieldSize += size
        this.field.push(entry)
        return true
    }

    public getFieldOffset(entry: string): number {
        for (let i = 0; i < this.field.length; i++) {
            if (this.field[i] == entry) {
                return this.fieldOffset[i]
            }
        }
        return 0
    }

    public setMaxFieldSize(_maxFieldSize: number) {
        this.maxFieldSize = _maxFieldSize
    }
}
export const parseSchema = (schema: {}[]) => {
    const SCHEMA_FIELDS = ['name', 'type', 'updateBy']

    schema.forEach((entry, idx) => {
        if (!('name' in entry && 'type' in entry)) {
            throw Error('Missing name or type in schema')
        }
        if (!('updateBy' in entry)) {
            entry['updateBy'] = 'replace'
        }

        // Contains an invalid key
        if (Object.keys(entry).some((x) => SCHEMA_FIELDS.indexOf(x) < 0)) {
            throw Error('Schema includes an invalid key')
        }

        if (schema.some((x, i) => x['name'] == entry['name'] && idx != i)) {
            throw Error('Schema includes a duplicate entry')
        }

        if (entry['type'] == 'uint') {
            entry['type'] = 'uint253'
        } else if (entry['type'] == 'bool') {
            entry['type'] = 'uint1'
        }

        if (
            String(entry['type']).slice(0, 4) != 'uint' ||
            isNaN(+String(entry['type']).slice(4))
        ) {
            throw Error('Schema includes an invalid type')
        }

        if (entry['updateBy'] != 'sum' && entry['updateBy'] != 'replace') {
            throw Error('Schema includes an invalid update method')
        }
    })
    return schema
}

export class AttesterSchema {
    private sumDataFields: DataField[]
    private replDataFields: DataField[]

    private curSumDataFieldCount: number
    private curReplDataFieldCount: number
    private schema: {}[]
    private schemaLookup: {}

    private encodedData: bigint[]

    constructor(_schema: {}[]) {
        this.curSumDataFieldCount = 0
        this.curReplDataFieldCount = 0

        this.sumDataFields = new Array(SUM_FIELD_COUNT)
            .fill(null)
            .map((n) => new DataField())
        this.replDataFields = new Array(FIELD_COUNT - SUM_FIELD_COUNT)
            .fill(null)
            .map((n) => new DataField())

        this.schema = parseSchema(_schema)
        this.encodedData = new Array(FIELD_COUNT).fill(BigInt(0))

        this.schemaLookup = {}

        this.buildDataFields()
    }

    findEntryByName(entry: string): {} {
        for (let i = 0; i < this.schema.length; i++) {
            if (this.schema[i]['name'] == entry) {
                return Object.assign({}, this.schema[i])
            }
        }
        throw Error('Entry does not exist in schema')
    }

    buildDataFields() {
        for (let i = 0; i < this.schema.length; i++) {
            const name = this.schema[i]['name']
            const bits = Number(this.schema[i]['type'].slice(4))
            const updateBy = this.schema[i]['updateBy']

            if (updateBy == 'sum') {
                while (
                    !this.sumDataFields[this.curSumDataFieldCount].addOrPass(
                        name,
                        bits
                    )
                ) {
                    this.curSumDataFieldCount++

                    if (this.curSumDataFieldCount == SUM_FIELD_COUNT) {
                        throw Error('Excessive sum field allocation')
                    }
                }
            } else if (updateBy == 'replace') {
                this.replDataFields[this.curReplDataFieldCount].setMaxFieldSize(
                    254 - REPL_NONCE_BITS
                )
                if (bits > 254 - REPL_NONCE_BITS) {
                    throw Error('Excessive replacement bits allocation')
                }

                while (
                    !this.replDataFields[this.curReplDataFieldCount].addOrPass(
                        name,
                        bits
                    )
                ) {
                    this.curReplDataFieldCount++

                    if (
                        this.curReplDataFieldCount + SUM_FIELD_COUNT ==
                        FIELD_COUNT
                    ) {
                        throw Error('Excessive replacement field allocation')
                    }
                }
            }
        }
    }

    getEncodedFieldIndex(entry: string): number {
        const schema = this.findEntryByName(entry)
        const updateBy = schema['updateBy']

        if (updateBy == 'sum') {
            for (let i = 0; i < SUM_FIELD_COUNT; i++) {
                if (this.sumDataFields[i].field.includes(entry)) {
                    return i
                }
            }
        } else if (updateBy == 'replace') {
            for (let i = 0; i < FIELD_COUNT - SUM_FIELD_COUNT; i++) {
                if (this.replDataFields[i].field.includes(entry)) {
                    return i
                }
            }
        }
        return -1
    }

    update(entry: string, v: bigint) {
        const schema = this.findEntryByName(entry)
        const bits = schema['type'].slice(4)
        const updateBy = schema['updateBy']
        const maxVal = BigInt(2) ** BigInt(bits) - BigInt(1)
        const idx = this.getEncodedFieldIndex(entry)
        if (updateBy == 'sum') {
            const n = BigInt(this.sumDataFields[idx].getFieldOffset(entry))
            const val = v + (this.encodedData[idx] >> n)

            if (val >= BigInt(2) ** BigInt(bits)) {
                throw Error('Summation overflows uint' + bits)
            }

            this.encodedData[idx] =
                (this.encodedData[idx] & ~(maxVal << n)) | ((val & maxVal) << n)
        } else if (updateBy == 'replace') {
            const n = BigInt(this.replDataFields[idx].getFieldOffset(entry))

            if (v >= BigInt(2) ** BigInt(bits)) {
                throw Error('Replacement overflows uint' + bits)
            }
            this.encodedData[SUM_FIELD_COUNT + idx] =
                (this.encodedData[SUM_FIELD_COUNT + idx] & ~(maxVal << n)) |
                ((v & maxVal) << n)
        }
    }

    decodeDataArray(): {}[] {
        let out: {}[] = []

        for (let i = 0; i < FIELD_COUNT; i++) {
            const f = this.sumDataFields.concat(this.replDataFields)[i]
            let bits = 0
            for (let j = 0; j < f.field.length; j++) {
                const entryName = f.field[j]
                const schema = this.findEntryByName(entryName)
                bits = f.getFieldOffset(schema['name'])
                schema['value'] = this.encodedData[i] >> BigInt(bits)
                out.push(schema)
            }
        }

        return out
    }

    getSchemaDetails() {
        let ans = {}
        for (let i = 0; i < SUM_FIELD_COUNT; i++) {
            if (this.sumDataFields[i].field.length == 0) continue
            ans[`sumData[${i + 1}]`] = this.sumDataFields[i]
        }
        for (let i = 0; i < FIELD_COUNT - SUM_FIELD_COUNT; i++) {
            if (this.replDataFields[i].field.length == 0) continue
            ans[`replData[${i + 1}]`] = this.replDataFields[i]
        }
        return ans
    }

    getValue(entry: string) {
        const a = this.decodeDataArray()
        const ans = a.find((x) => x['name'] == entry)

        if (ans == undefined) throw Error('Invalid Entry')
        return ans['value']
    }
}
