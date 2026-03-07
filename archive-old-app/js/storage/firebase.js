/**
 * Firebase Firestore Adapter
 * Uses Firestore for cloud data persistence
 * Data syncs across all devices in real-time
 * 
 * SETUP REQUIRED:
 * 1. Create Firebase project at https://firebase.google.com
 * 2. Enable Firestore Database (not Realtime Database)
 * 3. Update firebaseConfig in js/storage/firebase-config.js
 * 4. Switch to this adapter in js/storage/config.js
 * 
 * AUTO-INITIALIZATION:
 * - Collections are created automatically when first data is written
 * - No manual setup needed in Firestore Console
 */

class FirebaseAdapter extends StorageAdapter {
    constructor() {
        super();
        this.db = null;
        this.ready = false;
        this.cache = {};
        this.listeners = {};
    }

    /**
     * Initialize Firebase Firestore adapter
     */
    async init() {
        try {
            // Check if Firebase is loaded
            if (typeof firebase === 'undefined') {
                console.error('❌ Firebase SDK not loaded. Include Firebase scripts in your HTML.');
                return false;
            }

            // Check if Firebase config exists
            if (typeof firebaseConfig === 'undefined') {
                console.error('❌ Firebase config not found. Update js/storage/firebase-config.js');
                return false;
            }

            // Initialize Firebase
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }

            // Sign in anonymously for security rules
            await this.signInAnonymously();

            // Get Firestore reference
            this.db = firebase.firestore();
            this.ready = true;

            console.log('✅ Firebase Firestore adapter initialized');
            console.log('🔄 Real-time sync enabled with Firestore');
            console.log('📦 Collections will be created automatically when needed');
            
            // Auto-initialize collections (they'll be created when first data is written)
            await this.ensureCollectionsExist();
            
            return true;

        } catch (error) {
            console.error('❌ Firebase initialization failed:', error);
            this.ready = false;
            return false;
        }
    }

    /**
     * Sign in anonymously to Firebase Auth
     * This provides a security layer without requiring user accounts
     */
    async signInAnonymously() {
        try {
            const auth = firebase.auth();
            
            // Check if already signed in
            if (auth.currentUser) {
                console.log('✅ Already signed in anonymously:', auth.currentUser.uid);
                return auth.currentUser;
            }

            // Sign in anonymously
            const result = await auth.signInAnonymously();
            console.log('✅ Signed in anonymously:', result.user.uid);
            return result.user;

        } catch (error) {
            console.error('❌ Anonymous sign-in failed:', error);
            throw error;
        }
    }

    /**
     * Ensure collections exist by checking and initializing if needed
     * Firestore creates collections automatically, but we check structure
     */
    async ensureCollectionsExist() {
        try {
            const collections = ['students', 'tasks', 'messages', 'quizzes', 'quizResults', 'submittedDocuments'];
            console.log('🔍 Checking Firestore collections...');
            
            const checks = await Promise.all(collections.map(async (name) => {
                const snapshot = await this.db.collection(name).limit(1).get();
                return { name, empty: snapshot.empty };
            }));
            checks.forEach(({ name, empty }) => {
                console.log(empty ? `📝 Collection "${name}" is empty - will be created on first write` : `✅ Collection "${name}" exists with data`);
            });
            console.log('✅ Firestore ready for use');
        } catch (error) {
            console.warn('⚠️ Could not verify collections:', error.message);
        }
    }

    /**
     * Remove undefined values - Firestore does not accept undefined
     */
    _sanitizeForFirestore(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(item => this._sanitizeForFirestore(item));
        const clean = {};
        for (const k of Object.keys(obj)) {
            const v = obj[k];
            if (v !== undefined) clean[k] = this._sanitizeForFirestore(v);
        }
        return clean;
    }

    /**
     * Get data from Firestore
     * @param {string} key - The collection name to retrieve
     * @returns {Promise<any>} The data array or null
     */
    async get(key) {
        try {
            if (!this.ready) {
                throw new Error('Firebase adapter not initialized');
            }

            // Serve from cache if available
            if (this.cache.hasOwnProperty(key)) {
                return this.cache[key];
            }

            // Get all documents from collection
            const snapshot = await this.db.collection(key).get();
            
            if (snapshot.empty) {
                console.log(`📭 Collection "${key}" is empty`);
                this.cache[key] = null;
                return null;
            }

            // Convert Firestore documents to array
            const data = [];
            snapshot.forEach(doc => {
                data.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            // Cache the data
            this.cache[key] = data;
            
            // Set up real-time listener if not already listening
            if (!this.listeners[key]) {
                this.setupRealtimeListener(key);
            }

            return data;

        } catch (error) {
            console.error(`Error getting ${key} from Firestore:`, error);
            return null;
        }
    }

    /**
     * Set data in Firestore
     * @param {string} key - The collection name
     * @param {any} data - The data to store (array of objects or single object)
     * @returns {Promise<void>}
     */
    async set(key, data) {
        try {
            if (!this.ready) {
                throw new Error('Firebase adapter not initialized');
            }

            // Handle null or empty data
            if (!data) {
                console.log(`⚠️ No data provided for ${key}, skipping write`);
                return;
            }

            // If data is an array, write each item as a document
            if (Array.isArray(data)) {
                // Handle empty arrays - just clear the collection
                if (data.length === 0) {
                    console.log(`⚠️ Empty array for ${key}, clearing collection`);
                    const existingDocs = await this.db.collection(key).get();
                    const batch = this.db.batch();
                    existingDocs.forEach(doc => {
                        batch.delete(doc.ref);
                    });
                    if (!existingDocs.empty) {
                        await batch.commit();
                    }
                    this.cache[key] = null;
                    return;
                }

                const batch = this.db.batch();
                const collectionRef = this.db.collection(key);

                // First, delete all existing documents
                const existingDocs = await collectionRef.get();
                existingDocs.forEach(doc => {
                    batch.delete(doc.ref);
                });

                // Then add new documents (Firestore rejects undefined - strip it)
                data.forEach(item => {
                    const docId = item.id ? String(item.id) : this.db.collection(key).doc().id;
                    const docRef = collectionRef.doc(docId);
                    batch.set(docRef, this._sanitizeForFirestore(item));
                });

                await batch.commit();
                console.log(`✅ Saved ${data.length} documents to ${key}`);
            } else {
                const docId = data.id ? String(data.id) : 'data';
                const docRef = this.db.collection(key).doc(docId);
                await docRef.set(this._sanitizeForFirestore(data));
                console.log(`✅ Saved document to ${key}`);
            }

            // Update cache
            this.cache[key] = data;

        } catch (error) {
            console.error(`Error setting ${key} in Firestore:`, error);
            throw error;
        }
    }

    /**
     * Delete data from Firestore
     * @param {string} key - The collection name to delete
     * @returns {Promise<void>}
     */
    async delete(key) {
        try {
            if (!this.ready) {
                throw new Error('Firebase adapter not initialized');
            }

            // Delete all documents in the collection
            const snapshot = await this.db.collection(key).get();
            const batch = this.db.batch();

            snapshot.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            console.log(`🗑️ Deleted all documents from ${key}`);

            // Clear cache and listener
            delete this.cache[key];
            if (this.listeners[key]) {
                this.listeners[key]();
                delete this.listeners[key];
            }

        } catch (error) {
            console.error(`Error deleting ${key} from Firestore:`, error);
            throw error;
        }
    }

    /**
     * Clear all Firestore data
     * WARNING: This will delete ALL collections in your Firestore database!
     * @returns {Promise<void>}
     */
    async clear() {
        try {
            if (!this.ready) {
                throw new Error('Firebase adapter not initialized');
            }

            const collections = ['students', 'tasks', 'messages', 'quizzes', 'quizResults', 'submittedDocuments'];
            
            for (const collectionName of collections) {
                await this.delete(collectionName);
            }

            // Clear all cache
            this.cache = {};
            
            console.log('⚠️ All Firestore data cleared');

        } catch (error) {
            console.error('Error clearing Firestore:', error);
            throw error;
        }
    }

    /**
     * Setup real-time listener for a collection
     * @param {string} key - Collection name
     */
    setupRealtimeListener(key) {
        const unsubscribe = this.db.collection(key).onSnapshot(
            (snapshot) => {
                const data = [];
                snapshot.forEach(doc => {
                    data.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                this.cache[key] = data.length > 0 ? data : null;
                console.log(`🔄 Real-time update: ${key} (${data.length} items)`);
            },
            (error) => {
                console.error(`Error in ${key} listener:`, error);
            }
        );

        this.listeners[key] = unsubscribe;
    }

    /**
     * Check if Firebase is ready
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
        return 'Firestore';
    }

    /**
     * Listen for real-time updates on a collection
     * @param {string} key - The collection name to listen to
     * @param {Function} callback - Callback function when data changes
     * @returns {Function} Unsubscribe function
     */
    onValue(key, callback) {
        if (!this.ready) {
            console.error('Firebase adapter not initialized');
            return () => {};
        }

        const unsubscribe = this.db.collection(key).onSnapshot(
            (snapshot) => {
                const data = [];
                snapshot.forEach(doc => {
                    data.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                callback(data.length > 0 ? data : null);
            },
            (error) => {
                console.error(`Error listening to ${key}:`, error);
            }
        );

        return unsubscribe;
    }

    /**
     * Migrate data from localStorage to Firestore
     * Useful for initial setup or data import
     * @returns {Promise<void>}
     */
    async migrateFromLocalStorage() {
        try {
            console.log('🔄 Migrating data from localStorage to Firestore...');

            const keys = ['students', 'tasks', 'messages', 'quizzes', 'quizResults'];
            
            for (const key of keys) {
                const data = localStorage.getItem(key);
                if (data) {
                    const parsed = JSON.parse(data);
                    if (parsed && (Array.isArray(parsed) ? parsed.length > 0 : true)) {
                        await this.set(key, parsed);
                        console.log(`✅ Migrated ${key}: ${Array.isArray(parsed) ? parsed.length : '1'} items`);
                    }
                }
            }

            console.log('✅ Migration complete!');

        } catch (error) {
            console.error('❌ Migration failed:', error);
            throw error;
        }
    }

    /**
     * Add a single document to a collection
     * @param {string} collectionName - Collection name
     * @param {Object} data - Document data
     * @returns {Promise<string>} Document ID
     */
    async addDocument(collectionName, data) {
        try {
            if (!this.ready) {
                throw new Error('Firebase adapter not initialized');
            }

            const docRef = await this.db.collection(collectionName).add(data);
            console.log(`✅ Added document to ${collectionName} with ID: ${docRef.id}`);
            
            // Invalidate cache for this collection
            delete this.cache[collectionName];
            
            return docRef.id;

        } catch (error) {
            console.error(`Error adding document to ${collectionName}:`, error);
            throw error;
        }
    }

    /**
     * Update a single document in a collection
     * @param {string} collectionName - Collection name
     * @param {string} docId - Document ID
     * @param {Object} data - Data to update
     * @returns {Promise<void>}
     */
    async updateDocument(collectionName, docId, data) {
        try {
            if (!this.ready) {
                throw new Error('Firebase adapter not initialized');
            }

            await this.db.collection(collectionName).doc(docId).update(data);
            console.log(`✅ Updated document ${docId} in ${collectionName}`);
            
            // Invalidate cache for this collection
            delete this.cache[collectionName];

        } catch (error) {
            console.error(`Error updating document in ${collectionName}:`, error);
            throw error;
        }
    }

    /**
     * Delete a single document from a collection
     * @param {string} collectionName - Collection name
     * @param {string} docId - Document ID
     * @returns {Promise<void>}
     */
    async deleteDocument(collectionName, docId) {
        try {
            if (!this.ready) {
                throw new Error('Firebase adapter not initialized');
            }

            await this.db.collection(collectionName).doc(docId).delete();
            console.log(`🗑️ Deleted document ${docId} from ${collectionName}`);
            
            // Invalidate cache for this collection
            delete this.cache[collectionName];

        } catch (error) {
            console.error(`Error deleting document from ${collectionName}:`, error);
            throw error;
        }
    }
}
