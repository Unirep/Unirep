// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { Identity } from '@semaphore-protocol/identity'
import { stringifyBigInts } from '@unirep/utils'
import { Circuit, SignupProof } from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

import { EPOCH_LENGTH } from './config'
import { deployUnirep } from '../deploy'

describe('Attester getters', function () {
    this.timeout(120000)

    let unirepContract
    let chainId

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])
        const network = await accounts[0].provider.getNetwork()
        chainId = network.chainId
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

    it('should get member count', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        {
            const numberOfUsers = await unirepContract.attesterMemberCount(
                attester.address
            )
            expect(numberOfUsers).to.equal(0)
        }
        for (let x = 1; x < 5; x++) {
            const id = new Identity()
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.signup,
                stringifyBigInts({
                    epoch,
                    identity_secret: id.secret,
                    attester_id: attester.address,
                    chain_id: chainId,
                })
            )
            const { publicSignals, proof } = new SignupProof(
                r.publicSignals,
                r.proof,
                defaultProver
            )
            await unirepContract
                .connect(attester)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())
            const numberOfUsers = await unirepContract.attesterMemberCount(
                attester.address
            )
            expect(numberOfUsers).to.equal(x)
        }
    })
})
