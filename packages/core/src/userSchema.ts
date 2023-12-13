import { TableData } from 'anondb'
import { schema as syncSchema } from './schema'

const _schema = [
    ...syncSchema,
    {
        name: 'UserState',
        indexes: [{ keys: ['attesterId'] }],
        primaryKey: 'attesterId',
        rows: [
            {
                name: 'attesterId',
                type: 'String',
            },
            {
                name: 'latestTransitionedEpoch',
                type: 'Int',
                default: 0,
            },
            {
                name: 'latestTransitionedIndex',
                type: 'Int',
                defulat: 0,
            },
            {
                name: 'data',
                type: 'Object',
            },
        ],
    },
]

export const schema = _schema.map((obj) => ({
    ...obj,
    rows: [...obj.rows],
})) as TableData[]
