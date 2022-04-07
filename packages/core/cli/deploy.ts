import { ethers } from 'ethers'
import { deployUnirep } from '@unirep/contracts'
import {
    EPOCH_TREE_DEPTH,
    GLOBAL_STATE_TREE_DEPTH,
    MAX_REPUTATION_BUDGET,
    USER_STATE_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
} from '@unirep/config'

import {
    DEFAULT_ATTESTING_FEE,
    DEFAULT_EPOCH_LENGTH,
    DEFAULT_ETH_PROVIDER,
} from './defaults'
import {
    checkDeployerProviderConnection,
    genJsonRpcDeployer,
    getProvider,
    validateEthSk,
} from './utils'

const configureSubparser = (subparsers: any) => {
    const deployParser = subparsers.add_parser('deploy', { add_help: true })

    deployParser.add_argument('-d', '--deployer-privkey', {
        action: 'store',
        type: 'str',
        help: "The deployer's Ethereum private key",
    })

    deployParser.add_argument('-e', '--eth-provider', {
        action: 'store',
        type: 'str',
        help: `A connection string to an Ethereum provider. Default: ${DEFAULT_ETH_PROVIDER}`,
    })

    deployParser.add_argument('-l', '--epoch-length', {
        action: 'store',
        type: 'int',
        help: 'The length of an epoch in seconds. Default: 30',
    })

    deployParser.add_argument('-f', '--attesting-fee', {
        action: 'store',
        type: 'str',
        help: 'The fee to make an attestation. Default: 0.01 eth (i.e., 10 * 16)',
    })
}

const deploy = async (args: any) => {
    // The deployer's Ethereum private key
    // They may either enter it as a command-line option or via the
    // standard input
    const deployerPrivkey = args.deployer_privkey

    if (!validateEthSk(deployerPrivkey)) {
        console.error('Error: invalid Ethereum private key')
        return
    }

    // Epoch length
    const _epochLength = args.epoch_length ?? DEFAULT_EPOCH_LENGTH

    // Attesting fee
    const _attestingFee =
        args.attesting_fee
            ? ethers.BigNumber.from(args.attesting_fee)
            : DEFAULT_ATTESTING_FEE

    const settings = {
        epochLength: _epochLength,
        attestingFee: _attestingFee,
    }

    // Ethereum provider
    const ethProvider = args.eth_provider ?? DEFAULT_ETH_PROVIDER
    const provider = getProvider(ethProvider)

    if (!(await checkDeployerProviderConnection(deployerPrivkey, provider))) {
        console.error(
            'Error: unable to connect to the Ethereum provider at',
            ethProvider
        )
        return
    }
    const deployer = genJsonRpcDeployer(deployerPrivkey, provider)
    debugger

    const contract = await deployUnirep(deployer.signer, settings)

    console.log('Unirep:', contract.address)
}

export { deploy, configureSubparser }
