// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { IncrementalMerkleTree, genRandomSalt } from '@unirep/utils'

import { EPOCH_LENGTH } from '../src'
import { deployUnirep } from '../deploy'
import defaultConfig from '@unirep/circuits/config'

const { STATE_TREE_DEPTH } = defaultConfig

describe('Attester Signup', function () {
    this.timeout(120000)

    let unirepContract
    let snapshot

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])
    })

    beforeEach(async () => {
        snapshot = await ethers.provider.send('evm_snapshot', [])
    })

    afterEach(async () => {
        await ethers.provider.send('evm_revert', [snapshot])
    })

    it('should fail to double signup', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        await unirepContract
            .connect(attester)
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())
        await expect(
            unirepContract.connect(attester).attesterSignUp(EPOCH_LENGTH)
        ).to.be.revertedWithCustomError(unirepContract, 'AttesterAlreadySignUp')
    })

    it('should signup many attesters', async () => {
        const accounts = await ethers.getSigners()
        for (let i = 2; i < 10; i++) {
            const attester = accounts[i]
            const attesterEpochLength = EPOCH_LENGTH * i
            const tx = await unirepContract
                .connect(attester)
                .attesterSignUp(attesterEpochLength)
            const { timestamp } = await tx
                .wait()
                .then(({ blockNumber }) =>
                    ethers.provider.getBlock(blockNumber)
                )
            expect(tx)
                .to.emit(unirepContract, 'AttesterSignedUp')
                .withArgs(attester.address, attesterEpochLength, timestamp)

            const currentEpoch = await unirepContract.attesterCurrentEpoch(
                attester.address
            )
            expect(currentEpoch.toString()).to.equal('0')
            const epochTimeRemaining =
                await unirepContract.attesterEpochRemainingTime(
                    attester.address
                )
            expect(epochTimeRemaining.toNumber()).to.be.lte(
                +attesterEpochLength
            )
            const epochLength = await unirepContract.attesterEpochLength(
                attester.address
            )
            expect(epochLength.toNumber()).to.equal(attesterEpochLength)

            const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
            const exists = await unirepContract.attesterStateTreeRootExists(
                attester.address,
                currentEpoch,
                stateTree.root
            )
            expect(exists).to.be.true
            const stateRoot = await unirepContract.attesterStateTreeRoot(
                attester.address,
                currentEpoch
            )
            expect(stateRoot).to.equal(stateTree.root)
            const semaphoreRoot =
                await unirepContract.attesterSemaphoreGroupRoot(
                    attester.address
                )
            expect(semaphoreRoot).to.equal(stateTree.root)
        }
    })

    it('should fail to signup attester via relayer if signature is not valid', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[10]
        const relayer = accounts[0]

        const wrongMessage = genRandomSalt()
        const signature = await attester.signMessage(wrongMessage)
        await expect(
            unirepContract
                .connect(relayer)
                .attesterSignUpViaRelayer(
                    attester.address,
                    EPOCH_LENGTH,
                    signature
                )
        ).to.be.revertedWithCustomError(unirepContract, 'InvalidSignature')
    })

    it('should signup attester via relayer', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[10]
        const relayer = accounts[0]

        const message = ethers.utils.solidityKeccak256(
            ['address', 'address'],
            [attester.address, unirepContract.address]
        )
        const signature = await attester.signMessage(
            ethers.utils.arrayify(message)
        )
        const tx = await unirepContract
            .connect(relayer)
            .attesterSignUpViaRelayer(attester.address, EPOCH_LENGTH, signature)

        const { timestamp } = await tx
            .wait()
            .then(({ blockNumber }) => ethers.provider.getBlock(blockNumber))
        expect(tx)
            .to.emit(unirepContract, 'AttesterSignedUp')
            .withArgs(attester.address, EPOCH_LENGTH, timestamp)
        await tx.wait()

        const currentEpoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        expect(currentEpoch.toString()).to.equal('0')
        const epochTimeRemaining =
            await unirepContract.attesterEpochRemainingTime(attester.address)
        expect(epochTimeRemaining.toNumber()).to.be.lte(+EPOCH_LENGTH)
        const epochLength = await unirepContract.attesterEpochLength(
            attester.address
        )
        expect(epochLength.toNumber()).to.equal(EPOCH_LENGTH)

        const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        const exists = await unirepContract.attesterStateTreeRootExists(
            attester.address,
            currentEpoch,
            stateTree.root
        )
        expect(exists).to.be.true
        const stateRoot = await unirepContract.attesterStateTreeRoot(
            attester.address,
            currentEpoch
        )
        expect(stateRoot).to.equal(stateTree.root)
        const semaphoreRoot = await unirepContract.attesterSemaphoreGroupRoot(
            attester.address
        )
        expect(semaphoreRoot).to.equal(stateTree.root)
    })

    it('should fail to double signup via relayer', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[10]
        const relayer = accounts[0]

        const message = ethers.utils.solidityKeccak256(
            ['address', 'address'],
            [attester.address, unirepContract.address]
        )
        const signature = await attester.signMessage(
            ethers.utils.arrayify(message)
        )
        await unirepContract
            .connect(relayer)
            .attesterSignUpViaRelayer(attester.address, EPOCH_LENGTH, signature)
        await expect(
            unirepContract
                .connect(relayer)
                .attesterSignUpViaRelayer(
                    attester.address,
                    EPOCH_LENGTH,
                    signature
                )
        ).to.be.revertedWithCustomError(unirepContract, 'AttesterAlreadySignUp')
    })

    it("should fail to query attester's data if attester doesn't sign up", async () => {
        const address = 12345

        await expect(unirepContract.attesterCurrentEpoch(address)).to.be
            .reverted

        await expect(unirepContract.attesterEpochRemainingTime(address)).to.be
            .reverted
    })
})
