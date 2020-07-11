import { ethers } from "@nomiclabs/buidler"
import { Signer, Wallet } from "ethers"
import chai from "chai"
import { deployContract, solidity } from "ethereum-waffle"
import { genRandomSalt, hash5, hashLeftRight } from '../crypto/crypto'
import { linkLibrary } from './utils'

chai.use(solidity)
const { expect } = chai

import Hasher from "../artifacts/Hasher.json"
import PoseidonT3 from "../artifacts/PoseidonT3.json"
import PoseidonT6 from "../artifacts/PoseidonT6.json"

let hasherContract
let PoseidonT3Contract, PoseidonT6Contract

describe('Hasher', () => {
    before(async () => {
        let accounts: Signer[]
        accounts = await ethers.getSigners()

        console.log('Deploying PoseidonT3')
        PoseidonT3Contract = (await deployContract(
            <Wallet>accounts[0],
            PoseidonT3
        ))
        console.log('Deploying PoseidonT6')
        PoseidonT6Contract = (await deployContract(
            <Wallet>accounts[0],
            PoseidonT6
        ))

        // Link the Hasher contract to PoseidonT3 contract
        linkLibrary(Hasher, 'contracts/Poseidon.sol:PoseidonT3', PoseidonT3Contract.address)
        // Link the Hasher contract to PoseidonT6 contract
        linkLibrary(Hasher, 'contracts/Poseidon.sol:PoseidonT6', PoseidonT6Contract.address)

        console.log('Deploying Hasher')
        hasherContract = (await deployContract(
            <Wallet>accounts[0],
            Hasher
        ))
    })

    it('crypto.hashLeftRight should match hasher.hashLeftRight', async () => {
        const left = genRandomSalt()
        const right = genRandomSalt()
        const hashed = hashLeftRight(left, right)

        const onChainHash = await hasherContract.hashLeftRight(left.toString(), right.toString())
        expect(onChainHash.toString()).equal(hashed.toString())
    })

    it('crypto.hash5 should match hasher.hash5', async () => {
        const values: string[] = []
        for (let i = 0; i < 5; i++) {
            values.push(genRandomSalt().toString())
        }
        const hashed = hash5(values)

        const onChainHash = await hasherContract.hash5(values)
        expect(onChainHash.toString()).equal(hashed.toString())
    })
})