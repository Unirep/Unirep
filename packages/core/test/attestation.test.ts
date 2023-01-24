// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { ZkIdentity, stringifyBigInts } from '@unirep/utils'
import { deployUnirep } from '@unirep/contracts/deploy'
import { Circuit, BuildOrderedTree, SNARK_SCALAR_FIELD } from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

import { genUserState } from './utils'

const EPOCH_LENGTH = 1000

describe('Attester signs up and gives attestation', function () {
    this.timeout(30 * 60 * 1000)

    let unirepContract

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])
        const attester = accounts[1]
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

        afterEach(async () => {
            await ethers.provider.send('evm_revert', [snapshot])
        })
    }

    it('user sign up and receive attestation', async () => {
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
        const [epk] = epochKeys
        const newPosRep = 10
        const newNegRep = 5
        const newGraffiti = 1294194
        // now submit the attestation from the attester
        const { timestamp: newTimestamp } = await unirepContract
            .connect(attester)
            .submitAttestation(epoch, epk, newPosRep, newNegRep, newGraffiti)
            .then((t) => t.wait())
            .then(({ blockNumber }) => ethers.provider.getBlock(blockNumber))

        await userState.waitForSync()
        // now commit the attetstations
        //
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])
        const preimages = await userState.genEpochTreePreimages(epoch)
        const { circuitInputs } =
            BuildOrderedTree.buildInputsForLeaves(preimages)
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.buildOrderedTree,
            stringifyBigInts(circuitInputs)
        )
        const { publicSignals, proof } = new BuildOrderedTree(
            r.publicSignals,
            r.proof,
            defaultProver
        )

        await unirepContract
            .connect(accounts[5])
            .sealEpoch(epoch, attester.address, publicSignals, proof)
            .then((t) => t.wait())

        await userState.waitForSync()
        // now check the reputation
        const checkPromises = epochKeys.map(async (key) => {
            const { posRep, negRep, graffiti, timestamp } =
                await userState.getRepByEpochKey(key, BigInt(epoch))
            if (key.toString() === epk.toString()) {
                expect(posRep).to.equal(newPosRep)
                expect(negRep).to.equal(newNegRep)
                expect(graffiti).to.equal(newGraffiti)
                expect(timestamp).to.equal(newTimestamp)
            } else {
                expect(posRep).to.equal(0)
                expect(negRep).to.equal(0)
                expect(graffiti).to.equal(0)
                expect(timestamp).to.equal(0)
            }
        })
        await Promise.all(checkPromises)
        // then run an epoch transition and check the rep
        {
            const { publicSignals, proof } =
                await userState.genUserStateTransitionProof({
                    toEpoch: await userState.loadCurrentEpoch(),
                })
            // submit it
            await unirepContract
                .connect(accounts[4])
                .userStateTransition(publicSignals, proof)
                .then((t) => t.wait())
        }
        await userState.waitForSync()
        {
            const { posRep, negRep, graffiti, timestamp } =
                await userState.getRep()
            expect(posRep).to.equal(newPosRep)
            expect(negRep).to.equal(newNegRep)
            expect(graffiti).to.equal(newGraffiti)
            expect(timestamp).to.equal(newTimestamp)
        }
        await userState.stop()
    })

    it('should skip multiple epochs', async () => {
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

        await ethers.provider.send('evm_increaseTime', [5 * EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])
        const epoch = await userState.loadCurrentEpoch()
        await unirepContract
            .connect(attester)
            .submitAttestation(epoch, '0x01', 1, 0, 0)
            .then((t) => t.wait())
        await userState.waitForSync()
        await userState.stop()
    })
})
