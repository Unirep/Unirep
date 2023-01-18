// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'
import { EPOCH_LENGTH } from '../src'
import { deployUnirep } from '../deploy'
import {
    Circuit,
    EPOCH_TREE_DEPTH,
    EPOCH_TREE_ARITY,
    defaultEpochTreeLeaf,
    AGGREGATE_KEY_COUNT,
    AggregateEpochKeysProof,
} from '@unirep/circuits'
import { SparseMerkleTree, hash4 } from '@unirep/utils'
import { genAggregateEpochKeysCircuitInputs } from '@unirep/test'

describe('Hashchain tests', function () {
    this.timeout(300000)
    let unirepContract
    let attester

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])

        attester = accounts[1]
        await unirepContract
            .connect(attester)
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())
    })

    {
        let snapshot
        beforeEach(async () => {
            snapshot = await ethers.provider.send('evm_snapshot', [])
        })
        afterEach(() => ethers.provider.send('evm_revert', [snapshot]))
    }

    it('should build a hashchain', async () => {
        const epochKey = '0x12345'
        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )

        await unirepContract
            .connect(attester)
            .submitAttestation(epoch, epochKey, 1, 0, 0)
            .then((t) => t.wait())
        await expect(unirepContract.buildHashchain(attester.address, epoch))
            .to.emit(unirepContract, 'HashchainBuilt')
            .withArgs(epoch, attester.address, 0)
    })

    it('should build and process a hashchain', async () => {
        const epochKey = '0x123455'
        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )

        await unirepContract
            .connect(attester)
            .submitAttestation(epoch, epochKey, 1, 0, 0)
            .then((t) => t.wait())
        const hashchainIndex =
            await unirepContract.attesterHashchainProcessedCount(
                attester.address,
                epoch
            )
        expect(hashchainIndex.toNumber()).to.equal(0)
        await expect(unirepContract.buildHashchain(attester.address, epoch))
            .to.emit(unirepContract, 'HashchainBuilt')
            .withArgs(epoch, attester.address, hashchainIndex)
        const hashchain = await unirepContract.attesterHashchain(
            attester.address,
            epoch,
            hashchainIndex
        )
        expect(hashchain.epochKeys.length).to.equal(1)
        expect(hashchain.epochKeys[0].toBigInt()).to.equal(BigInt(epochKey))
        expect(hashchain.epochKeyBalances.length).to.equal(1)
        expect(hashchain.processed).to.equal(false)
        const owedKeys = await unirepContract.attesterOwedEpochKeys(
            attester.address,
            epoch
        )
        expect(owedKeys.toNumber()).to.equal(0)
        const inputs = genAggregateEpochKeysCircuitInputs(
            epoch,
            attester,
            hashchainIndex,
            hashchain
        )
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.aggregateEpochKeys,
            inputs
        )
        const isValid = await defaultProver.verifyProof(
            Circuit.aggregateEpochKeys,
            r.publicSignals,
            r.proof
        )
        const { proof, publicSignals } = new AggregateEpochKeysProof(
            r.publicSignals,
            r.proof
        )
        expect(isValid).to.be.true
        await expect(unirepContract.processHashchain(publicSignals, proof))
            .to.emit(unirepContract, 'HashchainProcessed')
            .withArgs(epoch, attester.address, false)
        const { processed } = await unirepContract.attesterHashchain(
            attester.address,
            epoch,
            hashchainIndex
        )
        expect(processed).to.be.true
    })

    it('should build max length hashchain', async () => {
        const epochKeys = Array(AGGREGATE_KEY_COUNT + 1)
            .fill(null)
            .map((_, i) => 1000 * i)
        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        for (const epochKey of epochKeys) {
            await unirepContract
                .connect(attester)
                .submitAttestation(epoch, epochKey, 1, 100, 0)
                .then((t) => t.wait())
        }
        const hashchainIndex =
            await unirepContract.attesterHashchainProcessedCount(
                attester.address,
                epoch
            )
        expect(hashchainIndex.toNumber()).to.equal(0)
        await expect(unirepContract.buildHashchain(attester.address, epoch))
            .to.emit(unirepContract, 'HashchainBuilt')
            .withArgs(epoch, attester.address, hashchainIndex)
        const hashchain = await unirepContract.attesterHashchain(
            attester.address,
            epoch,
            hashchainIndex
        )
        expect(hashchain.epochKeys.length).to.equal(AGGREGATE_KEY_COUNT)
        for (const [i, epochKey] of Object.entries(hashchain.epochKeys)) {
            expect(epochKey.toString()).to.equal(
                [...epochKeys].reverse()[i].toString()
            )
        }
        const owedKeys = await unirepContract.attesterOwedEpochKeys(
            attester.address,
            epoch
        )
        expect(owedKeys.toNumber()).to.equal(
            epochKeys.length - AGGREGATE_KEY_COUNT
        )
        expect(hashchain.epochKeyBalances.length).to.equal(AGGREGATE_KEY_COUNT)
        expect(hashchain.processed).to.equal(false)
    })

    it('should return correct attesterEpochSealed value', async () => {
        const epochKeys = Array(AGGREGATE_KEY_COUNT + 1)
            .fill(null)
            .map((_, i) => 1000 * i)
        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        {
            const sealed = await unirepContract.attesterEpochSealed(
                attester.address,
                epoch
            )
            expect(sealed).to.be.false
        }
        for (const epochKey of epochKeys) {
            await unirepContract
                .connect(attester)
                .submitAttestation(
                    epoch,
                    epochKey,
                    Math.floor(Math.random() * 10000000000),
                    100,
                    0
                )
                .then((t) => t.wait())
        }

        {
            const sealed = await unirepContract.attesterEpochSealed(
                attester.address,
                epoch
            )
            expect(sealed).to.be.false
        }
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])
        {
            const sealed = await unirepContract.attesterEpochSealed(
                attester.address,
                epoch
            )
            expect(sealed).to.be.false
        }
        const epochTree = new SparseMerkleTree(
            EPOCH_TREE_DEPTH,
            defaultEpochTreeLeaf,
            EPOCH_TREE_ARITY
        )
        {
            const hashchainIndex =
                await unirepContract.attesterHashchainProcessedCount(
                    attester.address,
                    epoch
                )
            expect(hashchainIndex.toNumber()).to.equal(0)
            await unirepContract
                .buildHashchain(attester.address, epoch)
                .then((t) => t.wait())
            {
                const sealed = await unirepContract.attesterEpochSealed(
                    attester.address,
                    epoch
                )
                expect(sealed).to.be.false
            }

            const hashchain = await unirepContract.attesterHashchain(
                attester.address,
                epoch,
                hashchainIndex
            )
            for (let x = 0; x < hashchain.epochKeys.length; x++) {
                epochTree.update(
                    hashchain.epochKeys[x].toBigInt(),
                    hash4(hashchain.epochKeyBalances[x])
                )
            }
            const inputs = genAggregateEpochKeysCircuitInputs(
                epoch,
                attester,
                hashchainIndex,
                hashchain
            )
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.aggregateEpochKeys,
                inputs
            )
            const { proof, publicSignals } = new AggregateEpochKeysProof(
                r.publicSignals,
                r.proof
            )
            await expect(unirepContract.processHashchain(publicSignals, proof))
                .to.emit(unirepContract, 'HashchainProcessed')
                .withArgs(epoch, attester.address, false)
        }
        {
            const sealed = await unirepContract.attesterEpochSealed(
                attester.address,
                epoch
            )
            expect(sealed).to.be.false
        }
        {
            const hashchainIndex =
                await unirepContract.attesterHashchainProcessedCount(
                    attester.address,
                    epoch
                )
            expect(hashchainIndex.toNumber()).to.equal(1)
            await unirepContract
                .buildHashchain(attester.address, epoch)
                .then((t) => t.wait())
            {
                const sealed = await unirepContract.attesterEpochSealed(
                    attester.address,
                    epoch
                )
                expect(sealed).to.be.false
            }

            const hashchain = await unirepContract.attesterHashchain(
                attester.address,
                epoch,
                hashchainIndex
            )
            const inputs = genAggregateEpochKeysCircuitInputs(
                epoch,
                attester,
                hashchainIndex,
                hashchain,
                epochTree
            )
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.aggregateEpochKeys,
                inputs
            )
            const { proof, publicSignals } = new AggregateEpochKeysProof(
                r.publicSignals,
                r.proof
            )
            await expect(unirepContract.processHashchain(publicSignals, proof))
                .to.emit(unirepContract, 'HashchainProcessed')
                .withArgs(epoch, attester.address, true)
        }
        {
            const sealed = await unirepContract.attesterEpochSealed(
                attester.address,
                epoch
            )
            expect(sealed).to.be.true
        }
    })
})
