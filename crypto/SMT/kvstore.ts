export type K = NonNullable<Buffer>
export type V = NonNullable<Buffer>
export interface KV {
  key: K
  value: V
}

/**
 * KeyValueStore represents a basic collection of key:value pairs.
 */
export interface KeyValueStore {
    /**
     * Queries the value at a given key.
     * @param key Key to query.
     * @returns the value at that key.
     */
    get(key: K): Promise<V>
  
    /**
     * Sets the value at a given key.
     * @param key Key to set.
     * @param value Value to set to.
     */
    set(key: K, value: V): Promise<void>
  
    /**
     * Deletes a given key.
     * @param key Key to delete.
     */
    delete(key: K): Promise<void>
}