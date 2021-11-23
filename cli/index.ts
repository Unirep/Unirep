#!/usr/bin/env node

import argparse from 'argparse' 

import {
    genUnirepIdentity,
    configureSubparser as configureSubparserForGenUnirepIdentity,
} from './genUnirepIdentity'

import {
    deploy,
    configureSubparser as configureSubparserForDeploy,
} from './deploy'

import {
    userSignUp,
    configureSubparser as configureSubparserForUserSignup,
} from './userSignUp'

import {
    attesterSignUp,
    configureSubparser as configureSubparserForattesterSignUp,
} from './attesterSignUp'

import {
    genEpochKeyAndProof,
    configureSubparser as configureSubparserForGenEpochKeyAndProof,
} from './genEpochKeyAndProof'

import {
    verifyEpochKeyProof,
    configureSubparser as configureSubparserForVerifyEpochKeyProof,
} from './verifyEpochKeyProof'

import {
    setAirdropAmount,
    configureSubparser as configureSubparserForSetAirdropAmount,
} from './setAirdropAmount'

import {
    attest,
    configureSubparser as configureSubparserForAttest,
} from './attest'

import {
    giveAirdrop,
    configureSubparser as configureSubparserForGiveAirdrop,
} from './giveAirdrop'

import {
    spendReputation,
    configureSubparser as configureSubparserForSpendReputation,
} from './spendReputation'

import {
    submitEpochKeyProof,
    configureSubparser as configureSubparserForSubmitEpochKeyProof
} from './submitEpochKeyProof'

import {
    epochTransition,
    configureSubparser as configureSubparserForEpochTransition,
} from './epochTransition'

import {
    userStateTransition,
    configureSubparser as configureSubparserForGenUserStateTransitionProof,
} from './userStateTransition'

import {
    genReputationProof,
    configureSubparser as configureSubparserForGenReputationProof,
} from './genReputationProof'

import {
    verifyReputationProof,
    configureSubparser as configureSubparserForVerifyReputationProof,
} from './verifyReputationProof'

import {
    genUserSignUpProof,
    configureSubparser as configureSubparserForGenUserSignUpProof,
} from './genUserSignUpProof'

import {
    verifyUserSignUpProof,
    configureSubparser as configureSubparserForVerifyUserSignUpProof,
} from './verifyUserSignUpProof'



const main = async () => {
    const parser = new argparse.ArgumentParser({ 
        description: 'Unirep',
    })

    const subparsers = parser.add_subparsers({
        title: 'Subcommands',
        dest: 'subcommand',
    })

    // Subcommand: genUnirepIdentity
    configureSubparserForGenUnirepIdentity(subparsers)

    // Subcommand: deploy
    configureSubparserForDeploy(subparsers)

    // Subcommand: userSignup
    configureSubparserForUserSignup(subparsers)

    // Subcommand: attesterSignUp
    configureSubparserForattesterSignUp(subparsers)

    // Subcommand: genEpochKeyAndProof
    configureSubparserForGenEpochKeyAndProof(subparsers)

    // Subcommand: verifyEpochKeyProof
    configureSubparserForVerifyEpochKeyProof(subparsers)

    // Subcommand: setAirdropAmount
    configureSubparserForSetAirdropAmount(subparsers)

    // Subcommand: attest
    configureSubparserForAttest(subparsers)

    // Subcommand: giveAirdrop
    configureSubparserForGiveAirdrop(subparsers)

    // Subcommand: spendReputation
    configureSubparserForSpendReputation(subparsers)

    // Subcommand: submitEpochKeyProof
    configureSubparserForSubmitEpochKeyProof(subparsers)

    // Subcommand: epochTransition
    configureSubparserForEpochTransition(subparsers)

    // Subcommand: userStateTransition
    configureSubparserForGenUserStateTransitionProof(subparsers)

    // Subcommand: genReputationProof
    configureSubparserForGenReputationProof(subparsers)

    // Subcommand: verifyReputationProof
    configureSubparserForVerifyReputationProof(subparsers)

    // Subcommand: genUserSignUpProof
    configureSubparserForGenUserSignUpProof(subparsers)

    // Subcommand: verifyUserSignUpProof
    configureSubparserForVerifyUserSignUpProof(subparsers)

    const args = parser.parse_args()

    // Execute the subcommand method
    if (args.subcommand === 'genUnirepIdentity') {
        await genUnirepIdentity(args)
    } else if (args.subcommand === 'deploy') {
        await deploy(args)
    } else if (args.subcommand === 'userSignUp') {
        await userSignUp(args)
    } else if (args.subcommand === 'attesterSignUp') {
        await attesterSignUp(args)
    } else if (args.subcommand === 'genEpochKeyAndProof') {
        await genEpochKeyAndProof(args)
    } else if (args.subcommand === 'verifyEpochKeyProof') {
        await verifyEpochKeyProof(args)
    } else if (args.subcommand === 'setAirdropAmount') {
        await setAirdropAmount(args)
    } else if (args.subcommand === 'attest') {
        await attest(args)
    } else if (args.subcommand === 'giveAirdrop') {
        await giveAirdrop(args)
    } else if (args.subcommand === 'spendReputation') {
        await spendReputation(args)
    } else if (args.subcommand === 'submitEpochKeyProof') {
        await submitEpochKeyProof(args)
    } else if (args.subcommand === 'epochTransition') {
        await epochTransition(args)
    } else if (args.subcommand === 'userStateTransition') {
        await userStateTransition(args)
    } else if (args.subcommand === 'genReputationProof') {
        await genReputationProof(args)
    } else if (args.subcommand === 'verifyReputationProof') {
        await verifyReputationProof(args)
    } else if (args.subcommand === 'genUserSignUpProof') {
        await genUserSignUpProof(args)
    } else if (args.subcommand === 'verifyUserSignUpProof') {
        await verifyUserSignUpProof(args)
    }
    process.exit(0)
}

if (require.main === module) {
    main()
}