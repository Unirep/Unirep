import {
    keccak256,
    getCreate2Address,
    ContractFactory,
    Signer,
    TransactionResponse,
} from 'ethers'

export const globalDeployerAddress =
    '0x7A0D94F55792C434d74a40883C6ed8545E406D12'

const GlobalFactory = async (factory: ContractFactory, _signer: Signer) => {
    const signer = _signer ?? factory.runner

    if (signer?.provider === null) {
        throw new Error('Global Factory: should connect a provider')
    }
    const globalDeployerCode = await signer.provider?.getCode(
        globalDeployerAddress
    )
    if (globalDeployerCode === '0x') {
        // the address that will send the tx
        const globalDeployerDeployer =
            '0x4c8D290a1B368ac4728d83a9e8321fC3af2b39b1'
        // the raw presigned tx
        const deployTx =
            '0xf87e8085174876e800830186a08080ad601f80600e600039806000f350fe60003681823780368234f58015156014578182fd5b80825250506014600cf31ba02222222222222222222222222222222222222222222222222222222222222222a02222222222222222222222222222222222222222222222222222222222222222'
        // first fund the deployer deployer
        const balance = await signer.provider?.getBalance(
            globalDeployerDeployer
        )
        const estimatedGas = await signer.estimateGas({
            to: globalDeployerDeployer,
        })
        if (BigInt(balance.toString()) < estimatedGas) {
            // send that much to the deployer address
            await signer
                .sendTransaction({
                    to: globalDeployerDeployer,
                    value: estimatedGas.toString(),
                })
                .then((t) => t.wait())
        }
        // need to deploy
        await signer.provider
            ?.broadcastTransaction(deployTx)
            .then((t) => t.wait())
    }
    // now the global deployer should exist
    // return an object that mimics the original factory object
    return {
        deploy: async (...args) => {
            const { data, gasPrice } = await factory.getDeployTransaction(
                ...args
            )
            const address = getCreate2Address(
                globalDeployerAddress,
                '0x' + Array(64).fill('0').join(''),
                keccak256(data)
            )
            const code = await signer.provider?.getCode(address)
            let tx: null | TransactionResponse = null
            if (code === '0x') {
                tx = await signer.sendTransaction({
                    to: globalDeployerAddress,
                    data,
                    gasPrice,
                })
            }
            return Object.assign(factory.attach(address), {
                deployTransaction: tx,
            })
        },
    }
}

export default GlobalFactory
