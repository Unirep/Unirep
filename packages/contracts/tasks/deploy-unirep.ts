import {
    Circuit,
    MAX_USERS,
    MAX_ATTESTERS,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    MAX_REPUTATION_BUDGET,
    EPOCH_LENGTH,
    GLOBAL_STATE_TREE_DEPTH,
    USER_STATE_TREE_DEPTH,
    EPOCH_TREE_DEPTH,
    NUM_ATTESTATIONS_PER_PROOF,
} from '@unirep/circuits'
import { task, types } from 'hardhat/config'
import { Unirep } from '../typechain'
import { UnirepTypes } from '../typechain/Unirep'

const ATTESTING_FEE = '0'

// address of deployed verifiers
export type VerifiersAddress<T extends string, U> = {
    [K in T]?: U
}

const getVerifiers = async (
    hre,
    _verifiers?: VerifiersAddress<Circuit, string>
): Promise<VerifiersAddress<Circuit, string>> => {
    const verifiers: VerifiersAddress<Circuit, string> = {
        ..._verifiers,
    }
    for (const circuit of Object.keys(Circuit)) {
        if (!_verifiers || !_verifiers[circuit]) {
            const contract = await hre.run('deploy:Verifier', { circuit })
            verifiers[circuit] = contract.address
        } else {
            console.log(
                `${circuit} Verifier contract has been deployed to: ${verifiers[circuit]}`
            )
        }
    }
    return verifiers
}

task(`deploy:Unirep`, `Deploy a Unirep contract`)
    .addOptionalParam(
        `${Circuit.verifyEpochKey}`,
        `Where ${Circuit.verifyEpochKey} verifier is deployed at`,
        undefined,
        types.string
    )
    .addOptionalParam(
        `${Circuit.processAttestations}`,
        `Where ${Circuit.processAttestations} verifier is deployed at`,
        undefined,
        types.string
    )
    .addOptionalParam(
        `${Circuit.startTransition}`,
        `Where ${Circuit.startTransition} verifier is deployed at`,
        undefined,
        types.string
    )
    .addOptionalParam(
        `${Circuit.userStateTransition}`,
        `Where ${Circuit.userStateTransition} verifier is deployed at`,
        undefined,
        types.string
    )
    .addOptionalParam(
        `${Circuit.proveReputation}`,
        `Where ${Circuit.proveReputation} verifier is deployed at`,
        undefined,
        types.string
    )
    .addOptionalParam(
        `${Circuit.proveUserSignUp}`,
        `Where ${Circuit.proveUserSignUp} verifier is deployed at`,
        undefined,
        types.string
    )
    .addOptionalParam(
        'globalStateTree',
        'The circuit config of global state tree depth',
        GLOBAL_STATE_TREE_DEPTH,
        types.int
    )
    .addOptionalParam(
        'userStateTree',
        'The circuit config of user state tree depth',
        USER_STATE_TREE_DEPTH,
        types.int
    )
    .addOptionalParam(
        'epochTree',
        'The circuit config of epoch tree depth',
        EPOCH_TREE_DEPTH,
        types.int
    )
    .addOptionalParam(
        'numEpochKey',
        'The circuit config of number of epoch key nonce per epoch',
        NUM_EPOCH_KEY_NONCE_PER_EPOCH,
        types.int
    )
    .addOptionalParam(
        'maxRep',
        'The circuit config of max reputation budget of spending reputation',
        MAX_REPUTATION_BUDGET,
        types.int
    )
    .addOptionalParam(
        'numAttestations',
        'The circuit config of max attestations per proof',
        NUM_ATTESTATIONS_PER_PROOF,
        types.int
    )
    .addOptionalParam(
        'epochLength',
        `The length of an epoch in Unirep`,
        EPOCH_LENGTH,
        types.int
    )
    .addOptionalParam(
        'attestingFee',
        `The amount of fee that has to be sent with an attestation`,
        ATTESTING_FEE,
        types.json
    )
    .addOptionalParam(
        'maxUsers',
        `The maximum number of users can sign up in Unirep`,
        MAX_USERS,
        types.int
    )
    .addOptionalParam(
        'maxAttesters',
        `The maximum number of attesters can sign up in Unirep`,
        MAX_ATTESTERS,
        types.int
    )
    .addOptionalParam(
        'privKey',
        `The deployer's private key`,
        undefined,
        types.string
    )
    .setAction(async (args, hre): Promise<Unirep> => {
        const verifiers: VerifiersAddress<Circuit, string> = await getVerifiers(
            hre,
            {
                [Circuit.verifyEpochKey]: args?.verifyEpochKey,
                [Circuit.processAttestations]: args?.processAttestations,
                [Circuit.startTransition]: args?.startTransition,
                [Circuit.userStateTransition]: args?.userStateTransition,
                [Circuit.proveReputation]: args?.proveReputation,
                [Circuit.proveUserSignUp]: args?.proveUserSignUp,
            }
        )
        const deployer = new hre.ethers.Wallet(
            args.privKey ?? (await hre.ethers.getSigner)[0],
            hre.ethers.provider
        )

        console.log('Deploying Unirep')
        const f = await hre.ethers.getContractFactory('Unirep')
        const c = await f.connect(deployer).deploy(
            {
                globalStateTreeDepth: args?.globalStateTree,
                userStateTreeDepth: args?.userStateTree,
                epochTreeDepth: args?.epochTree,
                numEpochKeyNoncePerEpoch: args?.numEpochKey,
                maxReputationBudget: args?.maxRep,
                numAttestationsPerProof: args?.numAttestations,
                epochLength: args?.epochLength,
                attestingFee: hre.ethers.BigNumber.from(
                    args?.attestingFee.toString()
                ),
                maxUsers: args?.maxUsers,
                maxAttesters: args?.maxAttesters,
            } as UnirepTypes.ConfigStruct,
            verifiers[Circuit.verifyEpochKey]!,
            verifiers[Circuit.startTransition]!,
            verifiers[Circuit.processAttestations]!,
            verifiers[Circuit.userStateTransition]!,
            verifiers[Circuit.proveReputation]!,
            verifiers[Circuit.proveUserSignUp]!
        )

        await c.deployTransaction.wait()

        // Print out deployment info
        console.log(
            '-----------------------------------------------------------------'
        )
        console.log(
            'Bytecode size of Unirep:',
            Math.floor(f.bytecode.length / 2),
            'bytes'
        )
        let receipt = await c.provider.getTransactionReceipt(
            c.deployTransaction.hash
        )
        console.log('Gas cost of deploying Unirep:', receipt.gasUsed.toString())
        console.log(
            '-----------------------------------------------------------------'
        )
        console.log(`Unirep contract has been deployed to: ${c.address}`)

        return c as Unirep
    })
