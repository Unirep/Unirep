import { expect } from 'chai'
import { genRandomNumber, hashLeftRight } from '@unirep/crypto'
import {
    EPOCH_LENGTH,
    EPOCH_TREE_DEPTH,
    GLOBAL_STATE_TREE_DEPTH,
    MAX_REPUTATION_BUDGET,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    USER_STATE_TREE_DEPTH,
} from '@unirep/circuits/config'
import { Attestation } from '@unirep/contracts'

import { computeInitUserStateRoot, ISettings, UnirepState } from '../../src'
import { genNewGST, genRandomAttestation } from '../utils'
const ATTESTING_FEE = '0' as any

describe('Unirep State', function () {
    let unirepState: UnirepState
    const setting: ISettings = {
        globalStateTreeDepth: GLOBAL_STATE_TREE_DEPTH,
        userStateTreeDepth: USER_STATE_TREE_DEPTH,
        epochTreeDepth: EPOCH_TREE_DEPTH,
        attestingFee: ATTESTING_FEE as any,
        epochLength: EPOCH_LENGTH,
        numEpochKeyNoncePerEpoch: NUM_EPOCH_KEY_NONCE_PER_EPOCH,
        maxReputationBudget: MAX_REPUTATION_BUDGET,
    }
    const epochKeys: string[] = []
    const maxUsers = 10
    const userNum = Math.ceil(Math.random() * maxUsers)
    let epoch = 1

    before(async () => {
        unirepState = new UnirepState(setting)
    })

    describe('Users sign up', async () => {
        const GSTree = genNewGST(
            setting.globalStateTreeDepth,
            setting.userStateTreeDepth
        )
        const rootHistories: bigint[] = []
        it('update Unirep state should success', async () => {
            for (let i = 0; i < userNum; i++) {
                const commitment = genRandomNumber()
                const randomAttesterId = Math.ceil(Math.random() * 10)
                const randomAirdropAmount = Math.ceil(Math.random() * 10)
                await unirepState.signUp(
                    epoch,
                    commitment,
                    randomAttesterId,
                    randomAirdropAmount
                )
                const USTRoot = await computeInitUserStateRoot(
                    setting.userStateTreeDepth,
                    randomAttesterId,
                    randomAirdropAmount
                )
                const GSTLeaf = hashLeftRight(commitment, USTRoot)

                const unirepGSTree = unirepState.genGSTree(epoch)
                GSTree.insert(GSTLeaf)
                expect(
                    GSTree.root,
                    `Global state tree root from Unirep state mismatches current global state tree`
                ).equal(unirepGSTree.root)
                rootHistories.push(GSTree.root)

                const GSTLeafNum = unirepState.getNumGSTLeaves(epoch)
                expect(
                    GSTLeafNum,
                    `Global state tree leaves should match`
                ).equal(i + 1)
            }
        })

        it('Get GST leaf number should fail if input an invalid epoch', async () => {
            const wrongEpoch = epoch + 1
            let error
            try {
                unirepState.getNumGSTLeaves(wrongEpoch)
            } catch (e) {
                error = e
            }
            expect(error).not.to.be.undefined
        })

        it('Update user sign up with wrong epoch should fail', async () => {
            const wrongEpoch = epoch + 1
            const commitment = genRandomNumber()
            const randomAttesterId = Math.ceil(Math.random() * 10)
            const randomAirdropAmount = Math.ceil(Math.random() * 10)
            let error
            try {
                await unirepState.signUp(
                    wrongEpoch,
                    commitment,
                    randomAttesterId,
                    randomAirdropAmount
                )
            } catch (e) {
                error = e
            }
            expect(error).not.to.be.undefined
        })

        it('Query GST root should success', async () => {
            for (let root of rootHistories) {
                const exist = unirepState.GSTRootExists(root, epoch)
                expect(
                    exist,
                    'Query global state tree root from Unirep state failed'
                ).to.be.true
            }
        })

        it('Query global state tree roots with wrong input should success', async () => {
            const notExist = unirepState.GSTRootExists(genRandomNumber(), epoch)
            expect(notExist, 'Query non-exist root from User state should fail')
                .to.be.false

            const invalidEpoch = epoch + 1
            for (let root of rootHistories) {
                let error
                try {
                    unirepState.GSTRootExists(root, invalidEpoch)
                } catch (e) {
                    error = e
                }
                expect(error).not.to.be.undefined
            }
        })
    })

    describe('Add attestations', async () => {
        const attestationsToEpochKey: { [key: string]: Attestation[] } = {}

        it('update Unirep state should success', async () => {
            const maxEpochKeyNum = 10
            const epochKeyNum = Math.ceil(Math.random() * maxEpochKeyNum)
            for (let i = 0; i < epochKeyNum; i++) {
                const maxAttestPerEpochKeyNum = 10
                const attestNum = Math.ceil(
                    Math.random() * maxAttestPerEpochKeyNum
                )

                const epochKey =
                    BigInt(genRandomNumber().toString()) %
                    BigInt(2 ** setting.epochLength)
                epochKeys.push(epochKey.toString())
                attestationsToEpochKey[epochKey.toString()] = []

                for (let j = 0; j < attestNum; j++) {
                    const attestation = genRandomAttestation()
                    unirepState.addAttestation(epochKey.toString(), attestation)
                    attestationsToEpochKey[epochKey.toString()].push(
                        attestation
                    )
                }
            }
        })

        it('wrong epoch key should throw error', async () => {
            let error
            const wrongEpochKey = genRandomNumber()
            const attestation = genRandomAttestation()
            try {
                unirepState.addAttestation(
                    wrongEpochKey.toString(),
                    attestation
                )
            } catch (e) {
                error = e
            }
            expect(error).not.to.be.undefined
        })

        it('Get attestations should success', async () => {
            for (let i = 0; i < epochKeys.length; i++) {
                const unirepAttestations = unirepState.getAttestations(
                    epochKeys[i]
                )
                for (let j = 0; j < unirepAttestations.length; j++) {
                    expect(JSON.stringify(unirepAttestations[j])).to.deep.equal(
                        JSON.stringify(attestationsToEpochKey[epochKeys[i]][j])
                    )
                }
            }
        })

        it('Get attestation with non exist epoch key should return an empty array', async () => {
            const epochKey =
                BigInt(genRandomNumber().toString()) %
                BigInt(2 ** setting.epochLength)
            const unirepAttestations = unirepState.getAttestations(
                epochKey.toString()
            )
            expect(unirepAttestations.length).equal(0)
        })

        it('Get attestation with invalid epoch key should throw error', async () => {
            let error
            const wrongEpochKey = genRandomNumber()
            try {
                unirepState.getAttestations(wrongEpochKey.toString())
            } catch (e) {
                error = e
            }
            expect(error).not.to.be.undefined
        })

        it('get epoch keys should success', async () => {
            const unirepEpochKeys = unirepState.getEpochKeys(epoch)
            expect(unirepEpochKeys.length).equal(epochKeys.length)

            for (let epk of unirepEpochKeys) {
                expect(epochKeys.indexOf(epk)).not.equal(-1)
            }
        })

        it('get epoch keys with invalid epoch should fail', async () => {
            let error
            try {
                unirepState.getEpochKeys(epoch + 1)
            } catch (e) {
                error = e
            }
            expect(error).not.to.be.undefined
        })

        it('add reputation nullifiers', async () => {
            const nullifierNum = Math.ceil(Math.random() * 10)
            for (let i = 0; i < nullifierNum; i++) {
                const nullifier = genRandomNumber()
                unirepState.addReputationNullifiers(nullifier)

                // submit the same nullifier twice should fail
                let error
                try {
                    unirepState.addReputationNullifiers(nullifier)
                } catch (e) {
                    error = e
                }
                expect(error).not.to.be.undefined

                // query nullifier should succeed
                const exist = unirepState.nullifierExist(nullifier)
                expect(
                    exist,
                    'Query reputation nullifier from Unirep state failed'
                ).to.be.true
            }
        })

        it('non exist nullifier should return false', async () => {
            const notExist = unirepState.nullifierExist(genRandomNumber())
            expect(
                notExist,
                'Query non exist nullifier from Unirep state with wrong result'
            ).to.be.false
        })
    })

    describe('1st Epoch transition', async () => {
        const GSTree = genNewGST(
            setting.globalStateTreeDepth,
            setting.userStateTreeDepth
        )
        const rootHistories: bigint[] = []

        it('epoch transition', async () => {
            await unirepState.epochTransition(epoch)
            expect(
                unirepState.currentEpoch,
                'Unirep epoch should increase by 1'
            ).equal(epoch + 1)
            epoch = unirepState.currentEpoch

            // sealed epoch key should not add attestations
            for (let i = 0; i < epochKeys.length; i++) {
                const attestation = genRandomAttestation()

                // submit the attestation to sealed epoch key should fail
                let error
                try {
                    unirepState.addAttestation(epochKeys[i], attestation)
                } catch (e) {
                    error = e
                }
                expect(error).not.to.be.undefined
            }
        })

        it('epoch transition with wrong epoch input should fail', async () => {
            const wrongEpoch = 1
            let error
            try {
                await unirepState.epochTransition(wrongEpoch)
            } catch (e) {
                error = e
            }
            expect(error).not.to.be.undefined
        })

        it('update Unirep state should success', async () => {
            for (let i = 0; i < userNum; i++) {
                const GSTLeaf = genRandomNumber()
                const nullifiers: bigint[] = []
                for (let j = 0; j < NUM_EPOCH_KEY_NONCE_PER_EPOCH; j++) {
                    nullifiers.push(genRandomNumber())
                }
                unirepState.userStateTransition(epoch, GSTLeaf, nullifiers)

                const unirepGSTree = unirepState.genGSTree(epoch)
                GSTree.insert(GSTLeaf)
                expect(
                    GSTree.root,
                    `Global state tree root from Unirep state mismatches current global state tree`
                ).equal(unirepGSTree.root)
                rootHistories.push(GSTree.root)

                const GSTLeafNum = unirepState.getNumGSTLeaves(epoch)
                expect(
                    GSTLeafNum,
                    `Global state tree leaves should match`
                ).equal(i + 1)
            }
        })

        it('Query GST root should success', async () => {
            for (let root of rootHistories) {
                const exist = unirepState.GSTRootExists(root, epoch)
                expect(
                    exist,
                    'Query global state tree root from Unirep state failed'
                ).to.be.true
            }
        })

        it('Query global state tree roots with wrong input should success', async () => {
            const notExist = unirepState.GSTRootExists(genRandomNumber(), epoch)
            expect(notExist, 'Query non-exist root from User state should fail')
                .to.be.false

            const invalidEpoch = epoch + 1
            for (let root of rootHistories) {
                let error
                try {
                    unirepState.GSTRootExists(root, invalidEpoch)
                } catch (e) {
                    error = e
                }
                expect(error).not.to.be.undefined
            }
        })

        it('user state transition with wrong epoch should fail', async () => {
            const wrongEpoch = epoch + 1
            const GSTLeaf = genRandomNumber()
            const nullifiers: bigint[] = []
            for (let i = 0; i < NUM_EPOCH_KEY_NONCE_PER_EPOCH; i++) {
                nullifiers.push(genRandomNumber())
            }
            let error
            try {
                await unirepState.userStateTransition(
                    wrongEpoch,
                    GSTLeaf,
                    nullifiers
                )
            } catch (e) {
                error = e
            }
            expect(error).not.to.be.undefined
        })

        it('user state transition with wrong nullifiers amount should fail', async () => {
            const GSTLeaf = genRandomNumber()
            const nullifiers: bigint[] = []
            const wrongEpkNullifierAmount = NUM_EPOCH_KEY_NONCE_PER_EPOCH + 1
            for (let i = 0; i < wrongEpkNullifierAmount; i++) {
                nullifiers.push(genRandomNumber())
            }
            let error
            try {
                unirepState.userStateTransition(epoch, GSTLeaf, nullifiers)
            } catch (e) {
                error = e
            }
            expect(error).not.to.be.undefined
        })

        it('generate epoch tree should succeed', async () => {
            const prevEpoch = 1
            const epochTree = await unirepState.genEpochTree(prevEpoch)
            const root = epochTree.root

            const exist = await unirepState.epochTreeRootExists(root, prevEpoch)
            expect(exist).to.be.true
        })

        it('query wrong epoch tree root should fail', async () => {
            const prevEpoch = 1
            const wrongRoot = genRandomNumber()
            const notExist = await unirepState.epochTreeRootExists(
                wrongRoot,
                prevEpoch
            )
            expect(notExist).to.be.false
        })

        it('query epoch tree root with wrong epoch should throw error', async () => {
            const wrongEpoch = epoch + 1
            const root = genRandomNumber()
            let error
            try {
                await unirepState.epochTreeRootExists(root, wrongEpoch)
            } catch (e) {
                error = e
            }
            expect(error).not.to.be.undefined
        })
    })

    describe('Add attestations in the next epoch', async () => {
        const attestationsToEpochKey: { [key: string]: Attestation[] } = {}

        it('update Unirep state should success', async () => {
            const maxEpochKeyNum = 10
            const epochKeyNum = Math.ceil(Math.random() * maxEpochKeyNum)
            for (let i = 0; i < epochKeyNum; i++) {
                const maxAttestPerEpochKeyNum = 10
                const attestNum = Math.ceil(
                    Math.random() * maxAttestPerEpochKeyNum
                )

                const epochKey =
                    BigInt(genRandomNumber().toString()) %
                    BigInt(2 ** setting.epochLength)
                attestationsToEpochKey[epochKey.toString()] = []

                for (let j = 0; j < attestNum; j++) {
                    const attestation = genRandomAttestation()
                    unirepState.addAttestation(epochKey.toString(), attestation)
                    attestationsToEpochKey[epochKey.toString()].push(
                        attestation
                    )
                }
            }
        })

        it('add reputation nullifiers', async () => {
            const nullifierNum = Math.ceil(Math.random() * 10)
            for (let i = 0; i < nullifierNum; i++) {
                const nullifier = genRandomNumber()
                unirepState.addReputationNullifiers(nullifier)

                // submit the same nullifier twice should fail
                let error
                try {
                    unirepState.addReputationNullifiers(nullifier)
                } catch (e) {
                    error = e
                }
                expect(error).not.to.be.undefined

                // query nullifier should succeed
                const exist = unirepState.nullifierExist(nullifier)
                expect(
                    exist,
                    'Query reputation nullifier from Unirep state failed'
                ).to.be.true
            }
        })
    })

    describe('2nd Epoch transition', async () => {
        const GSTree = genNewGST(
            setting.globalStateTreeDepth,
            setting.userStateTreeDepth
        )
        const rootHistories: bigint[] = []

        it('epoch transition', async () => {
            await unirepState.epochTransition(epoch)
            expect(
                unirepState.currentEpoch,
                'Unirep epoch should increase by 1'
            ).equal(epoch + 1)
            epoch = unirepState.currentEpoch
        })

        it('epoch transition with wrong epoch input should fail', async () => {
            const wrongEpoch = 1
            let error
            try {
                await unirepState.epochTransition(wrongEpoch)
            } catch (e) {
                error = e
            }
            expect(error).not.to.be.undefined
        })

        it('update Unirep state should success', async () => {
            for (let i = 0; i < userNum; i++) {
                const GSTLeaf = genRandomNumber()
                const nullifiers: bigint[] = []
                for (let j = 0; j < NUM_EPOCH_KEY_NONCE_PER_EPOCH; j++) {
                    nullifiers.push(genRandomNumber())
                }
                unirepState.userStateTransition(epoch, GSTLeaf, nullifiers)

                const unirepGSTree = unirepState.genGSTree(epoch)
                GSTree.insert(GSTLeaf)
                expect(
                    GSTree.root,
                    `Global state tree root from Unirep state mismatches current global state tree`
                ).equal(unirepGSTree.root)
                rootHistories.push(GSTree.root)

                const GSTLeafNum = unirepState.getNumGSTLeaves(epoch)
                expect(
                    GSTLeafNum,
                    `Global state tree leaves should match`
                ).equal(i + 1)
            }
        })

        it('Query GST root should success', async () => {
            for (let root of rootHistories) {
                const exist = unirepState.GSTRootExists(root, epoch)
                expect(
                    exist,
                    'Query global state tree root from Unirep state failed'
                ).to.be.true
            }
        })

        it('Query global state tree roots with wrong input should success', async () => {
            const notExist = unirepState.GSTRootExists(genRandomNumber(), epoch)
            expect(notExist, 'Query non-exist root from User state should fail')
                .to.be.false

            const invalidEpoch = epoch + 1
            for (let root of rootHistories) {
                let error
                try {
                    unirepState.GSTRootExists(root, invalidEpoch)
                } catch (e) {
                    error = e
                }
                expect(error).not.to.be.undefined
            }
        })

        it('generate epoch tree should succeed', async () => {
            const prevEpoch = 1
            const epochTree = await unirepState.genEpochTree(prevEpoch)
            const root = epochTree.root

            const exist = await unirepState.epochTreeRootExists(root, prevEpoch)
            expect(exist).to.be.true
        })
    })
})
