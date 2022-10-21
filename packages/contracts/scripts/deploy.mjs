import { deployUnirep } from '../build/deploy/index.js'
import { STATE_TREE_DEPTH, EPOCH_TREE_DEPTH } from '@unirep/circuits'

const attestingFee = ethers.utils.parseEther('0.000000000001')
const numEpochKeyNoncePerEpoch = 3
const numAttestationsPerProof = 5
const epochLength = 12 * 60 * 60 // seconds
const maxReputationBudget = 10

const [signer] = await ethers.getSigners()
const unirep = await deployUnirep(signer, {
    attestingFee,
    numEpochKeyNoncePerEpoch,
    stateTreeDepth: STATE_TREE_DEPTH,
    epochTreeDepth: EPOCH_TREE_DEPTH,
})
console.log(`Unirep address: ${unirep.address}`)
