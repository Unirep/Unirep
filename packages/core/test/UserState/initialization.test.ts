// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { ZkIdentity } from '@unirep/crypto'
import { deployUnirep } from '@unirep/contracts'

import { genUserState, genNewGST } from '../utils'

describe('User sign up events in Unirep User State', function () {
    this.timeout(0)

    const maxUsers = 10

    describe('Init User State', async () => {
        it('check User state matches the contract', async () => {
            const accounts = await ethers.getSigners()
            const unirepContract = await deployUnirep(accounts[0], {
                maxUsers,
            })
            const id = new ZkIdentity()
            const initUnirepState = await genUserState(
                ethers.provider,
                unirepContract.address,
                id
            )

            const contractEpoch = await unirepContract.currentEpoch()
            const unirepEpoch =
                await initUnirepState.getUnirepStateCurrentEpoch()
            expect(unirepEpoch).equal(Number(contractEpoch))

            const unirepGSTree = await initUnirepState.genGSTree(unirepEpoch)
            const defaultGSTree = genNewGST(
                initUnirepState.settings.globalStateTreeDepth,
                initUnirepState.settings.userStateTreeDepth
            )
            expect(unirepGSTree.root).equal(defaultGSTree.root)
            await initUnirepState.stop()
        })
    })
})
