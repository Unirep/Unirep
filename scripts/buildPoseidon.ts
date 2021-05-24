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
  PoseidonT3['abi'] = poseidonGenContract.generateABI(2)
  PoseidonT3['bytecode'] = poseidonGenContract.createCode(2)
  fs.writeFileSync(pathT3, JSON.stringify(PoseidonT3, null, 4))
}

const buildPoseidonT6 = async () => {
  const PoseidonT6 = JSON.parse(fs.readFileSync(pathT6).toString())
  PoseidonT6['abi'] = poseidonGenContract.generateABI(5)
  PoseidonT6['bytecode'] = poseidonGenContract.createCode(5)
  fs.writeFileSync(pathT6, JSON.stringify(PoseidonT6, null, 4))
}

if (require.main === module) {
  console.log('Building Poseidon T3 & T6...')
  buildPoseidonT3()
  buildPoseidonT6()
}

export { buildPoseidonT3, buildPoseidonT6 }