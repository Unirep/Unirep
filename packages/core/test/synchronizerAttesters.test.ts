// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { EPOCH_LENGTH } from '@unirep/contracts'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'
import { deployUnirep } from '@unirep/contracts/deploy'
import { Synchronizer } from '../src/Synchronizer'

describe('Synchronizer watch multiple attesters', function () {
    this.timeout(0)

    let unirepContract

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])
        for (let x = 0; x < 5; x++) {
            const attester = accounts[x]
            await unirepContract
                .connect(attester)
                .attesterSignUp(EPOCH_LENGTH)
                .then((t) => t.wait())
        }
    })

    it('should load attestations from all', async () => {
        const accounts = await ethers.getSigners()
        for (let x = 0; x < 5; x++) {
            await unirepContract
                .connect(accounts[0])
                .submitAttestation(0, x, x, 0, 0)
                .then((t) => t.wait())
        }
        const sync = new Synchronizer({
            unirepAddress: unirepContract.address,
            provider: ethers.provider,
            prover: defaultProver,
        })
        const seenAttestations = []
        sync.on('AttestationSubmitted', ({ decodedData }) => {
            seenAttestations.push(decodedData)
        })
        sync.start()
        await sync.waitForSync()
        expect(seenAttestations.length).to.equal(5)
        for (let x = 0; x < 5; x++) {
            const { attesterId, epochKey } = seenAttestations[x]
            expect(attesterId.toString()).to.equal(
                BigInt(accounts[0].address).toString()
            )
            expect(epochKey.toString()).to.equal(x.toString())
        }
    })

    it('should catch attester sign up event', async () => {
        const accounts = await ethers.getSigners()
        const sync = new Synchronizer({
            unirepAddress: unirepContract.address,
            provider: ethers.provider,
            prover: defaultProver,
        })
        await sync.start()
        await sync.waitForSync()
        const p = new Promise((r) => sync.on('AttesterSignedUp', r))
        await unirepContract
            .connect(accounts[10])
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())
        await p
    })

    // TODO: test for other events
})
