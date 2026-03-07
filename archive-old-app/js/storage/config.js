/**
 * Storage Configuration
 * Switch between different storage backends here
 * 
 * USAGE:
 * Change STORAGE_TYPE to switch backends:
 * - 'localStorage' : Browser localStorage (default, no setup needed)
 * - 'firebase'     : Firebase Realtime Database (requires Firebase setup)
 * 
 * SWITCHING BACKENDS:
 * 1. Change STORAGE_TYPE below
 * 2. If using Firebase, uncomment Firebase scripts in HTML files
 * 3. Configure Firebase in js/firebase-config.js
 * 4. Refresh the app
 */

/**
 * Firebase-only mode
 * If true, the app will NOT fall back to localStorage.
 * Instead, it will show a clear error and stop initialization.
 */
const FIREBASE_ONLY = false;  // Allow fallback to localStorage if Firebase fails

// ============================================
// CHANGE THIS LINE TO SWITCH STORAGE BACKEND
// You can also override at runtime via URL, e.g.:
//   ?storage=localStorage   or   ?storage=firebase
// ============================================
const DEFAULT_STORAGE_TYPE = 'firebase';  // Options: 'localStorage', 'firebase' - use firebase for Firestore persistence

// Connection status icon removed per design (no longer shown on any page)
function showConnectionIcon(status) {
    // No-op: icon removed from UI on all pages
}

// Legacy function for compatibility (now just shows icon)
function showAppStatusBanner({ title, message, variant = 'info' }) {
    if (variant === 'success') {
        showConnectionIcon('connected');
    } else if (variant === 'error') {
        showConnectionIcon('failed');
    } else {
        showConnectionIcon('connecting');
    }
}

// Make it available to other scripts (e.g., data-manager.js)
try {
    if (typeof window !== 'undefined') {
        window.showAppStatusBanner = showAppStatusBanner;
        window.showConnectionIcon = showConnectionIcon;
    }
} catch (e) {
    // ignore
}

// Runtime override helper
function getStorageTypeFromURL() {
    try {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const value = params.get('storage');
            if (value === 'firebase' || (!FIREBASE_ONLY && value === 'localStorage')) {
                console.log(`🔧 Storage override detected via URL: ${value}`);
                return value;
            }
        }
    } catch (e) {
        // ignore
    }
    return null;
}

const STORAGE_TYPE = getStorageTypeFromURL() || DEFAULT_STORAGE_TYPE;
// ============================================

/**
 * Storage Factory
 * Creates and returns the appropriate storage adapter
 */
class StorageFactory {
    static async createStorage() {
        let adapter;

        switch (STORAGE_TYPE) {
            case 'firebase':
                console.log('🔧 Using Firebase storage adapter');
                adapter = new FirebaseAdapter();
                break;

            case 'localStorage':
            default:
                console.log('🔧 Using LocalStorage adapter');
                adapter = new LocalStorageAdapter();
                break;
        }

        // Initialize the adapter
        const initialized = await adapter.init();
        
        if (!initialized) {
            const name = (adapter && typeof adapter.getName === 'function') ? adapter.getName() : 'Storage';
            const msg = `${name} initialization failed.`;

            if (FIREBASE_ONLY) {
                showConnectionIcon('failed');
                throw new Error(msg);
            }

            console.warn(`⚠️ ${msg} Falling back to LocalStorage`);
            adapter = new LocalStorageAdapter();
            await adapter.init();
        }

        console.log(`✅ Storage adapter ready: ${adapter.getName()}`);
        if (STORAGE_TYPE === 'firebase') {
            showConnectionIcon('connected');
        }
        return adapter;
    }

    /**
     * Get current storage type
     * @returns {string}
     */
    static getStorageType() {
        return STORAGE_TYPE;
    }

    /**
     * Check if using cloud storage
     * @returns {boolean}
     */
    static isCloudStorage() {
        return STORAGE_TYPE === 'firebase';
    }
}

