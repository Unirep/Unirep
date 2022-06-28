import { ethers } from 'hardhat'
import { BigNumber } from 'ethers'
import { expect } from 'chai'
import { genRandomSalt, ZkIdentity, hashLeftRight } from '@unirep/crypto'
import {
    Circuit,
    formatProofForVerifierContract,
    EPOCH_LENGTH,
    defaultProver,
} from '@unirep/circuits'
import {
    computeProcessAttestationsProofHash,
    computeStartTransitionProofHash,
    deployUnirep,
    EpochKeyProof,
    ReputationProof,
    SignUpProof,
    UserTransitionProof,
} from '@unirep/contracts'

const attestingFee = ethers.utils.parseEther('0.1')

import {
    genUserState,
    Synchronizer,
    schema,
    decodeBigIntArray,
    computeInitUserStateRoot,
} from '../../src'
import { genRandomAttestation } from '../utils'
import { SQLiteConnector } from 'anondb/node'

let synchronizer: Synchronizer

describe('Synchronizer process events', function () {
    this.timeout(200000)

    before(async () => {
        const accounts = await ethers.getSigners()
        const unirepContract = await deployUnirep(accounts[0], {
            attestingFee,
        })
        const db = await SQLiteConnector.create(schema, ':memory:')
        synchronizer = new Synchronizer(db, defaultProver, unirepContract)
        // now create an attester
        await unirepContract
            .connect(accounts[1])
            .attesterSignUp()
            .then((t) => t.wait())
        await synchronizer.start()
    })

    it('should process sign up event', async () => {
        const [UserSignedUp] =
            synchronizer.unirepContract.filters.UserSignedUp()
                .topics as string[]
        const signUpEvent = new Promise((rs, rj) =>
            synchronizer.once(UserSignedUp, (event) => rs(event))
        )
        const userCount = await (synchronizer as any)._db.count(
            'UserSignUp',
            {}
        )
        const accounts = await ethers.getSigners()
        const id = new ZkIdentity()
        const commitment = id.genIdentityCommitment()

        const epoch = await synchronizer.unirepContract.currentEpoch()
        const attesterId = await synchronizer.unirepContract.attesters(
            accounts[1].address
        )
        const airdropAmount = await synchronizer.unirepContract.airdropAmount(
            accounts[1].address
        )
        const tree = await synchronizer.genGSTree(epoch.toNumber())
        const tx = await synchronizer.unirepContract
            .connect(accounts[1])
            .userSignUp(commitment)
        const receipt = await tx.wait()
        await synchronizer.waitForSync()
        expect(receipt.status, 'User sign up failed').to.equal(1)
        await signUpEvent
        const docs = await (synchronizer as any)._db.findMany('UserSignUp', {
            where: {
                commitment: id.genIdentityCommitment().toString(),
            },
        })
        expect(docs.length).to.equal(1)
        expect(docs[0].epoch).to.equal(epoch.toNumber())
        expect(docs[0].attesterId).to.equal(attesterId.toNumber())
        expect(docs[0].airdrop).to.equal(airdropAmount.toNumber())
        const finalUserCount = await (synchronizer as any)._db.count(
            'UserSignUp',
            {}
        )
        expect(finalUserCount).to.equal(userCount + 1)
        // now look for a new GSTLeaf
        const leaf = hashLeftRight(
            id.genIdentityCommitment(),
            computeInitUserStateRoot(
                synchronizer.settings.userStateTreeDepth,
                attesterId.toNumber(),
                airdropAmount.toNumber()
            )
        )
        const storedLeaves = await (synchronizer as any)._db.findMany(
            'GSTLeaf',
            {
                where: {
                    hash: leaf.toString(),
                },
            }
        )
        const leafIndex = await (synchronizer as any)._db.count('GSTLeaf', {
            epoch: epoch.toNumber(),
        })
        expect(storedLeaves.length).to.equal(1)
        expect(storedLeaves[0].epoch).to.equal(epoch.toNumber())
        expect(storedLeaves[0].transactionHash).to.equal(
            receipt.transactionHash
        )
        expect(storedLeaves[0].index).to.equal(leafIndex - 1)
        // now look for a new GSTRoot
        tree.insert(leaf)
        const storedRoots = await (synchronizer as any)._db.findMany(
            'GSTRoot',
            {
                where: {
                    root: tree.root.toString(),
                },
            }
        )
        expect(storedRoots.length).to.equal(1)
        expect(storedRoots[0].epoch).to.equal(epoch.toNumber())
    })

    it('should process epk proof event and attestation', async () => {
        const [IndexedEpochKeyProof] =
            synchronizer.unirepContract.filters.IndexedEpochKeyProof()
                .topics as string[]
        const proofEvent = new Promise((rs, rj) =>
            synchronizer.once(IndexedEpochKeyProof, (event) => rs(event))
        )
        const accounts = await ethers.getSigners()
        const id = new ZkIdentity()
        const commitment = id.genIdentityCommitment()
        const proofCount = await (synchronizer as any)._db.count('Proof', {})

        {
            const tx = await synchronizer.unirepContract
                .connect(accounts[1])
                .userSignUp(commitment)
            const receipt = await tx.wait()
            expect(receipt.status, 'User sign up failed').to.equal(1)
        }
        const userState = await genUserState(
            ethers.provider,
            synchronizer.unirepContract.address,
            id
        )
        const epoch = await synchronizer.unirepContract.currentEpoch()
        const epochKeyNonce = 2
        const { proof, publicSignals } = await userState.genVerifyEpochKeyProof(
            epochKeyNonce
        )
        const epochKeyProof = new EpochKeyProof(publicSignals, proof)
        const isValid = await epochKeyProof.verify()
        expect(isValid, 'Verify epk proof off-chain failed').to.be.true
        const receipt = await synchronizer.unirepContract
            .submitEpochKeyProof(epochKeyProof)
            .then((t) => t.wait())
        await proofEvent
        await synchronizer.waitForSync()
        const storedProofs = await (synchronizer as any)._db.findMany('Proof', {
            where: {
                transactionHash: receipt.transactionHash,
            },
        })
        expect(storedProofs.length).to.equal(1)
        expect(storedProofs[0].event).to.equal('IndexedEpochKeyProof')
        expect(storedProofs[0].valid).to.equal(1)
        expect(storedProofs[0].epoch).to.equal(epoch.toNumber())
        expect(storedProofs[0].globalStateTree).to.equal(
            epochKeyProof.globalStateTree.toString()
        )
        // compare the proof
        const storedProof = decodeBigIntArray(storedProofs[0].proof)
        expect(epochKeyProof.proof.length).to.equal(storedProof.length)
        for (let x = 0; x < epochKeyProof.proof.length; x++) {
            expect(epochKeyProof.proof[x]).to.equal(storedProof[x].toString())
        }
        const storedPublicSignals = decodeBigIntArray(
            storedProofs[0].publicSignals
        )
        expect(epochKeyProof.publicSignals.length).to.equal(
            storedPublicSignals.length
        )
        for (let x = 0; x < epochKeyProof.publicSignals.length; x++) {
            expect(epochKeyProof.publicSignals[x]).to.equal(
                storedPublicSignals[x].toString()
            )
        }

        expect(storedProofs[0].toEpochKey).to.equal(null)
        expect(storedProofs[0].blindedUserState).to.equal(null)
        expect(storedProofs[0].blindedHashChain).to.equal(null)
        expect(storedProofs[0].outputBlindedHashChain).to.equal(null)
        expect(storedProofs[0].outputBlindedUserState).to.equal(null)
        expect(storedProofs[0].inputBlindedUserState).to.equal(null)
        expect(storedProofs[0].proofIndexRecords).to.equal(null)

        const [AttestationSubmitted] =
            synchronizer.unirepContract.filters.AttestationSubmitted()
                .topics as string[]
        const attestationEvent = new Promise((rs, rj) =>
            synchronizer.once(AttestationSubmitted, (event) => rs(event))
        )
        const proofIndex = await synchronizer.unirepContract.getProofIndex(
            epochKeyProof.hash()
        )
        const attestation = genRandomAttestation()
        attestation.attesterId = await synchronizer.unirepContract.attesters(
            accounts[1].address
        )
        await synchronizer.unirepContract
            .connect(accounts[1])
            .submitAttestation(
                attestation,
                epochKeyProof.epochKey,
                proofIndex,
                0, // from proof index
                { value: attestingFee }
            )
            .then((t) => t.wait())
        await attestationEvent
        await synchronizer.waitForSync()
        const attestations = await (synchronizer as any)._db.findMany(
            'Attestation',
            {
                where: {
                    hash: attestation.hash().toString(),
                },
            }
        )
        expect(attestations.length).to.equal(1)
        expect(attestations[0].epoch).to.equal(epoch)
        expect(attestations[0].posRep).to.equal(attestation.posRep.toNumber())
        expect(attestations[0].negRep).to.equal(attestation.negRep.toNumber())
        expect(attestations[0].graffiti).to.equal(
            attestation.graffiti.toString()
        )
        expect(attestations[0].signUp).to.equal(attestation.signUp.toNumber())
        expect(attestations[0].valid).to.equal(1)
        expect(BigNumber.from(attestations[0].attester).toString()).to.equal(
            BigNumber.from(accounts[1].address).toString()
        )
        expect(attestations[0].attesterId).to.equal(
            attestation.attesterId.toNumber()
        )
        expect(attestations[0].proofIndex).to.equal(proofIndex.toNumber())
        expect(attestations[0].epochKey).to.equal(
            epochKeyProof.epochKey.toString()
        )
        expect(attestations[0].epochKeyToHashchainMap).to.equal(null)
        const finalProofCount = await (synchronizer as any)._db.count(
            'Proof',
            {}
        )
        expect(finalProofCount).to.equal(proofCount + 1)
    })

    it('should process reputation proof', async () => {
        const [IndexedReputationProof] =
            synchronizer.unirepContract.filters.IndexedReputationProof()
                .topics as string[]
        const proofEvent = new Promise((rs, rj) =>
            synchronizer.once(IndexedReputationProof, (event) => rs(event))
        )
        const accounts = await ethers.getSigners()
        const id = new ZkIdentity()
        const commitment = id.genIdentityCommitment()

        {
            const receipt = await synchronizer.unirepContract
                .connect(accounts[1])
                .userSignUp(commitment)
                .then((t) => t.wait())
            expect(receipt.status, 'User sign up failed').to.equal(1)
        }
        const epoch = await synchronizer.unirepContract.currentEpoch()
        const userState = await genUserState(
            ethers.provider,
            synchronizer.unirepContract.address,
            id
        )

        const epochKeyNonce = 1
        const minRep = 0
        const proveGraffiti = BigInt(0)
        const graffitiPreimage = BigInt(0)
        const nonceList = [] as BigInt[]
        const maxReputationBudget =
            await synchronizer.unirepContract.maxReputationBudget()
        for (let i = nonceList.length; i < maxReputationBudget; i++) {
            nonceList.push(BigInt(-1))
        }
        const { proof, publicSignals } =
            await userState.genProveReputationProof(
                (
                    await synchronizer.unirepContract.attesters(
                        accounts[1].address
                    )
                ).toBigInt(),
                epochKeyNonce,
                minRep,
                proveGraffiti,
                graffitiPreimage,
                nonceList
            )
        const reputationProof = new ReputationProof(publicSignals, proof)
        const isValid = await reputationProof.verify()
        expect(isValid, 'Verify rep proof off-chain failed').to.be.true

        const proofCount = await (synchronizer as any)._db.count('Proof', {})
        const receipt = await synchronizer.unirepContract
            .connect(accounts[1])
            .spendReputation(reputationProof, { value: attestingFee })
            .then((t) => t.wait())
        await proofEvent
        await synchronizer.waitForSync()
        const proofIndex = await synchronizer.unirepContract.getProofIndex(
            reputationProof.hash()
        )
        const storedProofs = await (synchronizer as any)._db.findMany('Proof', {
            where: {
                transactionHash: receipt.transactionHash,
            },
        })
        expect(storedProofs.length).to.equal(1)
        expect(storedProofs[0].index).to.equal(proofIndex.toNumber())
        expect(storedProofs[0].event).to.equal('IndexedReputationProof')
        expect(storedProofs[0].valid).to.equal(1)
        expect(storedProofs[0].epoch).to.equal(epoch.toNumber())
        expect(storedProofs[0].globalStateTree).to.equal(
            reputationProof.globalStateTree.toString()
        )
        // compare the proof
        const storedProof = decodeBigIntArray(storedProofs[0].proof)
        expect(reputationProof.proof.length).to.equal(storedProof.length)
        for (let x = 0; x < reputationProof.proof.length; x++) {
            expect(reputationProof.proof[x]).to.equal(storedProof[x].toString())
        }
        const storedPublicSignals = decodeBigIntArray(
            storedProofs[0].publicSignals
        )
        expect(reputationProof.publicSignals.length).to.equal(
            storedPublicSignals.length
        )
        for (let x = 0; x < reputationProof.publicSignals.length; x++) {
            expect(reputationProof.publicSignals[x]).to.equal(
                storedPublicSignals[x].toString()
            )
        }

        expect(storedProofs[0].toEpochKey).to.equal(null)
        expect(storedProofs[0].blindedUserState).to.equal(null)
        expect(storedProofs[0].blindedHashChain).to.equal(null)
        expect(storedProofs[0].outputBlindedHashChain).to.equal(null)
        expect(storedProofs[0].outputBlindedUserState).to.equal(null)
        expect(storedProofs[0].inputBlindedUserState).to.equal(null)
        expect(storedProofs[0].proofIndexRecords).to.equal(null)
        const finalProofCount = await (synchronizer as any)._db.count(
            'Proof',
            {}
        )
        expect(finalProofCount).to.equal(proofCount + 1)
    })

    it('should process sign up proof', async () => {
        const [IndexedUserSignedUpProof] =
            synchronizer.unirepContract.filters.IndexedUserSignedUpProof()
                .topics as string[]
        const proofEvent = new Promise((rs, rj) =>
            synchronizer.once(IndexedUserSignedUpProof, (event) => rs(event))
        )
        const accounts = await ethers.getSigners()
        const id = new ZkIdentity()
        const commitment = id.genIdentityCommitment()
        {
            const receipt = await synchronizer.unirepContract
                .connect(accounts[1])
                .userSignUp(commitment)
                .then((t) => t.wait())
            expect(receipt.status, 'User sign up failed').to.equal(1)
        }
        const epoch = await synchronizer.unirepContract.currentEpoch()
        const userState = await genUserState(
            ethers.provider,
            synchronizer.unirepContract.address,
            id
        )
        const { proof, publicSignals } = await userState.genUserSignUpProof(
            (
                await synchronizer.unirepContract.attesters(accounts[1].address)
            ).toBigInt()
        )
        const userSignUpProof = new SignUpProof(publicSignals, proof)
        const isValid = await userSignUpProof.verify()
        expect(isValid, 'Verify sign up proof off-chain failed').to.be.true

        const proofCount = await (synchronizer as any)._db.count('Proof', {})
        const receipt = await synchronizer.unirepContract
            .connect(accounts[1])
            .airdropEpochKey(userSignUpProof, {
                value: attestingFee,
                gasLimit: 1000000,
            })
            .then((t) => t.wait())
        const proofIndex = await synchronizer.unirepContract.getProofIndex(
            userSignUpProof.hash()
        )
        await proofEvent
        await synchronizer.waitForSync()
        const storedProofs = await (synchronizer as any)._db.findMany('Proof', {
            where: {
                transactionHash: receipt.transactionHash,
            },
        })
        expect(storedProofs.length).to.equal(1)
        expect(storedProofs[0].index).to.equal(proofIndex.toNumber())
        expect(storedProofs[0].event).to.equal('IndexedUserSignedUpProof')
        expect(storedProofs[0].valid).to.equal(1)
        expect(storedProofs[0].epoch).to.equal(epoch.toNumber())
        expect(storedProofs[0].globalStateTree).to.equal(
            userSignUpProof.globalStateTree.toString()
        )
        // compare the proof
        const storedProof = decodeBigIntArray(storedProofs[0].proof)
        expect(userSignUpProof.proof.length).to.equal(storedProof.length)
        for (let x = 0; x < userSignUpProof.proof.length; x++) {
            expect(userSignUpProof.proof[x]).to.equal(storedProof[x].toString())
        }
        const storedPublicSignals = decodeBigIntArray(
            storedProofs[0].publicSignals
        )
        expect(userSignUpProof.publicSignals.length).to.equal(
            storedPublicSignals.length
        )
        for (let x = 0; x < userSignUpProof.publicSignals.length; x++) {
            expect(userSignUpProof.publicSignals[x]).to.equal(
                storedPublicSignals[x].toString()
            )
        }

        expect(storedProofs[0].toEpochKey).to.equal(null)
        expect(storedProofs[0].blindedUserState).to.equal(null)
        expect(storedProofs[0].blindedHashChain).to.equal(null)
        expect(storedProofs[0].outputBlindedHashChain).to.equal(null)
        expect(storedProofs[0].outputBlindedUserState).to.equal(null)
        expect(storedProofs[0].inputBlindedUserState).to.equal(null)
        expect(storedProofs[0].proofIndexRecords).to.equal(null)
        const finalProofCount = await (synchronizer as any)._db.count(
            'Proof',
            {}
        )
        expect(finalProofCount).to.equal(proofCount + 1)
    })

    it('should process epoch transition', async () => {
        await synchronizer.waitForSync()
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])

        const [EpochEnded] = synchronizer.unirepContract.filters.EpochEnded()
            .topics as string[]
        const epochEndedEvent = new Promise((rs, rj) =>
            synchronizer.once(EpochEnded, (event) => rs(event))
        )
        const startEpoch = await synchronizer.unirepContract.currentEpoch()
        expect(startEpoch).to.equal(1)
        await synchronizer.unirepContract
            .beginEpochTransition()
            .then((t) => t.wait())
        await epochEndedEvent
        await synchronizer.waitForSync()

        const endEpoch = await synchronizer.unirepContract.currentEpoch()
        const epochs = await (synchronizer as any)._db.findMany('Epoch', {
            where: {},
        })
        expect(endEpoch).to.equal(2)
        expect(epochs.length).to.equal(endEpoch)
        expect(epochs[0].number).to.equal(1)
        expect(epochs[0].sealed).to.equal(1)
        // TODO
        // expect(epochs[0].epochRoot).to.equal(/**/)
        expect(epochs.length).to.equal(endEpoch)
        expect(epochs[1].number).to.equal(2)
        expect(epochs[1].sealed).to.equal(0)
        expect(epochs[1].epochRoot).to.equal(null)
    })

    it('should process ust events', async () => {
        const accounts = await ethers.getSigners()
        const id = new ZkIdentity()
        const commitment = id.genIdentityCommitment()

        const receipt = await synchronizer.unirepContract
            .connect(accounts[1])
            .userSignUp(commitment)
            .then((t) => t.wait())
        expect(receipt.status, 'User sign up failed').to.equal(1)
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await synchronizer.unirepContract
            .beginEpochTransition()
            .then((t) => t.wait())

        const userState = await genUserState(
            ethers.provider,
            synchronizer.unirepContract.address,
            id
        )
        await userState.waitForSync()

        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])

        await synchronizer.unirepContract
            .beginEpochTransition()
            .then((t) => t.wait())
        const {
            startTransitionProof,
            processAttestationProofs,
            finalTransitionProof,
        } = await userState.genUserStateTransitionProofs()
        let isValid = await defaultProver.verifyProof(
            Circuit.startTransition,
            startTransitionProof.publicSignals,
            startTransitionProof.proof
        )
        expect(isValid, 'Verify start transition circuit off-chain failed').to
            .be.true
        const blindedUserState = startTransitionProof.blindedUserState
        const blindedHashChain = startTransitionProof.blindedHashChain
        const globalStateTree = startTransitionProof.globalStateTreeRoot
        const proof = formatProofForVerifierContract(startTransitionProof.proof)
        const [IndexedStartedTransitionProof] =
            synchronizer.unirepContract.filters.IndexedStartedTransitionProof()
                .topics as string[]
        const _startTransitionProof = new Promise((rs, rj) =>
            synchronizer.once(IndexedStartedTransitionProof, (event) =>
                rs(event)
            )
        )
        await synchronizer.unirepContract
            .startUserStateTransition(
                blindedUserState,
                blindedHashChain,
                globalStateTree,
                proof
            )
            .then((t) => t.wait())
        await _startTransitionProof

        const proofIndexes: any[] = []

        let proofNullifier = computeStartTransitionProofHash(
            blindedUserState,
            blindedHashChain,
            globalStateTree,
            proof
        )
        let proofIndex = await synchronizer.unirepContract.getProofIndex(
            proofNullifier
        )
        proofIndexes.push(proofIndex)

        for (let i = 0; i < processAttestationProofs.length; i++) {
            isValid = await defaultProver.verifyProof(
                Circuit.processAttestations,
                processAttestationProofs[i].publicSignals,
                processAttestationProofs[i].proof
            )
            expect(
                isValid,
                'Verify process attestations circuit off-chain failed'
            ).to.be.true

            const outputBlindedUserState =
                processAttestationProofs[i].outputBlindedUserState
            const outputBlindedHashChain =
                processAttestationProofs[i].outputBlindedHashChain
            const inputBlindedUserState =
                processAttestationProofs[i].inputBlindedUserState

            // submit random process attestations should success and not affect the results
            const falseInput = BigNumber.from(genRandomSalt())
            const [IndexedProcessedAttestationsProof] =
                synchronizer.unirepContract.filters.IndexedProcessedAttestationsProof()
                    .topics as string[]
            const _processedAttestations = new Promise((rs, rj) =>
                synchronizer.once(IndexedProcessedAttestationsProof, (event) =>
                    rs(event)
                )
            )
            await synchronizer.unirepContract
                .processAttestations(
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    falseInput,
                    formatProofForVerifierContract(
                        processAttestationProofs[i].proof
                    )
                )
                .then((t) => t.wait())
            await _processedAttestations

            const __processedAttestations = new Promise((rs, rj) =>
                synchronizer.once(IndexedProcessedAttestationsProof, (event) =>
                    rs(event)
                )
            )
            await synchronizer.unirepContract
                .processAttestations(
                    outputBlindedUserState,
                    outputBlindedHashChain,
                    inputBlindedUserState,
                    formatProofForVerifierContract(
                        processAttestationProofs[i].proof
                    )
                )
                .then((t) => t.wait())
            await __processedAttestations

            const proofNullifier = computeProcessAttestationsProofHash(
                outputBlindedUserState,
                outputBlindedHashChain,
                inputBlindedUserState,
                formatProofForVerifierContract(
                    processAttestationProofs[i].proof
                )
            )
            const proofIndex = await synchronizer.unirepContract.getProofIndex(
                proofNullifier
            )
            proofIndexes.push(proofIndex)
        }

        isValid = await defaultProver.verifyProof(
            Circuit.userStateTransition,
            finalTransitionProof.publicSignals,
            finalTransitionProof.proof
        )
        expect(isValid, 'Verify user state transition circuit off-chain failed')
            .to.be.true

        const transitionProof = new UserTransitionProof(
            finalTransitionProof.publicSignals,
            finalTransitionProof.proof
        )

        const [UserStateTransitioned] =
            synchronizer.unirepContract.filters.UserStateTransitioned()
                .topics as string[]
        const ust = new Promise((rs, rj) =>
            synchronizer.once(UserStateTransitioned, (event) => rs(event))
        )
        await synchronizer.unirepContract
            .updateUserStateRoot(transitionProof, proofIndexes)
            .then((t) => t.wait())
        await ust
    })
})
