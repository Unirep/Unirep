import { TableData } from 'anondb'
import { nanoid } from 'nanoid'

const _schema = [
    {
        name: 'SynchronizerState',
        indexes: [{ keys: ['latestCompleteBlock'] }],
        rows: [
            ['attesterId', 'String', { unique: true }],
            {
                name: 'latestProcessedBlock',
                type: 'Int',
                default: 0,
            },
            {
                name: 'latestProcessedTransactionIndex',
                type: 'Int',
                default: 0,
            },
            {
                name: 'latestProcessedEventIndex',
                type: 'Int',
                default: 0,
            },
            {
                name: 'latestCompleteBlock',
                type: 'Int',
                default: 0,
            },
        ],
    },
    {
        name: 'Attestation',
        indexes: [{ keys: ['index'] }],
        rows: [
            ['epoch', 'Int'],
            ['epochKey', 'String'],
            ['index', 'String', { unique: true }],
            ['attesterId', 'String'],
            ['fieldIndex', 'Int'],
            ['change', 'String'],
            ['blockNumber', 'Int'],
        ],
    },
    {
        name: 'StateTreeLeaf',
        indexes: [{ keys: ['index'] }, { keys: ['epoch'] }],
        rows: [
            ['epoch', 'Int'],
            ['hash', 'String'],
            ['index', 'Int'],
            ['attesterId', 'String'],
            ['blockNumber', 'Int'],
        ],
    },
    {
        name: 'EpochTreeLeaf',
        primaryKey: 'id',
        indexes: [{ keys: ['index'] }],
        rows: [
            ['id', 'String'],
            ['epoch', 'Int'],
            ['hash', 'String'],
            ['index', 'String'],
            ['attesterId', 'String'],
            ['blockNumber', 'Int'],
        ],
    },
    {
        name: 'HistoryTreeLeaf',
        primaryKey: 'id',
        indexes: [{ keys: ['index'] }],
        rows: [
            ['id', 'String'],
            ['index', 'Int'],
            ['attesterId', 'String'],
            ['leaf', 'String', { unique: true }],
        ],
    },
    {
        name: 'Epoch',
        indexes: [{ keys: ['number'] }],
        rows: [
            ['number', 'Int'],
            ['attesterId', 'String'],
            ['sealed', 'Bool'],
        ],
    },
    {
        name: 'Nullifier',
        indexes: [{ keys: ['epoch'] }],
        rows: [
            ['epoch', 'Int'],
            ['attesterId', 'String'],
            ['nullifier', 'String', { unique: true }],
            ['transactionHash', 'String', { optional: true }],
            ['blockNumber', 'Int'],
        ],
    },
    {
        name: 'UserSignUp',
        indexes: [
            { keys: ['commitment', 'attesterId'] },
            { keys: ['commitment', 'attesterId', 'epoch'] },
        ],
        rows: [
            ['commitment', 'String', { index: true }],
            ['epoch', 'Int'],
            ['attesterId', 'String'],
            ['blockNumber', 'Int'],
        ],
    },
    {
        name: 'Attester',
        rows: [
            ['startTimestamp', 'Int'],
            ['epochLength', 'Int'],
        ],
    },
]

/**
 * UniRep needs to persist data in order to construct state and make proofs.
 * To do this we use a generic database wrapper called [anondb](https://github.com/vimwitch/anondb).
 * This wrapper has support for desktop environment databases like SQLite, as well as the IndexedDB browser database.
 *
 * `@unirep/core` ships a schema that should be used with the database.
 * This schema can be extended by adding additional collections for application specific data storage.
 * @see http://developer.unirep.io/docs/core-api/schema
 * @example
 * ```ts
 * import { schema } from '@unirep/core'
 * import { SQLiteConnector } from 'anondb/node'
 * import { IndexedDBConnector } from 'anondb/web'
 * // in nodejs
 * const db_mem = await SQLiteConnector.create(schema, ':memory:')
 * const db_storage = await SQLiteConnector.create(schema, 'db.sqlite')
 * // in browser
 * const db_browser = await IndexedDBConnector.create(schema)
 * ```
 */
export const schema = _schema.map((obj) => ({
    primaryKey: '_id',
    ...obj,
    rows: [
        ...obj.rows,
        {
            name: '_id',
            type: 'String',
            default: () => nanoid(),
        },
    ],
})) as TableData[]
