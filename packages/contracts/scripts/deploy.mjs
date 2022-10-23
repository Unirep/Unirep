import { deployUnirep } from '../build/deploy/index.js'

const [signer] = await ethers.getSigners()
const unirep = await deployUnirep(signer)
console.log(`Unirep address: ${unirep.address}`)
