class DataField {
    public field: string[]
    public fieldOffset: number[]

    public currentFieldSize: bigint

    constructor() {
        this.field = []
        this.fieldOffset = []
        this.currentFieldSize = BigInt(0)
    }

    public addOrPass(entry: string, size: bigint): boolean {
        if (this.currentFieldSize + size >= 254) {
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
}
export const parseSchema = (schema: {}[]) => {
    const SCHEMA_FIELDS = ['name', 'type', 'updateBy']

    schema.forEach((entry) => {
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
    public fieldCount: number
    public sumFieldCount: number

    private sumDataFields: DataField[]
    private replDataFields: DataField[]

    private curSumDataFieldCount: number
    private curReplDataFieldCount: number
    private schema: {}[]
    private schemaLookup: {}

    private encodedData: bigint[]

    constructor(_schema: {}[], _fieldCount: number, _sumFieldCount: number) {
        this.fieldCount = _fieldCount
        this.sumFieldCount = _sumFieldCount

        this.curSumDataFieldCount = 0
        this.curReplDataFieldCount = 0

        this.sumDataFields = new Array(this.sumFieldCount)
        this.replDataFields = new Array(this.fieldCount - this.sumFieldCount)

        for (let i = 0; i < this.sumDataFields.length; i++) {
            this.sumDataFields[i] = new DataField()
        }

        for (let i = 0; i < this.replDataFields.length; i++) {
            this.replDataFields[i] = new DataField()
        }

        this.schema = parseSchema(_schema)
        this.encodedData = new Array(this.fieldCount).fill(
            BigInt(2) ** BigInt(254)
        )

        this.encodedData = new Array(this.fieldCount).fill(BigInt(0))

        this.schemaLookup = {}

        this.buildDataFields()
    }

    findEntryByName(entry: string): {} {
        for (let i = 0; i < this.schema.length; i++) {
            if (this.schema[i]['name'] == entry) {
                return Object.assign({}, this.schema[i])
            }
        }
        return {}
    }

    buildDataFields() {
        for (let i = 0; i < this.schema.length; i++) {
            const name = this.schema[i]['name']
            const bits = BigInt(this.schema[i]['type'].slice(4))
            const updateBy = this.schema[i]['updateBy']

            if (updateBy == 'sum') {
                if (
                    !this.sumDataFields[this.curSumDataFieldCount].addOrPass(
                        name,
                        bits
                    )
                ) {
                    this.curSumDataFieldCount++

                    if (this.curSumDataFieldCount >= this.sumFieldCount) {
                        throw Error('Too many sum fields')
                    }
                    const res = this.sumDataFields[
                        this.curSumDataFieldCount
                    ].addOrPass(name, bits)

                    if (!res) {
                        throw Error("Couldn't add " + name + ' sum data field')
                    }
                }
            } else if (updateBy == 'replace') {
                if (
                    !this.replDataFields[this.curReplDataFieldCount].addOrPass(
                        name,
                        bits
                    )
                ) {
                    this.curReplDataFieldCount++

                    if (this.curReplDataFieldCount >= this.fieldCount) {
                        throw Error('Too many replacement and sum fields')
                    }
                    const res = this.replDataFields[
                        this.curReplDataFieldCount
                    ].addOrPass(name, bits)

                    if (!res) {
                        throw Error(
                            "Couldn't replace " +
                                name +
                                ' replacement data field'
                        )
                    }
                }
            }
        }
    }

    getEncodedFieldIndex(entry: string): number {
        const schema = this.findEntryByName(entry)
        const updateBy = schema['updateBy']

        if (updateBy == 'sum') {
            for (let i = 0; i < this.sumFieldCount; i++) {
                if (this.sumDataFields[i].field.includes(entry)) {
                    return i
                }
            }
        } else if (updateBy == 'replace') {
            for (let i = 0; i < this.fieldCount - this.sumFieldCount; i++) {
                if (this.replDataFields[i].field.includes(entry)) {
                    return i
                }
            }
        } else {
            throw Error('Invalid update type')
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
            this.encodedData[this.sumFieldCount + idx] =
                (this.encodedData[this.sumFieldCount + idx] & ~(maxVal << n)) |
                ((v & maxVal) << n)
        } else {
            throw Error('Entry does not exist in schema')
        }
    }

    decodeDataArray(): {}[] {
        let out: {}[] = []

        for (let i = 0; i < this.fieldCount; i++) {
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
        for (let i = 0; i < this.sumFieldCount; i++) {
            if (this.sumDataFields[i].field.length == 0) continue
            ans[`sumData[${i + 1}]`] = this.sumDataFields[i]
        }
        for (let i = 0; i < this.fieldCount - this.sumFieldCount; i++) {
            if (this.replDataFields[i].field.length == 0) continue
            ans[`replData[${i + 1}]`] = this.replDataFields[i]
        }
        return ans
    }

    getEncodedData(fieldIndex: number): bigint {
        return this.encodedData[fieldIndex]
    }

    getValue(entry: string) {
        const a = this.decodeDataArray()
        const ans = a.find((x) => x['name'] == entry)

        if (ans == undefined) throw Error('Invalid Entry')
        return ans['value']
    }
}
