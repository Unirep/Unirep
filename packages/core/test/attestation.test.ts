// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { ZkIdentity, hashLeftRight } from '@unirep/crypto'
import { deployUnirep } from '@unirep/contracts/deploy'

import { Reputation, genGSTLeaf } from '../src'
import { genUserState, genUnirepState, genNewGST } from './utils'

const EPOCH_LENGTH = 1000

describe('Attester signs up and gives attestation', function () {
    this.timeout(30 * 60 * 1000)

    let unirepContract

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])
    })

    describe('Attester and user signup', async () => {
        it('attester sign up', async () => {
            const accounts = await ethers.getSigners()
            await unirepContract
                .connect(accounts[1])
                .attesterSignUp(EPOCH_LENGTH)
                .then((t) => t.wait())
        })

        it('user sign up and receive attestation', async () => {
            const accounts = await ethers.getSigners()
            const attesterId = BigInt(accounts[1].address)
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
                    .connect(accounts[1])
                    .userSignUp(publicSignals, proof)
                    .then((t) => t.wait())
            }
            await userState.waitForSync()
            // we're signed up, now run an attestation
            const epoch = await userState.getUnirepStateCurrentEpoch()
            const epochKeys = await userState.getEpochKeys(epoch)
            const [epk] = epochKeys
            const newPosRep = 10
            const newNegRep = 5
            const { publicSignals, proof } =
                await userState.genAttestationProof(
                    epk,
                    BigInt(newPosRep),
                    BigInt(newNegRep)
                )
            // now submit the attestation from the attester
            await unirepContract
                .connect(accounts[1])
                .submitAttestation(epoch, publicSignals, proof, {})
                .then((t) => t.wait())
            await userState.waitForSync()
            // now check the reputation
            const checkPromises = epochKeys.map(async (key) => {
                const { posRep, negRep } = await userState.getRepByEpochKey(
                    key,
                    BigInt(epoch)
                )
                if (key.toString() === epk.toString()) {
                    expect(posRep).to.equal(newPosRep)
                    expect(negRep).to.equal(newNegRep)
                } else {
                    expect(posRep).to.equal(0)
                    expect(negRep).to.equal(0)
                }
            })
            await Promise.all(checkPromises)
            // then run an epoch transition and check the rep
        })
    })
})
