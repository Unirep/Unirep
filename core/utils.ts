import assert from 'assert'
import * as ethers from 'ethers'

import chai from "chai"
import { solidity } from "ethereum-waffle"
chai.use(solidity)
const { expect } = chai

import Unirep from "../artifacts/Unirep.json"
import { numAttestationsPerBatch } from '../config/testLocal'
import { Attestation, IEpochTreeLeaf, UnirepState } from './UnirepState'

/*
 * Retrieves and parses on-chain Unirep contract data to create an off-chain
 * representation as a UnirepState object.
 * @param provider An Ethereum provider
 * @param address The address of the MACI contract
 */
const genUnirepStateFromContract = async (
    provider: ethers.providers.Provider,
    address: string,
    startBlock: number,
) => {

    const unirepContract = new ethers.Contract(
        address,
        Unirep.abi,
        provider,
    )

    const treeDepths_ = await unirepContract.treeDepths()
    const globalStateTreeDepth = treeDepths_.globalStateTreeDepth
    const userStateTreeDepth = treeDepths_.userStateTreeDepth
    const epochTreeDepth = treeDepths_.epochTreeDepth
    const nullifierTreeDepth = treeDepths_.nullifierTreeDepth
    const attestingFee = await unirepContract.attestingFee()
    const epochLength = (await unirepContract.epochLength()).toNumber()
    const maxEpochKeyNonce = await unirepContract.maxEpochKeyNonce()

    const unirepState = new UnirepState(
        globalStateTreeDepth,
        userStateTreeDepth,
        epochTreeDepth,
        nullifierTreeDepth,
        attestingFee,
        epochLength,
        maxEpochKeyNonce,
        numAttestationsPerBatch,
    )

    const newGSTLeafInsertedFilter = unirepContract.filters.NewGSTLeafInserted()
    const newGSTLeafInsertedEvents =  await unirepContract.queryFilter(newGSTLeafInsertedFilter, startBlock)

    const attestationSubmittedFilter = unirepContract.filters.AttestationSubmitted()
    const attestationSubmittedEvents =  await unirepContract.queryFilter(attestationSubmittedFilter, startBlock)

    const epochEndedFilter = unirepContract.filters.EpochEnded()
    const epochEndedEvents =  await unirepContract.queryFilter(epochEndedFilter, startBlock)

    const userStateTransitionedFilter = unirepContract.filters.UserStateTransitioned()
    const userStateTransitionedEvents =  await unirepContract.queryFilter(userStateTransitionedFilter, startBlock)

    const sequencerFilter = unirepContract.filters.Sequencer()
    const sequencerEvents =  await unirepContract.queryFilter(sequencerFilter, startBlock)

    // Reverse the events so pop() can start from the first event
    newGSTLeafInsertedEvents.reverse()
    attestationSubmittedEvents.reverse()
    epochEndedEvents.reverse()
    userStateTransitionedEvents.reverse()
    for (let i = 0; i < sequencerEvents.length; i++) {
        const sequencerEvent = sequencerEvents[i]
        const occurredEvent = sequencerEvent.args?._event
        if (occurredEvent === "UserSignUp") {
            const newLeafEvent = newGSTLeafInsertedEvents.pop()
            assert(newLeafEvent !== undefined, `Event sequence mismatch: missing newGSTLeafInsertedEvent`)

            const newLeaf = newLeafEvent.args?._hashedLeaf
            expect(newLeaf).equal(BigInt(newLeaf))
            unirepState.signUp(unirepState.currentEpoch, BigInt(newLeaf))
        } else if (occurredEvent === "AttestationSubmitted") {
            const attestationEvent = attestationSubmittedEvents.pop()
            assert(attestationEvent !== undefined, `Event sequence mismatch: missing attestationSubmittedEvent`)
            const epoch = attestationEvent.args?._epoch
            assert(
                epoch.toNumber() === unirepState.currentEpoch,
                `Attestation epoch (${epoch.toNumber()}) does not match current epoch (${unirepState.currentEpoch})`
            )

            const _attestation = attestationEvent.args?.attestation
            const attestation = new Attestation(
                BigInt(_attestation.attesterId),
                _attestation.posRep.toNumber(),
                _attestation.negRep.toNumber(),
                BigInt(_attestation.graffiti),
                _attestation.overwriteGraffiti
            )
            unirepState.addAttestation(attestationEvent.args?._epochKey.toString(), attestation)
        } else if (occurredEvent === "EpochEnded") {
            const epochEndedEvent = epochEndedEvents.pop()
            assert(epochEndedEvent !== undefined, `Event sequence mismatch: missing epochEndedEvent`)
            const epoch = epochEndedEvent.args?._epoch
            assert(
                epoch.toNumber() === unirepState.currentEpoch,
                `Ended epoch (${epoch.toNumber()}) does not match current epoch (${unirepState.currentEpoch})`
            )

            // Get epoch tree leaves of the ending epoch
            let [epochKeys_, epochKeyHashchains_] = await unirepContract.getEpochTreeLeaves(epoch)
            epochKeys_ = epochKeys_.map((epk) => BigInt(epk.toString()))
            epochKeyHashchains_ = epochKeyHashchains_.map((hc) => BigInt(hc.toString()))
            const epochTreeLeaves: IEpochTreeLeaf[] = []
            for (let i = 0; i < epochKeys_.length; i++) {
                const epochTreeLeaf: IEpochTreeLeaf = {
                    epochKey: epochKeys_[i],
                    hashchainResult: epochKeyHashchains_[i]
                }
                epochTreeLeaves.push(epochTreeLeaf)
            }

            unirepState.epochTransition(epoch.toNumber(), epochTreeLeaves)
        } else if (occurredEvent === "UserStateTransitioned") {
            const newLeafEvent = newGSTLeafInsertedEvents.pop()
            assert(newLeafEvent !== undefined, `Event sequence mismatch: missing newGSTLeafInsertedEvent`)
            const userStateTransitionedEvent = userStateTransitionedEvents.pop()
            assert(userStateTransitionedEvent !== undefined, `Event sequence mismatch: missing userStateTransitionedEvent`)

            const newLeaf = newLeafEvent.args?._hashedLeaf
            expect(newLeaf).equal(BigInt(newLeaf))

            const isProofValid = await unirepContract.verifyUserStateTransition(
                newLeaf,
                userStateTransitionedEvent.args?._nullifiers,
                userStateTransitionedEvent.args?._noAttestationNullifier,
                userStateTransitionedEvent.args?._fromEpoch,
                userStateTransitionedEvent.args?._fromGlobalStateTree,
                userStateTransitionedEvent.args?._fromEpochTree,
                userStateTransitionedEvent.args?._fromNullifierTreeRoot,
                userStateTransitionedEvent.args?._proof,
            )
            expect(isProofValid).to.be.true

            const allNullifiers = userStateTransitionedEvent.args?._nullifiers.map((n) => BigInt(n))
            const noAtteNullifier = BigInt(userStateTransitionedEvent.args?._noAttestationNullifier)
            allNullifiers.push(noAtteNullifier)

            unirepState.userStateTransition(unirepState.currentEpoch, BigInt(newLeaf), allNullifiers)
        } else {
            throw  new Error(`Unexpected event: ${occurredEvent}`)
        }
    }
    return unirepState
}

export {
    genUnirepStateFromContract,
}