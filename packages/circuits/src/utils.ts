/* eslint-disable @typescript-eslint/no-var-requires */

export const executeCircuit = async (
    circuit: any,
    inputs: any
): Promise<any> => {
    const witness = await circuit.calculateWitness(inputs, true)
    await circuit.checkConstraints(witness)
    await circuit.loadSymbols()

    return witness
}

export const getSignalByName = (circuit: any, witness: any, signal: string) => {
    return witness[circuit.symbols[signal].varIdx]
}
