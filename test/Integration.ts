import { ethers } from "@nomiclabs/buidler"
import { BigNumber, Contract, Signer, Wallet } from "ethers"
import chai from "chai"
import { solidity } from "ethereum-waffle"
import { attestingFee, epochLength, epochTreeDepth, globalStateTreeDepth, maxEpochKeyNonce, nullifierTreeDepth, numAttestationsPerBatch} from '../config/testLocal'
import { genIdentity, genIdentityCommitment } from 'libsemaphore'
import { IncrementalQuinTree, SnarkBigInt, genRandomSalt } from 'maci-crypto'
import { deployUnirep, getNewSMT, genNoAttestationNullifierKey, genNoAttestationNullifierValue, genStubEPKProof, genEpochKey, toCompleteHexString, computeNullifier } from './utils'

chai.use(solidity)
const { expect } = chai

import OneTimeSparseMerkleTree from '../artifacts/OneTimeSparseMerkleTree.json'
import Unirep from "../artifacts/Unirep.json"
import { BigNumber as smtBN, SparseMerkleTreeImpl, hexStrToBuf, bufToHexString } from "../crypto/SMT"

const genStubUserStateTransitionProof = genStubEPKProof

describe('Integration', () => {
    let users = new Array(2)
    let epochKeyToAttestationsMap = {}

    let attesters = new Array(2)
    let unirepContractCalledByFisrtAttester, unirepContractCalledBySecondAttester

    let unirepContract: Contract
    let prevEpoch: BigNumber
    let currentEpoch: BigNumber
    let GSTrees: {[key: string]: IncrementalQuinTree} = {}  // epoch -> GSTree
    let blankGSLeaf: SnarkBigInt, emptyUserStateRoot: SnarkBigInt
    let epochTrees: {[key: string]: SparseMerkleTreeImpl} = {}  // epoch -> epochTree
    let nullifierTree : SparseMerkleTreeImpl
    
    let accounts: Signer[]
    
    before(async () => {
        accounts = await ethers.getSigners()

        unirepContract = await deployUnirep(<Wallet>accounts[0])
        emptyUserStateRoot = await unirepContract.emptyUserStateRoot()
        currentEpoch = await unirepContract.currentEpoch()

        blankGSLeaf = await unirepContract.hashedBlankStateLeaf()
        GSTrees[currentEpoch.toString()] = new IncrementalQuinTree(globalStateTreeDepth, blankGSLeaf, 2)

        nullifierTree = await getNewSMT(nullifierTreeDepth)
    })

    describe('First epoch', () => {
        it('First user signs up', async () => {
            const id = genIdentity()
            const commitment = genIdentityCommitment(id)
            users[0] = new Object()
            users[0]['id'] = id
            users[0]['commitment'] = commitment

            const tx = await unirepContract.userSignUp(commitment)
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)

            users[0]['userStateRoot'] = emptyUserStateRoot
            const hashedStateLeaf = await unirepContract.hashStateLeaf(
                [
                    commitment.toString(),
                    emptyUserStateRoot.toString()
                ]
            )
            GSTrees[currentEpoch.toString()].insert(hashedStateLeaf)
            users[0]['latestTransitionedToEpoch'] = currentEpoch.toString()
        })

        it('First attester signs up', async () => {
            attesters[0] = new Object()
            attesters[0]['acct'] = accounts[1]
            attesters[0]['addr'] = await attesters[0]['acct'].getAddress()
            unirepContractCalledByFisrtAttester = await ethers.getContractAt(Unirep.abi, unirepContract.address, attesters[0]['acct'])

            const tx = await unirepContractCalledByFisrtAttester.attesterSignUp()
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)

            attesters[0]['id'] = await unirepContract.attesters(attesters[0]['addr'])
        })

        it('Global state tree built from events should match', async () => {
            const newLeafFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
            const newLeafEvents = await unirepContract.queryFilter(newLeafFilter)
            const newLeaves: any[] = newLeafEvents.map((event: any) => event['args']['_hashedLeaf'])
            let observedGST = new IncrementalQuinTree(globalStateTreeDepth, blankGSLeaf, 2)
            for(let leaf of newLeaves) {
                await observedGST.insert(leaf)
            }
            expect(observedGST.root).to.be.equal(GSTrees[currentEpoch.toString()].root)
        })
    })

    // No attestations made during first epoch
    // First user transitioned from epoch with no attestations

    describe('Second epoch', () => {
        it('begin first epoch epoch transition', async () => {
            prevEpoch = currentEpoch
            // Fast-forward epochLength of seconds
            await ethers.provider.send("evm_increaseTime", [epochLength])
            // Begin epoch transition
            let tx = await unirepContract.beginEpochTransition()
            let receipt = await tx.wait()
            expect(receipt.status).equal(1)
            console.log("Gas cost of epoch transition:", receipt.gasUsed.toString())

            epochTrees[prevEpoch.toString()] = await getNewSMT(epochTreeDepth)

            currentEpoch = await unirepContract.currentEpoch()
            expect(currentEpoch).equal(2)
        })

        it('Epoch tree built from events should match', async () => {
            const epochEndedFilter = unirepContract.filters.EpochEnded(prevEpoch)
            const epochEndedEvent: any = (await unirepContract.queryFilter(epochEndedFilter))[0]
            const epochTreeAddr = epochEndedEvent['args']['_epochTreeAddr']

            // No attestations made in previoud epoch so epoch tree root should be 0
            expect(epochTreeAddr).to.be.equal(ethers.utils.hexZeroPad("0x", 20))
        })

        it('First user transition from first epoch', async () => {
            const firstUserTransitionedFromEpoch = users[0]['latestTransitionedToEpoch']
            let oldNullifierTreeRoot = nullifierTree.getRootHash()
            const zeroNullifiers: number[] = []
            for (let i = 0; i < numAttestationsPerBatch; i++) {
                zeroNullifiers[i] = 0
            }

            const hashedStateLeaf = await unirepContract.hashStateLeaf(
                [
                    users[0]['commitment'].toString(),
                    users[0]['userStateRoot'].toString()
                ]
            )

            const epochKeyNonce = 0
            let tx = await unirepContract.updateUserStateRoot(
                firstUserTransitionedFromEpoch,
                GSTrees[firstUserTransitionedFromEpoch].root,
                epochTrees[firstUserTransitionedFromEpoch].getRootHash(),
                oldNullifierTreeRoot,
                hashedStateLeaf,
                genNoAttestationNullifierKey(users[0]['id']['identityNullifier'], currentEpoch.toNumber(), epochKeyNonce, nullifierTreeDepth),
                zeroNullifiers,
                genStubUserStateTransitionProof(true),
            )
            let receipt = await tx.wait()
            expect(receipt.status).equal(1)
        })

        it('Verify state transition of first user', async () => {
            const stateTransitionByEpochFilter = unirepContract.filters.UserStateTransitioned(null, currentEpoch)
            const stateTransitionByEpochEvent = await unirepContract.queryFilter(stateTransitionByEpochFilter)
            expect(stateTransitionByEpochEvent.length).to.be.equal(1)

            const newGSTLeafByEpochFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
            const newGSTLeafByEpochEvent = await unirepContract.queryFilter(newGSTLeafByEpochFilter)
            expect(newGSTLeafByEpochEvent.length).to.be.equal(1)

            const stateTransitionArgs: any = stateTransitionByEpochEvent[0]['args']
            const newGSTLeafArgs: any = newGSTLeafByEpochEvent[0]['args']

            const isProofValid = await unirepContract.verifyUserStateTransition(
                stateTransitionArgs['_fromEpoch'],
                stateTransitionArgs['_fromGlobalStateTree'],
                stateTransitionArgs['_fromEpochTree'],
                stateTransitionArgs['_fromNullifierTreeRoot'],
                newGSTLeafArgs['_hashedLeaf'],
                stateTransitionArgs['_noAttestationNullifier'],
                stateTransitionArgs['_nullifiers'],
                stateTransitionArgs['_proof'],
            )
            expect(isProofValid).to.be.true

            // Update nullifier tree
            const nullifiers = stateTransitionArgs['_nullifiers'].map((n) => new smtBN(n.toString()))
            for (const nullifier of nullifiers) {
                if (nullifier.gt(new smtBN(0))) {
                    let result = await nullifierTree.update(nullifier, hexStrToBuf(genNoAttestationNullifierValue()), true)
                    expect(result).to.be.true
                }
            }
            const noAtteNullifier = new smtBN(stateTransitionArgs['_noAttestationNullifier'].toString())
            if (noAtteNullifier.gt(new smtBN(0))) {
                let result = await nullifierTree.update(noAtteNullifier, hexStrToBuf(genNoAttestationNullifierValue()), true)
                expect(result).to.be.true
            }

            // Update GST
            GSTrees[currentEpoch.toString()] = new IncrementalQuinTree(globalStateTreeDepth, blankGSLeaf, 2)
            GSTrees[currentEpoch.toString()].insert(newGSTLeafArgs['_hashedLeaf'])

            users[0]['latestTransitionedToEpoch'] = currentEpoch.toString()
        })

        it('Second user signs up', async () => {
            const id = genIdentity()
            const commitment = genIdentityCommitment(id)
            users[1] = new Object()
            users[1]['id'] = id
            users[1]['commitment'] = commitment

            const tx = await unirepContract.userSignUp(commitment)
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)

            const hashedStateLeaf = await unirepContract.hashStateLeaf(
                [
                    commitment.toString(),
                    emptyUserStateRoot.toString()
                ]
            )
            GSTrees[currentEpoch.toString()].insert(hashedStateLeaf)
            users[1]['latestTransitionedToEpoch'] = currentEpoch.toString()
        })

        it('Second attester signs up', async () => {
            attesters[1] = new Object()
            attesters[1]['acct'] = accounts[2]
            attesters[1]['addr'] = await attesters[1]['acct'].getAddress()
            unirepContractCalledBySecondAttester = await ethers.getContractAt(Unirep.abi, unirepContract.address, attesters[1]['acct'])
            
            const tx = await unirepContractCalledBySecondAttester.attesterSignUp()
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)

            attesters[1]['id'] = await unirepContract.attesters(attesters[1]['addr'])
        })

        it('First attester attest to first user', async () => {
            const nonce = 0
            const firstUserEpochKey = genEpochKey(users[0]['id'].identityNullifier, currentEpoch.toNumber(), nonce)
            const attestation = {
                attesterId: attesters[0]['id'].toString(),
                posRep: 1,
                negRep: 0,
                graffiti: genRandomSalt().toString(),
                overwriteGraffiti: true,
            }
            const tx = await unirepContractCalledByFisrtAttester.submitAttestation(
                attestation,
                firstUserEpochKey,
                {value: attestingFee}
            )
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)

            epochKeyToAttestationsMap[firstUserEpochKey.toString()] = new Array()
            epochKeyToAttestationsMap[firstUserEpochKey.toString()].push(attestation)
        })

        it('First attester attest to second user', async () => {
            const nonce = 0
            const secondUserEpochKey = genEpochKey(users[1]['id'].identityNullifier, currentEpoch.toNumber(), nonce)
            const attestation = {
                attesterId: attesters[0]['id'].toString(),
                posRep: 2,
                negRep: 0,
                graffiti: genRandomSalt().toString(),
                overwriteGraffiti: true,
            }
            const tx = await unirepContractCalledByFisrtAttester.submitAttestation(
                attestation,
                secondUserEpochKey,
                {value: attestingFee}
            )
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)

            epochKeyToAttestationsMap[secondUserEpochKey.toString()] = new Array()
            epochKeyToAttestationsMap[secondUserEpochKey.toString()].push(attestation)
        })

        it('Second attester attest to second user', async () => {
            const nonce = 0
            const secondUserEpochKey = genEpochKey(users[1]['id'].identityNullifier, currentEpoch.toNumber(), nonce)
            const attestation = {
                attesterId: attesters[1]['id'].toString(),
                posRep: 0,
                negRep: 3,
                graffiti: genRandomSalt().toString(),
                overwriteGraffiti: true,
            }
            const tx = await unirepContractCalledBySecondAttester.submitAttestation(
                attestation,
                secondUserEpochKey,
                {value: attestingFee}
            )
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)

            epochKeyToAttestationsMap[secondUserEpochKey.toString()].push(attestation)
        })

        it('Attestations gathered from events should match', async () => {
            // First filter by epoch
            const attestationsByEpochFilter = unirepContract.filters.AttestationSubmitted(currentEpoch)
            const attestationsByEpochEvent = await unirepContract.queryFilter(attestationsByEpochFilter)
            expect(attestationsByEpochEvent.length).to.be.equal(3)

            // Second filter by attester
            for (let attester of attesters) {
                let attestationsByAttesterFilter = unirepContract.filters.AttestationSubmitted(null, null, attester['addr'])
                let attestationsByAttesterEvent = await unirepContract.queryFilter(attestationsByAttesterFilter)
                if (attester['id'] == 1) {
                    expect(attestationsByAttesterEvent.length).to.be.equal(2)
                } else if (attester['id'] == 2) {
                    expect(attestationsByAttesterEvent.length).to.be.equal(1)
                } else {
                    throw new Error(`Invalid attester id ${attester['id']}`)
                }
            }

            // Last filter by epoch key
            for (let epochKey in epochKeyToAttestationsMap) {
                const epkInHexStr = toCompleteHexString(BigInt(epochKey).toString(16), 32)
                let attestationsByEpochKeyFilter = unirepContract.filters.AttestationSubmitted(null, epkInHexStr)
                let attestationsByEpochKeyEvent = await unirepContract.queryFilter(attestationsByEpochKeyFilter)
                expect(attestationsByEpochKeyEvent.length).to.be.equal(epochKeyToAttestationsMap[epochKey].length)
                let attestations_: any[] = attestationsByEpochKeyEvent.map((event: any) => event['args'])
                let attestations: any[] = Object.values(epochKeyToAttestationsMap[epochKey])

                for (let i = 0; i < attestations_.length; i++) {
                    expect(
                        attestations[i]['attesterId'] == attestations_[i]['_attesterId'].toString() &&
                        attestations[i]['posRep'] == attestations_[i]['_posRep'].toNumber() &&
                        attestations[i]['negRep'] == attestations_[i]['_negRep'].toNumber() &&
                        attestations[i]['graffiti'] == attestations_[i]['_graffiti'].toString() &&
                        attestations[i]['overwriteGraffiti'] == attestations_[i]['_overwriteGraffiti']
                    ).to.be.true
                }
            }
        })

        it('Global state tree built from events should match', async () => {
            const newLeafFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
            const newLeafEvents = await unirepContract.queryFilter(newLeafFilter)
            const newLeaves: any[] = newLeafEvents.map((event: any) => event['args']['_hashedLeaf'])
            let observedGST = new IncrementalQuinTree(globalStateTreeDepth, blankGSLeaf, 2)
            for(let leaf of newLeaves) {
                await observedGST.insert(leaf)
            }
            expect(observedGST.root).to.be.equal(GSTrees[currentEpoch.toString()].root)
        })
    })

    describe('Third epoch', () => {
        it('begin second epoch epoch transition', async () => {
            prevEpoch = currentEpoch
            // Fast-forward epochLength of seconds
            await ethers.provider.send("evm_increaseTime", [epochLength])
            // Begin epoch transition
            let tx = await unirepContract.beginEpochTransition()
            let receipt = await tx.wait()
            expect(receipt.status).equal(1)
            console.log("Gas cost of epoch transition:", receipt.gasUsed.toString())

            epochTrees[prevEpoch.toString()] = await getNewSMT(epochTreeDepth)

            currentEpoch = await unirepContract.currentEpoch()
            expect(currentEpoch).equal(3)
        })

        it('Epoch tree built from events should match', async () => {
            const epochEndedFilter = unirepContract.filters.EpochEnded(prevEpoch)
            const epochEndedEvent: any = (await unirepContract.queryFilter(epochEndedFilter))[0]
            const epochTreeAddr = epochEndedEvent['args']['_epochTreeAddr']

            expect(epochTreeAddr).to.not.be.equal(ethers.utils.hexZeroPad("0x", 20))
            
            const epochTreeContract: Contract = await ethers.getContractAt(OneTimeSparseMerkleTree.abi, epochTreeAddr)
            let [epochKeys_, epochKeyHashchains_] = await epochTreeContract.getLeavesToInsert()
            expect(epochKeys_.length).to.be.equal(2)

            epochKeys_ = epochKeys_.map((epk) => epk.toString())
            epochKeyHashchains_ = epochKeyHashchains_.map((hc) => ethers.utils.hexZeroPad(hc.toHexString(), 32))
            for (let i = 0; i < epochKeys_.length; i++) {
                let result = await epochTrees[prevEpoch.toString()].update(new smtBN(epochKeys_[i]), hexStrToBuf(epochKeyHashchains_[i]), true)
                expect(result).to.be.true
            }

            const root_ = await epochTreeContract.genSMT({gasLimit: 12000000})
            // Epoch tree root should not be 0x0
            expect(root_).to.be.not.equal(ethers.utils.hexZeroPad("0x", 32))
            // Epoch tree root should match
            expect(root_).to.be.equal(bufToHexString(epochTrees[prevEpoch.toString()].getRootHash()))
        }).timeout(100000)

        it('First user transition from second epoch', async () => {
            const firstUserTransitionedFromEpoch = users[0]['latestTransitionedToEpoch']
            let oldNullifierTreeRoot = nullifierTree.getRootHash()
            const nonce = 0
            const prevEpoch = currentEpoch.toNumber() - 1
            const firstUserEpochKey = genEpochKey(users[0]['id'].identityNullifier, prevEpoch, nonce)
            expect(epochKeyToAttestationsMap[firstUserEpochKey.toString()].length).to.be.equal(1)
            const attestation = epochKeyToAttestationsMap[firstUserEpochKey.toString()][0]
            const attestationNullifier = computeNullifier(users[0]['id']['identityNullifier'], attestation['attesterId'], prevEpoch, nullifierTreeDepth)
            const nullifiers: BigInt[] = []
            nullifiers[0] = attestationNullifier
            for (let i = 1; i < numAttestationsPerBatch; i++) {
                nullifiers[i] = BigInt(0)
            }

            const hashedStateLeaf = await unirepContract.hashStateLeaf(
                [
                    users[0]['commitment'].toString(),
                    users[0]['userStateRoot'].toString()
                ]
            )

            const noAtteNullifier = 0
            let tx = await unirepContract.updateUserStateRoot(
                firstUserTransitionedFromEpoch,
                GSTrees[firstUserTransitionedFromEpoch].root,
                epochTrees[firstUserTransitionedFromEpoch].getRootHash(),
                oldNullifierTreeRoot,
                hashedStateLeaf,
                noAtteNullifier,
                nullifiers,
                genStubUserStateTransitionProof(true),
            )
            let receipt = await tx.wait()
            expect(receipt.status).equal(1)
        })

        it('Verify state transition of first user', async () => {
            const stateTransitionByEpochFilter = unirepContract.filters.UserStateTransitioned(null, currentEpoch)
            const stateTransitionByEpochEvent = await unirepContract.queryFilter(stateTransitionByEpochFilter)
            expect(stateTransitionByEpochEvent.length).to.be.equal(1)

            const newGSTLeafByEpochFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch)
            const newGSTLeafByEpochEvent = await unirepContract.queryFilter(newGSTLeafByEpochFilter)
            expect(newGSTLeafByEpochEvent.length).to.be.equal(1)

            const stateTransitionArgs: any = stateTransitionByEpochEvent[0]['args']
            const newGSTLeafArgs: any = newGSTLeafByEpochEvent[0]['args']

            const isProofValid = await unirepContract.verifyUserStateTransition(
                stateTransitionArgs['_fromEpoch'],
                stateTransitionArgs['_fromGlobalStateTree'],
                stateTransitionArgs['_fromEpochTree'],
                stateTransitionArgs['_fromNullifierTreeRoot'],
                newGSTLeafArgs['_hashedLeaf'],
                stateTransitionArgs['_noAttestationNullifier'],
                stateTransitionArgs['_nullifiers'],
                stateTransitionArgs['_proof'],
            )
            expect(isProofValid).to.be.true

            // Update nullifier tree
            const nullifiers = stateTransitionArgs['_nullifiers'].map((n) => new smtBN(n.toString()))
            for (const nullifier of nullifiers) {
                if (nullifier.gt(new smtBN(0))) {
                    let result = await nullifierTree.update(nullifier, hexStrToBuf(genNoAttestationNullifierValue()), true)
                    expect(result).to.be.true
                }
            }
            const noAtteNullifier = new smtBN(stateTransitionArgs['_noAttestationNullifier'].toString())
            if (noAtteNullifier.gt(new smtBN(0))) {
                let result = await nullifierTree.update(noAtteNullifier, hexStrToBuf(genNoAttestationNullifierValue()), true)
                expect(result).to.be.true
            }

            // Update GST
            GSTrees[currentEpoch.toString()] = new IncrementalQuinTree(globalStateTreeDepth, blankGSLeaf, 2)
            GSTrees[currentEpoch.toString()].insert(newGSTLeafArgs['_hashedLeaf'])

            users[0]['latestTransitionedToEpoch'] = currentEpoch.toString()
        })
    })
})