import { TableData } from 'anondb'
import { nanoid } from 'nanoid'

const _schema = [
    {
        name: 'SynchronizerState',
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
        indexes: [
            { keys: ['index'] },
            { keys: ['index', 'epochKey', 'epoch'] },
        ],
        rows: [
            ['epoch', 'Int'],
            ['epochKey', 'String'],
            ['index', 'String'], // event index, tx index, block index
            ['attesterId', 'String'],
            ['fieldIndex', 'Int'],
            ['change', 'String'],
            ['timestamp', 'Int'],
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
        primaryKey: 'id',
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
        name: 'Epoch',
        indexes: [{ keys: ['attesterId', 'number'] }],
        rows: [
            ['number', 'Int'],
            ['attesterId', 'String'],
            ['sealed', 'Bool'],
        ],
    },
    {
        name: 'Nullifier',
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
        indexes: [{ keys: ['commitment', 'attesterId'] }],
        rows: [
            ['commitment', 'String', { index: true }],
            ['epoch', 'Int'],
            ['attesterId', 'String'],
            ['blockNumber', 'Int'],
        ],
    },
    {
        name: 'Attester',
        primaryKey: '_id',
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
