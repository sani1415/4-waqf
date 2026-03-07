/**
 * Storage Adapter Interface
 * Base class that defines the contract for all storage adapters
 * This allows easy switching between different storage backends
 */

class StorageAdapter {
    /**
     * Initialize the storage adapter
     */
    async init() {
        throw new Error('init() must be implemented by subclass');
    }

    /**
     * Get data by key
     * @param {string} key - The key to retrieve
     * @returns {Promise<any>} The data
     */
    async get(key) {
        throw new Error('get() must be implemented by subclass');
    }

    /**
     * Set data by key
     * @param {string} key - The key to store data under
     * @param {any} data - The data to store
     * @returns {Promise<void>}
     */
    async set(key, data) {
        throw new Error('set() must be implemented by subclass');
    }

    /**
     * Delete data by key
     * @param {string} key - The key to delete
     * @returns {Promise<void>}
     */
    async delete(key) {
        throw new Error('delete() must be implemented by subclass');
    }

    /**
     * Clear all data
     * @returns {Promise<void>}
     */
    async clear() {
        throw new Error('clear() must be implemented by subclass');
    }

    /**
     * Check if storage is ready
     * @returns {boolean}
     */
    isReady() {
        throw new Error('isReady() must be implemented by subclass');
    }

    /**
     * Get the name of this storage adapter
     * @returns {string}
     */
    getName() {
        throw new Error('getName() must be implemented by subclass');
    }
}

