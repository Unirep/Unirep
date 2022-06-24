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
        name: 'Proof',
        rows: [
            {
                name: 'createdAt',
                type: 'Int',
                default: () => +new Date(),
            },
            ['index', 'Int'],
            ['epoch', 'Int', { optional: true }],
            ['toEpochKey', 'Int', { optional: true }],
            ['proof', 'String', { optional: true }],
            ['publicSignals', 'String', { optional: true }],
            ['valid', 'Bool', { optional: true }],
            ['spent', 'Bool', { optional: true }],
            ['event', 'String'],
            ['transactionHash', 'String'],
            ['blindedUserState', 'String', { optional: true }],
            ['blindedHashChain', 'String', { optional: true }],
            ['globalStateTree', 'String'],
            ['outputBlindedUserState', 'String', { optional: true }],
            ['outputBlindedHashChain', 'String', { optional: true }],
            ['inputBlindedUserState', 'String', { optional: true }],
            ['proofIndexRecords', 'Object', { optional: true }],
        ],
    },
    {
        name: 'Attestation',
        rows: [
            ['epoch', 'Int', { optional: true }],
            ['epochKey', 'String', { optional: true }],
            ['epochKeyToHashchainMap', 'String', { optional: true }],
            // ['index', 'Int'],
            ['index', 'Int'], // event index, tx index, block index
            ['transactionHash', 'String', { optional: true }],
            ['attester', 'String', { optional: true }],
            ['proofIndex', 'Int', { optional: true }],
            ['attesterId', 'Int', { optional: true }],
            ['posRep', 'Int', { optional: true }],
            ['negRep', 'Int', { optional: true }],
            ['graffiti', 'String', { optional: true }],
            ['signUp', 'Bool', { optional: true }],
            ['hash', 'String'],
            ['valid', 'Bool', { optional: true }],
        ],
    },
    {
        name: 'GSTLeaf',
        rows: [
            ['epoch', 'Int'],
            ['transactionHash', 'String'],
            ['hash', 'String'],
            ['index', 'Int'],
        ],
    },
    {
        name: 'GSTRoot',
        rows: [
            ['epoch', 'Int'],
            ['root', 'String'],
        ],
    },
    {
        name: 'Epoch',
        rows: [
            ['number', 'Int', { unique: true }],
            ['sealed', 'Bool'],
            ['epochRoot', 'String', { optional: true }],
        ],
    },
    {
        name: 'EpochKey',
        primaryKey: ['key', 'epoch'],
        rows: [
            ['key', 'String'],
            ['epoch', 'Int'],
            {
                name: 'epochDoc',
                relation: {
                    localField: 'epoch',
                    foreignField: 'number',
                    foreignTable: 'Epoch',
                },
            },
        ],
    },
    {
        name: 'Nullifier',
        rows: [
            ['epoch', 'Int'],
            ['nullifier', 'String', { unique: true }],
            ['transactionHash', 'String', { optional: true }],
            {
                name: 'confirmed',
                type: 'Bool',
                default: () => true,
            },
        ],
    },
    {
        name: 'UserSignUp',
        rows: [
            ['commitment', 'String'],
            ['epoch', 'Int'],
            ['attesterId', 'Int'],
            ['airdrop', 'Int'],
        ],
    },
]

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
