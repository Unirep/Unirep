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
    let postID
    
    const startBlock = 0
    const attestingFee = ethers.BigNumber.from(10).pow(18)
    const epochKeyNonce = 0
    const epochKeyNonce2 = 1
    const postNonce = 0
    const commentNonce = 10
    const attestNonce = 15
    const epochLength = 5
    let unirepContract: ethers.Contract
    let unirepState: UnirepState
    const dbOption = ``
    // const dbOption = ` -db`
    
    let userIdentity1, userIdentityCommitment1, userIdentity2, userIdentityCommitment2
    const attesterId = 1
    let epk, epkProof
    const text = "postText"
    const text2 = "commentText"
    const posRep = 3, negRep = 8, graffitiPreimage = 0, graffiti = hashOne(BigInt(graffitiPreimage))
    const minPosRep = 0, maxNegRep = 10, minRepDiff = 15
    let userRepProof
    let transactionHash

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
        it('should generate an identity for user 1', async () => {
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

            userIdentity1 = encodedIdentity
            userIdentityCommitment1 = encodedIdentityCommitment
        })
        it('should generate an identity for user 2', async () => {
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

            userIdentity2 = encodedIdentity
            userIdentityCommitment2 = encodedIdentityCommitment
        })
    })

    describe('userSignup CLI subcommand', () => {
        it('should sign user 1 up', async () => {
            const command = `npx ts-node cli/index.ts userSignup` +
                ` -x ${unirepContract.address} ` +
                ` -c ${userIdentityCommitment1} ` +
                ` -d ${userPrivKey} `

            const output = exec(command).stdout.trim()

            console.log(command)
            console.log(output)

            const signUpRegMatch = output.match(/Sign up epoch: 1/)
            expect(signUpRegMatch).not.equal(null)
        })

        it('should sign user 2 up', async () => {
            const command = `npx ts-node cli/index.ts userSignup` +
                ` -x ${unirepContract.address} ` +
                ` -c ${userIdentityCommitment2} ` +
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

        it('should sign user up', async () => {
            const command = `npx ts-node cli/index.ts attesterSignup` +
                ` -x ${unirepContract.address} ` +
                ` -d ${userPrivKey} `

            const output = exec(command).stdout.trim()

            console.log(command)
            console.log(output)

            const signUpRegMatch = output.match(/Attester sign up with attester id: 2/)
            expect(signUpRegMatch).not.equal(null)
        })
    })

    describe('genEpochKeyAndProof CLI subcommand', () => {
        it('should generate epoch key proof', async () => {
            const command = `npx ts-node cli/index.ts genEpochKeyAndProof` +
                ` -x ${unirepContract.address} ` +
                ` -id ${userIdentity1} ` +
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

    describe('publishPost CLI subcommand', () => {
        it('should publish a post', async () => {
            const command = `npx ts-node cli/index.ts publishPost` +
                ` -x ${unirepContract.address} ` +
                ` -tx ${text}` +
                ` -d ${userPrivKey}` +
                ` -id ${userIdentity1}` +
                ` -n ${epochKeyNonce}` + 
                ` -kn ${postNonce}` +
                dbOption

            const output = exec(command).stdout.trim()

            console.log(command)
            console.log(output)

            const epkRegMatch = output.match(/Epoch key of epoch 1 and nonce 0: ([a-fA-F0-9]+)/)
            epk = epkRegMatch[1]

            const idRegMatch = output.match(/Post ID: ([a-fA-F0-9]+)/)
            postID = idRegMatch[1]
            const postRegMatch = output.match(/Transaction hash: 0x[a-fA-F0-9]{64}/)
            expect(postRegMatch).not.equal(null)
            if(postRegMatch){
                transactionHash =postRegMatch[0].split('Transaction hash: ')[1]
            }
            const userRepProofRegMatch = output.match(/(Unirep\.reputationProof\.[a-zA-Z0-9\-\_]+)$/)
            expect(userRepProofRegMatch).not.equal(null)
            userRepProof = userRepProofRegMatch[1]
        })
    })

    describe('verifyReputationProof CLI subcommand', () => {
        it('should verify epoch key proof', async () => {
            const command = `npx ts-node cli/index.ts verifyReputationProof` +
                ` -x ${unirepContract.address} ` +
                ` -epk ${epk} ` +
                ` -pf ${userRepProof} ` +
                ` -th ${transactionHash}` +
                ` -act publishPost`

            const output = exec(command).stdout.trim()

            console.log(command)
            console.log(output)

            const verifyRegMatch = output.match(/Verify reputation proof of epoch key [a-zA-Z0-9 ]+ succeed/)
            expect(verifyRegMatch).not.equal(null)
        })
    })

    describe('listAllPosts CLI subcommand', () => {
        it('should list all posts', async () => {
            const command = `npx ts-node cli/index.ts listAllPosts` +
                ` -x ${unirepContract.address} ` 

            const output = exec(command).stdout.trim()

            console.log(command)
            console.log(output)

            const postRegMatch = output.match(/Post/)
            expect(postRegMatch).not.equal(null)
        })
    })

    describe('leaveComment CLI subcommand', () => {
        it('should leave a comment', async () => {
            const command = `npx ts-node cli/index.ts leaveComment` +
                ` -x ${unirepContract.address} ` +
                ` -pid ${postID} ` +
                ` -tx ${text2}` +
                ` -d ${userPrivKey}` +
                ` -id ${userIdentity1}` +
                ` -n ${epochKeyNonce2}` +
                ` -kn ${commentNonce}` +
                ` -mr ${minRepDiff}` +
                dbOption

            const output = exec(command).stdout.trim()

            console.log(command)
            console.log(output)

            const commentRegMatch = output.match(/Transaction hash: 0x[a-fA-F0-9]{64}/)
            expect(commentRegMatch).not.equal(null)
        })
    })


    describe('upvote CLI subcommand', () => {
        it('should upvote to user', async () => {
            const command = `npx ts-node cli/index.ts vote` +
                ` -x ${unirepContract.address} ` +
                ` -d ${attesterPrivKey} ` +
                ` -epk ${epk} ` +
                ` -id ${userIdentity2}` +
                ` -n ${epochKeyNonce}` +
                ` -kn ${attestNonce}` +
                ` -uv ${posRep} ` +
                ` -gf ${graffiti.toString(16)} `  +
                dbOption

            const output = exec(command).stdout.trim()

            console.log(command)
            console.log(output)

            const epkRegMatch = output.match(/Epoch key of epoch 1 and nonce 0: ([a-fA-F0-9]+)/)
            epk = epkRegMatch[1]
            const txRegMatch = output.match(/Transaction hash: 0x[a-fA-F0-9]{64}/)
            expect(txRegMatch).not.equal(null)
            if(txRegMatch){
                transactionHash = txRegMatch[0].split('Transaction hash: ')[1]
            }
            const userRepProofRegMatch = output.match(/(Unirep\.reputationProof\.[a-zA-Z0-9\-\_]+)$/)
            expect(userRepProofRegMatch).not.equal(null)
            userRepProof = userRepProofRegMatch[1]
        })
    })

    describe('verifyReputationProof CLI subcommand', () => {
        it('should verify epoch key proof', async () => {
            const command = `npx ts-node cli/index.ts verifyReputationProof` +
                ` -x ${unirepContract.address} ` +
                ` -epk ${epk} ` +
                ` -pf ${userRepProof} ` +
                ` -th ${transactionHash}` +
                ` -act vote`

            const output = exec(command).stdout.trim()

            console.log(command)
            console.log(output)

            const verifyRegMatch = output.match(/Verify reputation proof of epoch key [a-zA-Z0-9 ]+ succeed/)
            expect(verifyRegMatch).not.equal(null)
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
        it('should transition user 1 state', async () => {
            const command = `npx ts-node cli/index.ts userStateTransition` +
                ` -x ${unirepContract.address} ` +
                ` -d ${userPrivKey} ` +
                ` -id ${userIdentity1} ` +
                dbOption

            const output = exec(command).stdout.trim()

            console.log(command)
            console.log(output)

            const userTransitionRegMatch = output.match(/User transitioned from epoch 1 to epoch 2/)
            expect(userTransitionRegMatch).not.equal(null)
        })

        it('should transition user 2 state', async () => {
            const command = `npx ts-node cli/index.ts userStateTransition` +
                ` -x ${unirepContract.address} ` +
                ` -d ${userPrivKey} ` +
                ` -id ${userIdentity2} ` + 
                dbOption

            const output = exec(command).stdout.trim()

            console.log(command)
            console.log(output)

            const userTransitionRegMatch = output.match(/User transitioned from epoch 1 to epoch 2/)
            expect(userTransitionRegMatch).not.equal(null)
        })
    })

    describe('genReputationProofFromAttester CLI subcommand', () => {
        it('should generate user reputation proof', async () => {
            const command = `npx ts-node cli/index.ts genReputationProofFromAttester` +
                ` -x ${unirepContract.address} ` +
                ` -id ${userIdentity1} ` +
                ` -a ${attesterId} ` +
                // ` -mp ${minPosRep} ` +
                ` -mn ${maxNegRep} ` +
                // ` -md ${minRepDiff}` +
                ` -gp ${graffitiPreimage} ` +
                dbOption

            const output = exec(command).stdout.trim()

            console.log(command)
            console.log(output)

            const userRepProofRegMatch = output.match(/(Unirep.reputationProofFromAttester.[a-zA-Z0-9\-\_]+)$/)
            userRepProof = userRepProofRegMatch[1]
        })
    })

    describe('verifyReputationProofFromAttester CLI subcommand', () => {
        it('should verify user reputation proof', async () => {
            const command = `npx ts-node cli/index.ts verifyReputationProofFromAttester` +
                ` -x ${unirepContract.address} ` +
                ` -a ${attesterId} ` +
                // ` -mp ${minPosRep} ` +
                ` -mn ${maxNegRep} ` +
                // ` -md ${minRepDiff}` +
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