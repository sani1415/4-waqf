/**
 * LocalStorage Adapter
 * Uses browser's localStorage for data persistence
 * Data persists per-browser but does not sync across devices
 */

class LocalStorageAdapter extends StorageAdapter {
    constructor() {
        super();
        this.ready = false;
    }

    /**
     * Initialize localStorage adapter
     */
    async init() {
        try {
            // Check if localStorage is available
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            this.ready = true;
            console.log('✅ LocalStorage adapter initialized');
            return true;
        } catch (e) {
            console.error('❌ LocalStorage not available:', e);
            this.ready = false;
            return false;
        }
    }

    /**
     * Get data from localStorage
     * @param {string} key - The key to retrieve
     * @returns {Promise<any>} The parsed data or null
     */
    async get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`Error getting ${key} from localStorage:`, error);
            return null;
        }
    }

    /**
     * Set data in localStorage
     * @param {string} key - The key to store data under
     * @param {any} data - The data to store
     * @returns {Promise<void>}
     */
    async set(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error(`Error setting ${key} in localStorage:`, error);
            throw error;
        }
    }

    /**
     * Delete data from localStorage
     * @param {string} key - The key to delete
     * @returns {Promise<void>}
     */
    async delete(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error(`Error deleting ${key} from localStorage:`, error);
            throw error;
        }
    }

    /**
     * Clear all localStorage data
     * @returns {Promise<void>}
     */
    async clear() {
        try {
            localStorage.clear();
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            throw error;
        }
    }

    /**
     * Check if localStorage is ready
     * @returns {boolean}
     */
    isReady() {
        return this.ready;
    }

    /**
     * Get adapter name
     * @returns {string}
     */
    getName() {
        return 'LocalStorage';
    }
}

