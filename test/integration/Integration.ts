import { ethers as hardhatEthers } from 'hardhat'
import { BigNumber, ethers } from 'ethers'
import chai from "chai"
import { attestingFee, circuitEpochTreeDepth, circuitGlobalStateTreeDepth, circuitNullifierTreeDepth, circuitUserStateTreeDepth, epochLength, numEpochKeyNoncePerEpoch, numAttestationsPerEpochKey, defaultAirdroppedKarma, maxKarmaBudget} from '../../config/testLocal'
import { genIdentity, genIdentityCommitment } from 'libsemaphore'
import { IncrementalQuinTree, genRandomSalt, stringifyBigInts, hashOne, hash5 } from 'maci-crypto'
import { deployUnirep, genEpochKey, toCompleteHexString, computeEmptyUserStateRoot, getTreeDepthsForTesting } from '../utils'

const { expect } = chai

import { Attestation, IAttestation, IEpochTreeLeaf, IUserStateLeaf, UnirepState, UserState, genUserStateFromContract } from "../../core"
import { formatProofForVerifierContract, genVerifyEpochKeyProofAndPublicSignals, genVerifyReputationNullifierProofAndPublicSignals, genVerifyReputationProofAndPublicSignals,
genVerifyUserStateTransitionProofAndPublicSignals, getSignalByNameViaSym, verifyEPKProof, verifyProveReputationNullifierProof, verifyUserStateTransitionProof, verifyProveReputationProof, compileAndLoadCircuit, executeCircuit } from "../circuits/utils"
import { add0x } from '../../crypto/SMT'

