// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { ZkIdentity, stringifyBigInts } from '@unirep/utils'
import { deployUnirep } from '@unirep/contracts/deploy'
import { Circuit, BuildOrderedTree } from '@unirep/circuits'
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
        const epoch = await userState.sync.loadCurrentEpoch()
        const epochKeys = userState.getEpochKeys(epoch)
        const [epk] = epochKeys as bigint[]
        const fieldIndex = 1
        const val = 5
        // now submit the attestation from the attester
        await unirepContract
            .connect(attester)
            .attest(epk, epoch, fieldIndex, val)
            .then((t) => t.wait())

        await userState.waitForSync()
        // now commit the attetstations
        //
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])
        const preimages = await userState.sync.genEpochTreePreimages(epoch)
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
            const data = await userState.getDataByEpochKey(key, BigInt(epoch))
            if (key.toString() === epk.toString()) {
                expect(data[fieldIndex]).to.equal(val)
                data.forEach((d, i) => {
                    if (i === fieldIndex) return
                    expect(d).to.equal(0)
                })
            } else {
                for (const d of data) {
                    expect(d).to.equal(0)
                }
            }
        })
        await Promise.all(checkPromises)
        // then run an epoch transition and check the rep
        {
            const { publicSignals, proof } =
                await userState.genUserStateTransitionProof({
                    toEpoch: await userState.sync.loadCurrentEpoch(),
                })
            // submit it
            await unirepContract
                .connect(accounts[4])
                .userStateTransition(publicSignals, proof)
                .then((t) => t.wait())
        }
        await userState.waitForSync()
        {
            const data = await userState.getData()
            expect(data[fieldIndex]).to.equal(val)
            data.forEach((d, i) => {
                if (i === fieldIndex) return
                expect(d).to.equal(0)
            })
        }
        await userState.sync.stop()
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
        const epoch = await userState.sync.loadCurrentEpoch()
        await unirepContract
            .connect(attester)
            .attest('0x01', epoch, 1, 1)
            .then((t) => t.wait())
        await userState.waitForSync()
        await userState.sync.stop()
    })
})
