import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import chai from "chai"
import { attestingFee, circuitUserStateTreeDepth, epochLength, maxUsers, numEpochKeyNoncePerEpoch } from '../../config/testLocal'
import { genRandomSalt, hash5, hashLeftRight } from '../../crypto/crypto'
import { genIdentity, genIdentityCommitment } from 'libsemaphore'
import { deployUnirep, getTreeDepthsForTesting } from '../../core/utils'

const { expect } = chai

import { UnirepState } from '../../core/UnirepState'
import { UserState } from '../../core'
import { genNewSMT } from '../utils'
import { genProofAndPublicSignals, verifyProof } from '../../circuits/utils'
import { stringifyBigInts } from 'maci-crypto'


describe('Airdrop', function () {
    this.timeout(100000)

    let unirepContract
    let unirepState
    let userState

    let accounts: ethers.Signer[]

    let numUsers = 0

    let attester, attesterAddress, attesterId, unirepContractCalledByAttester
    let attester2, attester2Address, attester2Id, unirepContractCalledByAttester2

    const airdropPosRep = 20


    before(async () => {
        accounts = await hardhatEthers.getSigners()

        const _treeDepths = getTreeDepthsForTesting()
        const _settings = {
            maxUsers: maxUsers,
            numEpochKeyNoncePerEpoch: numEpochKeyNoncePerEpoch,
            epochLength: epochLength,
            attestingFee: attestingFee
        }
        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], _treeDepths, _settings)
        unirepState = new UnirepState(
            _treeDepths.globalStateTreeDepth,
            _treeDepths.userStateTreeDepth,
            _treeDepths.epochTreeDepth,
            _treeDepths.nullifierTreeDepth,
            attestingFee,
            epochLength,
            numEpochKeyNoncePerEpoch,
        )
    })

    it('compute SMT root should succeed', async () => {
        const leafIdx = BigInt(Math.floor(Math.random() * (2** circuitUserStateTreeDepth)))
        const leafValue = genRandomSalt()
        const oneLeafUSTRoot = await unirepContract.calcAirdropUSTRoot(leafIdx, leafValue)

        const defaultLeafHash = hash5([])
        const tree = await genNewSMT(circuitUserStateTreeDepth, defaultLeafHash)
        await tree.update(leafIdx, leafValue)
        const SMTRoot = await tree.getRootHash()

        expect(oneLeafUSTRoot, 'airdrop root does not match').equal(SMTRoot)
    })

    it('attester signs up and attester sets airdrop amount should succeed', async() => {
        console.log('Attesters sign up')
        attester = accounts[1]
        attesterAddress = await attester.getAddress()
        unirepContractCalledByAttester = unirepContract.connect(attester)
        let tx = await unirepContractCalledByAttester.attesterSignUp()
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)
        attesterId = await unirepContract.attesters(attesterAddress)
        // Sign up another attester
        attester2 = accounts[2]
        attester2Address = await attester2.getAddress()
        unirepContractCalledByAttester2 = unirepContract.connect(attester2)
        tx = await unirepContractCalledByAttester2.attesterSignUp()
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        attester2Id = await unirepContract.attesters(attester2Address)

        console.log('attesters set airdrop amount')
        tx = await unirepContractCalledByAttester.setAirdropAmount(airdropPosRep)
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        const airdroppedAmount = await unirepContract.airdropAmount(attesterAddress)
        expect(airdroppedAmount.toNumber()).equal(airdropPosRep)
    })

    it('user signs up through attester should get airdrop pos rep', async() => {
        console.log('User sign up')
        const userId = genIdentity()
        const userCommitment = genIdentityCommitment(userId)
        let tx = await unirepContractCalledByAttester.userSignUp(userCommitment)
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const newGSTLeafInsertedFilter = unirepContract.filters.NewGSTLeafInserted()
        const newGSTLeafInsertedEvents =  await unirepContract.queryFilter(newGSTLeafInsertedFilter)
        const newGSTLeaf = newGSTLeafInsertedEvents[numUsers].args._hashedLeaf
        numUsers ++

        // expected airdropped user state
        const defaultLeafHash = hash5([])
        const leafValue = hash5([BigInt(airdropPosRep)])
        const tree = await genNewSMT(circuitUserStateTreeDepth, defaultLeafHash)
        await tree.update(BigInt(attesterId), leafValue)
        const SMTRoot = await tree.getRootHash()
        const hashedLeaf = hashLeftRight(userCommitment, SMTRoot)
        expect(newGSTLeaf).equal(hashedLeaf)

        // user can prove airdrop pos rep
        const currentEpoch = await unirepContract.currentEpoch()

        unirepState.signUp(currentEpoch.toNumber(), BigInt(newGSTLeaf))
        userState = new UserState(
            unirepState,
            userId,
            userCommitment,
            false,
        )
        const latestTransitionedToEpoch = currentEpoch.toNumber()
        const GSTreeLeafIndex = 0
        userState.signUp(latestTransitionedToEpoch, GSTreeLeafIndex, attesterId, airdropPosRep)
        const provePosRep = 1, proveNegRep = 0, proveRepDiff = 0, proveGraffiti = 0
        const minPosRep = 19, maxNegRep = 0, minRepDiff = 0, graffitiPreImage = 0
        const circuitInputs = await userState.genProveReputationCircuitInputs(BigInt(attesterId), provePosRep, proveNegRep, proveRepDiff, proveGraffiti, minPosRep, maxNegRep, minRepDiff, graffitiPreImage)
        const startTime = new Date().getTime()
        const results = await genProofAndPublicSignals('proveReputation', stringifyBigInts(circuitInputs))
        const endTime = new Date().getTime()
        console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
        const isValid = await verifyProof('proveReputation', results['proof'], results['publicSignals'])
        expect(isValid, 'Verify reputation proof off-chain failed').to.be.true
    })

    it('user signs up through a signed up attester with 0 airdrop should not get airdrop', async() => {
        console.log('User sign up')
        const userId = genIdentity()
        const userCommitment = genIdentityCommitment(userId)
        let tx = await unirepContractCalledByAttester2.userSignUp(userCommitment)
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const newGSTLeafInsertedFilter = unirepContract.filters.NewGSTLeafInserted()
        const newGSTLeafInsertedEvents =  await unirepContract.queryFilter(newGSTLeafInsertedFilter)
        const newGSTLeaf = newGSTLeafInsertedEvents[numUsers].args._hashedLeaf
        numUsers ++

        // expected airdropped user state
        const defaultLeafHash = hash5([])
        const tree = await genNewSMT(circuitUserStateTreeDepth, defaultLeafHash)
        const SMTRoot = await tree.getRootHash()
        const hashedLeaf = hashLeftRight(userCommitment, SMTRoot)
        expect(newGSTLeaf).equal(hashedLeaf)

        // prove reputation should fail
        const currentEpoch = await unirepContract.currentEpoch()
        unirepState.signUp(currentEpoch.toNumber(), BigInt(newGSTLeaf))
        userState = new UserState(
            unirepState,
            userId,
            userCommitment,
            false,
        )
        const latestTransitionedToEpoch = currentEpoch.toNumber()
        const GSTreeLeafIndex = 0
        const airdropAmount = 0
        userState.signUp(latestTransitionedToEpoch, GSTreeLeafIndex, attester2Id, airdropAmount)
        const provePosRep = 1, proveNegRep = 0, proveRepDiff = 0, proveGraffiti = 0
        const minPosRep = 19, maxNegRep = 0, minRepDiff = 0, graffitiPreImage = 0
        const circuitInputs = await userState.genProveReputationCircuitInputs(BigInt(attesterId), provePosRep, proveNegRep, proveRepDiff, proveGraffiti, minPosRep, maxNegRep, minRepDiff, graffitiPreImage)
        const startTime = new Date().getTime()
        const results = await genProofAndPublicSignals('proveReputation', stringifyBigInts(circuitInputs))
        const endTime = new Date().getTime()
        console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
        const isValid = await verifyProof('proveReputation', results['proof'], results['publicSignals'])
        expect(isValid, 'Verify reputation proof off-chain failed').to.be.false
    })

    it('user signs up through a non-signed up attester should succeed and gets no airdrop', async() => {
        console.log('User sign up')
        const userId = genIdentity()
        const userCommitment = genIdentityCommitment(userId)
        let tx = await unirepContractCalledByAttester2.userSignUp(userCommitment)
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const newGSTLeafInsertedFilter = unirepContract.filters.NewGSTLeafInserted()
        const newGSTLeafInsertedEvents =  await unirepContract.queryFilter(newGSTLeafInsertedFilter)
        const newGSTLeaf = newGSTLeafInsertedEvents[numUsers].args._hashedLeaf
        numUsers ++

        // expected airdropped user state
        const defaultLeafHash = hash5([])
        const tree = await genNewSMT(circuitUserStateTreeDepth, defaultLeafHash)
        const SMTRoot = await tree.getRootHash()
        const hashedLeaf = hashLeftRight(userCommitment, SMTRoot)
        expect(newGSTLeaf).equal(hashedLeaf)
    })
})