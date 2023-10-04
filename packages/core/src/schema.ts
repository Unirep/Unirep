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
            ['index', 'String', { unique: true }], // event index, tx index, block index
            ['attesterId', 'String'],
            ['fieldIndex', 'Int'],
            ['change', 'String'],
            ['blockNumber', 'Int'],
        ],
    },
    {
        name: 'StateTreeLeaf',
        indexes: [{ keys: ['index'] }],
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
            ['commitment', 'String'],
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
 * The schema of the database that is used in storing Unirep data
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
