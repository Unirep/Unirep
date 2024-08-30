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

/**
 * UniRep needs to persist data in order to construct state and make proofs.
 * To do this we use a generic database wrapper called [anondb](https://github.com/vimwitch/anondb).
 * This wrapper has support for desktop environment databases like SQLite, as well as the IndexedDB browser database.
 *
 * `@unirep/core` ships a schema that should be used with the database.
 * The user schema extends from a synchronizer schema, which securely stores private user data, including personal information and the latest transitioned epoch.
 * @see http://developer.unirep.io/docs/core-api/user-schema
 * @example
 * ```ts
 * import { userSchema } from '@unirep/core'
 * import { SQLiteConnector } from 'anondb/node'
 * import { IndexedDBConnector } from 'anondb/web'
 * // in nodejs
 * const db_mem = await SQLiteConnector.create(userSchema, ':memory:')
 * const db_storage = await SQLiteConnector.create(userSchema, 'db.sqlite')
 * // in browser
 * const db_browser = await IndexedDBConnector.create(userSchema)
 * ```
 */
export const userSchema = _schema.map((obj) => ({
    ...obj,
    rows: [...obj.rows],
})) as TableData[]
