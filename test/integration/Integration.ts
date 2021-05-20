import { ethers as hardhatEthers } from 'hardhat'
import { BigNumber, ethers } from 'ethers'
import chai from "chai"
import { attestingFee, circuitEpochTreeDepth, circuitGlobalStateTreeDepth, circuitNullifierTreeDepth, circuitUserStateTreeDepth, epochLength, numEpochKeyNoncePerEpoch, numAttestationsPerEpochKey} from '../../config/testLocal'
import { genIdentity, genIdentityCommitment } from 'libsemaphore'
import { IncrementalQuinTree, genRandomSalt, stringifyBigInts, hashOne, hash5 } from 'maci-crypto'
import { deployUnirep, genEpochKey, toCompleteHexString, computeEmptyUserStateRoot, getTreeDepthsForTesting } from '../utils'

const { expect } = chai

import { Attestation, IAttestation, IEpochTreeLeaf, IUserStateLeaf, UnirepState, UserState, genUserStateFromContract } from "../../core"
import { formatProofForVerifierContract, genVerifyEpochKeyProofAndPublicSignals, genVerifyReputationProofAndPublicSignals, genVerifyReputationFromAttesterProofAndPublicSignals,
genVerifyUserStateTransitionProofAndPublicSignals, getSignalByNameViaSym, verifyEPKProof, verifyProveReputationProof, verifyUserStateTransitionProof, verifyProveReputationFromAttesterProof } from "../circuits/utils"
import { DEFAULT_AIRDROPPED_KARMA, DEFAULT_COMMENT_KARMA, DEFAULT_POST_KARMA } from '../../config/socialMedia'
import { add0x } from '../../crypto/SMT'

