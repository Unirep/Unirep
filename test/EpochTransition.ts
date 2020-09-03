import { ethers } from "@nomiclabs/buidler"
import { Contract, Signer, Wallet } from "ethers"
import chai from "chai"
import { solidity } from "ethereum-waffle"
import { attestingFee, epochLength } from '../config/testLocal'
import { genRandomSalt, hashLeftRight } from '../crypto/crypto'
import { genIdentity, genIdentityCommitment } from 'libsemaphore'
import { deployUnirep, genEpochKey } from './utils'

chai.use(solidity)
const { expect } = chai

import OneTimeSparseMerkleTree from '../artifacts/OneTimeSparseMerkleTree.json'
import Unirep from "../artifacts/Unirep.json"


describe('Epoch Transition', () => {
    let unirepContract: Contract

    let accounts: Signer[]

    let userId, userCommitment

    let attester, attesterAddress, attesterId, unirepContractCalledByAttester

    before(async () => {
        accounts = await ethers.getSigners()

        unirepContract = await deployUnirep(<Wallet>accounts[0])

        console.log('User sign up')
        userId = genIdentity()
        userCommitment = genIdentityCommitment(userId)
        let tx = await unirepContract.userSignUp(userCommitment)
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        console.log('Attester sign up')
        attester = accounts[1]
        attesterAddress = await attester.getAddress()
        unirepContractCalledByAttester = await ethers.getContractAt(Unirep.abi, unirepContract.address, attester)
        tx = await unirepContractCalledByAttester.attesterSignUp()
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

        attesterId = await unirepContract.attesters(attesterAddress)

        // Submit 2 attestations
        let epoch = await unirepContract.currentEpoch()
        let nonce = 0
        let epochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        let attestation = {
            attesterId: attesterId.toString(),
            posRep: 1,
            negRep: 0,
            graffiti: genRandomSalt().toString(),
            overwriteGraffiti: true,
        }
        tx = await unirepContractCalledByAttester.submitAttestation(
            attestation,
            epochKey,
            {value: attestingFee}
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        
        nonce = 1
        epochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        attestation = {
            attesterId: attesterId.toString(),
            posRep: 0,
            negRep: 99,
            graffiti: genRandomSalt().toString(),
            overwriteGraffiti: true,
        }
        tx = await unirepContractCalledByAttester.submitAttestation(
            attestation,
            epochKey,
            {value: attestingFee}
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

        let numEpochKey = await unirepContract.getNumEpochKey(epoch)
        expect(numEpochKey).equal(2)
    })

    it('premature epoch transition should fail', async () => {
        await expect(unirepContract.beginEpochTransition()
            ).to.be.revertedWith('Unirep: epoch not yet ended')
    })

    it('epoch transition should succeed', async () => {
        // Record data before epoch transition so as to compare them with data after epoch transition
        let epoch = await unirepContract.currentEpoch()
        let numEpochKey = await unirepContract.getNumEpochKey(epoch)
        let epochKeyHashchainMap = {}
        let epochKey_, hashChainBefore
        for (let i = 0; i < numEpochKey; i++) {
            epochKey_ = await unirepContract.getEpochKey(epoch, i)
            hashChainBefore = await unirepContract.epochKeyHashchain(epochKey_)
            epochKeyHashchainMap[epochKey_] = hashChainBefore
        }

        // Fast-forward epochLength of seconds
        await ethers.provider.send("evm_increaseTime", [epochLength])
        // Begin epoch transition
        let tx = await unirepContract.beginEpochTransition({gasLimit: 12000000})
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)
        console.log("Gas cost of epoch transition:", receipt.gasUsed.toString())
        
        // Parse epoch tree address and read from epoch tree
        // And verify that epoch keys and hashchains both match
        const parsed_log = unirepContract.interface.parseLog(receipt.logs[0])
        const epochTreeAddr = parsed_log['args']['_epochTreeAddr']
        expect(epochTreeAddr).to.be.not.equal(ethers.utils.hexZeroPad("0x", 20))

        const epochTreeContract: Contract = await ethers.getContractAt(OneTimeSparseMerkleTree.abi, epochTreeAddr)
        let [epochKeys_, epochKeyHashchains_] = await epochTreeContract.getLeavesToInsert()
        epochKeys_ = epochKeys_.map((epk) => epk.toString())
        // epochKeyHashchains_ = epochKeyHashchains_.map((hc) => ethers.utils.hexZeroPad(hc.toHexString(), 32))
        expect(epochKeys_.length).to.be.equal(numEpochKey)

        // Verify each epoch key hash chain is sealed
        let hashChainAfter
        let sealedHashChain
        let epkIndex
        for (epochKey_ in epochKeyHashchainMap) {
            sealedHashChain = hashLeftRight(
                1,
                epochKeyHashchainMap[epochKey_]
            )
            hashChainAfter = await unirepContract.epochKeyHashchain(epochKey_)
            expect(hashChainAfter).equal(sealedHashChain)

            // Check that epoch keys and hashchains also match the ones in epoch tree
            epkIndex = epochKeys_.indexOf(epochKey_)
            expect(epkIndex >= 0).to.be.true
            expect(epochKeyHashchains_[epkIndex]).to.be.equal(sealedHashChain)
        }

        // Epoch tree root should not be 0x0
        const root_ = await epochTreeContract.genSMT()
        expect(root_).to.be.not.equal(ethers.utils.hexZeroPad("0x", 32))

        // Verify latestEpochTransitionTime and currentEpoch
        let latestEpochTransitionTime = await unirepContract.latestEpochTransitionTime()
        expect(latestEpochTransitionTime).equal((await ethers.provider.getBlock(receipt.blockNumber)).timestamp)

        let epoch_ = await unirepContract.currentEpoch()
        expect(epoch_).equal(Number(epoch) + 1)
    })

    it('attesting to a sealed epoch key should fail', async () => {
        let attestation = {
            attesterId: attesterId.toString(),
            posRep: 1,
            negRep: 0,
            graffiti: genRandomSalt().toString(),
            overwriteGraffiti: true,
        }

        let prevEpoch = (await unirepContract.currentEpoch()).sub(1)
        let numEpochKey = await unirepContract.getNumEpochKey(prevEpoch)
        for (let i = 0; i < numEpochKey; i++) {
            let epochKey_ = await unirepContract.getEpochKey(prevEpoch, i)

            await expect(unirepContractCalledByAttester.submitAttestation(
                attestation,
                epochKey_,
                {value: attestingFee}
            )).to.be.revertedWith('Unirep: hash chain of this epoch key has been sealed')
        }
    })

    it('epoch transition with no attestations and epoch keys should also succeed', async () => {
        let epoch = await unirepContract.currentEpoch()
        let numEpochKey = await unirepContract.getNumEpochKey(epoch)
        expect(numEpochKey).equal(0)

        // Fast-forward epochLength of seconds
        await ethers.provider.send("evm_increaseTime", [epochLength])
        // Begin epoch transition
        let tx = await unirepContract.beginEpochTransition()
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        // Verify epoch tree: since there are no epoch keys, no epoch tree is formed
        const parsed_log = unirepContract.interface.parseLog(receipt.logs[0])
        const epochTreeAddr = parsed_log['args']['_epochTreeAddr']
        expect(epochTreeAddr).to.be.equal(ethers.utils.hexZeroPad("0x", 20))

        // Verify latestEpochTransitionTime and currentEpoch
        let latestEpochTransitionTime = await unirepContract.latestEpochTransitionTime()
        expect(latestEpochTransitionTime).equal((await ethers.provider.getBlock(receipt.blockNumber)).timestamp)

        let epoch_ = await unirepContract.currentEpoch()
        expect(epoch_).equal(Number(epoch) + 1)
    })
})