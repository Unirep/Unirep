import { ethers as hardhatEthers } from 'hardhat'
import { BigNumber, ethers } from 'ethers'
import chai from "chai"
import { attestingFee, circuitEpochTreeDepth, circuitGlobalStateTreeDepth, circuitNullifierTreeDepth, circuitUserStateTreeDepth, epochLength, numEpochKeyNoncePerEpoch} from '../../config/testLocal'
import { genIdentity, genIdentityCommitment } from 'libsemaphore'
import { IncrementalQuinTree, genRandomSalt, stringifyBigInts, hashLeftRight, hashOne } from 'maci-crypto'
import { deployUnirep, genEpochKey, computeEmptyUserStateRoot, getTreeDepthsForTesting } from '../../core/utils'
import { toCompleteHexString } from '../utils'

const { expect } = chai

import { Attestation, IAttestation, IEpochTreeLeaf, IUserStateLeaf, UnirepState, UserState, genUserStateFromContract } from "../../core"
import { compileAndLoadCircuit, formatProofForVerifierContract, genProofAndPublicSignals, getSignalByNameViaSym, verifyProof } from "../../circuits/utils"

describe('Integration', function () {
    this.timeout(1000000)

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
    let unirepContractCalledByFirstAttester, unirepContractCalledBySecondAttester

    let prevEpoch: ethers.BigNumber
    let currentEpoch: ethers.BigNumber
    let emptyUserStateRoot: BigInt
    let blankGSLeaf: BigInt
    let userStateTransitionedNum: {[key: number]: ethers.BigNumber[]} = {}
    let epochKeys: {[key: string]: boolean} = {}

    let accounts: ethers.Signer[]

    let duplicatedProofInputs

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        const _treeDepths = getTreeDepthsForTesting("circuit")
        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], _treeDepths)

        currentEpoch = await unirepContract.currentEpoch()
        emptyUserStateRoot = computeEmptyUserStateRoot(circuitUserStateTreeDepth)
        blankGSLeaf = hashLeftRight(BigInt(0), emptyUserStateRoot)

        unirepState = new UnirepState(
            circuitGlobalStateTreeDepth,
            circuitUserStateTreeDepth,
            circuitEpochTreeDepth,
            circuitNullifierTreeDepth,
            attestingFee,
            epochLength,
            numEpochKeyNoncePerEpoch,
        )
    })

    describe('First epoch', () => {
        it('First user signs up', async () => {
            const id = genIdentity()
            const commitment = genIdentityCommitment(id)

            const tx = await unirepContract.userSignUp(commitment)
            const receipt = await tx.wait()
            expect(receipt.status, 'User sign up failed').to.equal(1)

            const hashedStateLeaf = await unirepContract.hashStateLeaf([commitment, emptyUserStateRoot])
            unirepState.signUp(currentEpoch.toNumber(), BigInt(hashedStateLeaf))
            users[firstUser] = new UserState(
                unirepState,
                id,
                commitment,
                false,
            )
            const latestTransitionedToEpoch = currentEpoch.toNumber()
            const GSTreeLeafIndex = 0
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
            unirepContractCalledByFirstAttester = unirepContract.connect(attesters[firstAttester]['acct'])

            const tx = await unirepContractCalledByFirstAttester.attesterSignUp()
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
            const epkNullifiers = users[firstUser].getEpochKeyNullifiers(fromEpoch)
            console.log('Processing first user\'s transition: ')
            console.log(`from epoch ${fromEpoch}, GSTreeRoot ${GSTreeRoot}, epochTreeRoot ${epochTreeRoot}, nullifierTreeRoot ${nullifierTreeRoot}`)
            console.log(`and epkNullifiers [${epkNullifiers}]`)

            const circuitInputs = await users[firstUser].genUserStateTransitionCircuitInputs()
            let results = await genProofAndPublicSignals('startTransition', circuitInputs.startTransitionProof)
            let isValid = await verifyProof('startTransition', results['proof'], results['publicSignals'])
            expect(isValid, 'Verify start transition circuit off-chain failed').to.be.true

            const blindedUserState = results['publicSignals'][0]
            const blindedHashChain = results['publicSignals'][1]
            let tx = await unirepContract.startUserStateTransition(
                blindedUserState,
                blindedHashChain,
                GSTreeRoot,
                formatProofForVerifierContract(results['proof']),
            )
            let receipt = await tx.wait()
            expect(receipt.status, 'Submit user state transition proof failed').to.equal(1)

            for (let i = 0; i < circuitInputs.processAttestationProof.length; i++) {
                results = await genProofAndPublicSignals('processAttestations', circuitInputs.processAttestationProof[i])
                isValid = await verifyProof('processAttestations', results['proof'], results['publicSignals'])
                expect(isValid, 'Verify process attestations circuit off-chain failed').to.be.true

                const outputBlindedUserState = results['publicSignals'][0]
                const outputBlindedHashChain = results['publicSignals'][1]
                const inputBlindedUserState = results['publicSignals'][2]

                tx = await unirepContract.processAttestations(
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    inputBlindedUserState,
                    formatProofForVerifierContract(results['proof']),
                )
                receipt = await tx.wait()
                expect(receipt.status, 'Submit process attestations proof failed').to.equal(1)
            }

            results = await genProofAndPublicSignals('userStateTransition', circuitInputs.finalTransitionProof)
            isValid = await verifyProof('userStateTransition', results['proof'], results['publicSignals'])
            expect(isValid, 'Verify user state transition circuit off-chain failed').to.be.true
            const newGSTLeaf = getSignalByNameViaSym('userStateTransition', results['witness'], 'main.new_GST_leaf')

            const outputEpkNullifiers = results['publicSignals'].slice(1,1 + numEpochKeyNoncePerEpoch)
            const blindedUserStates = results['publicSignals'].slice(2 + numEpochKeyNoncePerEpoch,2 + 2 * numEpochKeyNoncePerEpoch)
            const blindedHashChains = results['publicSignals'].slice(3 + 2*numEpochKeyNoncePerEpoch,3 + 3*numEpochKeyNoncePerEpoch)

            // Verify nullifiers outputted by circuit are the same as the ones computed off-chain
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
            userStateTransitionedNum[currentEpoch.toNumber()].push(newGSTLeaf)

            tx = await unirepContract.updateUserStateRoot(
                newGSTLeaf,
                outputEpkNullifiers,
                blindedUserStates,
                blindedHashChains,
                fromEpoch,
                GSTreeRoot,
                epochTreeRoot,
                formatProofForVerifierContract(results['proof']),
            )
            receipt = await tx.wait()
            expect(receipt.status, 'Submit user state transition proof failed').to.equal(1)
        })

        it('Verify state transition of first user\'s epoch transition', async () => {
            const stateTransitionByEpochFilter = unirepContract.filters.UserStateTransitioned(currentEpoch)
            const stateTransitionByEpochEvent = await unirepContract.queryFilter(stateTransitionByEpochFilter)
            expect(stateTransitionByEpochEvent.length, `Number of state transition events current epoch should be ${userStateTransitionedNum[currentEpoch.toNumber()].length}`).to.equal(userStateTransitionedNum[currentEpoch.toNumber()].length)

            const stateTransitionArgs: any = stateTransitionByEpochEvent[0]['args']

            // Verify on-chain
            const isProofValid = await unirepContract.verifyUserStateTransition(
                stateTransitionArgs['userTransitionedData']['newGlobalStateTreeLeaf'],
                stateTransitionArgs['userTransitionedData']['epkNullifiers'],
                stateTransitionArgs['userTransitionedData']['fromEpoch'],
                stateTransitionArgs['userTransitionedData']['blindedUserStates'],
                stateTransitionArgs['userTransitionedData']['fromGlobalStateTree'],
                stateTransitionArgs['userTransitionedData']['blindedHashChains'],
                stateTransitionArgs['userTransitionedData']['fromEpochTree'],
                stateTransitionArgs['userTransitionedData']['proof'],
            )
            expect(isProofValid, 'Verify user state transition on-chain failed').to.be.true
            
            const epkNullifiers = stateTransitionArgs['userTransitionedData']['epkNullifiers'].map((n) => BigInt(n) % BigInt(2 ** circuitNullifierTreeDepth))

            const latestUserStateLeaves = userStateLeavesAfterTransition[firstUser]  // Leaves should be empty as no reputations are given yet
            users[firstUser].transition(latestUserStateLeaves)
            console.log(`First user finish state transition. AttesterIds in UST: [${latestUserStateLeaves.map((l) => l.attesterId.toString())}]`)
            expect(users[firstUser].latestTransitionedEpoch, 'First user should transition to current epoch').to.equal(currentEpoch.toNumber())

            unirepState.userStateTransition(currentEpoch.toNumber(), BigInt(stateTransitionArgs['userTransitionedData']['newGlobalStateTreeLeaf']), epkNullifiers)
            console.log('User state transition off-chain: ')
            console.log(`newGSTLeaf ${BigInt(stateTransitionArgs['userTransitionedData']['newGlobalStateTreeLeaf'])} and epk nullifier ${epkNullifiers}`)
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

            const tx = await unirepContract.userSignUp(commitment)
            const receipt = await tx.wait()
            expect(receipt.status, 'User sign up failed').to.equal(1)

            const hashedStateLeaf = await unirepContract.hashStateLeaf([commitment, emptyUserStateRoot])
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
            unirepContractCalledBySecondAttester = unirepContract.connect(attesters[secondAttester]['acct'])
            const message = ethers.utils.solidityKeccak256(["address", "address"], [attesters[secondAttester]['addr'], unirepContract.address])
            attesterSigs[secondAttester] = await attesters[secondAttester]['acct'].signMessage(ethers.utils.arrayify(message))
            const tx = await unirepContractCalledBySecondAttester.attesterSignUp()
            const receipt = await tx.wait()
            expect(receipt.status, 'Attester sign up failed').to.equal(1)

            attesters[secondAttester].id = BigInt(await unirepContract.attesters(attesters[secondAttester]['addr']))
            console.log(`First attester signs up, attester id: ${attesters[secondAttester].id}`)
        })

        it('Verify epoch key of first user', async () => {
            const epochKeyNonce = 0
            const circuitInputs = await users[firstUser].genVerifyEpochKeyCircuitInputs(epochKeyNonce)
            const results = await genProofAndPublicSignals('verifyEpochKey', stringifyBigInts(circuitInputs))
            const isValid = await verifyProof('verifyEpochKey', results['proof'], results['publicSignals'])
            expect(isValid, 'Verify epk proof off-chain failed').to.be.true
            
            // Verify on-chain
            const GSTree = unirepState.genGSTree(currentEpoch.toNumber())
            const firstUserEpochKey = genEpochKey(users[firstUser].id.identityNullifier, currentEpoch.toNumber(), epochKeyNonce, circuitEpochTreeDepth)
            const isProofValid = await unirepContract.verifyEpochKeyValidity(
                GSTree.root,
                currentEpoch,
                firstUserEpochKey,
                formatProofForVerifierContract(results['proof']),
            )
            console.log(`Verifying epk proof with GSTreeRoot ${GSTree.root}, epoch ${currentEpoch} and epk ${firstUserEpochKey}`)
            expect(isProofValid, 'Verify epk proof on-chain failed').to.be.true
        })

        it('First attester attest to first user\'s first epoch key', async () => {
            const nonce = 0
            const firstUserEpochKey = genEpochKey(users[firstUser].id.identityNullifier, currentEpoch.toNumber(), nonce, circuitEpochTreeDepth)
            const graffitiPreImage = genRandomSalt()
            const attestation: Attestation = new Attestation(
                attesters[firstAttester].id,
                BigInt(3),
                BigInt(1),
                hashOne(graffitiPreImage),
            )
            // Add graffiti pre-image to graffitiPreImageMap
            graffitiPreImageMap[firstUser] = new Object()
            graffitiPreImageMap[firstUser][attestation.attesterId.toString()] = graffitiPreImage
            console.log(`Attester attest to epk ${firstUserEpochKey} with ${attestation.toJSON()}`)
            const tx = await unirepContractCalledByFirstAttester.submitAttestation(
                attestation,
                firstUserEpochKey,
                { value: attestingFee }
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit attestation failed').to.equal(1)

            secondEpochEpochKeys.push(firstUserEpochKey.toString())
            epochKeys[firstUserEpochKey.toString()] = true
            attestationsFromFirstAttester ++
            unirepState.addAttestation(firstUserEpochKey.toString(), attestation)
        })

        it('First attester attest to first user\'s second epoch key', async () => {
            const nonce = 1
            const firstUserEpochKey = genEpochKey(users[firstUser].id.identityNullifier, currentEpoch.toNumber(), nonce, circuitEpochTreeDepth)
            const graffitiPreImage = genRandomSalt()
            const attestation: Attestation = new Attestation(
                attesters[firstAttester].id,
                BigInt(5),
                BigInt(1),
                hashOne(graffitiPreImage),
            )
            // update graffiti pre-image in graffitiPreImageMap
            graffitiPreImageMap[firstUser][attestation.attesterId.toString()] = graffitiPreImage
            console.log(`Attester attest to epk ${firstUserEpochKey} with ${attestation.toJSON()}`)
            const tx = await unirepContractCalledByFirstAttester.submitAttestation(
                attestation,
                firstUserEpochKey,
                { value: attestingFee }
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit attestation failed').to.equal(1)

            secondEpochEpochKeys.push(firstUserEpochKey.toString())
            epochKeys[firstUserEpochKey.toString()] = true
            attestationsFromFirstAttester ++
            unirepState.addAttestation(firstUserEpochKey.toString(), attestation)
        })

        it('Second attester attest to first user', async () => {
            const nonce = 0
            const firstUserEpochKey = genEpochKey(users[firstUser].id.identityNullifier, currentEpoch.toNumber(), nonce, circuitEpochTreeDepth)
            const graffitiPreImage = genRandomSalt()
            const attestation: Attestation = new Attestation(
                attesters[secondAttester].id,
                BigInt(3),
                BigInt(1),
                hashOne(graffitiPreImage),
            )
            // Add graffiti pre-image to graffitiPreImageMap
            graffitiPreImageMap[firstUser][attestation.attesterId.toString()] = graffitiPreImage
            console.log(`Attester attest to epk ${firstUserEpochKey} with ${attestation.toJSON()}`)
            const tx = await unirepContractCalledBySecondAttester.submitAttestation(
                attestation,
                firstUserEpochKey,
                { value: attestingFee }
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit attestation failed').to.equal(1)

            attestationsFromSecondAttester ++
            unirepState.addAttestation(firstUserEpochKey.toString(), attestation)
        })

        it('Verify epoch key of second user', async () => {
            const epochKeyNonce = 0
            const circuitInputs = await users[secondUser].genVerifyEpochKeyCircuitInputs(epochKeyNonce)
            const results = await genProofAndPublicSignals('verifyEpochKey', stringifyBigInts(circuitInputs))
            const isValid = await verifyProof('verifyEpochKey', results['proof'], results['publicSignals'])
            expect(isValid, 'Verify epk proof off-chain failed').to.be.true
            
            // Verify on-chain
            const GSTree = unirepState.genGSTree(currentEpoch.toNumber())
            const secondUserEpochKey = genEpochKey(users[secondUser].id.identityNullifier, currentEpoch.toNumber(), epochKeyNonce, circuitEpochTreeDepth)
            const isProofValid = await unirepContract.verifyEpochKeyValidity(
                GSTree.root,
                currentEpoch,
                secondUserEpochKey,
                formatProofForVerifierContract(results['proof']),
            )
            console.log(`Verifying epk proof with GSTreeRoot ${GSTree.root}, epoch ${currentEpoch} and epk ${secondUserEpochKey}`)
            expect(isProofValid, 'Verify epk proof on-chain failed').to.be.true
        })

        it('First attester attest to second user', async () => {
            const nonce = 0
            const secondUserEpochKey = genEpochKey(users[secondUser].id.identityNullifier, currentEpoch.toNumber(), nonce, circuitEpochTreeDepth)
            const graffitiPreImage = genRandomSalt()
            const attestation: Attestation = new Attestation(
                attesters[firstAttester].id,
                BigInt(2),
                BigInt(6),
                hashOne(graffitiPreImage),
            )
            // Add graffiti pre-image to graffitiPreImageMap
            graffitiPreImageMap[secondUser] = new Object()
            graffitiPreImageMap[secondUser][attestation.attesterId.toString()] = graffitiPreImage
            console.log(`Attester attest to epk ${secondUserEpochKey} with ${attestation.toJSON()}`)
            const tx = await unirepContractCalledByFirstAttester.submitAttestation(
                attestation,
                secondUserEpochKey,
                { value: attestingFee }
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit attestation failed').to.equal(1)

            secondEpochEpochKeys.push(secondUserEpochKey.toString())
            epochKeys[secondUserEpochKey.toString()] = true
            attestationsFromFirstAttester ++
            unirepState.addAttestation(secondUserEpochKey.toString(), attestation)
        })

        it('Second attester attest to second user', async () => {
            const nonce = 0
            const secondUserEpochKey = genEpochKey(users[secondUser].id.identityNullifier, currentEpoch.toNumber(), nonce, circuitEpochTreeDepth)
            const graffitiPreImage = genRandomSalt()
            const attestation: Attestation = new Attestation(
                attesters[secondAttester].id,
                BigInt(0),
                BigInt(3),
                hashOne(graffitiPreImage),
            )
            // Add graffiti pre-image to graffitiPreImageMap
            graffitiPreImageMap[secondUser][attestation.attesterId.toString()] = graffitiPreImage
            console.log(`Attester attest to epk ${secondUserEpochKey} with ${attestation.toJSON()}`)
            const tx = await unirepContractCalledBySecondAttester.submitAttestation(
                attestation,
                secondUserEpochKey,
                { value: attestingFee }
            )
            const receipt = await tx.wait()
            expect(receipt.status, 'Submit attestation failed').to.equal(1)

            attestationsFromSecondAttester ++
            unirepState.addAttestation(secondUserEpochKey.toString(), attestation)
        })

        it('Attestations gathered from events should match', async () => {
            // First filter by epoch
            const attestationsByEpochFilter = unirepContract.filters.AttestationSubmitted(currentEpoch)
            const attestationsByEpochEvent = await unirepContract.queryFilter(attestationsByEpochFilter)
            const attestationNum = attestationsFromFirstAttester + attestationsFromSecondAttester
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
            const epkNullifiers = users[firstUser].getEpochKeyNullifiers(fromEpoch)
            console.log('Processing first user\'s transition: ')
            console.log(`from epoch ${fromEpoch}, GSTreeRoot ${GSTreeRoot}, epochTreeRoot ${epochTreeRoot}, nullifierTreeRoot ${nullifierTreeRoot}`)
            console.log(`and epkNullifiers [${epkNullifiers}]`)

            const circuitInputs = await users[firstUser].genUserStateTransitionCircuitInputs()
            let results = await genProofAndPublicSignals('startTransition', circuitInputs.startTransitionProof)
            let isValid = await verifyProof('startTransition', results['proof'], results['publicSignals'])
            expect(isValid, 'Verify start transition circuit off-chain failed').to.be.true

            const blindedUserState = results['publicSignals'][0]
            const blindedHashChain = results['publicSignals'][1]

            let tx = await unirepContract.startUserStateTransition(
                blindedUserState,
                blindedHashChain,
                GSTreeRoot,
                formatProofForVerifierContract(results['proof']),
            )
            let receipt = await tx.wait()
            expect(receipt.status, 'Submit user state transition proof failed').to.equal(1)

            for (let i = 0; i < circuitInputs.processAttestationProof.length; i++) {
                results = await genProofAndPublicSignals('processAttestations', circuitInputs.processAttestationProof[i])
                isValid = await verifyProof('processAttestations', results['proof'], results['publicSignals'])
                expect(isValid, 'Verify process attestations circuit off-chain failed').to.be.true

                const outputBlindedUserState = results['publicSignals'][0]
                const outputBlindedHashChain = results['publicSignals'][1]
                const inputBlindedUserState = results['publicSignals'][2]

                tx = await unirepContract.processAttestations(
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    inputBlindedUserState,
                    formatProofForVerifierContract(results['proof']),
                )
                receipt = await tx.wait()
                expect(receipt.status, 'Submit process attestations proof failed').to.equal(1)
            }

            results = await genProofAndPublicSignals('userStateTransition', circuitInputs.finalTransitionProof)
            isValid = await verifyProof('userStateTransition', results['proof'], results['publicSignals'])
            expect(isValid, 'Verify user state transition circuit off-chain failed').to.be.true
            const newGSTLeaf = getSignalByNameViaSym('userStateTransition', results['witness'], 'main.new_GST_leaf')

            const outputEpkNullifiers = results['publicSignals'].slice(1,1 + numEpochKeyNoncePerEpoch)
            const blindedUserStates = results['publicSignals'].slice(2 + numEpochKeyNoncePerEpoch,2 + 2 * numEpochKeyNoncePerEpoch)
            const blindedHashChains = results['publicSignals'].slice(3 + 2*numEpochKeyNoncePerEpoch,3 + 3*numEpochKeyNoncePerEpoch)

            // Verify nullifiers outputted by circuit are the same as the ones computed off-chain
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
            userStateTransitionedNum[currentEpoch.toNumber()].push(newGSTLeaf)

            tx = await unirepContract.updateUserStateRoot(
                newGSTLeaf,
                outputEpkNullifiers,
                blindedUserStates,
                blindedHashChains,
                fromEpoch,
                GSTreeRoot,
                epochTreeRoot,
                formatProofForVerifierContract(results['proof']),
            )
            receipt = await tx.wait()
            expect(receipt.status, 'Submit user state transition proof failed').to.equal(1)

            // Record state transition proof inputs to be used to submit duplicated proof
            duplicatedProofInputs = {
                "newGSTLeaf": newGSTLeaf,
                "epkNullifiers": outputEPKNullifiers,
                "blindedUserStates": blindedUserStates,
                "blindedHashChains": blindedHashChains,
                "fromEpoch": fromEpoch,
                "GSTreeRoot": GSTreeRoot,
                "epochTreeRoot": epochTreeRoot,
                "proof": formatProofForVerifierContract(results['proof']),
            }
        })

        it('Verify state transition of first user\'s epoch transition', async () => {
            const stateTransitionByEpochFilter = unirepContract.filters.UserStateTransitioned(currentEpoch)
            const stateTransitionByEpochEvent = await unirepContract.queryFilter(stateTransitionByEpochFilter)
            expect(stateTransitionByEpochEvent.length, `Number of state transition events current epoch should be ${userStateTransitionedNum[currentEpoch.toNumber()].length}`).to.equal(userStateTransitionedNum[currentEpoch.toNumber()].length)

            const stateTransitionArgs: any = stateTransitionByEpochEvent[0]['args']

            // Verify on-chain
            const isProofValid = await unirepContract.verifyUserStateTransition(
                stateTransitionArgs['userTransitionedData']['newGlobalStateTreeLeaf'],
                stateTransitionArgs['userTransitionedData']['epkNullifiers'],
                stateTransitionArgs['userTransitionedData']['fromEpoch'],
                stateTransitionArgs['userTransitionedData']['blindedUserStates'],
                stateTransitionArgs['userTransitionedData']['fromGlobalStateTree'],
                stateTransitionArgs['userTransitionedData']['blindedHashChains'],
                stateTransitionArgs['userTransitionedData']['fromEpochTree'],
                stateTransitionArgs['userTransitionedData']['proof'],
            )
            expect(isProofValid, 'Verify user state transition on-chain failed').to.be.true
            
            const epkNullifiers = stateTransitionArgs['userTransitionedData']['epkNullifiers'].map((n) => BigInt(n) % BigInt(2 ** circuitNullifierTreeDepth))

            const latestUserStateLeaves = userStateLeavesAfterTransition[firstUser]  // Leaves should be empty as no reputations are given yet
            users[firstUser].transition(latestUserStateLeaves)
            console.log(`First user finish state transition. AttesterIds in UST: [${latestUserStateLeaves.map((l) => l.attesterId.toString())}]`)
            expect(users[firstUser].latestTransitionedEpoch, 'First user should transition to current epoch').to.equal(currentEpoch.toNumber())

            unirepState.userStateTransition(currentEpoch.toNumber(), BigInt(stateTransitionArgs['userTransitionedData']['newGlobalStateTreeLeaf']), epkNullifiers)
            console.log('User state transition off-chain: ')
            console.log(`newGSTLeaf ${BigInt(stateTransitionArgs['userTransitionedData']['newGlobalStateTreeLeaf'])} and epk nullifier ${epkNullifiers}`)
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
            const attesterId = attesters[firstAttester].id  // Prove reputation received from first attester
            const provePosRep = BigInt(1)
            const proveNegRep = BigInt(1)
            const proveRepDiff = BigInt(0)
            const proveGraffiti = BigInt(1)
            const minPosRep = BigInt(7)
            const maxNegRep = BigInt(10)
            const minRepDiff = BigInt(0)
            const graffitiPreImage = graffitiPreImageMap[firstUser][attesterId.toString()]
            console.log(`Proving reputation from attester ${attesterId} with minPosRep ${minPosRep}, maxNegRep ${maxNegRep} and graffitiPreimage ${graffitiPreImage}`)
            const circuitInputs = await users[firstUser].genProveReputationCircuitInputs(attesterId, provePosRep, proveNegRep, proveRepDiff, proveGraffiti, minPosRep, maxNegRep, minRepDiff, graffitiPreImage)
            const startTime = new Date().getTime()
            const results = await genProofAndPublicSignals('proveReputation', stringifyBigInts(circuitInputs))
            const endTime = new Date().getTime()
            console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            const isValid = await verifyProof('proveReputation', results['proof'], results['publicSignals'])
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
                duplicatedProofInputs["epkNullifiers"],
                duplicatedProofInputs["blindedUserStates"],
                duplicatedProofInputs["blindedHashChains"],
                duplicatedProofInputs["fromEpoch"],
                duplicatedProofInputs["GSTreeRoot"],
                duplicatedProofInputs["epochTreeRoot"],
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