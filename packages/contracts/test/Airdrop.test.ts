// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { ZkIdentity, genRandomSalt } from '@unirep/crypto'
import { deployUnirep, SignUpProof, Unirep } from '../src'

describe('Airdrop', function () {
    this.timeout(100000)

    let unirepContract: Unirep

    const attestingFee = ethers.utils.parseEther('0.1')

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0], {
            attestingFee,
        })
    })

    describe('Attesters set initial balance', () => {
        it('attester should airdrop with initial amount', async () => {
            const accounts = await ethers.getSigners()
            await unirepContract
                .connect(accounts[1])
                .attesterSignUp()
                .then((t) => t.wait())
            const attesterId = await unirepContract.attesters(
                accounts[1].address
            )
            const id = new ZkIdentity()
            const epoch = await unirepContract.currentEpoch()
            const airdropAmount = 100
            await expect(
                unirepContract
                    .connect(accounts[1])
                    ['userSignUp(uint256,uint256)'](
                        id.genIdentityCommitment(),
                        airdropAmount
                    )
            )
                .to.emit(unirepContract, 'UserSignedUp')
                .withArgs(
                    epoch,
                    id.genIdentityCommitment(),
                    attesterId,
                    airdropAmount
                )
        })

        it('non-attester should fail to airdrop with initial amount', async () => {
            const accounts = await ethers.getSigners()
            const id = new ZkIdentity()
            await expect(
                unirepContract
                    .connect(accounts[0])
                    ['userSignUp(uint256,uint256)'](
                        id.genIdentityCommitment(),
                        100
                    )
            ).to.be.revertedWith(
                'Unirep: must sign up through attester to create initBalance'
            )
        })
    })
})