describe('Integration', function () {
    this.timeout(500000)

    let unirepState: UnirepState
    let users: UserState[] = new Array(2)
    let attesters = new Array(2)

    // Data that are needed for verifying proof
    let userStateLeavesAfterTransition: IUserStateLeaf[][] = new Array(2)
    let graffitiPreImageMap = new Array(2)

    let unirepContract: ethers.Contract
    let unirepContractCalledByFirstAttester, unirepContractCalledBySecondAttester
    let _treeDepths

    let prevEpoch: ethers.BigNumber
    let currentEpoch: ethers.BigNumber
    let emptyUserStateRoot: BigInt
    let blankGSLeaf: BigInt

    let accounts: ethers.Signer[]

    let duplicatedProofInputs

    let postId = '123456'
    let commentId = '654321'
    let postText = 'postText'
    let commentText = 'commentText'

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        _treeDepths = getTreeDepthsForTesting("circuit")
        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], _treeDepths)

        currentEpoch = await unirepContract.currentEpoch()
        emptyUserStateRoot = computeEmptyUserStateRoot(circuitUserStateTreeDepth)
        blankGSLeaf = hash5([BigInt(0), emptyUserStateRoot, BigInt(DEFAULT_AIRDROPPED_KARMA), BigInt(0), BigInt(0)])

        unirepState = new UnirepState(
            circuitGlobalStateTreeDepth,
            circuitUserStateTreeDepth,
            circuitEpochTreeDepth,
            circuitNullifierTreeDepth,
            attestingFee,
            epochLength,
            numEpochKeyNoncePerEpoch,
            numAttestationsPerEpochKey,
        )
    })

    describe('First epoch', () => {
        it('First user signs up', async () => {
            const id = genIdentity()
            const commitment = genIdentityCommitment(id)

            const tx = await unirepContract.userSignUp(commitment)
            const receipt = await tx.wait()
            expect(receipt.status, 'User sign up failed').to.equal(1)

            const hashedStateLeaf = await unirepContract.hashStateLeaf(
                [
                    commitment,
                    emptyUserStateRoot,
                    BigInt(DEFAULT_AIRDROPPED_KARMA),
                    BigInt(0)
                ]
            )
            unirepState.signUp(currentEpoch.toNumber(), BigInt(hashedStateLeaf))
            users[0] = new UserState(
                unirepState,
                id,
                commitment,
                false,
            )
            const latestTransitionedToEpoch = currentEpoch.toNumber()
            const newLeafFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
            const newLeafEvents = await unirepContract.queryFilter(newLeafFilter)
            let GSTreeLeafIndex: number = -1

            for (let i = 0; i < newLeafEvents.length; i++) {
                if(BigInt(newLeafEvents[i]?.args?._hashedLeaf) == BigInt(hashedStateLeaf)){
                    GSTreeLeafIndex = newLeafEvents[i]?.args?._leafIndex.toNumber()
                }
            }
            
            expect(GSTreeLeafIndex).to.equal(0)
            users[0].signUp(latestTransitionedToEpoch, GSTreeLeafIndex)
            console.log(`First user signs up with commitment (${commitment}), in epoch ${latestTransitionedToEpoch} and GST leaf ${GSTreeLeafIndex}`)
            console.log('----------------------User State----------------------')
            console.log(users[0].toJSON(4))
            console.log('------------------------------------------------------')
        })

        it('First attester signs up', async () => {
            attesters[0] = new Object()
            attesters[0]['acct'] = accounts[1]
            attesters[0]['addr'] = await attesters[0]['acct'].getAddress()
            unirepContractCalledByFirstAttester = unirepContract.connect(attesters[0]['acct'])

            const tx = await unirepContractCalledByFirstAttester.attesterSignUp()
            const receipt = await tx.wait()
            expect(receipt.status, 'Attester sign up failed').to.equal(1)
            
            attesters[0].id = BigInt(await unirepContract.attesters(attesters[0]['addr']))
            console.log(`First attester signs up, attester id: ${attesters[0].id}`)
        })

        it('Global state tree built from events should match', async () => {
            const newLeafFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
            const newLeafEvents = await unirepContract.queryFilter(newLeafFilter)

            const stateTransitionByEpochFilter = unirepContract.filters.UserStateTransitioned(currentEpoch)
            const stateTransitionByEpochEvents = await unirepContract.queryFilter(stateTransitionByEpochFilter)

            let newLeaves = new Array(newLeafEvents.length + stateTransitionByEpochEvents.length)

            for(const event of newLeafEvents){
                const leafIndex = event?.args?._leafIndex
                newLeaves[leafIndex] = event?.args?._hashedLeaf
            }

            for(const event of stateTransitionByEpochEvents){
                const leafIndex = event?.args?._leafIndex
                newLeaves[leafIndex] = event?.args?.userTransitionedData?.newGlobalStateTreeLeaf
            }

            let observedGST = new IncrementalQuinTree(circuitGlobalStateTreeDepth, blankGSLeaf, 2)
            for(let leaf of newLeaves) {
                observedGST.insert(leaf)
            }
            expect(observedGST.root, 'GST root mismatch').to.equal(unirepState.genGSTree(currentEpoch.toNumber()).root)
        })
    })

    // No attestations made during first epoch
    // First user transitioned from epoch with no attestations

    describe('Second epoch', () => {
        const secondEpochEpochKeys: string[] = []
        it('begin first epoch epoch transition', async () => {
            prevEpoch = currentEpoch
            // Fast-forward epochLength of seconds
            await hardhatEthers.provider.send("evm_increaseTime", [epochLength])
            // Begin epoch transition
            const numEpochKeysToSeal = await unirepContract.getNumEpochKey(currentEpoch)
            let tx = await unirepContract.beginEpochTransition(numEpochKeysToSeal)
            let receipt = await tx.wait()
            expect(receipt.status, 'Epoch transition failed').to.equal(1)
            console.log(`Gas cost of epoch transition(sealing hash chain of ${numEpochKeysToSeal} epoch keys): ${receipt.gasUsed.toString()}`)

            currentEpoch = await unirepContract.currentEpoch()
            expect(currentEpoch, 'Current epoch should be 2').to.equal(2)

            unirepState.epochTransition(prevEpoch.toNumber(), [])
            console.log('----------------------Unirep State----------------------')
            console.log(unirepState.toJSON(4))
            console.log('------------------------------------------------------')
        })

        it('First user transition from first epoch', async () => {
            const fromEpoch = users[0].latestTransitionedEpoch
            const fromEpochGSTree: IncrementalQuinTree = unirepState.genGSTree(fromEpoch)
            const GSTreeRoot = fromEpochGSTree.root
            const fromEpochTree = await unirepState.genEpochTree(fromEpoch)
            const epochTreeRoot = fromEpochTree.getRootHash()
            const nullifierTreeRoot = (await unirepState.genNullifierTree()).getRootHash()
            const attestationNullifiers = users[0].getAttestationNullifiers(fromEpoch)
            const epkNullifiers = users[0].getEpochKeyNullifiers(fromEpoch)
            console.log('Processing first user\'s transition: ')
            console.log(`from epoch ${fromEpoch}, GSTreeRoot ${GSTreeRoot}, epochTreeRoot ${epochTreeRoot}, nullifierTreeRoot ${nullifierTreeRoot}`)
            console.log(`and attestationNullifiers [${attestationNullifiers}]`)
            console.log(`and epkNullifiers [${epkNullifiers}]`)

            const circuitInputs = await users[0].genUserStateTransitionCircuitInputs()
            const results = await genVerifyUserStateTransitionProofAndPublicSignals(stringifyBigInts(circuitInputs))
            const isValid = await verifyUserStateTransitionProof(results['proof'], results['publicSignals'])
            expect(isValid, 'Verify user transition circuit off-chain failed').to.be.true
            const newGSTLeaf = getSignalByNameViaSym('userStateTransition', results['witness'], 'main.new_GST_leaf')

            // Verify nullifiers outputted by circuit are the same as the ones computed off-chain
            const outputAttestationNullifiers: BigInt[] = []
            for (let i = 0; i < attestationNullifiers.length; i++) {
                const outputNullifier = getSignalByNameViaSym('userStateTransition', results['witness'], 'main.nullifiers[' + i + ']')
                const modedOutputNullifier = BigInt(outputNullifier) % BigInt(2 ** circuitNullifierTreeDepth)
                expect(BigNumber.from(attestationNullifiers[i])).to.equal(BigNumber.from(modedOutputNullifier))
                outputAttestationNullifiers.push(outputNullifier)
            }
            const outputEPKNullifiers: BigInt[] = []
            for (let i = 0; i < epkNullifiers.length; i++) {
                const outputNullifier = getSignalByNameViaSym('userStateTransition', results['witness'], 'main.epoch_key_nullifier[' + i + ']')
                const modedOutputNullifier = BigInt(outputNullifier) % BigInt(2 ** circuitNullifierTreeDepth)
                expect(BigNumber.from(epkNullifiers[i])).to.equal(BigNumber.from(modedOutputNullifier))
                outputEPKNullifiers.push(outputNullifier)
            }
            // Verify new state state outputted by circuit is the same as the one computed off-chain
            const newState = await users[0].genNewUserStateAfterTransition()
            expect(newGSTLeaf, 'Computed new GST leaf should match').to.equal(newState.newGSTLeaf)
            userStateLeavesAfterTransition[0] = newState.newUSTLeaves
            let tx = await unirepContract.updateUserStateRoot(
                newGSTLeaf,
                outputAttestationNullifiers,
                outputEPKNullifiers,
                fromEpoch,
                GSTreeRoot,
                epochTreeRoot,
                nullifierTreeRoot,
                formatProofForVerifierContract(results['proof']),
            )
            let receipt = await tx.wait()
            expect(receipt.status, 'Submit user state transition proof failed').to.equal(1)
        })

        it('Verify state transition of first user\'s epoch transition', async () => {
            const stateTransitionByEpochFilter = unirepContract.filters.UserStateTransitioned(currentEpoch)
            const stateTransitionByEpochEvent = await unirepContract.queryFilter(stateTransitionByEpochFilter)
            expect(stateTransitionByEpochEvent.length, 'Number of state transition events current epoch should be 1').to.equal(1)

            // const newGSTLeafByEpochFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
            // const newGSTLeafByEpochEvent = await unirepContract.queryFilter(newGSTLeafByEpochFilter)
            // console.log(newGSTLeafByEpochEvent)
            // expect(newGSTLeafByEpochEvent.length, 'Number of new GST leaves should be 1').to.equal(1)

            const stateTransitionArgs: any = stateTransitionByEpochEvent[0]['args']
            // const newGSTLeafArgs: any = stateTransitionByEpochEvent[0]['args']

            // Verify on-chain
            const isProofValid = await unirepContract.verifyUserStateTransition(
                stateTransitionArgs['userTransitionedData']['newGlobalStateTreeLeaf'],
                stateTransitionArgs['userTransitionedData']['attestationNullifiers'],
                stateTransitionArgs['userTransitionedData']['epkNullifiers'],
                stateTransitionArgs['userTransitionedData']['fromEpoch'],
                stateTransitionArgs['userTransitionedData']['fromGlobalStateTree'],
                stateTransitionArgs['userTransitionedData']['fromEpochTree'],
                // stateTransitionArgs['userTransitionedData']['_fromNullifierTreeRoot'],
                stateTransitionArgs['userTransitionedData']['proof'],
            )
            expect(isProofValid, 'Verify user state transition on-chain failed').to.be.true

            const attestationNullifiers = stateTransitionArgs['userTransitionedData']['attestationNullifiers'].map((n) => BigInt(n))
            const epkNullifiers = stateTransitionArgs['userTransitionedData']['epkNullifiers'].map((n) => BigInt(n))
            // Combine nullifiers and mod them
            const allNullifiers = attestationNullifiers.concat(epkNullifiers).map((nullifier) => BigInt(nullifier) % BigInt(2 ** circuitNullifierTreeDepth))

            const latestUserStateLeaves = userStateLeavesAfterTransition[0]  // Leaves should be empty as no reputations are given yet
            users[0].transition(latestUserStateLeaves)
            console.log(`First user finish state transition. AttesterIds in UST: [${latestUserStateLeaves.map((l) => l.attesterId.toString())}]`)
            expect(users[0].latestTransitionedEpoch, 'First user should transition to current epoch').to.equal(currentEpoch.toNumber())

            unirepState.userStateTransition(currentEpoch.toNumber(), BigInt(stateTransitionArgs['userTransitionedData']['newGlobalStateTreeLeaf']), allNullifiers)
            console.log('User state transition off-chain: ')
            console.log(`newGSTLeaf ${BigInt(stateTransitionArgs['userTransitionedData']['newGlobalStateTreeLeaf'])}, attestation attestationNullifiers [${attestationNullifiers}] and epk nullifier ${epkNullifiers}`)
            console.log('----------------------User State----------------------')
            console.log(users[0].toJSON(4))
            console.log('------------------------------------------------------')
        })

        it('Second user signs up', async () => {
            const id = genIdentity()
            const commitment = genIdentityCommitment(id)

            const tx = await unirepContract.userSignUp(commitment)
            const receipt = await tx.wait()
            expect(receipt.status, 'User sign up failed').to.equal(1)

            const hashedStateLeaf = await unirepContract.hashStateLeaf(
                [
                    commitment,
                    emptyUserStateRoot,
                    BigInt(DEFAULT_AIRDROPPED_KARMA),
                    BigInt(0)
                ]
            )
            unirepState.signUp(currentEpoch.toNumber(), BigInt(hashedStateLeaf.toString()))
            users[1] = new UserState(
                unirepState,
                id,
                commitment,
                false,
            )
            const latestTransitionedToEpoch = currentEpoch.toNumber()
            const newLeafFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
            const newLeafEvents = await unirepContract.queryFilter(newLeafFilter)
            let GSTreeLeafIndex: number = -1

            for (let i = 0; i < newLeafEvents.length; i++) {
                if(BigInt(newLeafEvents[i]?.args?._hashedLeaf) == BigInt(hashedStateLeaf)){
                    GSTreeLeafIndex = newLeafEvents[i]?.args?._leafIndex.toNumber()
                }
            }

            users[1].signUp(latestTransitionedToEpoch, GSTreeLeafIndex)
            console.log(`Second user signs up with commitment (${commitment}), in epoch ${latestTransitionedToEpoch} and GST leaf ${GSTreeLeafIndex}`)
            console.log('----------------------User State----------------------')
            console.log(users[1].toJSON(4))
            console.log('------------------------------------------------------')
        })

        it('Second attester signs up', async () => {
            attesters[1] = new Object()
            attesters[1]['acct'] = accounts[2]
            attesters[1]['addr'] = await attesters[1]['acct'].getAddress()
            unirepContractCalledBySecondAttester = unirepContract.connect(attesters[1]['acct'])
            
            const tx = await unirepContractCalledBySecondAttester.attesterSignUp()
            const receipt = await tx.wait()
            expect(receipt.status, 'Attester sign up failed').to.equal(1)

            attesters[1].id = BigInt(await unirepContract.attesters(attesters[1]['addr']))
            console.log(`First attester signs up, attester id: ${attesters[0].id}`)
        })

        it('first user generate an epoch key and verify it', async () => {
            const epochKeyNonce = 0
            const epk = genEpochKey(users[0].id.identityNullifier, currentEpoch.toNumber(), epochKeyNonce, circuitEpochTreeDepth).toString(16)

            const circuitInputs = await users[0].genVerifyEpochKeyCircuitInputs(
                epochKeyNonce,                       // generate epoch key from epoch nonce
            )
            const results = await genVerifyEpochKeyProofAndPublicSignals(stringifyBigInts(circuitInputs))

            const isValid = await verifyEPKProof(results['proof'], results['publicSignals'])
            expect(isValid, 'Verify epoch key proof off-chain failed').to.be.true
            
            // Verify on-chain
            const proof = formatProofForVerifierContract(results['proof'])
            const epochKey = BigInt(add0x(epk))
            const publicSignals = results['publicSignals']

            const firstUserEpochKey = genEpochKey(users[0].id.identityNullifier, currentEpoch.toNumber(), epochKeyNonce, circuitEpochTreeDepth)
            const isProofValid = await unirepContract.verifyEpochKeyValidity(
                publicSignals,
                proof
            )
            console.log(`Verifying epk proof with epoch ${currentEpoch} and epk ${firstUserEpochKey}`)
            expect(isProofValid, 'Verify reputation proof on-chain failed').to.be.true
        })

        it('first user publish a post and generate epoch key', async () => {
            const epochKeyNonce = 0
            const epk = genEpochKey(users[0].id.identityNullifier, currentEpoch.toNumber(), epochKeyNonce, circuitEpochTreeDepth).toString(16)

            // gen nullifier nonce list
            const proveKarmaAmount = DEFAULT_POST_KARMA
            const nonceStarter: number = 0

            // gen minRep proof
            const minRep = 0

            const circuitInputs = await users[0].genProveReputationCircuitInputs(
                epochKeyNonce,                       // generate epoch key from epoch nonce
                proveKarmaAmount,               // the amount of output karma nullifiers
                nonceStarter,                      // nonce to generate karma nullifiers
                minRep                          // the amount of minimum reputation the user wants to prove
            )
            const results = await genVerifyReputationProofAndPublicSignals(stringifyBigInts(circuitInputs))

            const nullifiers: BigInt[] = [] 
    
            for (let i = 0; i < DEFAULT_POST_KARMA; i++) {
                const variableName = 'main.karma_nullifiers['+i+']'
                nullifiers.push(getSignalByNameViaSym('proveReputation', results['witness'], variableName) % BigInt(2 ** circuitNullifierTreeDepth) )
            }
            const isValid = await verifyProveReputationProof(results['proof'], results['publicSignals'])
            expect(isValid, 'Verify reputation proof off-chain failed').to.be.true
            
            // Verify on-chain
            const proof = formatProofForVerifierContract(results['proof'])
            const epochKey = BigInt(add0x(epk))
            const publicSignals = results['publicSignals']

            const firstUserEpochKey = genEpochKey(users[0].id.identityNullifier, currentEpoch.toNumber(), epochKeyNonce, circuitEpochTreeDepth)
            const isProofValid = await unirepContract.verifyReputation(
                publicSignals,
                proof
            )
            console.log(`Verifying epk proof with epoch ${currentEpoch} and epk ${firstUserEpochKey}`)
            expect(isProofValid, 'Verify reputation proof on-chain failed').to.be.true

            const attestationToEpochKey = new Attestation(
                BigInt(attesters[0].id),
                BigInt(0),
                BigInt(DEFAULT_POST_KARMA),
                BigInt(0),
                false,
            )
            
            const tx = await unirepContractCalledByFirstAttester.publishPost(
                BigInt(add0x(postId)), 
                epochKey,
                postText, 
                publicSignals, 
                proof,
                nullifiers,
                { value: attestingFee, gasLimit: 1000000 }
            )

            const receipt = await tx.wait()
            expect(receipt.status, 'Submit post failed').to.equal(1)

            secondEpochEpochKeys.push(firstUserEpochKey.toString())
            unirepState.addAttestation(firstUserEpochKey.toString(), attestationToEpochKey)
            for(const user of users){
                user.updateAttestation(firstUserEpochKey, attestationToEpochKey.posRep, attestationToEpochKey.negRep)
            }
        })

        it('Second attester upvote to first user', async () => {
            const nonce = 0
            const firstUserEpochKey = genEpochKey(users[0].id.identityNullifier, currentEpoch.toNumber(), nonce, circuitEpochTreeDepth)
            const graffitiPreImage = genRandomSalt()
            const secondUserEpochKey = genEpochKey(users[1].id.identityNullifier, currentEpoch.toNumber(), nonce, circuitEpochTreeDepth)

            // gen nullifier nonce list
            const voteValue = 3
            const proveKarmaAmount = voteValue
            const upvoteValue = BigInt(voteValue)       
            const nonceStarter: number = 0
   
            // gen minRep proof
            const minRep =  0

            // Add graffiti pre-image to graffitiPreImageMap
            graffitiPreImageMap[0] = new Object()
            graffitiPreImageMap[0][attesters[1].id] = graffitiPreImage
            console.log(`Attester attest to epk ${firstUserEpochKey} with vote value ${voteValue}`)

            // generating reputation proof
            const circuitInputs = await users[1].genProveReputationCircuitInputs(
                nonce,                       // generate epoch key from epoch nonce
                proveKarmaAmount,               // the amount of output karma nullifiers
                nonceStarter,                      // nonce to generate karma nullifiers
                minRep                          // the amount of minimum reputation the user wants to prove
            )

            const results = await genVerifyReputationProofAndPublicSignals(stringifyBigInts(circuitInputs))

            // generating onchain nullifiers
            const nullifiers: BigInt[] = [] 
    
            for (let i = 0; i < voteValue; i++) {
                const variableName = 'main.karma_nullifiers['+i+']'
                nullifiers.push(getSignalByNameViaSym('proveReputation', results['witness'], variableName) % BigInt(2 ** _treeDepths.nullifierTreeDepth) )
            }

            // verify reputation proof
            const isValid = await verifyProveReputationProof(results['proof'], results['publicSignals'])
            expect(isValid, 'verify reputation circuit failed').to.equal(true)

            // format proof
            const proof = formatProofForVerifierContract(results['proof'])
            const fromEpochKey = BigInt(add0x(secondUserEpochKey.toString(16)))
            const publicSignals = results['publicSignals']

            const attestationToEpochKey = new Attestation(
                BigInt(attesters[1].id),
                BigInt(upvoteValue),
                BigInt(0),
                hashOne(graffitiPreImage),
                true,
            )

            const attestationToAttester = new Attestation(
                BigInt(attesters[1].id),
                BigInt(0),
                BigInt(upvoteValue),
                BigInt(0),
                false,
            )

            const tx = await unirepContractCalledBySecondAttester.vote(
                attestationToEpochKey,
                firstUserEpochKey,
                fromEpochKey,
                publicSignals,
                proof,
                nullifiers,
                { value: attestingFee }
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit attestation failed').to.equal(1)

            secondEpochEpochKeys.push(secondUserEpochKey.toString())
            
            unirepState.addAttestation(secondUserEpochKey.toString(), attestationToAttester)
            unirepState.addAttestation(firstUserEpochKey.toString(), attestationToEpochKey)
            for(const user of users){
                user.updateAttestation(secondUserEpochKey, attestationToAttester.posRep, attestationToAttester.negRep)
                user.updateAttestation(firstUserEpochKey, attestationToEpochKey.posRep, attestationToEpochKey.negRep)
            }
        })

        it('Attestations gathered from events should match', async () => {
            // First filter by epoch
            const attestationsByEpochFilter = unirepContract.filters.AttestationSubmitted(currentEpoch)
            const attestationsByEpochEvent = await unirepContract.queryFilter(attestationsByEpochFilter)
            expect(attestationsByEpochEvent.length, 'Number of attestations submitted should be 3').to.equal(3)

            // Second filter by attester
            for (let attester of attesters) {
                let attestationsByAttesterFilter = unirepContract.filters.AttestationSubmitted(null, null, attester['addr'])
                let attestationsByAttesterEvent = await unirepContract.queryFilter(attestationsByAttesterFilter)
                if (attester.id == 1) {
                    expect(attestationsByAttesterEvent.length, 'Number of attestations from first attester should be 1').to.equal(1)
                } else if (attester.id == 2) {
                    expect(attestationsByAttesterEvent.length, 'Number of attestations from second attester should be 2').to.equal(2)
                } else {
                    throw new Error(`Invalid attester id ${attester.id}`)
                }
            }

            // Last filter by epoch key
            for (let epochKey of secondEpochEpochKeys) {
                const epkInHexStr = toCompleteHexString(BigInt(epochKey).toString(16), 32)
                let attestationsByEpochKeyFilter = unirepContract.filters.AttestationSubmitted(null, epkInHexStr)
                let attestationsByEpochKeyEvent = await unirepContract.queryFilter(attestationsByEpochKeyFilter)
                let attestations_: IAttestation[] = attestationsByEpochKeyEvent.map((event: any) => event['args']['attestation'])

                let attestations: IAttestation[] = unirepState.getAttestations(epochKey)
                expect(attestationsByEpochKeyEvent.length, `Number of attestations to epk ${epochKey} should be ${attestations.length}`).to.equal(attestations.length)

                for (let i = 0; i < attestations_.length; i++) {
                    console.log(`Comparing attestation ${i} attesting to epk ${epochKey}`)
                    expect(attestations[i]['attesterId'], 'Mismatched attesterId').to.equal(attestations_[i]['attesterId'])
                    expect(attestations[i]['posRep'], 'Mismatched posRep').to.equal(attestations_[i]['posRep'])
                    expect(attestations[i]['negRep'], 'Mismatched negRep').to.equal(attestations_[i]['negRep'])
                    expect(attestations[i]['graffiti'], 'Mismatched graffiti').to.equal(attestations_[i]['graffiti'])
                    expect(attestations[i]['overwriteGraffiti'], 'Mismatched overwriteGraffiti').to.equal(attestations_[i]['overwriteGraffiti'])
                }
            }
        })

        it('Global state tree built from events should match', async () => {
            const newLeafFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
            const newLeafEvents = await unirepContract.queryFilter(newLeafFilter)

            const stateTransitionByEpochFilter = unirepContract.filters.UserStateTransitioned(currentEpoch)
            const stateTransitionByEpochEvents = await unirepContract.queryFilter(stateTransitionByEpochFilter)

            let newLeaves = new Array(newLeafEvents.length + stateTransitionByEpochEvents.length)

            for(const event of newLeafEvents){
                const leafIndex = event?.args?._leafIndex
                newLeaves[leafIndex] = event?.args?._hashedLeaf
            }

            for(const event of stateTransitionByEpochEvents){
                const leafIndex = event?.args?._leafIndex
                newLeaves[leafIndex] = event?.args?.userTransitionedData?.newGlobalStateTreeLeaf
            }

            let observedGST = new IncrementalQuinTree(circuitGlobalStateTreeDepth, blankGSLeaf, 2)
            for(let leaf of newLeaves) {
                console.log("event",BigInt(leaf))
                // Only insert non-zero leaf
                if (leaf.gt(0)) observedGST.insert(leaf)
            }
            expect(observedGST.root, 'GSTreeRoot mismatched').to.equal(unirepState.genGSTree(currentEpoch.toNumber()).root)
        })
    })

    describe('Third epoch', () => {
        const thirdEpochEpochKeys: string[] = []
        it('begin second epoch epoch transition', async () => {
            prevEpoch = currentEpoch
            // Fast-forward epochLength of seconds
            await hardhatEthers.provider.send("evm_increaseTime", [epochLength])
            // Begin epoch transition
            const numEpochKeysToSeal = await unirepContract.getNumEpochKey(currentEpoch)
            let tx = await unirepContract.beginEpochTransition(numEpochKeysToSeal)
            let receipt = await tx.wait()
            expect(receipt.status, 'Epoch transition failed').to.equal(1)
            console.log(`Gas cost of epoch transition(sealing hash chain of ${numEpochKeysToSeal} epoch keys): ${receipt.gasUsed.toString()}`)

            currentEpoch = await unirepContract.currentEpoch()
            expect(currentEpoch, 'Current epoch should be 3').to.equal(3)

            let [epochKeys_, epochKeyHashchains_] = await unirepContract.getEpochTreeLeaves(prevEpoch)
            expect(epochKeys_.length, 'Number of epoch keys last epoch should be 2').to.equal(2)

            epochKeys_ = epochKeys_.map((epk) => epk.toString())
            epochKeyHashchains_ = epochKeyHashchains_.map((hc) => hc.toString())
            // Add epoch tree leaves to unirepState
            const epochTreeLeaves: IEpochTreeLeaf[] = []
            for (let i = 0; i < epochKeys_.length; i++) {
                const epochTreeLeaf: IEpochTreeLeaf = {
                    epochKey: BigInt(epochKeys_[i]),
                    hashchainResult: BigInt(epochKeyHashchains_[i])
                }
                epochTreeLeaves.push(epochTreeLeaf)
            }

            unirepState.epochTransition(prevEpoch.toNumber(), epochTreeLeaves)
            console.log(`Updating epoch tree leaves off-chain with list of epoch keys: [${epochTreeLeaves.map((l) => l.epochKey.toString())}]`)
            console.log('----------------------Unirep State----------------------')
            console.log(unirepState.toJSON(4))
            console.log('------------------------------------------------------')
        })

        it('First user transition from second epoch', async () => {
            const fromEpoch = users[0].latestTransitionedEpoch
            const fromEpochGSTree: IncrementalQuinTree = unirepState.genGSTree(fromEpoch)
            const GSTreeRoot = fromEpochGSTree.root
            const fromEpochTree = await unirepState.genEpochTree(fromEpoch)
            const epochTreeRoot = fromEpochTree.getRootHash()
            const nullifierTreeRoot = (await unirepState.genNullifierTree()).getRootHash()
            const attestationNullifiers = users[0].getAttestationNullifiers(fromEpoch)
            const epkNullifiers = users[0].getEpochKeyNullifiers(fromEpoch)
            console.log('Processing first user\'s transition: ')
            console.log(`from epoch ${fromEpoch}, GSTreeRoot ${GSTreeRoot}, epochTreeRoot ${epochTreeRoot}, nullifierTreeRoot ${nullifierTreeRoot}`)
            console.log(`and attestationNullifiers [${attestationNullifiers}]`)
            console.log(`and epkNullifiers [${epkNullifiers}]`)

            const circuitInputs = await users[0].genUserStateTransitionCircuitInputs()
            const results = await genVerifyUserStateTransitionProofAndPublicSignals(stringifyBigInts(circuitInputs))
            const isValid = await verifyUserStateTransitionProof(results['proof'], results['publicSignals'])
            expect(isValid, 'Verify user transition circuit off-chain failed').to.be.true
            const newGSTLeaf = getSignalByNameViaSym('userStateTransition', results['witness'], 'main.new_GST_leaf')

            // Verify nullifiers outputted by circuit are the same as the ones computed off-chain
            const outputAttestationNullifiers: BigInt[] = []
            for (let i = 0; i < attestationNullifiers.length; i++) {
                const outputNullifier = getSignalByNameViaSym('userStateTransition', results['witness'], 'main.nullifiers[' + i + ']')
                const modedOutputNullifier = BigInt(outputNullifier) % BigInt(2 ** circuitNullifierTreeDepth)
                expect(BigNumber.from(attestationNullifiers[i])).to.equal(BigNumber.from(modedOutputNullifier))
                outputAttestationNullifiers.push(outputNullifier)
            }
            const outputEPKNullifiers: BigInt[] = []
            for (let i = 0; i < epkNullifiers.length; i++) {
                const outputNullifier = getSignalByNameViaSym('userStateTransition', results['witness'], 'main.epoch_key_nullifier[' + i + ']')
                const modedOutputNullifier = BigInt(outputNullifier) % BigInt(2 ** circuitNullifierTreeDepth)
                expect(BigNumber.from(epkNullifiers[i])).to.equal(BigNumber.from(modedOutputNullifier))
                outputEPKNullifiers.push(outputNullifier)
            }
            // Verify new state state outputted by circuit is the same as the one computed off-chain
            const newState = await users[0].genNewUserStateAfterTransition()
            expect(newGSTLeaf, 'Computed new GST leaf should match').to.equal(newState.newGSTLeaf)
            userStateLeavesAfterTransition[0] = newState.newUSTLeaves
            let tx = await unirepContract.updateUserStateRoot(
                newGSTLeaf,
                outputAttestationNullifiers,
                outputEPKNullifiers,
                fromEpoch,
                GSTreeRoot,
                epochTreeRoot,
                nullifierTreeRoot,
                formatProofForVerifierContract(results['proof']),
            )
            let receipt = await tx.wait()
            expect(receipt.status, 'Submit user state transition proof failed').to.equal(1)

            // Record state transition proof inputs to be used to submit duplicated proof
            duplicatedProofInputs = {
                "newGSTLeaf": newGSTLeaf,
                "attestationNullifiers": outputAttestationNullifiers,
                "epkNullifiers": outputEPKNullifiers,
                "fromEpoch": fromEpoch,
                "GSTreeRoot": GSTreeRoot,
                "epochTreeRoot": epochTreeRoot,
                "nullifierTreeRoot": nullifierTreeRoot,
                "proof": formatProofForVerifierContract(results['proof']),
            }
        })

        it('Verify state transition of first user\'s epoch transition', async () => {
            const stateTransitionByEpochFilter = unirepContract.filters.UserStateTransitioned(currentEpoch)
            const stateTransitionByEpochEvent = await unirepContract.queryFilter(stateTransitionByEpochFilter)
            expect(stateTransitionByEpochEvent.length, 'Number of state transition events current epoch should be 1').to.equal(1)

            // const newGSTLeafByEpochFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
            // const newGSTLeafByEpochEvent = await unirepContract.queryFilter(newGSTLeafByEpochFilter)
            // expect(newGSTLeafByEpochEvent.length, 'Number of new GST leaves should be 1').to.equal(1)

            const stateTransitionArgs: any = stateTransitionByEpochEvent[0]['args']
            const newGSTLeaf: any = stateTransitionArgs['userTransitionedData']['newGlobalStateTreeLeaf']

            // Verify on-chain
            const isProofValid = await unirepContract.verifyUserStateTransition(
                stateTransitionArgs['userTransitionedData']['newGlobalStateTreeLeaf'],
                stateTransitionArgs['userTransitionedData']['attestationNullifiers'],
                stateTransitionArgs['userTransitionedData']['epkNullifiers'],
                stateTransitionArgs['userTransitionedData']['fromEpoch'],
                stateTransitionArgs['userTransitionedData']['fromGlobalStateTree'],
                stateTransitionArgs['userTransitionedData']['fromEpochTree'],
                // stateTransitionArgs['userTransitionedData']['_fromNullifierTreeRoot'],
                stateTransitionArgs['userTransitionedData']['proof'],
            )
            expect(isProofValid, 'Verify user state transition on-chain failed').to.be.true

            const attestationNullifiers = stateTransitionArgs['userTransitionedData']['attestationNullifiers'].map((n) => BigInt(n))
            const epkNullifiers = stateTransitionArgs['userTransitionedData']['epkNullifiers'].map((n) => BigInt(n))
            // Combine nullifiers and mod them
            const allNullifiers = attestationNullifiers.concat(epkNullifiers).map((nullifier) => BigInt(nullifier) % BigInt(2 ** circuitNullifierTreeDepth))

            const latestUserStateLeaves = userStateLeavesAfterTransition[0]
            users[0].transition(latestUserStateLeaves)
            console.log(`First user finish state transition. AttesterIds in UST: [${latestUserStateLeaves.map((l) => l.attesterId.toString())}]`)
            expect(users[0].latestTransitionedEpoch, 'First user should transition to current epoch').to.equal(currentEpoch.toNumber())

            unirepState.userStateTransition(currentEpoch.toNumber(), BigInt(newGSTLeaf), allNullifiers)
            console.log('User state transition off-chain: ')
            console.log(`newGSTLeaf ${BigInt(newGSTLeaf)}, attestation attestationNullifiers [${attestationNullifiers}] and epk nullifier ${epkNullifiers}`)
            console.log('----------------------User State----------------------')
            console.log(users[0].toJSON(4))
            console.log('------------------------------------------------------')
        })

        it('First user prove his reputation', async () => {
            const attesterId = attesters[1].id  // Prove reputation received from first attester
            const provePosRep = BigInt(1)
            const proveNegRep = BigInt(1)
            const proveRepDiff = BigInt(1)
            const proveGraffiti = BigInt(1)
            const minPosRep = BigInt(1)
            const maxNegRep = BigInt(10)
            const minRepDiff = BigInt(0)
            const graffitiPreImage = graffitiPreImageMap[0][attesterId.toString()]
            console.log(`Proving reputation from attester ${attesterId} with minPosRep ${minPosRep}, maxNegRep ${maxNegRep} and graffitiPreimage ${graffitiPreImage}`)
            const circuitInputs = await users[0].genProveReputationFromAttesterCircuitInputs(attesterId, provePosRep, proveNegRep, proveRepDiff, proveGraffiti, minPosRep, maxNegRep, minRepDiff, graffitiPreImage)
            const startTime = new Date().getTime()
            const results = await genVerifyReputationFromAttesterProofAndPublicSignals(stringifyBigInts(circuitInputs))
            const endTime = new Date().getTime()
            console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            const isValid = await verifyProveReputationFromAttesterProof(results['proof'], results['publicSignals'])
            expect(isValid, 'Verify reputation proof off-chain failed').to.be.true

            // Verify on-chain
            const GSTreeRoot = unirepState.genGSTree(currentEpoch.toNumber()).root
            const nullifierTree = await unirepState.genNullifierTree()
            const nullifierTreeRoot = nullifierTree.getRootHash()
            const publicInput = [
                users[0].latestTransitionedEpoch,
                GSTreeRoot,
                nullifierTreeRoot,
                attesterId,
                provePosRep,
                proveNegRep,
                proveRepDiff,
                proveGraffiti,
                minRepDiff,
                minPosRep,
                maxNegRep,
                graffitiPreImage
            ]
            const isProofValid = await unirepContract.verifyReputationFromAttester(
                publicInput,
                formatProofForVerifierContract(results['proof']),
            )
            expect(isProofValid, 'Verify reputation on-chain failed').to.be.true
        })

        it('first user leave a comment and generate epoch key', async () => {
            const epochKeyNonce = 0
            const epk = genEpochKey(users[0].id.identityNullifier, currentEpoch.toNumber(), epochKeyNonce, circuitEpochTreeDepth).toString(16)

            // gen nullifier nonce list
            const proveKarmaAmount = DEFAULT_COMMENT_KARMA
            const nonceStarter: number = 0

            // gen minRep proof
            const minRep = 0

            const circuitInputs = await users[0].genProveReputationCircuitInputs(
                epochKeyNonce,                       // generate epoch key from epoch nonce
                proveKarmaAmount,               // the amount of output karma nullifiers
                nonceStarter,                      // nonce to generate karma nullifiers
                minRep                          // the amount of minimum reputation the user wants to prove
            )
            const results = await genVerifyReputationProofAndPublicSignals(stringifyBigInts(circuitInputs))

            const nullifiers: BigInt[] = [] 
    
            for (let i = 0; i < DEFAULT_COMMENT_KARMA; i++) {
                const variableName = 'main.karma_nullifiers['+i+']'
                nullifiers.push(getSignalByNameViaSym('proveReputation', results['witness'], variableName) % BigInt(2 ** circuitNullifierTreeDepth) )
            }
            const isValid = await verifyProveReputationProof(results['proof'], results['publicSignals'])
            expect(isValid, 'Verify reputation proof off-chain failed').to.be.true
            
            // Verify on-chain
            const proof = formatProofForVerifierContract(results['proof'])
            const epochKey = BigInt(add0x(epk))
            const publicSignals = results['publicSignals']

            const firstUserEpochKey = genEpochKey(users[0].id.identityNullifier, currentEpoch.toNumber(), epochKeyNonce, circuitEpochTreeDepth)
            const isProofValid = await unirepContract.verifyReputation(
                publicSignals,
                proof
            )
            console.log(`Verifying epk proof with epoch ${currentEpoch} and epk ${firstUserEpochKey}`)
            expect(isProofValid, 'Verify reputation proof on-chain failed').to.be.true

            const attestationToEpochKey = new Attestation(
                BigInt(attesters[0].id),
                BigInt(0),
                BigInt(DEFAULT_COMMENT_KARMA),
                BigInt(0),
                false,
            )
            
            const tx = await unirepContractCalledByFirstAttester.leaveComment(
                BigInt(add0x(postId)), 
                BigInt(add0x(commentId)),
                epochKey,
                commentText, 
                publicSignals, 
                proof,
                nullifiers,
                { value: attestingFee, gasLimit: 1000000 }
            )

            const receipt = await tx.wait()
            expect(receipt.status, 'Submit comment failed').to.equal(1)

            thirdEpochEpochKeys.push(firstUserEpochKey.toString())
            unirepState.addAttestation(firstUserEpochKey.toString(), attestationToEpochKey)
            for(const user of users){
                user.updateAttestation(firstUserEpochKey, attestationToEpochKey.posRep, attestationToEpochKey.negRep)
            }
        })

        it('First user submits duplicated state transition proof', async () => {
            let tx = await unirepContract.updateUserStateRoot(
                duplicatedProofInputs["newGSTLeaf"],
                duplicatedProofInputs["attestationNullifiers"],
                duplicatedProofInputs["epkNullifiers"],
                duplicatedProofInputs["fromEpoch"],
                duplicatedProofInputs["GSTreeRoot"],
                duplicatedProofInputs["epochTreeRoot"],
                duplicatedProofInputs["nullifierTreeRoot"],
                duplicatedProofInputs["proof"],
            )
            let receipt = await tx.wait()
            expect(receipt.status, 'Submit duplicated user state transition proof failed').to.equal(1)
        })

        it('genUserStateFromContract should return equivalent UserState and UnirepState', async () => {
            const userStateFromContract = await genUserStateFromContract(
                hardhatEthers.provider,
                unirepContract.address,
                0,
                users[0].id,
                users[0].commitment,
            )

            // Check user state matches
            expect(users[0].latestTransitionedEpoch, 'First user latest transitioned epoch mismatch').to.equal(userStateFromContract.latestTransitionedEpoch)
            expect(users[0].latestGSTLeafIndex, 'First user latest GST leaf index mismatch').to.equal(userStateFromContract.latestGSTLeafIndex)
            expect((await users[0].genUserStateTree()).getRootHash(), 'First user UST mismatch').to.equal((await userStateFromContract.genUserStateTree()).getRootHash())

            // Check unirep state matches
            expect(unirepState.currentEpoch, 'Unirep state current epoch mismatch').to.equal(userStateFromContract.getUnirepStateCurrentEpoch())
            for (let epoch = 1; epoch <= unirepState.currentEpoch; epoch++) {
                const GST = unirepState.genGSTree(epoch)
                const _GST = userStateFromContract.getUnirepStateGSTree(epoch)
                expect(GST.root, `Epoch ${epoch} GST root mismatch`).to.equal(_GST.root)

                const epochTree = await unirepState.genEpochTree(epoch)
                const _epochTree = await userStateFromContract.getUnirepStateEpochTree(epoch)
                expect(epochTree.getRootHash(), `Epoch ${epoch} epoch tree root mismatch`).to.equal(_epochTree.getRootHash())

                const nullifierTree = await unirepState.genNullifierTree()
                const _nullifierTree = await userStateFromContract.getUnirepStateNullifierTree()
                expect(nullifierTree.getRootHash(), `Epoch ${epoch} nullifier tree root mismatch`).to.equal(_nullifierTree.getRootHash())
            }
        })
    })
})