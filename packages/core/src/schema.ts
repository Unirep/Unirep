import { TableData } from 'anondb'
import { nanoid } from 'nanoid'

const _schema = [
    {
        name: 'SynchronizerState',
        rows: [
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
            ['attesterId', 'Int', { optional: true }],
            ['posRep', 'Int', { optional: true }],
            ['negRep', 'Int', { optional: true }],
            ['graffiti', 'String', { optional: true }],
            ['signUp', 'Int', { optional: true }],
            ['hash', 'String'],
        ],
    },
    {
        name: 'GSTLeaf',
        indexes: [{ keys: ['index'] }],
        rows: [
            ['epoch', 'Int'],
            ['hash', 'String'],
            ['index', 'Int'],
        ],
    },
    {
        name: 'Epoch',
        indexes: [{ keys: ['number'] }],
        rows: [
            ['number', 'Int', { unique: true }],
            ['sealed', 'Bool'],
        ],
    },
    {
        name: 'Nullifier',
        rows: [
            ['epoch', 'Int'],
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
            ['attesterId', 'Int'],
            ['airdrop', 'Int'],
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
