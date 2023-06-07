//@ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'

describe('Unirep App', function () {
    let mockUnirep
    let app
    let reimburseAttestation

    const epochLength = 300
    let startTime = 0
    let user
    let publicSignals
    let proof = [0, 1, 2, 3, 4, 5, 6, 7]

    it('deployment', async function () {
        const [caller] = await ethers.getSigners()
        user = caller.address

        // deploy mock mockUnirep contract
        console.log('Deploying MockUnirep Contract')
        const MockUnirep = await ethers.getContractFactory('MockUnirep')
        mockUnirep = await MockUnirep.deploy()
        await mockUnirep.deployed()
        console.log(
            `MockUnirep contract with epoch length ${epochLength} is deployed to ${mockUnirep.address}`
        )

        // deploy attester contract
        console.log('Deploying ExampleAttester Contract')
        const App = await ethers.getContractFactory('ExampleAttester')
        app = await App.deploy(mockUnirep.address, epochLength)
        await app.deployed()
        console.log(
            `ExampleAttester contract with epoch length ${epochLength} is deployed to ${app.address}`
        )
        publicSignals = [0, 1, app.address, 3]

        // deploy ReimburseAttestation contract
        console.log('Deploying Reimburse Attestation Contract')
        const ReimburseAttestation = await ethers.getContractFactory(
            'ReimburseAttestation'
        )
        reimburseAttestation = await ReimburseAttestation.deploy(
            mockUnirep.address,
            app.address
        )
        await reimburseAttestation.deployed()
        console.log(
            `ReimburseAttestation contract with epoch length ${epochLength} is deployed to ${reimburseAttestation.address}`
        )
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
        await app.addToWhitelist([user], user)

        const userInitialBalance = await ethers.provider.getBalance(user)

        const appInitialBalance = await ethers.provider.getBalance(app.address)

        const tx = await app.userSignUp(publicSignals, proof)

        const appFinalBalance = await ethers.provider.getBalance(app.address)

        const reimbursement = appInitialBalance - appFinalBalance

        expect(tx).to.emit(app, 'Reimbursed').withArgs(user, reimbursement, 0)

        const userFinalBalance = await ethers.provider.getBalance(user)

        console.log('userInitialBalance: ' + BigInt(userInitialBalance))
        console.log('userFinalBalance: ' + BigInt(userFinalBalance))
        console.log(
            'difference between final balance and initial balance: ' +
                (BigInt(userFinalBalance) - BigInt(userInitialBalance))
        )
        console.log('reimbursement: ' + BigInt(reimbursement))
        expect(BigInt(userFinalBalance.toString())).equal(
            BigInt(userInitialBalance) + BigInt(reimbursement)
        )
    })

    it('user state transition', async () => {
        const oldEpoch = await mockUnirep.attesterCurrentEpoch(app.address)
        for (;;) {
            await ethers.provider.send('evm_mine', [])
            const newEpoch = await mockUnirep.attesterCurrentEpoch(app.address)
            if (oldEpoch + 1 == newEpoch) break
        }
        const newEpoch = await mockUnirep.attesterCurrentEpoch(app.address)
        const tx = await app.userStateTransition(publicSignals, proof)
        const receipt = await tx.wait()

        expect(receipt.status).equal(1)
    })
})
