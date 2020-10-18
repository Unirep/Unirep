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
    }
}

if (require.main === module) {
    main()
}