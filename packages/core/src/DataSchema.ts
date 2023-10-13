import { CircuitConfig, shiftBits } from '@unirep/circuits'

/**
 * Type describing each field in the user-defined schema. Schema field type must be a `uint`.
 * :::caution
 * Replacement field must be `uint205`
 * :::
 * @example
 * ```ts
 * const schema: SchemaField = {
 *   name: 'posRep', // field name
 *   type: 'uint64', // uint*
 *   updatedBy: 'sum', // either update by adding or replacing user data
 * }
 * ```
 */
export type SchemaField = {
    name: string
    type: string
    updateBy: 'sum' | 'replace'
}

/**
 * Type to be used with a deployed Unirep contract object
 */
export type Attestation = {
    fieldIndex: number
    change: bigint
}

/**
 * The `DataSchema` class abstracts UniRep data into a JavaScript object.
 * This class can be used to encode and decode attestation data,
 * and build attestations that are ready to be submitted to the UniRep smart contract.
 * @example
 * ```ts
 * import { Attestation, DataSchema, SchemaField } from '@unirep/core'
 *
 * const schema: SchemaField[] = [
 *   {name: 'posRep', type: 'uint64', updateBy: 'sum',},
 *   {name: 'negRep', type: 'uint64', updateBy: 'sum',},
 *   {name: 'graffiti', type: 'uint205', updateBy: 'replace',},
 *   {name: 'postCount', type: 'uint49', updateBy: 'sum',},
 *   {name: 'commentCount', type: 'uint49', updateBy: 'sum',},
 *   {name: 'voteCount', type: 'uint49', updateBy: 'sum',},
 * ]
 *
 * const d = new DataSchema(schema)
 * ```
 */
export class DataSchema {
    public schema: any[]
    public config: CircuitConfig

    constructor(schema: SchemaField[], config = CircuitConfig.default) {
        this.config = config
        this.schema = this.parseSchema(schema)
    }

    /**
     * Verify a user-defined data schema
     * @param schema The array of `SchemaField`
     * @returns
     * ```ts
     * {
     *   ...schema: SchemaField, // exploded `SchemaField` fields
     *   dataIndex: number,
     *   offset: number, // bit offset in attester change
     *   bits: number // bits allocated
     * }
     * ```
     */
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

    /**
     * Build an `Attestation` object to be used for a UniRep contract
     * @param change The data change. If it is `sum` field, then the data will be changed by an addition. If it is `replacement` field, then the data will be changed by replacement.
     * @returns The attestation object could be submitted through Unirep contract.
     * @example
     * **Sum field**
     * ```ts
     * // 10 will be added to the 'posRep' field in the user data
     * const sumChange = { name: 'posRep', val: BigInt(10) }
     * const sumAttestation: Attestation = d.buildAttestation(sumChange)
     * ```
     *
     * **Replacement field**
     * ```ts
     * // 20 will replace the current value in the 'graffiti' field in user data
     * const replacementChange = { name: 'graffiti', val: BigInt(20) }
     * const replacementAttestation: Attestation = d.buildAttestation(replacementChange)
     * ```
     */
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

    /**
     * Build multiple `Attestation` objects to be used for a UniRep contract
     * @param changes The array of data change.
     * @returns The array of attestations could be submitted through Unirep contract.
     * @example
     * ```ts
     * // Multiple attestations can build using `buildAttestations()`
     * const changes = [
     *   { name: 'posRep', val: BigInt(10) },
     *   { name: 'negRep', val: BigInt(10) },
     *   { name: 'negRep', val: BigInt(20) },
     *   { name: 'graffiti', val: BigInt(30) },
     * ]
     *
     * //Returns two `Attestation` objects: 'posRep' and 'negRep' attestations are combined into one attestation
     * const attestations: Attestation[] = d.buildAttestations(changes)
     * ```
     */
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

    /**
     * Parse encoded schema, producing a dictionary of user-defined field names and attestation value
     * @param data The raw data happends in UniRep contract.
     * @returns The names of the data and its values.
     * @example
     * ```ts
     * // JS literal representing emitted data from a UniRep contract
     * const data = [
     *   553402322211286548490n,
     *   0n,
     *   0n,
     *   0n,
     *   205688069665150755269371147819668813122841983204197482918576158n,
     *   0n
     * ]
     *
     * const parsedData = d.parseData(data)
     * // Result:
     * // parsedData = {
     * //   posRep: 10n,
     * //   negRep: 30n,
     * //   graffiti: 30n,
     * //   postCount: 0n,
     * //   commentCount: 0n,
     * //   voteCount: 0n
     * // }
     * ```
     */
    parseData(data: bigint[]): any {
        const parsed = {}

        for (const field of this.schema) {
            const { name, /* type, updateBy, */ dataIndex, bits, offset } =
                field
            parsed[name] = shiftBits(
                data[dataIndex],
                BigInt(offset),
                BigInt(bits)
            )
        }

        return parsed
    }
}
