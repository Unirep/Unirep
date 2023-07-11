// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { Identity } from '@semaphore-protocol/identity'
import { deployUnirep } from '@unirep/contracts/deploy'

import { EPOCH_LENGTH, genUserState } from './utils'

describe('Attester signs up and gives attestation', function () {
    this.timeout(30 * 60 * 1000)

    let unirepContract

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])
    })

    {
        let snapshot
        beforeEach(async () => {
            snapshot = await ethers.provider.send('evm_snapshot', [])
            const accounts = await ethers.getSigners()
            const attester = accounts[1]
            await unirepContract
                .connect(attester)
                .attesterSignUp(EPOCH_LENGTH)
                .then((t) => t.wait())
        })

        afterEach(() => ethers.provider.send('evm_revert', [snapshot]))
    }

    it('user sign up and receive attestation', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const attesterId = BigInt(attester.address)
        const id = new Identity()
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
        const epochKeys = userState.getEpochKeys(epoch) as bigint[]
        const [epk] = epochKeys
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

        // now check the reputation
        const checkPromises = epochKeys.map(async (key) => {
            const data = await userState.getDataByEpochKey(key, epoch)
            if (key.toString() === epk.toString()) {
                expect(data[fieldIndex].toString()).to.equal(val.toString())
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
            expect(data[fieldIndex].toString()).to.equal(val.toString())
            data.forEach((d, i) => {
                if (i === fieldIndex) return
                expect(d).to.equal(0)
            })
        }
        userState.sync.stop()
    })

    it('should skip multiple epochs', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const attesterId = BigInt(attester.address)
        const id = new Identity()

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
            .attest('0x02', epoch, 1, 1)
            .then((t) => t.wait())
        await userState.waitForSync()
        userState.sync.stop()
    })
})
