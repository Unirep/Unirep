import * as path from 'path'
import * as fs from 'fs'
const poseidonGenContract = require('circomlib/src/poseidon_gencontract.js')

const pathT3 = path.join(
  __dirname,
  '../artifacts/contracts/Poseidon.sol/PoseidonT3.json'
)
const pathT6 = path.join(
  __dirname,
  '../artifacts/contracts/Poseidon.sol/PoseidonT6.json'
)

const buildPoseidonT3 = () => {
  const PoseidonT3 = JSON.parse(fs.readFileSync(pathT3).toString())
  PoseidonT3['abi'] = poseidonGenContract.abi
  PoseidonT3['bytecode'] = poseidonGenContract.createCode(2)
  fs.writeFileSync(pathT3, JSON.stringify(PoseidonT3))
}

const buildPoseidonT6 = async () => {
  const PoseidonT6 = JSON.parse(fs.readFileSync(pathT6).toString())
  PoseidonT6['abi'] = poseidonGenContract.abi
  PoseidonT6['bytecode'] = poseidonGenContract.createCode(5)
  fs.writeFileSync(pathT6, JSON.stringify(PoseidonT6))
}

if (require.main === module) {
  buildPoseidonT3()
  buildPoseidonT6()
}

export { buildPoseidonT3, buildPoseidonT6 }