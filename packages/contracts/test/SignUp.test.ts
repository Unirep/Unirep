// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import {
    hashLeftRight,
    IncrementalMerkleTree,
    ZkIdentity,
} from '@unirep/crypto'
import {
    EPOCH_TREE_DEPTH,
    GLOBAL_STATE_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    USER_STATE_TREE_DEPTH,
} from '@unirep/circuits'

const ATTESTING_FEE = '0'

import { EPOCH_LENGTH, Unirep } from '../src'
import { deployUnirep } from '../deploy'
import { genNewUserStateTree } from './utils'

describe('Signup', () => {
    const testMaxUser = 5
    let unirepContract: Unirep
    let accounts: any[]

    let signedUpUsers = 0
    let signedUpAttesters = 0

    before(async () => {
        accounts = await ethers.getSigners()

        unirepContract = await deployUnirep(accounts[0], {
            maxUsers: testMaxUser,
            maxAttesters: testMaxUser,
        })
    })

    it('should have the correct config value', async () => {
        const config = await unirepContract.config()
        expect(ATTESTING_FEE).equal(config.attestingFee)
        expect(EPOCH_LENGTH).equal(config.epochLength)
        expect(NUM_EPOCH_KEY_NONCE_PER_EPOCH).equal(
            config.numEpochKeyNoncePerEpoch
        )
        expect(testMaxUser).equal(config.maxUsers)
        expect(EPOCH_TREE_DEPTH).equal(config.epochTreeDepth)
        expect(GLOBAL_STATE_TREE_DEPTH).equal(config.globalStateTreeDepth)
        expect(USER_STATE_TREE_DEPTH).equal(config.userStateTreeDepth)
    })

    describe('User sign-ups', () => {
        const id = new ZkIdentity()
        const commitment = id.genIdentityCommitment()

        it('sign up should succeed', async () => {
            const tx = await unirepContract['userSignUp(uint256)'](commitment)
            const receipt = await tx.wait()

            expect(receipt.status).equal(1)
            signedUpUsers++

            const numUserSignUps_ = await unirepContract.numUserSignUps()
            expect(signedUpUsers).equal(numUserSignUps_)
        })

        it('compute global state tree should success', async () => {
            const epoch = 1
            const onchainGST = await unirepContract.globalStateTree(epoch)

            const offChainGST = new IncrementalMerkleTree(
                GLOBAL_STATE_TREE_DEPTH
            )
            const GSTLeaf = hashLeftRight(
                commitment,
                genNewUserStateTree(USER_STATE_TREE_DEPTH).root
            )
            offChainGST.insert(GSTLeaf)
            expect(offChainGST.root.toString()).equal(
                onchainGST.root.toString()
            )
        })

        it('double sign up should fail', async () => {
            await expect(
                unirepContract['userSignUp(uint256)'](commitment)
            ).to.be.revertedWithCustomError(
                unirepContract,
                `UserAlreadySignedUp`
            )
        })

        it('sign up should fail if max capacity reached', async () => {
            for (let i = 1; i < testMaxUser; i++) {
                let tx = await unirepContract['userSignUp(uint256)'](
                    new ZkIdentity().genIdentityCommitment()
                )
                let receipt = await tx.wait()
                expect(receipt.status).equal(1)
                signedUpUsers++

                const numUserSignUps_ = await unirepContract.numUserSignUps()
                expect(signedUpUsers).equal(numUserSignUps_)
            }
            await expect(
                unirepContract['userSignUp(uint256)'](
                    new ZkIdentity().genIdentityCommitment()
                )
            ).to.be.revertedWithCustomError(
                unirepContract,
                'ReachedMaximumNumberUserSignedUp'
            )
        })
    })

    describe('Attester sign-ups', () => {
        let attester: any
        let attesterAddress: string
        let attester2: any
        let attester2Address: string
        let attester2Sig

        it('sign up should succeed', async () => {
            attester = accounts[1]
            attesterAddress = attester.address

            const tx = await unirepContract.connect(attester).attesterSignUp()
            const receipt = await tx.wait()

            expect(receipt.status).equal(1)
            signedUpAttesters++

            const attesterId = await unirepContract.attesters(attesterAddress)
            expect(signedUpAttesters).equal(attesterId)
            const nextAttesterId_ = await unirepContract.nextAttesterId()
            // nextAttesterId starts with 1 so now it should be 2
            expect(signedUpAttesters + 1).equal(nextAttesterId_)
        })

        it('sign up via relayer should succeed', async () => {
            let relayer = accounts[0]
            unirepContract.connect(relayer)
            attester2 = accounts[2]
            attester2Address = await attester2.getAddress()

            let message = ethers.utils.solidityKeccak256(
                ['address', 'address'],
                [attester2Address, unirepContract.address]
            )
            attester2Sig = await attester2.signMessage(
                ethers.utils.arrayify(message)
            )
            const tx = await unirepContract.attesterSignUpViaRelayer(
                attester2Address,
                attester2Sig
            )
            const receipt = await tx.wait()

            expect(receipt.status).equal(1)
            signedUpAttesters++

            const attesterId = await unirepContract.attesters(attester2Address)
            expect(signedUpAttesters).equal(attesterId)
            const nextAttesterId_ = await unirepContract.nextAttesterId()
            expect(signedUpAttesters + 1).equal(nextAttesterId_)
        })

        it('sign up with invalid signature should fail', async () => {
            let attester3 = accounts[3]
            let attester3Address = await attester3.getAddress()
            await expect(
                unirepContract.attesterSignUpViaRelayer(
                    attester3Address,
                    attester2Sig
                )
            ).to.be.revertedWithCustomError(unirepContract, 'InvalidSignature')
        })

        it('double sign up should fail', async () => {
            await expect(
                unirepContract.connect(attester).attesterSignUp()
            ).to.be.revertedWithCustomError(
                unirepContract,
                `AttesterAlreadySignUp`
            )

            await expect(
                unirepContract.attesterSignUpViaRelayer(
                    attester2Address,
                    attester2Sig
                )
            ).to.be.revertedWithCustomError(
                unirepContract,
                `AttesterAlreadySignUp`
            )
        })

        it('sign up should fail if max capacity reached', async () => {
            for (let i = 3; i < testMaxUser; i++) {
                attester = accounts[i]
                attesterAddress = attester.address

                const tx = await unirepContract
                    .connect(attester)
                    .attesterSignUp()
                const receipt = await tx.wait()
                expect(receipt.status).equal(1)
                signedUpAttesters++

                const attesterId = await unirepContract.attesters(
                    attesterAddress
                )
                expect(signedUpAttesters).equal(attesterId)
                const nextAttesterId_ = await unirepContract.nextAttesterId()
                expect(signedUpAttesters + 1).equal(nextAttesterId_)
            }
            attester = accounts[5]
            attesterAddress = attester.address

            await expect(
                unirepContract.connect(attester).attesterSignUp()
            ).to.be.revertedWithCustomError(
                unirepContract,
                'ReachedMaximumNumberUserSignedUp'
            )
        })
    })

    describe('Attesters set initial balance', () => {
        it('attester should airdrop with initial amount', async () => {
            unirepContract = await deployUnirep(accounts[0], {
                maxUsers: testMaxUser,
                maxAttesters: testMaxUser,
            })
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
            const { numberOfLeaves } = await unirepContract.globalStateTree(
                epoch
            )
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
                    airdropAmount,
                    numberOfLeaves
                )
        })

        it('non-attester should fail to airdrop with initial amount', async () => {
            const id = new ZkIdentity()
            await expect(
                unirepContract
                    .connect(accounts[0])
                    ['userSignUp(uint256,uint256)'](
                        id.genIdentityCommitment(),
                        100
                    )
            ).to.be.revertedWithCustomError(
                unirepContract,
                'AirdropWithoutAttester'
            )
        })
    })
})
