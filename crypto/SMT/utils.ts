import { ethers } from 'ethers'

export const bufToHexString = (buf: Buffer): string => {
    return '0x' + buf.toString('hex')
}

/**
 * Removes "0x" from start of a string if it exists.
 * @param str String to modify.
 * @returns the string without "0x".
 */
export const remove0x = (str: string): string => {
    return str.startsWith('0x') ? str.slice(2) : str
}

/**
 * Adds "0x" to the start of a string if necessary.
 * @param str String to modify.
 * @returns the string with "0x".
 */
export const add0x = (str: string): string => {
    str = str.padStart(64,"0")
    return str.startsWith('0x') ? str : '0x' + str
}

/**
 * Computes the keccak256 hash of a value.
 * @param value Value to hash
 * @returns the hash of the value.
 */
export const keccak256 = (value: string): string => {
    const preimage = add0x(value)
    return remove0x(ethers.utils.keccak256(preimage))
}