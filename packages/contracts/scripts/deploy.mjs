import { deployUnirep } from '../build/deploy/index.js'

const [signer] = await ethers.getSigners()
const unirep = await deployUnirep(signer)
const unirepAddress = await unirep.getAddress()
console.log(`Unirep address: ${unirepAddress}`)
