import { ethers } from "@nomiclabs/buidler"
import { Signer, Wallet } from "ethers"
import chai from "chai"
import { deployContract, link, solidity } from "ethereum-waffle"
import { genRandomSalt, hashLeftRight } from '../crypto/crypto'

chai.use(solidity)
const { expect } = chai

import Hasher from "../artifacts/Hasher.json"
import PoseidonT3 from "../artifacts/PoseidonT3.json"

let hasherContract
let PoseidonT3Contract

describe('Hasher', () => {
    before(async () => {
        let accounts: Signer[]
        accounts = await ethers.getSigners()

        console.log('Deploying Poseidon')
        PoseidonT3Contract = (await deployContract(
            <Wallet>accounts[0],
            PoseidonT3
        ))

        // Link the Hasher contract to PoseidonT3 contract
        let linkableContract = {
            evm: {
                bytecode: {
                    object: Hasher.bytecode,
                }
            }
        }
        link(linkableContract, 'contracts/Poseidon.sol:PoseidonT3', PoseidonT3Contract.address);
        Hasher.bytecode = linkableContract.evm.bytecode.object

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
})