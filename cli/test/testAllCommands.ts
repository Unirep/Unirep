import base64url from 'base64url'
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { genIdentityCommitment, unSerialiseIdentity } from 'libsemaphore'
import chai from "chai"

const { expect } = chai

import { DEFAULT_ETH_PROVIDER } from '../../cli/defaults'
import { genUnirepStateFromContract, UnirepState } from '../../core'
import { exec } from './utils'

import Unirep from "../../artifacts/contracts/Unirep.sol/Unirep.json"
import { hashOne } from "maci-crypto"
import { identityCommitmentPrefix, identityPrefix } from '../prefix'

describe('test all CLI subcommands', function() {
    this.timeout(500000)

    let deployerPrivKey
    let deployerAddr
    let attesterPrivKey
    let attesterAddr
    let userPrivKey
    let userAddr
    
    const startBlock = 0
    const attestingFee = ethers.BigNumber.from(10).pow(18)
    const epochKeyNonce = 0
    const epochLength = 5
    let unirepContract: ethers.Contract
    let unirepState: UnirepState
    
    let userIdentity, userIdentityCommitment
    const attesterId = 1
    let epk, epkProof
    const posRep = 5, negRep = 4, graffitiPreimage = 0, graffiti = hashOne(BigInt(graffitiPreimage))
    const minPosRep = 0, maxNegRep = 10
    let userRepProof

    before(async() => {
        deployerPrivKey = ethers.utils.solidityKeccak256(['uint'], [0])
        deployerAddr = ethers.utils.computeAddress(deployerPrivKey)
        userPrivKey = ethers.utils.solidityKeccak256(['uint'], [1])
        userAddr = ethers.utils.computeAddress(userPrivKey)
        attesterPrivKey = ethers.utils.solidityKeccak256(['uint'], [2])
        attesterAddr = ethers.utils.computeAddress(attesterPrivKey)

        // Transfer ether so they can execute transactions
        const defaultAccount: ethers.Signer = (await hardhatEthers.getSigners())[0]
        await defaultAccount.sendTransaction({to: deployerAddr, value: ethers.utils.parseEther('10'), gasLimit: 21000})
        await defaultAccount.sendTransaction({to: userAddr, value: ethers.utils.parseEther('10'), gasLimit: 21000})
        await defaultAccount.sendTransaction({to: attesterAddr, value: ethers.utils.parseEther('10'), gasLimit: 21000})
    })

    describe('deploy CLI subcommand', () => {
        it('should deploy a Unirep contract', async () => {
            const command = `npx ts-node cli/index.ts deploy` +
                ` -d ${deployerPrivKey} ` + 
                ` -l ${epochLength} ` +
                ` -f ${attestingFee.toString()} `

            const output = exec(command).stdout.trim()

            console.log(command)
            console.log(output)

            const regMatch = output.match(/Unirep: (0x[a-fA-F0-9]{40})$/)
            const unirepAddress = regMatch[1]

            const provider = new hardhatEthers.providers.JsonRpcProvider(DEFAULT_ETH_PROVIDER)
            unirepContract = new ethers.Contract(
                unirepAddress,
                Unirep.abi,
                provider,
            )

            unirepState = await genUnirepStateFromContract(
                provider,
                unirepAddress,
                startBlock,
            )

            expect(unirepState.epochLength).equal(epochLength)
            expect(unirepState.attestingFee).equal(attestingFee)
        })
    })

    describe('genUserIdentity CLI subcommand', () => {
        it('should generate an identity for user', async () => {
            const command = `npx ts-node cli/index.ts genUnirepIdentity`

            const output = exec(command).stdout.trim()

            console.log(command)
            console.log(output)

            const idRegMatch = output.match(/^(Unirep.identity.[a-zA-Z0-9\-\_]+)\n/)
            const encodedIdentity = idRegMatch[1]
            const serializedIdentity = base64url.decode(encodedIdentity.slice(identityPrefix.length))
            const _userIdentity = unSerialiseIdentity(serializedIdentity)

            const commitmentRegMatch = output.match(/(Unirep.identityCommitment.[a-zA-Z0-9\-\_]+)$/)
            const encodedIdentityCommitment = commitmentRegMatch[1]
            const serializedIdentityCommitment = base64url.decode(encodedIdentityCommitment.slice(identityCommitmentPrefix.length))
            const _userIdentityCommitment = genIdentityCommitment(_userIdentity)
            expect(serializedIdentityCommitment).equal(_userIdentityCommitment.toString(16))

            userIdentity = encodedIdentity
            userIdentityCommitment = encodedIdentityCommitment
        })
    })

    describe('userSignup CLI subcommand', () => {
        it('should sign user up', async () => {
            const command = `npx ts-node cli/index.ts userSignUp` +
                ` -x ${unirepContract.address} ` +
                ` -c ${userIdentityCommitment} ` +
                ` -d ${userPrivKey} `

            const output = exec(command).stdout.trim()

            console.log(command)
            console.log(output)

            const signUpRegMatch = output.match(/Sign up epoch: 1/)
            expect(signUpRegMatch).not.equal(null)
        })
    })

    describe('attesterSignUp CLI subcommand', () => {
        it('should sign attester up', async () => {
            const command = `npx ts-node cli/index.ts attesterSignUp` +
                ` -x ${unirepContract.address} ` +
                ` -d ${attesterPrivKey} `

            const output = exec(command).stdout.trim()

            console.log(command)
            console.log(output)

            const signUpRegMatch = output.match(/Attester sign up with attester id: 1/)
            expect(signUpRegMatch).not.equal(null)
        })
    })

    describe('genEpochKeyAndProof CLI subcommand', () => {
        it('should generate epoch key proof', async () => {
            const command = `npx ts-node cli/index.ts genEpochKeyAndProof` +
                ` -x ${unirepContract.address} ` +
                ` -id ${userIdentity} ` +
                ` -n ${epochKeyNonce} `

            const output = exec(command).stdout.trim()

            console.log(command)
            console.log(output)

            const epkRegMatch = output.match(/Epoch key of epoch 1 and nonce 0: ([a-fA-F0-9]+)/)
            epk = epkRegMatch[1]
            const epkProofRegMatch = output.match(/(Unirep.epkProof.[a-zA-Z0-9\-\_]+)$/)
            epkProof = epkProofRegMatch[1]
        })
    })

    describe('verifyEpochKeyProof CLI subcommand', () => {
        it('should verify epoch key proof', async () => {
            const command = `npx ts-node cli/index.ts verifyEpochKeyProof` +
                ` -x ${unirepContract.address} ` +
                ` -epk ${epk} ` +
                ` -pf ${epkProof} `

            const output = exec(command).stdout.trim()

            console.log(command)
            console.log(output)

            const verifyRegMatch = output.match(/Verify epoch key proof with epoch key [a-fA-F0-9]+ succeed/)
            expect(verifyRegMatch).not.equal(null)
        })
    })

    describe('attest CLI subcommand', () => {
        it('should attest to user', async () => {
            const command = `npx ts-node cli/index.ts attest` +
                ` -x ${unirepContract.address} ` +
                ` -d ${attesterPrivKey} ` +
                ` -epk ${epk} ` +
                ` -id ${userIdentity} ` +
                ` -n ${epochKeyNonce} ` +
                ` -pr ${posRep} ` +
                ` -nr ${negRep} ` +
                ` -gf ${graffiti.toString(16)} `

            const output = exec(command).stdout.trim()

            console.log(command)
            console.log(output)

            const txRegMatch = output.match(/Transaction hash: 0x[a-fA-F0-9]{64}/)
            expect(txRegMatch).not.equal(null)
        })
    })

    describe('epochTransition CLI subcommand', () => {
        it('should transition to next epoch', async () => {
            const command = `npx ts-node cli/index.ts epochTransition` +
                ` -x ${unirepContract.address} ` +
                ` -d ${deployerPrivKey} ` +
                ` -t `

            const output = exec(command).stdout.trim()

            console.log(command)
            console.log(output)

            const epochEndRegMatch = output.match(/End of epoch: 1/)
            expect(epochEndRegMatch).not.equal(null)
        })
    })

    describe('userStateTransition CLI subcommand', () => {
        it('should transition user state', async () => {
            const command = `npx ts-node cli/index.ts userStateTransition` +
                ` -x ${unirepContract.address} ` +
                ` -d ${userPrivKey} ` +
                ` -id ${userIdentity} `

            const output = exec(command).stdout.trim()

            console.log(command)
            console.log(output)

            const userTransitionRegMatch = output.match(/User transitioned from epoch 1 to epoch 2/)
            expect(userTransitionRegMatch).not.equal(null)
        })
    })

    describe('genReputationProof CLI subcommand', () => {
        it('should generate user reputation proof', async () => {
            const command = `npx ts-node cli/index.ts genReputationProof` +
                ` -x ${unirepContract.address} ` +
                ` -id ${userIdentity} ` +
                ` -a ${attesterId} ` +
                ` -mp ${minPosRep} ` +
                // ` -mn ${maxNegRep} ` +
                ` -gp ${graffitiPreimage} `

            const output = exec(command).stdout.trim()

            console.log(command)
            console.log(output)

            const userRepProofRegMatch = output.match(/(Unirep.reputationProof.[a-zA-Z0-9\-\_]+)$/)
            userRepProof = userRepProofRegMatch[1]
        })
    })

    describe('verifyReputationProof CLI subcommand', () => {
        it('should verify user reputation proof', async () => {
            const command = `npx ts-node cli/index.ts verifyReputationProof` +
                ` -x ${unirepContract.address} ` +
                ` -a ${attesterId} ` +
                ` -mp ${minPosRep} ` +
                // ` -mn ${maxNegRep} ` +
                ` -gp ${graffitiPreimage} ` +
                ` -pf ${userRepProof} `

            const output = exec(command).stdout.trim()

            console.log(command)
            console.log(output)

            const verifyRegMatch = output.match(/Verify reputation proof from attester 1 .+, succeed/)
            expect(verifyRegMatch).not.equal(null)
        })
    })
})