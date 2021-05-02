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
    eventListeners,
    configureSubparser as configureSubparserForEventListeners,
} from './eventListeners'

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
    verifyReputationProof,
    configureSubparser as configureSubparserForVerifyReputationProof,
} from './verifyReputationProof'

import {
    publishPost,
    configureSubparser as configureSubparserForPublishPost,
} from './publishPost'

import {
    listAllPosts,
    configureSubparser as configureSubparserForListAllPosts,
} from './listAllPosts'

import {
    leaveComment,
    configureSubparser as configureSubparserForleaveComment,
} from './leaveComment'

import {
    attest,
    configureSubparser as configureSubparserForAttest,
} from './attest'

import {
    vote,
    configureSubparser as configureSubparserForvote,
} from './vote'

import {
    epochTransition,
    configureSubparser as configureSubparserForEpochTransition,
} from './epochTransition'

import {
    userStateTransition,
    configureSubparser as configureSubparserForGenUserStateTransitionProof,
} from './userStateTransition'

import {
    genReputationProofFromAttester,
    configureSubparser as configureSubparserForGenReputationProofFromAttester,
} from './genReputationProofFromAttester'

import {
    verifyReputationProofFromAttester,
    configureSubparser as configureSubparserForVerifyReputationProofFromAttester,
} from './verifyReputationProofFromAttester'


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

    // Subcommand: eventListners
    configureSubparserForEventListeners(subparsers)

    // Subcommand: userSignup
    configureSubparserForUserSignup(subparsers)

    // Subcommand: attesterSignup
    configureSubparserForAttesterSignup(subparsers)

    // Subcommand: genEpochKeyAndProof
    configureSubparserForGenEpochKeyAndProof(subparsers)

    // Subcommand: verifyEpochKeyProof
    configureSubparserForVerifyEpochKeyProof(subparsers)

    // Subcommand: verifyReputationProof
    configureSubparserForVerifyReputationProof(subparsers)

    // Subcommand: publishPost
    configureSubparserForPublishPost(subparsers)

    // Subcommand: listAllPosts
    configureSubparserForListAllPosts(subparsers)

    // Subcommand: leaveComment
    configureSubparserForleaveComment(subparsers)

    // Subcommand: attest
    configureSubparserForAttest(subparsers)

    // Subcommand: vote
    configureSubparserForvote(subparsers)

    // Subcommand: epochTransition
    configureSubparserForEpochTransition(subparsers)

    // Subcommand: userStateTransition
    configureSubparserForGenUserStateTransitionProof(subparsers)

    // Subcommand: genReputationProof
    configureSubparserForGenReputationProofFromAttester(subparsers)

    // Subcommand: verifyReputationProof
    configureSubparserForVerifyReputationProofFromAttester(subparsers)

    const args = parser.parseArgs()

    // Execute the subcommand method
    if (args.subcommand === 'genUnirepIdentity') {
        await genUnirepIdentity(args)
    } else if (args.subcommand === 'deploy') {
        await deploy(args)
    } else if (args.subcommand === 'eventListeners') {
        await eventListeners(args)
    } else if (args.subcommand === 'userSignup') {
        await userSignup(args)
    } else if (args.subcommand === 'attesterSignup') {
        await attesterSignup(args)
    } else if (args.subcommand === 'genEpochKeyAndProof') {
        await genEpochKeyAndProof(args)
    } else if (args.subcommand === 'verifyEpochKeyProof') {
        await verifyEpochKeyProof(args)
    } else if (args.subcommand === 'verifyReputationProof') {
        await verifyReputationProof(args)
    } else if (args.subcommand === 'publishPost') {
        await publishPost(args)
    } else if (args.subcommand === 'listAllPosts') {
        await listAllPosts(args)
    } else if (args.subcommand === 'leaveComment') {
        await leaveComment(args)
    } else if (args.subcommand === 'attest') {
        await attest(args)
    } else if (args.subcommand === 'vote') {
        await vote(args)
    } else if (args.subcommand === 'epochTransition') {
        await epochTransition(args)
    } else if (args.subcommand === 'userStateTransition') {
        await userStateTransition(args)
    } else if (args.subcommand === 'genReputationProofFromAttester') {
        await genReputationProofFromAttester(args)
    } else if (args.subcommand === 'verifyReputationProofFromAttester') {
        await verifyReputationProofFromAttester(args)
    }
}

if (require.main === module) {
    main()
}