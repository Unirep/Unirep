import { createHash } from 'crypto'
import poseidon from 'poseidon-lite'
import { genRandomSalt } from 'maci-crypto'

/**
 * Type of snark public signals
 */
type SnarkPublicSignals = bigint[]

/**
 * Interface of snark proof
 */
interface SnarkProof {
    pi_a: bigint[]
    pi_b: bigint[][]
    pi_c: bigint[]
}

/**
 * Definition of type of serialized ZKIdentity
 */
type SerializedIdentity = {
    identityNullifier: string
    identityTrapdoor: string
    secret: string[]
}

/**
 * Returns an hexadecimal sha256 hash of the message passed as parameter.
 * @param message The string to hash.
 * @returns The hexadecimal hash of the message.
 */
function sha256(message: string): string {
    return `0x${createHash('sha256')
        .update(Buffer.from(message))
        .digest('hex')}`
}

/**
 * The strategy is used to generate the ZK identity.
 */
enum Strategy {
    /**
     * Identity is generated randomly.
     */
    RANDOM,
    /**
     * Identity is generated from a message.
     */
    MESSAGE,
    /**
     * Identity parameters are passed from outside.
     */
    SERIALIZED,
}

/**
 * ZkIdentity is a class which can be used by protocols supported by the
 * @zk-kit/protocols package and it simplifies the management of
 * identity-related witness parameters.
 */
class ZkIdentity {
    private _identityTrapdoor: bigint
    private _identityNullifier: bigint
    private _secret: bigint[] = []

    /**
     * Initializes the class attributes based on the strategy passed as parameter.
     * @param strategy The strategy for identity generation. Default: `Strategy.RANDOM`
     * @param metadata Additional data needed to create identity for given strategy.
     */
    constructor(
        strategy: Strategy = Strategy.RANDOM,
        metadata?: string | SerializedIdentity
    ) {
        switch (strategy) {
            case Strategy.RANDOM: {
                this._identityTrapdoor = genRandomSalt().valueOf()
                this._identityNullifier = genRandomSalt().valueOf()
                this._secret = [this._identityNullifier, this._identityTrapdoor]
                break
            }
            case Strategy.MESSAGE: {
                if (!metadata) {
                    throw new Error('The message is not defined')
                }

                if (typeof metadata !== 'string') {
                    throw new Error('The message is not a string')
                }

                const messageHash = sha256(metadata)

                this._identityTrapdoor = BigInt(
                    `0x${sha256(`${messageHash}identity_trapdoor`)}`
                )
                this._identityNullifier = BigInt(
                    `0x${sha256(`${messageHash}identity_nullifier`)}`
                )
                this._secret = [this._identityNullifier, this._identityTrapdoor]
                break
            }
            case Strategy.SERIALIZED: {
                if (!metadata) {
                    throw new Error('The serialized identity is not defined')
                }

                if (typeof metadata === 'string') {
                    try {
                        metadata = JSON.parse(metadata) as SerializedIdentity
                    } catch (error) {
                        throw new Error(
                            'The serialized identity cannot be parsed'
                        )
                    }
                }

                if (
                    !('identityNullifier' in metadata) ||
                    !('identityTrapdoor' in metadata) ||
                    !('secret' in metadata)
                ) {
                    throw new Error(
                        'The serialized identity does not contain the right parameter'
                    )
                }

                const { identityNullifier, identityTrapdoor, secret } = metadata

                this._identityNullifier = BigInt(`0x${identityNullifier}`)
                this._identityTrapdoor = BigInt(`0x${identityTrapdoor}`)
                this._secret = secret.map((item) => BigInt(`0x${item}`))

                break
            }
            default:
                throw new Error('The provided strategy is not supported')
        }
    }

    /**
     * Returns the identity trapdoor.
     * @returns The identity trapdoor.
     */
    get trapdoor(): bigint {
        return this._identityTrapdoor
    }

    /**
     * Returns the identity nullifier.
     * @returns The identity nullifier.
     */
    get identityNullifier(): bigint {
        return this._identityNullifier
    }

    /**
     * Returns the secret.
     * @returns The secret.
     */
    get secret(): bigint[] {
        return this._secret
    }

    /**
     * Returns the Poseidon hash of the secret.
     * @returns The hash of the secret.
     */
    get secretHash(): bigint {
        return poseidon(this._secret)
    }

    /**
     * Generates the identity commitment from the secret.
     * @returns identity commitment
     */
    public genIdentityCommitment(): bigint {
        return poseidon([this.secretHash])
    }

    /**
     * Serializes the class attributes and returns a stringified object.
     * @returns The stringified serialized identity.
     */
    public serializeIdentity(): string {
        const data: SerializedIdentity = {
            identityNullifier: this._identityNullifier.toString(16),
            identityTrapdoor: this._identityTrapdoor.toString(16),
            secret: this._secret.map((item) => item.toString(16)),
        }

        return JSON.stringify(data)
    }
}

export { SnarkPublicSignals, SnarkProof, ZkIdentity, Strategy }
