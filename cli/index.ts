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
    userSignup,
    configureSubparser as configureSubparserForUserSignup,
} from './userSignUp'

import {
    attesterSignup,
    configureSubparser as configureSubparserForAttesterSignup,
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
    attest,
    configureSubparser as configureSubparserForAttest,
} from './attest'

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


const main = async () => {
    const parser = new argparse.ArgumentParser({ 
        description: 'Unirep',
    })

    const subparsers = parser.addSubparsers({
        title: 'Subcommands',
        dest: 'subcommand',
    })

    // Subcommand: genUnirepIdentity
    configureSubparserForGenUnirepIdentity(subparsers)

    // Subcommand: deploy
    configureSubparserForDeploy(subparsers)

    // Subcommand: userSignup
    configureSubparserForUserSignup(subparsers)

    // Subcommand: attesterSignup
    configureSubparserForAttesterSignup(subparsers)

    // Subcommand: genEpochKeyAndProof
    configureSubparserForGenEpochKeyAndProof(subparsers)

    // Subcommand: verifyEpochKeyProof
    configureSubparserForVerifyEpochKeyProof(subparsers)

    // Subcommand: attest
    configureSubparserForAttest(subparsers)

    // Subcommand: epochTransition
    configureSubparserForEpochTransition(subparsers)

    // Subcommand: userStateTransition
    configureSubparserForGenUserStateTransitionProof(subparsers)

    // Subcommand: genReputationProof
    configureSubparserForGenReputationProof(subparsers)

    // Subcommand: verifyReputationProof
    configureSubparserForVerifyReputationProof(subparsers)

    const args = parser.parseArgs()

    // Execute the subcommand method
    if (args.subcommand === 'genUnirepIdentity') {
        await genUnirepIdentity(args)
    } else if (args.subcommand === 'deploy') {
        await deploy(args)
    } else if (args.subcommand === 'userSignup') {
        await userSignup(args)
    } else if (args.subcommand === 'attesterSignup') {
        await attesterSignup(args)
    } else if (args.subcommand === 'genEpochKeyAndProof') {
        await genEpochKeyAndProof(args)
    } else if (args.subcommand === 'verifyEpochKeyProof') {
        await verifyEpochKeyProof(args)
    } else if (args.subcommand === 'attest') {
        await attest(args)
    } else if (args.subcommand === 'epochTransition') {
        await epochTransition(args)
    } else if (args.subcommand === 'userStateTransition') {
        await userStateTransition(args)
    } else if (args.subcommand === 'genReputationProof') {
        await genReputationProof(args)
    } else if (args.subcommand === 'verifyReputationProof') {
        await verifyReputationProof(args)
    }
}

if (require.main === module) {
    main()
}