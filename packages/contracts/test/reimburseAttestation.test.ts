//@ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { deployUnirep } from '@unirep/contracts/deploy'
import { Identity } from '@semaphore-protocol/identity'
import { schema, UserState } from '@unirep/core'
import { SQLiteConnector } from 'anondb/node'

import { defaultProver as prover } from '@unirep/circuits/provers/defaultProver'

async function genUserState(id, app) {
    // generate a user state
    const db = await SQLiteConnector.create(schema, ':memory:')
    const unirepAddress = await app.unirep()
    const attesterId = BigInt(app.address)
    const userState = new UserState(
        {
            db,
            prover,
            unirepAddress,
            provider: ethers.provider,
            attesterId,
        },
        id
    )
    await userState.sync.start()
    await userState.waitForSync()
    return userState
}

describe('Unirep App', function () {
    let unirep
    let app
    let reimburseAttestation

    const epochLength = 300
    let startTime = 0
    const id = new Identity()
    let owner

    it('deployment', async function () {
        // deploy Unirep contract
        const [deployer] = await ethers.getSigners()
        owner = deployer.address
        console.log('deployer ' + deployer.address)
        unirep = await deployUnirep(deployer)
        console.log(
            `Unirep contract with epoch length ${epochLength} is deployed to ${unirep.address}`
        )

        // deploy attester contract
        console.log('Deploying ExampleAttester Contract')
        const App = await ethers.getContractFactory('ExampleAttester')
        app = await App.deploy(unirep.address, epochLength)
        await app.deployed()
        console.log(
            `ExampleAttester contract with epoch length ${epochLength} is deployed to ${app.address}`
        )

        // deploy ReimburseAttestation contract
        console.log('Deploying Reimburse Attestation Contract')
        const ReimburseAttestation = await ethers.getContractFactory(
            'ReimburseAttestation'
        )
        reimburseAttestation = await ReimburseAttestation.deploy(
            unirep.address,
            app.address
        )
        await reimburseAttestation.deployed()
        console.log(
            `ReimburseAttestation contract with epoch length ${epochLength} is deployed to ${reimburseAttestation.address}`
        )
        startTime = (
            await unirep.attesterStartTimestamp(app.address)
        ).toNumber()
    })

    it('Should receive donation correctly', async () => {
        const [donor] = await ethers.getSigners()
        const initialBalance = await ethers.provider.getBalance(app.address)
        const tx = await app
            .connect(donor)
            .donate({ value: ethers.utils.parseEther('1') })
        await tx.wait()
        const finalBalance = await ethers.provider.getBalance(app.address)
        expect(finalBalance).to.equal(
            initialBalance.add(ethers.utils.parseEther('1'))
        )
    })

    it('user sign up', async () => {
        const userState = await genUserState(id, app)
        const { publicSignals, proof } = await userState.genUserSignUpProof()
        await app.addToWhitelist([owner], owner)
        const tx = await app.userSignUp(publicSignals, proof)
        const receipt = await tx.wait()

        expect(receipt.status).equal(1)
        // TODO: find something equivalent to numUserSignUPs in unirep contract
        // const numUserSignUPs = await unirep.numUserSignUPs
        // expect(1).equal(numUserSignUPs)
        userState.sync.stop()
    })

    it('user state transition', async () => {
        const oldEpoch = await unirep.attesterCurrentEpoch(app.address)
        const timestamp = Math.floor(+new Date() / 1000)
        // const waitTime = startTime + epochLength - timestamp

        for (;;) {
            // await new Promise((resolve) => setTimeout(resolve, waitTime * 1000))
            await ethers.provider.send('evm_mine', [])
            const newEpoch = await unirep.attesterCurrentEpoch(app.address)
            if (oldEpoch + 1 == newEpoch) break
        }
        const newEpoch = await unirep.attesterCurrentEpoch(app.address)
        const userState = await genUserState(id, app)
        const { publicSignals, proof } =
            await userState.genUserStateTransitionProof({
                toEpoch: newEpoch,
            })
        await unirep
            .userStateTransition(publicSignals, proof)
            .then((t) => t.wait())
    })
})
