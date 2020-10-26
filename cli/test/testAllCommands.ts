import { ethers } from "hardhat"
import { Contract, Signer, providers, utils, BigNumber } from 'ethers'
import { genIdentityCommitment, unSerialiseIdentity } from 'libsemaphore'
import chai from "chai"

const { expect } = chai

import { DEFAULT_ETH_PROVIDER } from '../../cli/defaults'
import { genUnirepStateFromContract, UnirepState } from '../../core'
import { exec } from './utils'

import Unirep from "../../artifacts/contracts/Unirep.sol/Unirep.json"
import { hashOne } from "maci-crypto"

describe('test all CLI subcommands', function() {
    this.timeout(500000)

    let deployerPrivKey
    let deployerAddr
    let attesterPrivKey
    let attesterAddr
    let userPrivKey
    let userAddr
    
    const startBlock = 0
    const attestingFee = BigNumber.from(10).pow(18)
    const maxEpochKeyNonce = 0
    const epochKeyNonce = 0
    const epochLength = 5
    let unirepContract: Contract
    let unirepState: UnirepState
    
    let serializedIdentity, serializedIdentityCommitment
    let userIdentity, userIdentityCommitment
    const attesterId = 1
    let epk, epkProof
    const posRep = 10, negRep = 8, graffitiPreimage = 0, graffiti = hashOne(BigInt(graffitiPreimage))
    const minPosRep = 0, maxNegRep = 10
    let userRepProof

    before(async() => {
        deployerPrivKey = utils.solidityKeccak256(['uint'], [0])
        deployerAddr = utils.computeAddress(deployerPrivKey)
        userPrivKey = utils.solidityKeccak256(['uint'], [1])
        userAddr = utils.computeAddress(userPrivKey)
        attesterPrivKey = utils.solidityKeccak256(['uint'], [2])
        attesterAddr = utils.computeAddress(attesterPrivKey)

        // Transfer ether so they can execute transactions
        const defaultAccount: Signer = (await ethers.getSigners())[0]
        await defaultAccount.sendTransaction({to: deployerAddr, value: utils.parseEther('10'), gasLimit: 21000})
        await defaultAccount.sendTransaction({to: userAddr, value: utils.parseEther('10'), gasLimit: 21000})
        await defaultAccount.sendTransaction({to: attesterAddr, value: utils.parseEther('10'), gasLimit: 21000})
    })

    describe('deploy CLI subcommand', () => {
        it('should deploy a Unirep contract', async () => {
            const command = `npx ts-node cli/index.ts deploy` +
                ` -d ${deployerPrivKey} ` + 
                ` -kn ${maxEpochKeyNonce} ` +
                ` -l ${epochLength} ` +
                ` -f ${attestingFee.toString()} `

            const output = exec(command).stdout.trim()

            console.log(command)
            console.log(output)

            const regMatch = output.match(/Unirep: (0x[a-fA-F0-9]{40})$/)
            const unirepAddress = regMatch[1]

            const provider = new providers.JsonRpcProvider(DEFAULT_ETH_PROVIDER)
            unirepContract = new Contract(
                unirepAddress,
                Unirep.abi,
                provider,
            )

            unirepState = await genUnirepStateFromContract(
                provider,
                unirepAddress,
                startBlock,
            )

            expect(unirepState.maxEpochKeyNonce).equal(maxEpochKeyNonce)
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

            const idRegMatch = output.match(/^Identity: (\"\[[a-fA-F0-9,"\\]+\]\")\n/)
            serializedIdentity = idRegMatch[1]
            userIdentity = unSerialiseIdentity(JSON.parse(serializedIdentity))
            const commitmentRegMatch = output.match(/Identity Commitment: ([a-fA-F0-9]+)$/)
            serializedIdentityCommitment = commitmentRegMatch[1]
            userIdentityCommitment = genIdentityCommitment(userIdentity)
            expect(serializedIdentityCommitment).equal(userIdentityCommitment.toString(16))
        })
    })

    describe('userSignup CLI subcommand', () => {
        it('should sign user up', async () => {
            const command = `npx ts-node cli/index.ts userSignup` +
                ` -x ${unirepContract.address} ` +
                ` -c ${serializedIdentityCommitment} ` +
                ` -d ${userPrivKey} `

            const output = exec(command).stdout.trim()

            console.log(command)
            console.log(output)

            const signUpRegMatch = output.match(/Sign up epoch: 1/)
            expect(signUpRegMatch).not.equal(null)
        })
    })

    describe('attesterSignup CLI subcommand', () => {
        it('should sign attester up', async () => {
            const command = `npx ts-node cli/index.ts attesterSignup` +
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
                ` -id ${serializedIdentity} ` +
                ` -n ${epochKeyNonce} `

            const output = exec(command).stdout.trim()

            console.log(command)
            console.log(output)

            const epkRegMatch = output.match(/Epoch key of epoch 1 and nonce 0: ([a-fA-F0-9]+)/)
            epk = epkRegMatch[1]
            const epkProofRegMatch = output.match(/Epoch key proof: (\"\{[a-zA-F0-9_:,"\\\[\]]+\}\")/)
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
                ` -id ${serializedIdentity} ` +
                ` -n ${epochKeyNonce} `

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
                ` -id ${serializedIdentity} ` +
                ` -a ${attesterId} ` +
                ` -mp ${minPosRep} ` +
                ` -mn ${maxNegRep} ` +
                ` -gp ${graffitiPreimage} `

            const output = exec(command).stdout.trim()

            console.log(command)
            console.log(output)

            const userRepProofRegMatch = output.match(/Proof of reputation from attester 1: (\"\{[a-zA-F0-9_:,"\\\[\]]+\}\")/)
            userRepProof = userRepProofRegMatch[1]
        })
    })

    describe('verifyReputationProof CLI subcommand', () => {
        it('should verify user reputation proof', async () => {
            const command = `npx ts-node cli/index.ts verifyReputationProof` +
                ` -x ${unirepContract.address} ` +
                ` -a ${attesterId} ` +
                ` -mp ${minPosRep} ` +
                ` -mn ${maxNegRep} ` +
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