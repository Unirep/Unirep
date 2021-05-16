import { ethers } from 'ethers'
import { DEFAULT_AIRDROPPED_KARMA } from '../config/socialMedia'
import { maxUsers } from '../config/testLocal'
import { deployUnirep, getTreeDepthsForTesting } from '../core/utils'
import { DEFAULT_ATTESTING_FEE, DEFAULT_EPOCH_LENGTH, DEFAULT_ETH_PROVIDER, DEFAULT_MAX_EPOCH_KEY_NONCE, DEFAULT_NUM_ATTESTATIONS_PER_EPOCH_KEY, DEFAULT_TREE_DEPTHS_CONFIG } from './defaults'
import {
    checkDeployerProviderConnection,
    genJsonRpcDeployer,
    promptPwd,
    validateEthSk,
} from './utils'

const configureSubparser = (subparsers: any) => {
    const deployParser = subparsers.addParser(
        'deploy',
        { addHelp: true },
    )

    const deployerPrivkeyGroup = deployParser.addMutuallyExclusiveGroup({ required: true })

    deployerPrivkeyGroup.addArgument(
        ['-dp', '--prompt-for-deployer-privkey'],
        {
            action: 'storeTrue',
            help: 'Whether to prompt for the deployer\'s Ethereum private key and ignore -d / --deployer-privkey',
        }
    )

    deployerPrivkeyGroup.addArgument(
        ['-d', '--deployer-privkey'],
        {
            action: 'store',
            type: 'string',
            help: 'The deployer\'s Ethereum private key',
        }
    )

    deployParser.addArgument(
        ['-e', '--eth-provider'],
        {
            action: 'store',
            type: 'string',
            help: 'A connection string to an Ethereum provider. Default: http://localhost:8545',
        }
    )

    // deployParser.addArgument(
    //     ['-kn', '--max-epoch-key-nonce'],
    //     {
    //         action: 'store',
    //         type: 'int',
    //         help: 'The maximum supported epoch key nonce. Default: 2',
    //     }
    // )

    deployParser.addArgument(
        ['-l', '--epoch-length'],
        {
            action: 'store',
            type: 'int',
            help: 'The length of an epoch in seconds. Default: 30',
        }
    )

    deployParser.addArgument(
        ['-f', '--attesting-fee'],
        {
            action: 'store',
            type: 'string',
            help: 'The fee to make an attestation. Default: 0.01 eth (i.e., 10 * 16)',
        }
    )

    deployParser.addArgument(
        ['-td', '--tree-depths-config'],
        {
            action: 'store',
            type: 'string',
            help: 'The configuration of tree depths: circuit or contract. Default: circuit',
        }
    )

}

const deploy = async (args: any) => {

    // The deployer's Ethereum private key
    // They may either enter it as a command-line option or via the
    // standard input
    let deployerPrivkey
    if (args.prompt_for_deployer_privkey) {
        deployerPrivkey = await promptPwd('Deployer\'s Ethereum private key')
    } else {
        deployerPrivkey = args.deployer_privkey
    }

    if (!validateEthSk(deployerPrivkey)) {
        console.error('Error: invalid Ethereum private key')
        return
    }

    // Max epoch key nonce
    // const _numEpochKeyNoncePerEpoch = (args.max_epoch_key_nonce != undefined) ? args.max_epoch_key_nonce : DEFAULT_MAX_EPOCH_KEY_NONCE
    const _numEpochKeyNoncePerEpoch = DEFAULT_MAX_EPOCH_KEY_NONCE

    const _numAttestationsPerEpochKey = DEFAULT_NUM_ATTESTATIONS_PER_EPOCH_KEY

    // Default given karma
    const _deaultKarma = DEFAULT_AIRDROPPED_KARMA

    // Epoch length
    const _epochLength = (args.epoch_length != undefined) ? args.epoch_length : DEFAULT_EPOCH_LENGTH

    // Attesting fee
    const _attestingFee = (args.attesting_fee != undefined) ? ethers.BigNumber.from(args.attesting_fee) : DEFAULT_ATTESTING_FEE

    const settings = {
        'maxUsers': maxUsers,
        'numEpochKeyNoncePerEpoch': _numEpochKeyNoncePerEpoch,
        'numAttestationsPerEpochKey': _numAttestationsPerEpochKey,
        'defaultKarma': _deaultKarma,
        'epochLength': _epochLength,
        'attestingFee': _attestingFee,
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