import { ethers } from 'ethers'
import { deployUnirep } from '@unirep/contracts'

import { maxAttesters, maxReputationBudget, maxUsers } from '../config/testLocal'
import { getTreeDepthsForTesting } from '../core'
import { DEFAULT_ATTESTING_FEE, DEFAULT_EPOCH_LENGTH, DEFAULT_ETH_PROVIDER, DEFAULT_MAX_EPOCH_KEY_NONCE, DEFAULT_TREE_DEPTHS_CONFIG } from './defaults'
import { checkDeployerProviderConnection, genJsonRpcDeployer, validateEthSk, } from './utils'

const configureSubparser = (subparsers: any) => {
    const deployParser = subparsers.add_parser(
        'deploy',
        { add_help: true },
    )

    deployParser.add_argument(
        '-d', '--deployer-privkey',
        {
            action: 'store',
            type: 'str',
            help: 'The deployer\'s Ethereum private key',
        }
    )

    deployParser.add_argument(
        '-e', '--eth-provider',
        {
            action: 'store',
            type: 'str',
            help: `A connection string to an Ethereum provider. Default: ${DEFAULT_ETH_PROVIDER}`,
        }
    )

    deployParser.add_argument(
        '-l', '--epoch-length',
        {
            action: 'store',
            type: 'int',
            help: 'The length of an epoch in seconds. Default: 30',
        }
    )

    deployParser.add_argument(
        '-f', '--attesting-fee',
        {
            action: 'store',
            type: 'str',
            help: 'The fee to make an attestation. Default: 0.01 eth (i.e., 10 * 16)',
        }
    )

    deployParser.add_argument(
        '-td', '--tree-depths-config',
        {
            action: 'store',
            type: 'str',
            help: 'The configuration of tree depths: circuit or contract. Default: circuit',
        }
    )

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

    // Max epoch key nonce
    // const _numEpochKeyNoncePerEpoch = (args.max_epoch_key_nonce != undefined) ? args.max_epoch_key_nonce : DEFAULT_MAX_EPOCH_KEY_NONCE
    const _numEpochKeyNoncePerEpoch = DEFAULT_MAX_EPOCH_KEY_NONCE

    // Max reputation budget
    const _maxReputationBudget = maxReputationBudget

    // Epoch length
    const _epochLength = (args.epoch_length != undefined) ? args.epoch_length : DEFAULT_EPOCH_LENGTH

    // Attesting fee
    const _attestingFee = (args.attesting_fee != undefined) ? ethers.BigNumber.from(args.attesting_fee) : DEFAULT_ATTESTING_FEE

    const settings = {
        maxUsers: maxUsers,
        maxAttesters: maxAttesters,
        numEpochKeyNoncePerEpoch: _numEpochKeyNoncePerEpoch,
        maxReputationBudget: _maxReputationBudget,
        epochLength: _epochLength,
        attestingFee: _attestingFee
    }

    // Tree depths config
    const _treeDepthsConfig = args.tree_depths_config ? args.tree_depths_config : DEFAULT_TREE_DEPTHS_CONFIG

    if (_treeDepthsConfig !== 'circuit' && _treeDepthsConfig !== 'contract') {
        console.error('Error: this codebase only supports circuit or contract configurations for tree depths')
        return
    }

    const treeDepths = getTreeDepthsForTesting(_treeDepthsConfig)

    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER

    if (! (await checkDeployerProviderConnection(deployerPrivkey, ethProvider))) {
        console.error('Error: unable to connect to the Ethereum provider at', ethProvider)
        return
    }
    const deployer = genJsonRpcDeployer(deployerPrivkey, ethProvider)
    debugger

    const contract = await deployUnirep(
        deployer.signer,
        treeDepths,
        settings,
    )

    console.log('Unirep:', contract.address)
}

export {
    deploy,
    configureSubparser,
}