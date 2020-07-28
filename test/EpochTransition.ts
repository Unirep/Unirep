import { ethers } from "@nomiclabs/buidler"
import { Signer, Wallet } from "ethers"
import chai from "chai"
import { deployContract, solidity } from "ethereum-waffle"
import { attestingFee, epochLength, globalStateTreeDepth, maxEpochKeyNonce, maxUsers, userStateTreeDepth } from '../config/testLocal'
import { genRandomSalt, NOTHING_UP_MY_SLEEVE } from '../crypto/crypto'
import { genIdentity, genIdentityCommitment } from '../crypto/idendity'
import { genEpochKey, genStubEPKProof, linkLibrary } from './utils'

chai.use(solidity)
const { expect } = chai

import Unirep from "../artifacts/Unirep.json"
import PoseidonT3 from "../artifacts/PoseidonT3.json"
import PoseidonT6 from "../artifacts/PoseidonT6.json"
import NewUserStateVerifier from "../artifacts/NewUserStateVerifier.json"


describe('Epoch Transition', () => {
    let unirepContract

    let accounts: Signer[]

    let userId, userCommitment

    let attester, attesterAddress, attesterId, unirepContractCalledByAttester

    before(async () => {
        let PoseidonT3Contract, PoseidonT6Contract
        let NewUserStateVerifierContract
        accounts = await ethers.getSigners()

        console.log('Deploying PoseidonT3C')
        PoseidonT3Contract = (await deployContract(
            <Wallet>accounts[0],
            PoseidonT3
        ))
        console.log('Deploying PoseidonT6')
        PoseidonT6Contract = (await deployContract(
            <Wallet>accounts[0],
            PoseidonT6
        ))

        console.log('Deploying NewUserStateVerifier')
        NewUserStateVerifierContract = (await deployContract(
            <Wallet>accounts[0],
            NewUserStateVerifier
        ))

        console.log('Deploying Unirep')
        // Link the IncrementalMerkleTree contract to PoseidonT3 contract
        linkLibrary(Unirep, 'contracts/Poseidon.sol:PoseidonT3', PoseidonT3Contract.address)
        // Link the IncrementalMerkleTree contract to PoseidonT6 contract
        linkLibrary(Unirep, 'contracts/Poseidon.sol:PoseidonT6', PoseidonT6Contract.address)

        unirepContract = (await deployContract(
            <Wallet>accounts[0],
            Unirep,
            [
                {
                    globalStateTreeDepth,
                    userStateTreeDepth
                },
                {
                    maxUsers,
                    maxEpochKeyNonce
                },
                NewUserStateVerifierContract.address,
                epochLength,
                attestingFee
            ],
            {
                gasLimit: 9000000,
            }
        ))

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
        let tx = await unirepContract.beginEpochTransition()
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        // Verify epoch tree
        // let epochTree
        // let epochTree_ = await unirepContract.epochTrees(epoch)
        // expect(epochTree_).equal(epochTree)

        // Verify each epoch key hash chain is sealed
        let hashChainAfter
        let sealedHashChain
        for (epochKey_ in epochKeyHashchainMap) {
            sealedHashChain = ethers.utils.solidityKeccak256(
                ["bytes32", "bytes32"],
                [
                    ethers.utils.hexZeroPad("0x01", 32),
                    epochKeyHashchainMap[epochKey_]
                ]
            )
            hashChainAfter = await unirepContract.epochKeyHashchain(epochKey_)
            expect(hashChainAfter).equal(sealedHashChain)
        }

        // Verify latestEpochTransitionTime and currentEpoch
        let latestEpochTransitionTime = await unirepContract.latestEpochTransitionTime()
        expect(latestEpochTransitionTime).equal((await ethers.provider.getBlock(receipt.blockNumber)).timestamp)

        let epoch_ = await unirepContract.currentEpoch()
        expect(epoch_).equal(Number(epoch) + 1)
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
        // epoch tree should be bytes32(0)
        let epochTree_ = await unirepContract.epochTrees(epoch)
        expect(epochTree_).equal(ethers.utils.hexZeroPad("0x", 32))

        // Verify latestEpochTransitionTime and currentEpoch
        let latestEpochTransitionTime = await unirepContract.latestEpochTransitionTime()
        expect(latestEpochTransitionTime).equal((await ethers.provider.getBlock(receipt.blockNumber)).timestamp)

        let epoch_ = await unirepContract.currentEpoch()
        expect(epoch_).equal(Number(epoch) + 1)
    })
})