describe('Integration', function () {
    this.timeout(500000)

    let unirepState: UnirepState
    let users: UserState[] = new Array(2)
    let attesters = new Array(2)
    let attesterSigs = new Array(2)
    const firstUser = 0
    const secondUser = 1
    const firstAttester = 0
    const secondAttester = 1

    // Data that are needed for verifying proof
    let userStateLeavesAfterTransition: IUserStateLeaf[][] = new Array(2)
    let graffitiPreImageMap = new Array(2)

    let unirepContract: ethers.Contract
    let contractCalledByFirstAttester, contractCalledBySecondAttester
    let _treeDepths

    let prevEpoch: ethers.BigNumber
    let currentEpoch: ethers.BigNumber
    let emptyUserStateRoot: BigInt
    let blankGSLeaf: BigInt
    let userStateTransitionedNum: {[key: number]: ethers.BigNumber[]} = {}
    let epochKeys: {[key: string]: boolean} = {}

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
        blankGSLeaf = hash5([BigInt(0), emptyUserStateRoot, BigInt(0), BigInt(0), BigInt(0)])

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

            const tx = await unirepContract.userSignUp(commitment, defaultAirdroppedKarma)
            const receipt = await tx.wait()
            expect(receipt.status, 'User sign up failed').to.equal(1)

            const hashedStateLeaf = await unirepContract.hashStateLeaf(
                [
                    commitment,
                    emptyUserStateRoot,
                    BigInt(defaultAirdroppedKarma),
                    BigInt(0)
                ]
            )
            unirepState.signUp(currentEpoch.toNumber(), BigInt(hashedStateLeaf))
            users[firstUser] = new UserState(
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
            
            users[firstUser].signUp(latestTransitionedToEpoch, GSTreeLeafIndex)
            console.log(`First user signs up with commitment (${commitment}), in epoch ${latestTransitionedToEpoch} and GST leaf ${GSTreeLeafIndex}`)
            console.log('----------------------User State----------------------')
            console.log(users[firstUser].toJSON(4))
            console.log('------------------------------------------------------')
        })

        it('First attester signs up', async () => {
            attesters[firstAttester] = new Object()
            attesters[firstAttester]['acct'] = accounts[1]
            attesters[firstAttester]['addr'] = await attesters[firstAttester]['acct'].getAddress()
            contractCalledByFirstAttester = unirepContract.connect(attesters[firstAttester]['acct'])
            const message = ethers.utils.solidityKeccak256(["address", "address"], [attesters[firstAttester]['addr'], unirepContract.address])
            attesterSigs[firstAttester] = await attesters[firstAttester]['acct'].signMessage(ethers.utils.arrayify(message))
            const tx = await contractCalledByFirstAttester.attesterSignUp()
            const receipt = await tx.wait()
            expect(receipt.status, 'Attester sign up failed').to.equal(1)
            
            attesters[firstAttester].id = BigInt(await unirepContract.attesters(attesters[firstAttester]['addr']))
            console.log(`First attester signs up, attester id: ${attesters[firstAttester].id}`)
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
        let attestationsFromUnirepSocial: number = 0
        let attestationsFromFirstAttester: number = 0
        let attestationsFromSecondAttester: number = 0
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

            userStateTransitionedNum[currentEpoch.toNumber()] = []
        })

        it('First user transition from first epoch', async () => {
            const fromEpoch = users[firstUser].latestTransitionedEpoch
            const fromEpochGSTree: IncrementalQuinTree = unirepState.genGSTree(fromEpoch)
            const GSTreeRoot = fromEpochGSTree.root
            const fromEpochTree = await unirepState.genEpochTree(fromEpoch)
            const epochTreeRoot = fromEpochTree.getRootHash()
            const nullifierTreeRoot = (await unirepState.genNullifierTree()).getRootHash()
            const attestationNullifiers = users[firstUser].getAttestationNullifiers(fromEpoch)
            const epkNullifiers = users[firstUser].getEpochKeyNullifiers(fromEpoch)
            console.log('Processing first user\'s transition: ')
            console.log(`from epoch ${fromEpoch}, GSTreeRoot ${GSTreeRoot}, epochTreeRoot ${epochTreeRoot}, nullifierTreeRoot ${nullifierTreeRoot}`)
            console.log(`and attestationNullifiers [${attestationNullifiers}]`)
            console.log(`and epkNullifiers [${epkNullifiers}]`)

            const circuitInputs = await users[firstUser].genUserStateTransitionCircuitInputs()
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
            const newState = await users[firstUser].genNewUserStateAfterTransition()
            expect(newGSTLeaf, 'Computed new GST leaf should match').to.equal(newState.newGSTLeaf)
            userStateLeavesAfterTransition[firstUser] = newState.newUSTLeaves
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
            userStateTransitionedNum[currentEpoch.toNumber()].push(newGSTLeaf)
        })

        it('Verify state transition of first user\'s epoch transition', async () => {
            const stateTransitionByEpochFilter = unirepContract.filters.UserStateTransitioned(currentEpoch)
            const stateTransitionByEpochEvent = await unirepContract.queryFilter(stateTransitionByEpochFilter)
            expect(stateTransitionByEpochEvent.length, `Number of state transition events current epoch should be ${userStateTransitionedNum[currentEpoch.toNumber()].length}`).to.equal(userStateTransitionedNum[currentEpoch.toNumber()].length)

            const stateTransitionArgs: any = stateTransitionByEpochEvent[0]['args']

            // Verify on-chain
            const isProofValid = await unirepContract.verifyUserStateTransition(
                stateTransitionArgs['userTransitionedData']['newGlobalStateTreeLeaf'],
                stateTransitionArgs['userTransitionedData']['attestationNullifiers'],
                stateTransitionArgs['userTransitionedData']['epkNullifiers'],
                stateTransitionArgs['userTransitionedData']['fromEpoch'],
                stateTransitionArgs['userTransitionedData']['fromGlobalStateTree'],
                defaultAirdroppedKarma,
                stateTransitionArgs['userTransitionedData']['fromEpochTree'],
                stateTransitionArgs['userTransitionedData']['proof'],
            )
            expect(isProofValid, 'Verify user state transition on-chain failed').to.be.true

            const attestationNullifiers = stateTransitionArgs['userTransitionedData']['attestationNullifiers'].map((n) => BigInt(n))
            const epkNullifiers = stateTransitionArgs['userTransitionedData']['epkNullifiers'].map((n) => BigInt(n))
            // Combine nullifiers and mod them
            const allNullifiers = attestationNullifiers.concat(epkNullifiers).map((nullifier) => BigInt(nullifier) % BigInt(2 ** circuitNullifierTreeDepth))

            const latestUserStateLeaves = userStateLeavesAfterTransition[0]  // Leaves should be empty as no reputations are given yet
            users[firstUser].transition(latestUserStateLeaves)
            console.log(`First user finish state transition. AttesterIds in UST: [${latestUserStateLeaves.map((l) => l.attesterId.toString())}]`)
            expect(users[firstUser].latestTransitionedEpoch, 'First user should transition to current epoch').to.equal(currentEpoch.toNumber())

            unirepState.userStateTransition(currentEpoch.toNumber(), BigInt(stateTransitionArgs['userTransitionedData']['newGlobalStateTreeLeaf']), allNullifiers)
            console.log('User state transition off-chain: ')
            console.log(`newGSTLeaf ${BigInt(stateTransitionArgs['userTransitionedData']['newGlobalStateTreeLeaf'])}, attestation attestationNullifiers [${attestationNullifiers}] and epk nullifier ${epkNullifiers}`)
            console.log('----------------------User State----------------------')
            console.log(users[firstUser].toJSON(4))
            console.log('------------------------------------------------------')

            // User state transition through Unirep Social should be found in Unirep Social Events
            const userStateTransitionFilter = unirepContract.filters.UserStateTransitioned(currentEpoch)
            const userStateTransitionEvents = await unirepContract.queryFilter(userStateTransitionFilter)
            let foundIdx = false
            for (let i = 0; i < userStateTransitionEvents.length; i++) {
                if(userStateTransitionEvents[i]?.args?._leafIndex.eq(stateTransitionArgs['_leafIndex'])) foundIdx = true
            }
            expect(foundIdx).to.be.true
        })

        it('Second user signs up', async () => {
            const id = genIdentity()
            const commitment = genIdentityCommitment(id)

            const tx = await unirepContract.userSignUp(commitment, defaultAirdroppedKarma)
            const receipt = await tx.wait()
            expect(receipt.status, 'User sign up failed').to.equal(1)

            const hashedStateLeaf = await unirepContract.hashStateLeaf(
                [
                    commitment,
                    emptyUserStateRoot,
                    BigInt(defaultAirdroppedKarma),
                    BigInt(0)
                ]
            )
            unirepState.signUp(currentEpoch.toNumber(), BigInt(hashedStateLeaf.toString()))
            users[secondUser] = new UserState(
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
            expect(GSTreeLeafIndex).to.equal(1)

            users[secondUser].signUp(latestTransitionedToEpoch, GSTreeLeafIndex)
            console.log(`Second user signs up with commitment (${commitment}), in epoch ${latestTransitionedToEpoch} and GST leaf ${GSTreeLeafIndex}`)
            console.log('----------------------User State----------------------')
            console.log(users[secondUser].toJSON(4))
            console.log('------------------------------------------------------')
        })

        it('Second attester signs up', async () => {
            attesters[secondAttester] = new Object()
            attesters[secondAttester]['acct'] = accounts[2]
            attesters[secondAttester]['addr'] = await attesters[secondAttester]['acct'].getAddress()
            contractCalledBySecondAttester = unirepContract.connect(attesters[secondAttester]['acct'])
            const message = ethers.utils.solidityKeccak256(["address", "address"], [attesters[secondAttester]['addr'], unirepContract.address])
            attesterSigs[secondAttester] = await attesters[secondAttester]['acct'].signMessage(ethers.utils.arrayify(message))
            const tx = await contractCalledBySecondAttester.attesterSignUp()
            const receipt = await tx.wait()
            expect(receipt.status, 'Attester sign up failed').to.equal(1)

            attesters[secondAttester].id = BigInt(await unirepContract.attesters(attesters[secondAttester]['addr']))
            console.log(`First attester signs up, attester id: ${attesters[secondAttester].id}`)
        })

        it('first user generate an epoch key and verify it', async () => {
            const epochKeyNonce = 0
            const epk = genEpochKey(users[firstUser].id.identityNullifier, currentEpoch.toNumber(), epochKeyNonce, circuitEpochTreeDepth).toString(16)

            const circuitInputs = await users[firstUser].genVerifyEpochKeyCircuitInputs(
                epochKeyNonce,                       // generate epoch key from epoch nonce
            )
            const results = await genVerifyEpochKeyProofAndPublicSignals(stringifyBigInts(circuitInputs))

            const isValid = await verifyEPKProof(results['proof'], results['publicSignals'])
            expect(isValid, 'Verify epoch key proof off-chain failed').to.be.true
            
            // Verify on-chain
            const GSTree = unirepState.genGSTree(currentEpoch.toNumber())
            const proof = formatProofForVerifierContract(results['proof'])

            const firstUserEpochKey = genEpochKey(users[0].id.identityNullifier, currentEpoch.toNumber(), epochKeyNonce, circuitEpochTreeDepth)
            const isProofValid = await unirepContract.verifyEpochKeyValidity(
                GSTree.root,
                currentEpoch,
                firstUserEpochKey,
                proof
            )
            console.log(`Verifying epk proof with epoch ${currentEpoch} and epk ${firstUserEpochKey}`)
            expect(isProofValid, 'Verify reputation proof on-chain failed').to.be.true
        })

        // it('first user publish a post and generate epoch key', async () => {
        //     const epochKeyNonce = 0
        //     const epk = genEpochKey(users[firstUser].id.identityNullifier, currentEpoch.toNumber(), epochKeyNonce, circuitEpochTreeDepth).toString(16)

        //     // gen nullifier nonce list
        //     const proveKarmaAmount = DEFAULT_POST_KARMA

        //     // gen minRep proof
        //     const minRep = 0

        //     const circuitInputs = await users[0].genProveReputationNullifierCircuitInputs(
        //         epochKeyNonce,                       // generate epoch key from epoch nonce
        //         proveKarmaAmount,               // the amount of output karma nullifiers
        //         minRep                          // the amount of minimum reputation the user wants to prove
        //     )
        //     const results = await genVerifyReputationNullifierProofAndPublicSignals(stringifyBigInts(circuitInputs))

        //     const isValid = await verifyProveReputationNullifierProof(results['proof'], results['publicSignals'])
        //     expect(isValid, 'Verify reputation proof off-chain failed').to.be.true
            
        //     // Verify on-chain
        //     const proof = formatProofForVerifierContract(results['proof'])
        //     const epochKey = BigInt(add0x(epk))
        //     const nullifiers = results['publicSignals'].slice(0, maxKarmaBudget)
        //     const publicSignals = results['publicSignals'].slice(maxKarmaBudget+2)

        //     const firstUserEpochKey = genEpochKey(users[0].id.identityNullifier, currentEpoch.toNumber(), epochKeyNonce, circuitEpochTreeDepth)
        //     const isProofValid = await unirepContract.verifyReputation(
        //         nullifiers,
        //         currentEpoch,
        //         epochKey,
        //         publicSignals,
        //         proof
        //     )
        //     console.log(`Verifying epk proof with epoch ${currentEpoch} and epk ${firstUserEpochKey}`)
        //     expect(isProofValid, 'Verify reputation proof on-chain failed').to.be.true

        //     const attestationToEpochKey = new Attestation(
        //         BigInt(unirepSocialId),
        //         BigInt(0),
        //         BigInt(DEFAULT_POST_KARMA),
        //         BigInt(0),
        //         false,
        //     )
            
        //     const tx = await unirepContract.publishPost(
        //         BigInt(add0x(postId)), 
        //         epochKey,
        //         postText, 
        //         nullifiers,
        //         publicSignals, 
        //         proof,
        //         { value: attestingFee, gasLimit: 1000000 }
        //     )

        //     const receipt = await tx.wait()
        //     expect(receipt.status, 'Submit post failed').to.equal(1)

        //     for (let i = 0; i < maxKarmaBudget; i++) {
        //         const modedNullifier = BigInt(nullifiers[i]) % BigInt(2 ** unirepState.nullifierTreeDepth)
        //         unirepState.addKarmaNullifiers(modedNullifier)
        //     }

        //     // User submit a post through Unirep Social should be found in Unirep Social Events
        //     const postFilter = unirepContract.filters.PostSubmitted(currentEpoch, BigInt(add0x(postId)), epochKey)
        //     const postEvents = await unirepContract.queryFilter(postFilter)
        //     expect(postEvents.length).to.equal(1)

        //     secondEpochEpochKeys.push(firstUserEpochKey.toString())
        //     unirepState.addAttestation(firstUserEpochKey.toString(), attestationToEpochKey)
        //     for(const user of users){
        //         user.updateAttestation(firstUserEpochKey, attestationToEpochKey.posRep, attestationToEpochKey.negRep)
        //     }
        //     attestationsFromUnirepSocial++
        //     epochKeys[epochKey.toString()] = true
        // })

        it('Second attester attest to first user', async () => {
            const nonce = 0
            const firstUserEpochKey = genEpochKey(users[firstUser].id.identityNullifier, currentEpoch.toNumber(), nonce, circuitEpochTreeDepth)
            const graffitiPreImage = genRandomSalt()
            const secondUserEpochKey = genEpochKey(users[secondUser].id.identityNullifier, currentEpoch.toNumber(), nonce, circuitEpochTreeDepth)

            let attestation: Attestation = new Attestation(
                BigInt(attesters[secondAttester].id),
                BigInt(1),
                BigInt(0),
                hashOne(graffitiPreImage),
                true,
            )  
   
            // gen minRep proof
            const minRep =  0

            // Add graffiti pre-image to graffitiPreImageMap
            graffitiPreImageMap[0] = new Object()
            graffitiPreImageMap[0][attesters[secondAttester].id] = graffitiPreImage
            console.log(`Attester attest to epk ${firstUserEpochKey} with ${attestation.toJSON()}`)

            // generating reputation proof
            const circuitInputs = await users[secondUser].genProveReputationNullifierCircuitInputs(
                nonce,                       // generate epoch key from epoch nonce
                Number(attestation.posRep) + Number(attestation.negRep),  // the amount of output karma nullifiers
                minRep                          // the amount of minimum reputation the user wants to prove
            )

            const results = await genVerifyReputationNullifierProofAndPublicSignals(stringifyBigInts(circuitInputs))

            // verify reputation proof
            const isValid = await verifyProveReputationNullifierProof(results['proof'], results['publicSignals'])
            expect(isValid, 'verify reputation circuit failed').to.equal(true)

            // format proof
            const proof = formatProofForVerifierContract(results['proof'])
            const fromEpochKey = BigInt(add0x(secondUserEpochKey.toString(16)))
            const nullifiers = results['publicSignals'].slice(0, maxKarmaBudget)
            const publicSignals = results['publicSignals'].slice(maxKarmaBudget+2)

            const attestationToEpochKey = attestation

            const attestationToAttester = new Attestation(
                BigInt(attesters[secondAttester].id),
                BigInt(0),
                BigInt(Number(attestation.posRep) + Number(attestation.negRep)),
                BigInt(0),
                false,
            )

            const tx = await contractCalledBySecondAttester.submitAttestation(
                attestation,
                fromEpochKey,
                firstUserEpochKey,
                nullifiers,
                publicSignals,
                formatProofForVerifierContract(results['proof']),
                {value: attestingFee}
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit attestation failed').to.equal(1)

            for (let i = 0; i < maxKarmaBudget; i++) {
                const modedNullifier = BigInt(nullifiers[i]) % BigInt(2 ** unirepState.nullifierTreeDepth)
                unirepState.addKarmaNullifiers(modedNullifier)
            }

            secondEpochEpochKeys.push(secondUserEpochKey.toString())
            
            unirepState.addAttestation(secondUserEpochKey.toString(), attestationToAttester)
            unirepState.addAttestation(firstUserEpochKey.toString(), attestationToEpochKey)
            for(const user of users){
                user.updateAttestation(secondUserEpochKey, attestationToAttester.posRep, attestationToAttester.negRep)
                user.updateAttestation(firstUserEpochKey, attestationToEpochKey.posRep, attestationToEpochKey.negRep)
            }
            attestationsFromSecondAttester += 2
            epochKeys[firstUserEpochKey.toString()] = true
            epochKeys[fromEpochKey.toString()] = true
        })

        // it('first user leave a comment and generate epoch key', async () => {
        //     const epochKeyNonce = 1
        //     const epk = genEpochKey(users[firstUser].id.identityNullifier, currentEpoch.toNumber(), epochKeyNonce, circuitEpochTreeDepth).toString(16)

        //     // gen nullifier nonce list
        //     const proveKarmaAmount = DEFAULT_COMMENT_KARMA

        //     // gen minRep proof
        //     const minRep = 0

        //     const circuitInputs = await users[firstUser].genProveReputationNullifierCircuitInputs(
        //         epochKeyNonce,                       // generate epoch key from epoch nonce
        //         proveKarmaAmount,               // the amount of output karma nullifiers
        //         minRep                          // the amount of minimum reputation the user wants to prove
        //     )
        //     const results = await genVerifyReputationNullifierProofAndPublicSignals(stringifyBigInts(circuitInputs))

        //     const isValid = await verifyProveReputationNullifierProof(results['proof'], results['publicSignals'])
        //     expect(isValid, 'Verify reputation proof off-chain failed').to.be.true
            
        //     // Verify on-chain
        //     const proof = formatProofForVerifierContract(results['proof'])
        //     const epochKey = BigInt(add0x(epk))
        //     const nullifiers = results['publicSignals'].slice(0, maxKarmaBudget)
        //     const publicSignals = results['publicSignals'].slice(maxKarmaBudget+2)

        //     const firstUserEpochKey = genEpochKey(users[firstUser].id.identityNullifier, currentEpoch.toNumber(), epochKeyNonce, circuitEpochTreeDepth)
        //     const isProofValid = await unirepContract.verifyReputation(
        //         nullifiers,
        //         currentEpoch,
        //         epochKey,
        //         publicSignals,
        //         proof
        //     )
        //     console.log(`Verifying epk proof with epoch ${currentEpoch} and epk ${firstUserEpochKey}`)
        //     expect(isProofValid, 'Verify reputation proof on-chain failed').to.be.true

        //     const attestationToEpochKey = new Attestation(
        //         BigInt(unirepSocialId),
        //         BigInt(0),
        //         BigInt(DEFAULT_COMMENT_KARMA),
        //         BigInt(0),
        //         false,
        //     )
            
        //     const tx = await unirepContract.leaveComment(
        //         BigInt(add0x(postId)), 
        //         BigInt(add0x(commentId)),
        //         epochKey,
        //         commentText, 
        //         nullifiers,
        //         publicSignals, 
        //         proof,
        //         { value: attestingFee, gasLimit: 1000000 }
        //     )

        //     const receipt = await tx.wait()
        //     expect(receipt.status, 'Submit comment failed').to.equal(1)

        //     for (let i = 0; i < maxKarmaBudget; i++) {
        //         const modedNullifier = BigInt(nullifiers[i]) % BigInt(2 ** unirepState.nullifierTreeDepth)
        //         unirepState.addKarmaNullifiers(modedNullifier)
        //     }

        //     // User submit a comment through Unirep Social should be found in Unirep Social Events
        //     const commentFilter = unirepContract.filters.CommentSubmitted(currentEpoch, BigInt(add0x(postId)), epochKey)
        //     const commentEvents = await unirepContract.queryFilter(commentFilter)
        //     expect(commentEvents.length).to.equal(1)

        //     secondEpochEpochKeys.push(firstUserEpochKey.toString())
        //     unirepState.addAttestation(firstUserEpochKey.toString(), attestationToEpochKey)
        //     for(const user of users){
        //         user.updateAttestation(firstUserEpochKey, attestationToEpochKey.posRep, attestationToEpochKey.negRep)
        //     }
        //     attestationsFromUnirepSocial++
        //     epochKeys[epochKey.toString()] = true
        // })

        it('Attestations gathered from events should match', async () => {
            // First filter by epoch
            const attestationsByEpochFilter = unirepContract.filters.AttestationSubmitted(currentEpoch)
            const attestationsByEpochEvent = await unirepContract.queryFilter(attestationsByEpochFilter)
            const attestationNum = attestationsFromUnirepSocial + attestationsFromFirstAttester + attestationsFromSecondAttester
            expect(attestationsByEpochEvent.length, `Number of attestations submitted should be ${attestationNum}`).to.equal(attestationNum)

            // Second filter by attester
            for (let attester of attesters) {
                let attestationsByAttesterFilter = unirepContract.filters.AttestationSubmitted(null, null, attester['addr'])
                let attestationsByAttesterEvent = await unirepContract.queryFilter(attestationsByAttesterFilter)
                if (attester.id == attesters[firstAttester].id) {
                    expect(attestationsByAttesterEvent.length, `Number of attestations from first attester should be ${attestationsFromFirstAttester}`).to.equal(attestationsFromFirstAttester)
                } else if (attester.id == attesters[secondAttester].id) {
                    expect(attestationsByAttesterEvent.length, `Number of attestations from second attester should be ${attestationsFromSecondAttester}`).to.equal(attestationsFromSecondAttester)
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
            expect(epochKeys_.length, `Number of epoch keys last epoch should be ${Object.keys(epochKeys).length}`).to.equal(Object.keys(epochKeys).length)

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

            userStateTransitionedNum[currentEpoch.toNumber()] = []
        })

        it('First user transition from second epoch', async () => {
            const fromEpoch = users[firstUser].latestTransitionedEpoch
            const fromEpochGSTree: IncrementalQuinTree = unirepState.genGSTree(fromEpoch)
            const GSTreeRoot = fromEpochGSTree.root
            const fromEpochTree = await unirepState.genEpochTree(fromEpoch)
            const epochTreeRoot = fromEpochTree.getRootHash()
            const nullifierTreeRoot = (await unirepState.genNullifierTree()).getRootHash()
            const attestationNullifiers = users[firstUser].getAttestationNullifiers(fromEpoch)
            const epkNullifiers = users[0].getEpochKeyNullifiers(fromEpoch)
            console.log('Processing first user\'s transition: ')
            console.log(`from epoch ${fromEpoch}, GSTreeRoot ${GSTreeRoot}, epochTreeRoot ${epochTreeRoot}, nullifierTreeRoot ${nullifierTreeRoot}`)
            console.log(`and attestationNullifiers [${attestationNullifiers}]`)
            console.log(`and epkNullifiers [${epkNullifiers}]`)

            const circuitInputs = await users[firstUser].genUserStateTransitionCircuitInputs()
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
            const newState = await users[firstUser].genNewUserStateAfterTransition()
            expect(newGSTLeaf, 'Computed new GST leaf should match').to.equal(newState.newGSTLeaf)
            userStateLeavesAfterTransition[firstUser] = newState.newUSTLeaves
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
            userStateTransitionedNum[currentEpoch.toNumber()].push(newGSTLeaf)

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
            expect(stateTransitionByEpochEvent.length, `Number of state transition events current epoch should be ${userStateTransitionedNum[currentEpoch.toNumber()].length}`).to.equal(userStateTransitionedNum[currentEpoch.toNumber()].length)

            const stateTransitionArgs: any = stateTransitionByEpochEvent[0]['args']
            const newGSTLeaf: any = stateTransitionArgs['userTransitionedData']['newGlobalStateTreeLeaf']

            // Verify on-chain
            const isProofValid = await unirepContract.verifyUserStateTransition(
                stateTransitionArgs['userTransitionedData']['newGlobalStateTreeLeaf'],
                stateTransitionArgs['userTransitionedData']['attestationNullifiers'],
                stateTransitionArgs['userTransitionedData']['epkNullifiers'],
                stateTransitionArgs['userTransitionedData']['fromEpoch'],
                stateTransitionArgs['userTransitionedData']['fromGlobalStateTree'],
                defaultAirdroppedKarma,
                stateTransitionArgs['userTransitionedData']['fromEpochTree'],
                stateTransitionArgs['userTransitionedData']['proof'],
            )
            expect(isProofValid, 'Verify user state transition on-chain failed').to.be.true

            const attestationNullifiers = stateTransitionArgs['userTransitionedData']['attestationNullifiers'].map((n) => BigInt(n))
            const epkNullifiers = stateTransitionArgs['userTransitionedData']['epkNullifiers'].map((n) => BigInt(n))
            // Combine nullifiers and mod them
            const allNullifiers = attestationNullifiers.concat(epkNullifiers).map((nullifier) => BigInt(nullifier) % BigInt(2 ** circuitNullifierTreeDepth))

            const latestUserStateLeaves = userStateLeavesAfterTransition[firstUser]
            users[firstUser].transition(latestUserStateLeaves)
            console.log(`First user finish state transition. AttesterIds in UST: [${latestUserStateLeaves.map((l) => l.attesterId.toString())}]`)
            expect(users[0].latestTransitionedEpoch, 'First user should transition to current epoch').to.equal(currentEpoch.toNumber())

            unirepState.userStateTransition(currentEpoch.toNumber(), BigInt(newGSTLeaf), allNullifiers)
            console.log('User state transition off-chain: ')
            console.log(`newGSTLeaf ${BigInt(newGSTLeaf)}, attestation attestationNullifiers [${attestationNullifiers}] and epk nullifier ${epkNullifiers}`)
            console.log('----------------------User State----------------------')
            console.log(users[firstUser].toJSON(4))
            console.log('------------------------------------------------------')

            // User state transition through Unirep Social should be found in Unirep Social Events
            const userStateTransitionFilter = unirepContract.filters.UserStateTransitioned(currentEpoch)
            const userStateTransitionEvents = await unirepContract.queryFilter(userStateTransitionFilter)
            let foundIdx = false
            for (let i = 0; i < userStateTransitionEvents.length; i++) {
                if(userStateTransitionEvents[i]?.args?._leafIndex.eq(stateTransitionArgs['_leafIndex'])) foundIdx = true
            }
            expect(foundIdx).to.be.true
        })

        it('First user prove his reputation', async () => {
            const attesterId = attesters[secondAttester].id  // Prove reputation received from first attester
            const provePosRep = BigInt(1)
            const proveNegRep = BigInt(1)
            const proveRepDiff = BigInt(1)
            const proveGraffiti = BigInt(1)
            const minPosRep = BigInt(1)
            const maxNegRep = BigInt(10)
            const minRepDiff = BigInt(0)
            const graffitiPreImage = graffitiPreImageMap[0][attesterId.toString()]
            console.log(`Proving reputation from attester ${attesterId} with minPosRep ${minPosRep}, maxNegRep ${maxNegRep} and graffitiPreimage ${graffitiPreImage}`)
            const circuitInputs = await users[firstUser].genProveReputationCircuitInputs(attesterId, provePosRep, proveNegRep, proveRepDiff, proveGraffiti, minPosRep, maxNegRep, minRepDiff, graffitiPreImage)
            const startTime = new Date().getTime()
            const results = await genVerifyReputationProofAndPublicSignals(stringifyBigInts(circuitInputs))
            const endTime = new Date().getTime()
            console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            const isValid = await verifyProveReputationProof(results['proof'], results['publicSignals'])
            expect(isValid, 'Verify reputation proof off-chain failed').to.be.true

            // Verify on-chain
            const GSTreeRoot = unirepState.genGSTree(currentEpoch.toNumber()).root
            const nullifierTree = await unirepState.genNullifierTree()
            const nullifierTreeRoot = nullifierTree.getRootHash()
            const publicInput = [
                provePosRep,
                proveNegRep,
                proveRepDiff,
                proveGraffiti,
                minRepDiff,
                minPosRep,
                maxNegRep,
                graffitiPreImage
            ]
            const isProofValid = await unirepContract.verifyReputation(
                users[firstUser].latestTransitionedEpoch,
                GSTreeRoot,
                nullifierTreeRoot,
                attesterId,
                publicInput,
                formatProofForVerifierContract(results['proof']),
            )
            expect(isProofValid, 'Verify reputation on-chain failed').to.be.true
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
                users[firstUser].id,
                users[firstUser].commitment,
            )

            // Check user state matches
            expect(users[firstUser].latestTransitionedEpoch, 'First user latest transitioned epoch mismatch').to.equal(userStateFromContract.latestTransitionedEpoch)
            expect(users[firstUser].latestGSTLeafIndex, 'First user latest GST leaf index mismatch').to.equal(userStateFromContract.latestGSTLeafIndex)
            expect((await users[firstUser].genUserStateTree()).getRootHash(), 'First user UST mismatch').to.equal((await userStateFromContract.genUserStateTree()).getRootHash())

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