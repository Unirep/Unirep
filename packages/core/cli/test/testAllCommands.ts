// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import base64url from 'base64url'
import { ethers } from 'ethers'
import chai from 'chai'
const { expect } = chai
import { ZkIdentity, hashOne, Strategy } from '@unirep/crypto'
import { getUnirepContract, Unirep } from '@unirep/contracts'

import { DEFAULT_ETH_PROVIDER } from '../defaults'
import { genUnirepStateFromContract, UnirepState } from '../../src'
import { identityCommitmentPrefix, identityPrefix } from '../prefix'
import { exec } from './utils'

describe('test all CLI subcommands', function () {
    this.timeout(0)

    let deployerPrivKey =
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
    let deployerAddr
    let attesterPrivKey =
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
    let attesterAddr
    let userPrivKey =
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
    let userAddr

    const attestingFee = ethers.BigNumber.from(10).pow(18)
    const epochKeyNonce = 0
    const epochLength = 5
    let unirepContract: Unirep
    let unirepState: UnirepState

    let userIdentity, userIdentityCommitment
    const attesterId = 1
    let epk, epkProof, epkPublicSignals, proofIdx
    const airdropPosRep = 30
    const posRep = 5,
        negRep = 4,
        graffitiPreimage = 0,
        graffiti = hashOne(BigInt(graffitiPreimage)),
        signUpFlag = 1
    const minPosRep = 0
    const repNullifierAmount = 1
    let userRepProof, signUpProof
    let repPublicSignals, signUpPublicSignals

    before(async () => {
        deployerPrivKey = ethers.utils.solidityKeccak256(['uint'], [0])
        deployerAddr = ethers.utils.computeAddress(deployerPrivKey)
        userPrivKey = ethers.utils.solidityKeccak256(['uint'], [1])
        userAddr = ethers.utils.computeAddress(userPrivKey)
        attesterPrivKey = ethers.utils.solidityKeccak256(['uint'], [2])
        attesterAddr = ethers.utils.computeAddress(attesterPrivKey)

        // Transfer ether so they can execute transactions
        const defaultAccount: ethers.Signer = (
            await hardhatEthers.getSigners()
        )[0]
        await defaultAccount.sendTransaction({
            to: deployerAddr,
            value: ethers.utils.parseEther('10'),
            gasLimit: 21000,
        })
        await defaultAccount.sendTransaction({
            to: userAddr,
            value: ethers.utils.parseEther('10'),
            gasLimit: 21000,
        })
        await defaultAccount.sendTransaction({
            to: attesterAddr,
            value: ethers.utils.parseEther('10'),
            gasLimit: 21000,
        })
    })

    describe('deploy CLI subcommand', () => {
        it('should deploy a Unirep contract', async () => {
            const command =
                `npx ts-node cli/index.ts deploy` +
                ` -d ${deployerPrivKey} ` +
                ` -l ${epochLength} ` +
                ` -f ${attestingFee.toString()} `

            console.log(command)
            const output = exec(command).stdout.trim()
            console.log(output)

            const regMatch = output.match(/Unirep: (0x[a-fA-F0-9]{40})$/)
            const unirepAddress = regMatch[1]

            const provider = new hardhatEthers.providers.JsonRpcProvider(
                DEFAULT_ETH_PROVIDER
            )
            unirepContract = getUnirepContract(unirepAddress, provider)

            unirepState = await genUnirepStateFromContract(
                provider,
                unirepAddress
            )

            expect(unirepState.setting.epochLength).equal(epochLength)
            expect(unirepState.setting.attestingFee).equal(attestingFee)
        })
    })

    describe('genUserIdentity CLI subcommand', () => {
        it('should generate an identity for user', async () => {
            const command = `npx ts-node cli/index.ts genUnirepIdentity`

            console.log(command)
            const output = exec(command).stdout.trim()
            console.log(output)

            const idRegMatch = output.match(
                /^(Unirep.identity.[a-zA-Z0-9\-\_]+)\n/
            )
            const encodedIdentity = idRegMatch[1]
            const serializedIdentity = base64url.decode(
                encodedIdentity.slice(identityPrefix.length)
            )
            const _userIdentity = new ZkIdentity(
                Strategy.SERIALIZED,
                serializedIdentity
            )

            const commitmentRegMatch = output.match(
                /(Unirep.identityCommitment.[a-zA-Z0-9\-\_]+)$/
            )
            const encodedIdentityCommitment = commitmentRegMatch[1]
            const serializedIdentityCommitment = base64url.decode(
                encodedIdentityCommitment.slice(identityCommitmentPrefix.length)
            )
            const _userIdentityCommitment =
                _userIdentity.genIdentityCommitment()
            expect(serializedIdentityCommitment).equal(
                _userIdentityCommitment.toString()
            )

            userIdentity = encodedIdentity
            userIdentityCommitment = encodedIdentityCommitment
        })
    })

    describe('userSignup CLI subcommand', () => {
        it('should sign user up', async () => {
            const command =
                `npx ts-node cli/index.ts userSignUp` +
                ` -x ${unirepContract.address} ` +
                ` -c ${userIdentityCommitment} ` +
                ` -d ${userPrivKey} `

            console.log(command)
            const output = exec(command).stdout.trim()
            console.log(output)

            const signUpRegMatch = output.match(/Sign up epoch: 1/)
            expect(signUpRegMatch).not.equal(null)
        })
    })

    describe('attesterSignUp CLI subcommand', () => {
        it('should sign attester up', async () => {
            const command =
                `npx ts-node cli/index.ts attesterSignUp` +
                ` -x ${unirepContract.address} ` +
                ` -d ${attesterPrivKey} `

            console.log(command)
            const output = exec(command).stdout.trim()
            console.log(output)

            const signUpRegMatch = output.match(
                /Attester sign up with attester id: 1/
            )
            expect(signUpRegMatch).not.equal(null)
        })
    })

    describe('setAirdropAmount CLI subcommand', () => {
        it('should set the airdrop amount from an attester', async () => {
            const command =
                `npx ts-node cli/index.ts setAirdropAmount` +
                ` -x ${unirepContract.address} ` +
                ` -d ${attesterPrivKey} ` +
                ` -a ${airdropPosRep}`

            console.log(command)
            const output = exec(command).stdout.trim()
            console.log(output)

            const txRegMatch = output.match(
                /Transaction hash: 0x[a-fA-F0-9]{64}/
            )
            expect(txRegMatch).not.equal(null)
        })
    })

    describe('genEpochKeyAndProof CLI subcommand', () => {
        it('should generate epoch key proof', async () => {
            const command =
                `npx ts-node cli/index.ts genEpochKeyAndProof` +
                ` -x ${unirepContract.address} ` +
                ` -id ${userIdentity} ` +
                ` -n ${epochKeyNonce} `

            console.log(command)
            const output = exec(command).stdout.trim()
            console.log(output)

            const epkRegMatch = output.match(
                /Epoch key of epoch 1 and nonce 0: ([a-fA-F0-9]+)/
            )
            epk = epkRegMatch[1]
            const epkProofRegMatch = output.match(
                /(Unirep.epk.proof.[a-zA-Z0-9\-\_]+)/
            )
            epkProof = epkProofRegMatch[1]
            const epkPublicSignalsRegMatch = output.match(
                /(Unirep.epk.publicSignals.[a-zA-Z0-9\-\_]+)$/
            )
            epkPublicSignals = epkPublicSignalsRegMatch[1]
        })
    })

    describe('verifyEpochKeyProof CLI subcommand', () => {
        it('should verify epoch key proof', async () => {
            const command =
                `npx ts-node cli/index.ts verifyEpochKeyProof` +
                ` -x ${unirepContract.address} ` +
                ` -pf ${epkProof} ` +
                ` -p ${epkPublicSignals}`

            console.log(command)
            const output = exec(command).stdout.trim()
            console.log(output)

            const verifyRegMatch = output.match(
                /Verify epoch key proof with epoch key ([0-9]+) succeed/
            )
            expect(verifyRegMatch[1]).equals(epk)
            expect(verifyRegMatch).not.equal(null)
        })
    })

    describe('submitEpochKeyProof CLI subcommand', () => {
        it('should submit epoch key proof', async () => {
            const command =
                `npx ts-node cli/index.ts submitEpochKeyProof` +
                ` -x ${unirepContract.address} ` +
                ` -d ${deployerPrivKey} ` +
                ` -pf ${epkProof} ` +
                ` -p ${epkPublicSignals}`

            console.log(command)
            const output = exec(command).stdout.trim()
            console.log(output)

            const txRegMatch = output.match(
                /Transaction hash: 0x[a-fA-F0-9]{64}/
            )
            expect(txRegMatch).not.equal(null)

            const proofIndexRegMatch = output.match(/Proof index:  ([0-9]+)/)
            proofIdx = proofIndexRegMatch[1]
        })
    })

    describe('attest CLI subcommand', () => {
        it('should attest to user', async () => {
            const command =
                `npx ts-node cli/index.ts attest` +
                ` -x ${unirepContract.address} ` +
                ` -d ${attesterPrivKey} ` +
                ` -epk ${epk} ` +
                ` -toi ${proofIdx} ` +
                ` -pr ${posRep} ` +
                ` -nr ${negRep} ` +
                ` -gf ${graffiti.toString()} ` +
                ` -s ${signUpFlag}`

            console.log(command)
            const output = exec(command).stdout.trim()
            console.log(output)

            const txRegMatch = output.match(
                /Transaction hash: 0x[a-fA-F0-9]{64}/
            )
            expect(txRegMatch).not.equal(null)
        })
    })

    describe('epochTransition CLI subcommand', () => {
        it('should transition to next epoch', async () => {
            const command =
                `npx ts-node cli/index.ts epochTransition` +
                ` -x ${unirepContract.address} ` +
                ` -d ${deployerPrivKey} ` +
                ` -t `

            console.log(command)
            const output = exec(command).stdout.trim()
            console.log(output)

            const epochEndRegMatch = output.match(/End of epoch: 1/)
            expect(epochEndRegMatch).not.equal(null)
        })
    })

    describe('userStateTransition CLI subcommand', () => {
        it('should transition user state', async () => {
            const command =
                `npx ts-node cli/index.ts userStateTransition` +
                ` -x ${unirepContract.address} ` +
                ` -d ${userPrivKey} ` +
                ` -id ${userIdentity} `

            console.log(command)
            const output = exec(command).stdout.trim()
            console.log(output)

            const userTransitionRegMatch = output.match(
                /User transitioned from epoch 1 to epoch 2/
            )
            expect(userTransitionRegMatch).not.equal(null)
        })
    })

    describe('genReputationProof CLI subcommand', () => {
        it('should generate user reputation proof', async () => {
            const command =
                `npx ts-node cli/index.ts genReputationProof` +
                ` -x ${unirepContract.address} ` +
                ` -id ${userIdentity} ` +
                ` -a ${attesterId} ` +
                ` -mr ${minPosRep} ` +
                ` -n ${epochKeyNonce}` +
                ` -r ${repNullifierAmount}`
            // ` -mn ${maxNegRep} ` +
            // ` -gp ${graffitiPreimage} `

            console.log(command)
            const output = exec(command).stdout.trim()
            console.log(output)

            const userRepProofRegMatch = output.match(
                /(Unirep.reputation.proof.[a-zA-Z0-9\-\_]+)/
            )
            const epochKeyRegMatch = output.match(
                /Epoch key of the user: ([0-9]+)/
            )
            const publicSignalRegMatch = output.match(
                /(Unirep.reputation.publicSignals.[a-zA-Z0-9]+)/
            )
            userRepProof = userRepProofRegMatch[1]
            epk = epochKeyRegMatch[1]
            repPublicSignals = publicSignalRegMatch[1]
        })
    })

    describe('verifyReputationProof CLI subcommand', () => {
        it('should verify user reputation proof', async () => {
            const command =
                `npx ts-node cli/index.ts verifyReputationProof` +
                ` -x ${unirepContract.address} ` +
                ` -pf ${userRepProof} ` +
                ` -p ${repPublicSignals}`

            console.log(command)
            const output = exec(command).stdout.trim()
            console.log(output)

            const verifyRegMatch = output.match(
                /Verify reputation proof from attester 1 .+, succeed/
            )
            expect(verifyRegMatch).not.equal(null)
        })
    })

    describe('genUserSignUpProof CLI subcommand', () => {
        it('should generate user sign up proof', async () => {
            const command =
                `npx ts-node cli/index.ts genUserSignUpProof` +
                ` -x ${unirepContract.address} ` +
                ` -id ${userIdentity} ` +
                ` -a ${attesterId} `

            console.log(command)
            const output = exec(command).stdout.trim()
            console.log(output)

            const signUpProofRegMatch = output.match(
                /(Unirep.signUp.proof.[a-zA-Z0-9\-\_]+)/
            )
            const epochKeyRegMatch = output.match(
                /Epoch key of the user: ([0-9]+)/
            )
            const publicSignalRegMatch = output.match(
                /(Unirep.signUp.publicSignals.[a-zA-Z0-9]+)/
            )
            signUpProof = signUpProofRegMatch[1]
            epk = epochKeyRegMatch[1]
            signUpPublicSignals = publicSignalRegMatch[1]
        })
    })

    describe('verifyUserSignUpProof CLI subcommand', () => {
        it('should verify user sign up proof', async () => {
            const command =
                `npx ts-node cli/index.ts verifyUserSignUpProof` +
                ` -x ${unirepContract.address} ` +
                ` -pf ${signUpProof} ` +
                ` -p ${signUpPublicSignals}`

            console.log(command)
            const output = exec(command).stdout.trim()
            console.log(output)

            const verifyRegMatch = output.match(
                /Verify user sign up proof from attester 1 succeed/
            )
            expect(verifyRegMatch).not.equal(null)
        })
    })

    describe('giveAirdrop CLI subcommand', () => {
        it('should submit an airdrop request by an attester', async () => {
            const command =
                `npx ts-node cli/index.ts giveAirdrop` +
                ` -x ${unirepContract.address} ` +
                ` -d ${attesterPrivKey}` +
                ` -pf ${signUpProof} ` +
                ` -p ${signUpPublicSignals}`

            console.log(command)
            const output = exec(command).stdout.trim()
            console.log(output)

            const verifyRegMatch = output.match(
                /Verify user sign up proof from attester 1 succeed/
            )
            expect(verifyRegMatch).not.equal(null)
            const txRegMatch = output.match(
                /Transaction hash: 0x[a-fA-F0-9]{64}/
            )
            expect(txRegMatch).not.equal(null)
        })
    })

    describe('spendReputation CLI subcommand', () => {
        it('should submit a spendReputation transaction', async () => {
            const command =
                `npx ts-node cli/index.ts spendReputation` +
                ` -x ${unirepContract.address} ` +
                ` -d ${attesterPrivKey}` +
                ` -pf ${userRepProof} ` +
                ` -p ${repPublicSignals}`

            console.log(command)
            const output = exec(command).stdout.trim()
            console.log(output)

            const verifyRegMatch = output.match(
                /Verify reputation proof from attester 1 .+, succeed/
            )
            expect(verifyRegMatch).not.equal(null)
            const txRegMatch = output.match(
                /Transaction hash: 0x[a-fA-F0-9]{64}/
            )
            expect(txRegMatch).not.equal(null)
        })
    })
})
