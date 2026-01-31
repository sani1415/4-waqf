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
const FIREBASE_ONLY = true;

// ============================================
// CHANGE THIS LINE TO SWITCH STORAGE BACKEND
// You can also override at runtime via URL, e.g.:
//   ?storage=localStorage   or   ?storage=firebase
// ============================================
const DEFAULT_STORAGE_TYPE = 'firebase';  // Options: 'localStorage', 'firebase'

// Simple connection status icon (replaces banner)
function showConnectionIcon(status) {
    try {
        if (typeof document === 'undefined') return;

        const id = 'db-connection-icon';
        let icon = document.getElementById(id);
        
        if (!icon) {
            icon = document.createElement('div');
            icon.id = id;
            icon.style.cssText = [
                'position:fixed',
                'top:12px',
                'right:12px',
                'z-index:99999',
                'width:32px',
                'height:32px',
                'border-radius:50%',
                'display:flex',
                'align-items:center',
                'justify-content:center',
                'font-size:16px',
                'cursor:pointer',
                'transition:all 0.2s ease',
                'box-shadow:0 2px 8px rgba(0,0,0,0.15)'
            ].join(';');
            document.body.appendChild(icon);
        }

        if (status === 'connected') {
            icon.style.background = '#10b981';
            icon.style.color = '#fff';
            icon.innerHTML = '<i class="fas fa-cloud" style="font-size:16px;"></i>';
            icon.title = 'Connected to Firebase';
        } else if (status === 'failed') {
            icon.style.background = '#ef4444';
            icon.style.color = '#fff';
            icon.innerHTML = '<i class="fas fa-cloud-slash" style="font-size:16px;"></i>';
            icon.title = 'Firebase connection failed';
        } else {
            icon.style.background = '#6b7280';
            icon.style.color = '#fff';
            icon.innerHTML = '<i class="fas fa-cloud" style="font-size:16px; opacity:0.6;"></i>';
            icon.title = 'Connecting...';
        }
    } catch (e) {
        // ignore
    }
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

