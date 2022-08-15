/* eslint-disable @typescript-eslint/no-var-requires */

import { CircuitInput } from './types'

/**
 * Compute the witness of the given circuit and user inputs
 * @param circuit The circuit is loaded with `circom.tester(path)`
 * @param inputs The user inputs of the circuits that are used to generate witness
 * @returns witness of the proof
 */
export const executeCircuit = async (
    circuit: any,
    inputs: CircuitInput
): Promise<any> => {
    const witness = await circuit.calculateWitness(inputs, true)
    await circuit.checkConstraints(witness)
    await circuit.loadSymbols()

    return witness
}

/**
 * Get signal from a given witness
 * @param circuit The circuit is loaded with `circom.tester(path)`
 * @param witness The computed witness
 * @param signal The name of the signal that user wants to retrieve
 * @returns The value of the signal
 */
export const getSignalByName = (circuit: any, witness: any, signal: string) => {
    return witness[circuit.symbols[signal].varIdx]
}
