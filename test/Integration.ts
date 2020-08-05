import { ethers } from "@nomiclabs/buidler"
import { BigNumber, Contract, Signer, Wallet } from "ethers"
import chai from "chai"
import { solidity } from "ethereum-waffle"
import { attestingFee, epochLength, epochTreeDepth, globalStateTreeDepth, maxEpochKeyNonce, maxUsers, nullifierTreeDepth, userStateTreeDepth} from '../config/testLocal'
import { genIdentity, genIdentityCommitment } from 'libsemaphore'
import { IncrementalQuinTree, SnarkBigInt, genRandomSalt } from 'maci-crypto'
import { deployUnirep, getNewSMT, genNoAttestationNullifier, genNoAttestationNullifierValue, genStubEPKProof, genEpochKey } from './utils'

chai.use(solidity)
const { expect } = chai

import OneTimeSparseMerkleTree from '../artifacts/OneTimeSparseMerkleTree.json'
import Unirep from "../artifacts/Unirep.json"
import { BigNumber as smtBN, SparseMerkleTreeImpl, hexStrToBuf, bufToHexString } from "../crypto/SMT"

const genStubUserStateTransitionProof = genStubEPKProof

describe('Integration', () => {
    let users = new Array(2)

    let attesters = new Array(3)
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
            unirepContractCalledByFisrtAttester = await ethers.getContractAt(Unirep.abi, unirepContract.address, attesters[0]['acct'])

            const tx = await unirepContractCalledByFisrtAttester.attesterSignUp()
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)

            attesters[0]['id'] = await unirepContract.attesters(await attesters[0]['acct'].getAddress())
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
            const nullifier = genNoAttestationNullifier(users[0]['id'].identityNullifier, prevEpoch.toNumber())
            let result = await nullifierTree.update(new smtBN(nullifier, 'hex'), hexStrToBuf(genNoAttestationNullifierValue()), true)
            expect(result).to.be.true

            const hashedStateLeaf = await unirepContract.hashStateLeaf(
                [
                    users[0]['commitment'].toString(),
                    users[0]['userStateRoot'].toString()
                ]
            )

            let tx = await unirepContract.updateUserStateRoot(
                firstUserTransitionedFromEpoch,
                GSTrees[firstUserTransitionedFromEpoch].root,
                epochTrees[firstUserTransitionedFromEpoch].getRootHash(),
                oldNullifierTreeRoot,
                hashedStateLeaf,
                GSTrees[firstUserTransitionedFromEpoch].root,  // No attestations so state tree remains the same
                nullifierTree.getRootHash(),
                genStubUserStateTransitionProof(true),
            )
            let receipt = await tx.wait()
            expect(receipt.status).equal(1)

            GSTrees[currentEpoch.toString()] = new IncrementalQuinTree(globalStateTreeDepth, blankGSLeaf, 2)
            GSTrees[currentEpoch.toString()].insert(hashedStateLeaf)

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
            attesters[1] = accounts[2]
            attesters[1]['acct'] = accounts[2]
            unirepContractCalledBySecondAttester = await ethers.getContractAt(Unirep.abi, unirepContract.address, attesters[1]['acct'])
            
            const tx = await unirepContractCalledBySecondAttester.attesterSignUp()
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)

            attesters[1]['id'] = await unirepContract.attesters(await attesters[1]['acct'].getAddress())
        })

        it('First attester attest to first user', async () => {
            const nonce = 0
            const firstUserEpochKey = genEpochKey(users[0]['id'].identityNullifier, currentEpoch.toNumber(), nonce)
            let attestation = {
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
        })

        it('First attester attest to second user', async () => {
            const nonce = 0
            const secondUserEpochKey = genEpochKey(users[1]['id'].identityNullifier, currentEpoch.toNumber(), nonce)
            let attestation = {
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
        })

        it('Second attester attest to second user', async () => {
            const nonce = 1
            const secondUserEpochKey = genEpochKey(users[1]['id'].identityNullifier, currentEpoch.toNumber(), nonce)
            let attestation = {
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
            expect(epochKeys_.length).to.be.equal(3)

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
    })
})