// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import { ZkIdentity } from '@unirep/crypto'
import { deployUnirep, Unirep } from '@unirep/contracts'

import { genUserState } from '../../src'
import { genNewGST } from '../utils'

describe('User sign up events in Unirep User State', function () {
    this.timeout(0)

    let accounts: ethers.Signer[]
    const maxUsers = 10

    let unirepContract: Unirep
    let treeDepths

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], {
            maxUsers,
        })
        treeDepths = await unirepContract.treeDepths()
    })

    describe('Init User State', async () => {
        it('check User state matches the contract', async () => {
            const id = new ZkIdentity()
            const initUnirepState = await genUserState(
                hardhatEthers.provider,
                unirepContract.address,
                id
            )

            const contractEpoch = await unirepContract.currentEpoch()
            const unirepEpoch = initUnirepState.getUnirepStateCurrentEpoch()
            expect(unirepEpoch).equal(Number(contractEpoch))

            const unirepGSTree =
                initUnirepState.getUnirepStateGSTree(unirepEpoch)
            const defaultGSTree = genNewGST(
                treeDepths.globalStateTreeDepth,
                treeDepths.userStateTreeDepth
            )
            expect(unirepGSTree.root).equal(defaultGSTree.root)
        })
    })
})
