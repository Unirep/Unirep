// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import { deployUnirep, Unirep } from '@unirep/contracts'

import { genUnirepState } from '../../src'
import { genNewGST } from '../utils'

describe('User sign up events in Unirep State', function () {
    this.timeout(0)

    let unirepContract: Unirep
    let treeDepths

    let accounts: ethers.Signer[]
    const maxUsers = 10

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], {
            maxUsers,
        })
        treeDepths = await unirepContract.treeDepths()
    })

    describe('Init Unirep State', async () => {
        it('check Unirep state matches the contract', async () => {
            const initUnirepState = await genUnirepState(
                hardhatEthers.provider,
                unirepContract.address
            )

            const contractEpoch = await unirepContract.currentEpoch()
            const unirepEpoch = initUnirepState.currentEpoch
            expect(unirepEpoch).equal(Number(contractEpoch))

            const unirepGSTLeaves = initUnirepState.getNumGSTLeaves(unirepEpoch)
            expect(unirepGSTLeaves).equal(0)

            const unirepGSTree = initUnirepState.genGSTree(unirepEpoch)
            const defaultGSTree = genNewGST(
                treeDepths.globalStateTreeDepth,
                treeDepths.userStateTreeDepth
            )
            expect(unirepGSTree.root).equal(defaultGSTree.root)
        })
    })
})
