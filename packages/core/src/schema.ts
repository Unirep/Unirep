import { TableData } from 'anondb'
import { nanoid } from 'nanoid'

const _schema = [
    {
        name: 'SynchronizerState',
        rows: [
            ['attesterId', 'String', { unique: true }],
            ['latestProcessedBlock', 'Int'],
            ['latestProcessedTransactionIndex', 'Int'],
            ['latestProcessedEventIndex', 'Int'],
            ['latestCompleteBlock', 'Int'],
        ],
    },
    {
        name: 'Attestation',
        indexes: [
            { keys: ['index'] },
            { keys: ['index', 'epochKey', 'epoch'] },
        ],
        rows: [
            ['epoch', 'Int', { optional: true }],
            ['epochKey', 'String', { optional: true }],
            ['index', 'String'], // event index, tx index, block index
            ['attester', 'String', { optional: true }],
            ['attesterId', 'String', { optional: true }],
            ['posRep', 'Int', { optional: true }],
            ['negRep', 'Int', { optional: true }],
            ['graffiti', 'String', { optional: true }],
            ['timestamp', 'String', { optional: true }],
            ['hash', 'String'],
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
            ['epochKey', 'String'],
            ['posRep', 'String'],
            ['negRep', 'String'],
            ['graffiti', 'String'],
            ['timestamp', 'String'],
        ],
    },
    {
        name: 'Epoch',
        indexes: [{ keys: ['number'] }],
        rows: [
            ['number', 'Int', { unique: true }],
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
        ],
    },
    {
        name: 'UserSignUp',
        indexes: [{ keys: ['commitment', 'attesterId'] }],
        rows: [
            ['commitment', 'String', { index: true }],
            ['epoch', 'Int'],
            ['attesterId', 'String'],
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
