import { ethers as hardhatEthers } from "hardhat"
import { BigNumber, utils } from 'ethers'
import * as crypto from 'crypto'

import chai from "chai"
import { genRandomSalt, hash5, hashLeftRight, hashOne } from "maci-crypto"
import { Attestation } from "../core"
const { expect } = chai


describe("ttt", function () {

    // it("sss", async function () {
    //     const height = 6
    //     // const zeroHash = hashLeftRight(BigInt(1), BigInt(0))
    //     const zeroHash = hash5([BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0)])
    //     const hashes: BigInt[] = [
    //         zeroHash,
    //     ]

    //     for (let i = 1; i < height; i++) {
    //         hashes[i] = hashLeftRight(hashes[i - 1], hashes[i - 1])
    //     }
    //     for (let i = 0; i < height; i++) {
    //         console.log(i, hashes[i])
    //     }
    // })
    it("sss", async function () {
        // const bn = genRandomSalt()
        const bn = BigInt(1)
        const a = BigNumber.from(255)
        console.log(a)
        console.log(BigInt(BigNumber.from(255)))
        console.log(BigNumber.from(BigInt(255)))

        // console.log(BigInt('0x176ff05d9c7c4528b04553217098a71cd076d52623dab894a7f7ee34116ca170'))
        // console.log(hashOne(BigInt(0)).toString(16))
        // console.log(BigNumber.from(0).gt(0))
        // expect(BigInt(2) == BigInt(BigNumber.from(3))).to.be.true
        // console.log(BigInt(2**200).valueOf())
        // console.log(BigInt(2**200) % BigInt(2) === BigInt(1), BigNumber.from(BigInt(2**200)).and(1))
        // console.log(BigInt(2**200).valueOf() + BigInt(2**200).valueOf() == BigInt(2**201).valueOf())
    })
})
