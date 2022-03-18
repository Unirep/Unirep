#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const argparse_1 = __importDefault(require("argparse"));
const genUnirepIdentity_1 = require("./genUnirepIdentity");
const deploy_1 = require("./deploy");
const userSignUp_1 = require("./userSignUp");
const attesterSignUp_1 = require("./attesterSignUp");
const genEpochKeyAndProof_1 = require("./genEpochKeyAndProof");
const verifyEpochKeyProof_1 = require("./verifyEpochKeyProof");
const setAirdropAmount_1 = require("./setAirdropAmount");
const attest_1 = require("./attest");
const giveAirdrop_1 = require("./giveAirdrop");
const spendReputation_1 = require("./spendReputation");
const submitEpochKeyProof_1 = require("./submitEpochKeyProof");
const epochTransition_1 = require("./epochTransition");
const userStateTransition_1 = require("./userStateTransition");
const genReputationProof_1 = require("./genReputationProof");
const verifyReputationProof_1 = require("./verifyReputationProof");
const genUserSignUpProof_1 = require("./genUserSignUpProof");
const verifyUserSignUpProof_1 = require("./verifyUserSignUpProof");
const main = async () => {
    const parser = new argparse_1.default.ArgumentParser({
        description: 'Unirep',
    });
    const subparsers = parser.add_subparsers({
        title: 'Subcommands',
        dest: 'subcommand',
    });
    // Subcommand: genUnirepIdentity
    (0, genUnirepIdentity_1.configureSubparser)(subparsers);
    // Subcommand: deploy
    (0, deploy_1.configureSubparser)(subparsers);
    // Subcommand: userSignup
    (0, userSignUp_1.configureSubparser)(subparsers);
    // Subcommand: attesterSignUp
    (0, attesterSignUp_1.configureSubparser)(subparsers);
    // Subcommand: genEpochKeyAndProof
    (0, genEpochKeyAndProof_1.configureSubparser)(subparsers);
    // Subcommand: verifyEpochKeyProof
    (0, verifyEpochKeyProof_1.configureSubparser)(subparsers);
    // Subcommand: setAirdropAmount
    (0, setAirdropAmount_1.configureSubparser)(subparsers);
    // Subcommand: attest
    (0, attest_1.configureSubparser)(subparsers);
    // Subcommand: giveAirdrop
    (0, giveAirdrop_1.configureSubparser)(subparsers);
    // Subcommand: spendReputation
    (0, spendReputation_1.configureSubparser)(subparsers);
    // Subcommand: submitEpochKeyProof
    (0, submitEpochKeyProof_1.configureSubparser)(subparsers);
    // Subcommand: epochTransition
    (0, epochTransition_1.configureSubparser)(subparsers);
    // Subcommand: userStateTransition
    (0, userStateTransition_1.configureSubparser)(subparsers);
    // Subcommand: genReputationProof
    (0, genReputationProof_1.configureSubparser)(subparsers);
    // Subcommand: verifyReputationProof
    (0, verifyReputationProof_1.configureSubparser)(subparsers);
    // Subcommand: genUserSignUpProof
    (0, genUserSignUpProof_1.configureSubparser)(subparsers);
    // Subcommand: verifyUserSignUpProof
    (0, verifyUserSignUpProof_1.configureSubparser)(subparsers);
    const args = parser.parse_args();
    // Execute the subcommand method
    if (args.subcommand === 'genUnirepIdentity') {
        await (0, genUnirepIdentity_1.genUnirepIdentity)(args);
    }
    else if (args.subcommand === 'deploy') {
        await (0, deploy_1.deploy)(args);
    }
    else if (args.subcommand === 'userSignUp') {
        await (0, userSignUp_1.userSignUp)(args);
    }
    else if (args.subcommand === 'attesterSignUp') {
        await (0, attesterSignUp_1.attesterSignUp)(args);
    }
    else if (args.subcommand === 'genEpochKeyAndProof') {
        await (0, genEpochKeyAndProof_1.genEpochKeyAndProof)(args);
    }
    else if (args.subcommand === 'verifyEpochKeyProof') {
        await (0, verifyEpochKeyProof_1.verifyEpochKeyProof)(args);
    }
    else if (args.subcommand === 'setAirdropAmount') {
        await (0, setAirdropAmount_1.setAirdropAmount)(args);
    }
    else if (args.subcommand === 'attest') {
        await (0, attest_1.attest)(args);
    }
    else if (args.subcommand === 'giveAirdrop') {
        await (0, giveAirdrop_1.giveAirdrop)(args);
    }
    else if (args.subcommand === 'spendReputation') {
        await (0, spendReputation_1.spendReputation)(args);
    }
    else if (args.subcommand === 'submitEpochKeyProof') {
        await (0, submitEpochKeyProof_1.submitEpochKeyProof)(args);
    }
    else if (args.subcommand === 'epochTransition') {
        await (0, epochTransition_1.epochTransition)(args);
    }
    else if (args.subcommand === 'userStateTransition') {
        await (0, userStateTransition_1.userStateTransition)(args);
    }
    else if (args.subcommand === 'genReputationProof') {
        await (0, genReputationProof_1.genReputationProof)(args);
    }
    else if (args.subcommand === 'verifyReputationProof') {
        await (0, verifyReputationProof_1.verifyReputationProof)(args);
    }
    else if (args.subcommand === 'genUserSignUpProof') {
        await (0, genUserSignUpProof_1.genUserSignUpProof)(args);
    }
    else if (args.subcommand === 'verifyUserSignUpProof') {
        await (0, verifyUserSignUpProof_1.verifyUserSignUpProof)(args);
    }
    process.exit(0);
};
if (require.main === module) {
    main();
}
