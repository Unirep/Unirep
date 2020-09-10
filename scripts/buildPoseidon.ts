const Artifactor = require("truffle-artifactor");

const poseidonGenContract = require('circomlib/src/poseidon_gencontract.js')
const artifactor = new Artifactor('artifacts/')

const buildPoseidonT3 = async () => {
  await artifactor.save({
    contractName: 'PoseidonT3',
    abi: poseidonGenContract.abi,
    unlinked_binary: poseidonGenContract.createCode(2)
  })
}

const buildPoseidonT6 = async () => {
  await artifactor.save({
    contractName: 'PoseidonT6',
    abi: poseidonGenContract.abi,
    unlinked_binary: poseidonGenContract.createCode(5)
  })
}

if (require.main === module) {
  buildPoseidonT3()
  buildPoseidonT6()
}

export { buildPoseidonT3, buildPoseidonT6 }