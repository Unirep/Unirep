import { ethers } from 'hardhat'
import { BigNumberish } from 'ethers'
import { expect } from 'chai'
import { ZkIdentity, genRandomSalt } from '@unirep/crypto'
import { EPOCH_LENGTH } from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'
import { deployUnirep } from '@unirep/contracts/deploy'

const attestingFee = ethers.utils.parseEther('0.1')

import { Synchronizer, schema, genEpochKey } from '../../src'
import { genUserState, genRandomAttestation, compareDB } from '../utils'
import { SQLiteConnector } from 'anondb/node'
import { Unirep } from '@unirep/contracts'

let synchronizer: Synchronizer

describe('Offchain Epoch Tree', function () {
    this.timeout(0)
    let attester
    let attesterId
    let unirepContract: Unirep

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0], {
            attestingFee,
        })
        const db = await SQLiteConnector.create(schema, ':memory:')
        synchronizer = new Synchronizer(db, defaultProver, unirepContract)
        // now create an attester
        attester = accounts[1]
        await unirepContract
            .connect(attester)
            .attesterSignUp()
            .then((t) => t.wait())
        attesterId = await unirepContract.attesters(attester.address)
        await synchronizer.start()
    })

    afterEach(async () => {
        await synchronizer.waitForSync()
        const state = await genUserState(
            synchronizer.unirepContract.provider,
            synchronizer.unirepContract.address,
            new ZkIdentity()
        )
        await compareDB((state as any)._db, (synchronizer as any)._db)
        await state.stop()
    })

    it('Attest to different epoch keys should create the same epoch trees onchain and offchain', async () => {
        const epoch = 1
        const nonce = 0

        for (let i = 0; i < 5; i++) {
            const epochKey = genEpochKey(genRandomSalt(), epoch, nonce)
            const attestation = genRandomAttestation()
            attestation.attesterId = attesterId

            const tx = await unirepContract
                .connect(attester)
                .submitAttestation(attestation, epochKey as BigNumberish, {
                    value: attestingFee,
                })
            await tx.wait()
            await synchronizer.waitForSync()
            const onchainEpochTree = await unirepContract.epochTrees(epoch)
            const offchainEpochTree = await synchronizer.genEpochTree(epoch)
            expect(onchainEpochTree.root.toString()).to.equal(
                offchainEpochTree.root.toString()
            )
        }
    })

    it('Attest to the same epoch keys should create the same epoch trees onchain and offchain', async () => {
        const epoch = 1
        const nonce = 0
        const epochKey = genEpochKey(genRandomSalt(), epoch, nonce)

        for (let i = 0; i < 5; i++) {
            const attestation = genRandomAttestation()
            attestation.attesterId = attesterId

            const tx = await unirepContract
                .connect(attester)
                .submitAttestation(attestation, epochKey as BigNumberish, {
                    value: attestingFee,
                })
            await tx.wait()
            await synchronizer.waitForSync()
            const onchainEpochTree = await unirepContract.epochTrees(epoch)
            const offchainEpochTree = await synchronizer.genEpochTree(epoch)
            expect(onchainEpochTree.root.toString()).to.equal(
                offchainEpochTree.root.toString()
            )
        }
    })

    it('Epoch tree should be the same after epoch transition', async () => {
        const epoch = 1
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await synchronizer.unirepContract
            .beginEpochTransition()
            .then((t) => t.wait())
        await synchronizer.waitForSync()
        const onchainEpochTree = await unirepContract.epochTrees(epoch)
        const offchainEpochTree = await synchronizer.genEpochTree(epoch)
        expect(onchainEpochTree.root.toString()).to.equal(
            offchainEpochTree.root.toString()
        )
        const onchainEpochTreeRoot = await unirepContract.epochTreeRoots(epoch)
        expect(onchainEpochTreeRoot.toString()).to.equal(
            offchainEpochTree.root.toString()
        )
    })
})
