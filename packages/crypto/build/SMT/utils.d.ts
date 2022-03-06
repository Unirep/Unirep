/// <reference types="node" />
export declare const bufToHexString: (buf: Buffer) => string;
/**
 * Removes "0x" from start of a string if it exists.
 * @param str String to modify.
 * @returns the string without "0x".
 */
export declare const remove0x: (str: string) => string;
/**
 * Adds "0x" to the start of a string if necessary.
 * @param str String to modify.
 * @returns the string with "0x".
 */
export declare const add0x: (str: string) => string;
/**
 * Computes the keccak256 hash of a value.
 * @param value Value to hash
 * @returns the hash of the value.
 */
export declare const keccak256: (value: string) => string;
