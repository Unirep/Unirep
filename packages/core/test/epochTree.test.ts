// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import {
    genRandomSalt,
    ZkIdentity,
    hash4,
    SparseMerkleTree,
} from '@unirep/utils'
import { deployUnirep } from '@unirep/contracts/deploy'

import { genUnirepState, genUserState } from './utils'

const EPOCH_LENGTH = 1000

describe('Epoch tree', function () {
    this.timeout(30 * 60 * 1000)

    let unirepContract
    const defaultEpochTreeLeaf = hash4([0, 0, 0, 0])
    let snapshot

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])
        const attester = accounts[1]
        await unirepContract
            .connect(attester)
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())
    })

    beforeEach(async () => {
        snapshot = await ethers.provider.send('evm_snapshot', [])
    })

    afterEach(async () => {
        await ethers.provider.send('evm_revert', [snapshot])
    })

    it('initialization', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const unirepState = await genUnirepState(
            ethers.provider,
            unirepContract.address,
            attester.address
        )
        const contractEpoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        const unirepEpoch = await unirepState.calcCurrentEpoch()
        expect(contractEpoch.toNumber()).to.equal(unirepEpoch)

        // onchain epoch tree
        const contractEpochRoot = await unirepContract.attesterEpochRoot(
            attester.address,
            unirepEpoch
        )
        const userEpochRoot = await unirepState.genEpochTree(unirepEpoch)
        expect(contractEpochRoot.toString()).to.equal(
            userEpochRoot.root.toString()
        )

        // offchain epoch tree
        const config = await unirepContract.config()
        const epochTree = new SparseMerkleTree(
            config.epochTreeDepth,
            defaultEpochTreeLeaf,
            config.epochTreeArity
        )
        expect(userEpochRoot.root.toString()).to.equal(
            epochTree.root.toString()
        )

        await unirepState.stop()
    })

    it('attestations should update epoch tree', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const attesterId = BigInt(attester.address)
        const id = new ZkIdentity()
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        {
            const { publicSignals, proof } =
                await userState.genUserSignUpProof()
            await unirepContract
                .connect(attester)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())
        }
        await userState.waitForSync()
        // we're signed up, now run an attestation
        const epoch = await userState.loadCurrentEpoch()
        const epochKeys = await userState.getEpochKeys(epoch)
        const config = await unirepContract.config()
        const epochTree = new SparseMerkleTree(
            config.epochTreeDepth,
            defaultEpochTreeLeaf,
            config.epochTreeArity
        )

        for (const epk of epochKeys) {
            let posRep = 0
            let negRep = 0
            let graffiti = BigInt(0)
            let timestamp = 0
            for (let i = 0; i < 5; i++) {
                const newPosRep = Math.floor(Math.random() * 10)
                const newNegRep = Math.floor(Math.random() * 10)
                const newGraffiti = genRandomSalt()
                // now submit the attestation from the attester
                const { timestamp: newTimestamp } = await unirepContract
                    .connect(attester)
                    .submitAttestation(
                        epoch,
                        epk,
                        newPosRep,
                        newNegRep,
                        newGraffiti
                    )
                    .then((t) => t.wait())
                    .then(({ blockNumber }) =>
                        ethers.provider.getBlock(blockNumber)
                    )
                posRep += newPosRep
                negRep += newNegRep
                graffiti = newGraffiti
                timestamp = newTimestamp
            }
            epochTree.update(epk, hash4([posRep, negRep, graffiti, timestamp]))
        }

        await userState.waitForSync()
        // now commit the attetstations
        await unirepContract
            .connect(accounts[5])
            .buildHashchain(attester.address, epoch)
            .then((t) => t.wait())

        const hashchain = await unirepContract.attesterHashchain(
            attester.address,
            epoch,
            0
        )
        const { publicSignals, proof } =
            await userState.genAggregateEpochKeysProof({
                epochKeys: hashchain.epochKeys,
                newBalances: hashchain.epochKeyBalances,
                hashchainIndex: hashchain.index,
                epoch,
            })
        await unirepContract
            .connect(accounts[5])
            .processHashchain(publicSignals, proof)
            .then((t) => t.wait())
        await userState.waitForSync()

        const onchainEpochRoot = await unirepContract.attesterEpochRoot(
            attester.address,
            epoch
        )
        const userEpochRoot = await userState.genEpochTree(epoch)
        expect(onchainEpochRoot.toString()).to.equal(
            userEpochRoot.root.toString()
        )
        expect(userEpochRoot.root.toString()).to.equal(
            epochTree.root.toString()
        )
        await userState.stop()
    })

    it('should generate epoch tree after epoch transition', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const attesterId = BigInt(attester.address)
        const id = new ZkIdentity()
        const userState = await genUserState(
            ethers.provider,
            unirepContract.address,
            id,
            attesterId
        )
        {
            const { publicSignals, proof } =
                await userState.genUserSignUpProof()
            await unirepContract
                .connect(attester)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())
        }
        await userState.waitForSync()
        // we're signed up, now run an attestation
        const epoch = await userState.loadCurrentEpoch()
        const epochKeys = await userState.getEpochKeys(epoch)
        const config = await unirepContract.config()
        const epochTree = new SparseMerkleTree(
            config.epochTreeDepth,
            defaultEpochTreeLeaf,
            config.epochTreeArity
        )

        for (const epk of epochKeys) {
            let posRep = 0
            let negRep = 0
            let graffiti = BigInt(0)
            let timestamp = 0
            for (let i = 0; i < 5; i++) {
                const newPosRep = Math.floor(Math.random() * 10)
                const newNegRep = Math.floor(Math.random() * 10)
                const newGraffiti = genRandomSalt()
                // now submit the attestation from the attester
                const { timestamp: newTimestamp } = await unirepContract
                    .connect(attester)
                    .submitAttestation(
                        epoch,
                        epk,
                        newPosRep,
                        newNegRep,
                        newGraffiti
                    )
                    .then((t) => t.wait())
                    .then(({ blockNumber }) =>
                        ethers.provider.getBlock(blockNumber)
                    )
                posRep += newPosRep
                negRep += newNegRep
                graffiti = newGraffiti
                timestamp = newTimestamp
            }
            epochTree.update(epk, hash4([posRep, negRep, graffiti, timestamp]))
        }

        await userState.waitForSync()
        // now commit the attetstations
        await unirepContract
            .connect(accounts[5])
            .buildHashchain(attester.address, epoch)
            .then((t) => t.wait())

        const hashchain = await unirepContract.attesterHashchain(
            attester.address,
            epoch,
            0
        )
        const { publicSignals, proof } =
            await userState.genAggregateEpochKeysProof({
                epochKeys: hashchain.epochKeys,
                newBalances: hashchain.epochKeyBalances,
                hashchainIndex: hashchain.index,
                epoch,
            })
        await unirepContract
            .connect(accounts[5])
            .processHashchain(publicSignals, proof)
            .then((t) => t.wait())
        await userState.waitForSync()

        const prevEpoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])
        const newEpoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        expect(prevEpoch.toNumber() + 1).to.equal(newEpoch.toNumber())

        // onchain epoch tree
        const contractEpochRoot = await unirepContract.attesterEpochRoot(
            attester.address,
            prevEpoch
        )
        const userEpochRoot = await userState.genEpochTree(prevEpoch)
        expect(contractEpochRoot.toString()).to.equal(
            userEpochRoot.root.toString()
        )

        expect(userEpochRoot.root.toString()).to.equal(
            epochTree.root.toString()
        )
        await userState.stop()
    })
})
