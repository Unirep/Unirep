import { poseidon_gencontract } from 'circomlibjs'

const poseidons = [2, 5]

export default poseidons.reduce((acc, inputCount) => {
    return {
        [inputCount]: {
            abi: poseidon_gencontract.generateABI(inputCount),
            bytecode: poseidon_gencontract.createCode(inputCount),
        },
        ...acc,
    }
}, {})
