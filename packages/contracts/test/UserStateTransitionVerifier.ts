import { Circuit } from "@unirep/circuits";
import { genIdentity, genRandomSalt } from "@unirep/crypto";
import { expect } from "chai";
import { BigNumberish, ethers } from "ethers";
import { ethers as hardhatEthers } from "hardhat";

import { epochLength } from "../config";
import { deployUnirep, UserTransitionProof } from "../src";
import {
  genInputForContract,
  genUserStateTransitionCircuitInput,
  getTreeDepthsForTesting,
} from "./utils";

describe("User State Transition", function () {
  this.timeout(600000);
  let accounts;
  let unirepContract;

  const epoch = 1;
  const user = genIdentity();
  const proofIndexes = [];

  before(async () => {
    accounts = await hardhatEthers.getSigners();

    const _treeDepths = getTreeDepthsForTesting();
    unirepContract = await deployUnirep(
      <ethers.Wallet>accounts[0],
      _treeDepths
    );
  });

  it("Valid user state update inputs should work", async () => {
    const circuitInputs = await genUserStateTransitionCircuitInput(user, epoch);
    const input: UserTransitionProof = await genInputForContract(
      Circuit.userStateTransition,
      circuitInputs
    );
    const isValid = await input.verify();
    expect(isValid, "Verify user state transition proof off-chain failed").to.be
      .true;
    const isProofValid = await unirepContract.verifyUserStateTransition(input);
    expect(isProofValid).to.be.true;

    // UST should be performed after epoch transition
    // Fast-forward epochLength of seconds
    await hardhatEthers.provider.send("evm_increaseTime", [epochLength]);
    let tx = await unirepContract.beginEpochTransition();
    let receipt = await tx.wait();
    expect(receipt.status).equal(1);

    tx = await unirepContract.updateUserStateRoot(input, proofIndexes);
    receipt = await tx.wait();
    expect(receipt.status).equal(1);

    const pfIdx = await unirepContract.getProofIndex(input.hash());
    expect(Number(pfIdx)).not.eq(0);
  });

  it("Proof with wrong epoch should fail", async () => {
    const wrongEpoch = epoch + 1;
    const circuitInputs = await genUserStateTransitionCircuitInput(user, epoch);
    const input: UserTransitionProof = await genInputForContract(
      Circuit.userStateTransition,
      circuitInputs
    );
    input.transitionFromEpoch = wrongEpoch;
    const isProofValid = await unirepContract.verifyUserStateTransition(input);
    expect(isProofValid).to.be.false;
  });

  it("Proof with wrong global state tree root should fail", async () => {
    const wrongGlobalStateTreeRoot = genRandomSalt() as BigNumberish;
    const circuitInputs = await genUserStateTransitionCircuitInput(user, epoch);
    const input: UserTransitionProof = await genInputForContract(
      Circuit.userStateTransition,
      circuitInputs
    );
    input.fromGlobalStateTree = wrongGlobalStateTreeRoot;
    const isProofValid = await unirepContract.verifyUserStateTransition(input);
    expect(isProofValid).to.be.false;
  });

  it("Proof with wrong epoch tree root should fail", async () => {
    const wrongEpochTreeRoot = genRandomSalt();
    const circuitInputs = await genUserStateTransitionCircuitInput(user, epoch);
    const input: UserTransitionProof = await genInputForContract(
      Circuit.userStateTransition,
      circuitInputs
    );
    input.fromEpochTree = wrongEpochTreeRoot as BigNumberish;
    const isProofValid = await unirepContract.verifyUserStateTransition(input);
    expect(isProofValid).to.be.false;
  });

  it("Proof with wrong blinded user states should fail", async () => {
    const circuitInputs = await genUserStateTransitionCircuitInput(user, epoch);
    const input: UserTransitionProof = await genInputForContract(
      Circuit.userStateTransition,
      circuitInputs
    );
    input.blindedUserStates[0] = genRandomSalt() as BigNumberish;
    const isProofValid = await unirepContract.verifyUserStateTransition(input);
    expect(isProofValid).to.be.false;
  });

  it("Proof with wrong blinded hash chain should fail", async () => {
    const circuitInputs = await genUserStateTransitionCircuitInput(user, epoch);
    const input: UserTransitionProof = await genInputForContract(
      Circuit.userStateTransition,
      circuitInputs
    );
    input.blindedHashChains[0] = genRandomSalt() as BigNumberish;
    const isProofValid = await unirepContract.verifyUserStateTransition(input);
    expect(isProofValid).to.be.false;
  });

  it("Proof with wrong global state tree leaf should fail", async () => {
    const circuitInputs = await genUserStateTransitionCircuitInput(user, epoch);
    const input: UserTransitionProof = await genInputForContract(
      Circuit.userStateTransition,
      circuitInputs
    );
    input.newGlobalStateTreeLeaf = genRandomSalt() as BigNumberish;
    const isProofValid = await unirepContract.verifyUserStateTransition(input);
    expect(isProofValid).to.be.false;
  });
});
