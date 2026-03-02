/**
 * offline-indicator.js
 * 
 * Provides visual indicators for online/offline status and manages
 * user interactions when the app is offline.
 * 
 * Features:
 * - Visual banner showing offline status
 * - Header icon indicator
 * - Disables checkout when offline
 * - Shows toast notifications for connectivity changes
 * - Tracks pending sync operations
 * 
 * @version 1.0.0
 */

import * as ui from './ui.js';

/**
 * OfflineIndicator class manages the offline/online status UI
 */
class OfflineIndicator {
    constructor() {
        this.isOnline = navigator.onLine;
        this.banner = null;
        this.headerIndicator = null;
        this.pendingSyncCount = 0;

        // Bind event handlers
        this.handleOnline = this.handleOnline.bind(this);
        this.handleOffline = this.handleOffline.bind(this);
        this.handleServiceWorkerMessage = this.handleServiceWorkerMessage.bind(this);

        this.init();
    }

    /**
     * Initialize the offline indicator
     */
    init() {
        console.log('[OfflineIndicator] Initializing...', this.isOnline ? 'Online' : 'Offline');

        // Create UI elements
        this.createBanner();
        this.createHeaderIndicator();

        // Set up event listeners
        window.addEventListener('online', this.handleOnline);
        window.addEventListener('offline', this.handleOffline);

        // Listen for messages from service worker
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage);
        }

        // Initial state update
        this.updateUI();

        // Check for pending sync operations
        this.checkPendingSync();
    }

    /**
     * Create the offline banner element
     */
    createBanner() {
        // Check if banner already exists
        if (document.getElementById('offline-banner')) {
            this.banner = document.getElementById('offline-banner');
            return;
        }

        this.banner = document.createElement('div');
        this.banner.id = 'offline-banner';
        this.banner.className = 'offline-banner';
        this.banner.setAttribute('role', 'status');
        this.banner.setAttribute('aria-live', 'polite');

        this.banner.textContent = '';

        const content = document.createElement('div');
        content.className = 'offline-banner__content';

        const icon = document.createElement('i');
        icon.className = 'fas fa-wifi-slash offline-banner__icon';

        const textDiv = document.createElement('div');
        textDiv.className = 'offline-banner__text';

        const title = document.createElement('strong');
        title.className = 'offline-banner__title';
        title.textContent = "You're offline";

        const message = document.createElement('span');
        message.className = 'offline-banner__message';
        message.textContent = "Some features may be limited. Changes will sync when you're back online.";

        textDiv.appendChild(title);
        textDiv.appendChild(message);

        const syncStatus = document.createElement('div');
        syncStatus.className = 'offline-banner__sync-status hidden';

        const syncIcon = document.createElement('i');
        syncIcon.className = 'fas fa-sync-alt fa-spin';

        const syncText = document.createElement('span');
        syncText.className = 'offline-banner__sync-text';
        syncText.textContent = 'Syncing ';

        const syncCount = document.createElement('span');
        syncCount.className = 'sync-count';
        syncCount.textContent = '0';

        syncText.appendChild(syncCount);
        syncText.appendChild(document.createTextNode(' items...'));

        syncStatus.appendChild(syncIcon);
        syncStatus.appendChild(syncText);

        content.appendChild(icon);
        content.appendChild(textDiv);
        content.appendChild(syncStatus);

        this.banner.appendChild(content);

        document.body.prepend(this.banner);
    }

    /**
     * Create the header status indicator
     */
    createHeaderIndicator() {
        // Add indicator to header
        const header = document.querySelector('.main-header');
        if (!header) {
            console.warn('[OfflineIndicator] Header not found');
            return;
        }

        // Check if indicator already exists
        if (document.getElementById('connection-indicator')) {
            this.headerIndicator = document.getElementById('connection-indicator');
            return;
        }

        this.headerIndicator = document.createElement('div');
        this.headerIndicator.id = 'connection-indicator';
        this.headerIndicator.className = 'connection-indicator';
        this.headerIndicator.setAttribute('aria-label', 'Connection status');
        this.headerIndicator.setAttribute('title', 'Offline - Limited functionality');
        this.headerIndicator.style.display = 'none'; // Hidden by default, only shown when offline

        const icon = document.createElement('i');
        icon.className = 'fas fa-wifi-slash connection-indicator__icon';

        const text = document.createElement('span');
        text.className = 'connection-indicator__text';
        text.textContent = 'Offline';

        this.headerIndicator.appendChild(icon);
        this.headerIndicator.appendChild(text);

        // Insert before the cart link
        const cartLink = header.querySelector('.header-cart-link');
        if (cartLink) {
            cartLink.parentNode.insertBefore(this.headerIndicator, cartLink);
        } else {
            // Fallback: append to header actions
            const headerActions = header.querySelector('.header-actions');
            if (headerActions) {
                headerActions.appendChild(this.headerIndicator);
            }
        }
    }

    /**
     * Handle online event
     */
    handleOnline() {
        console.log('[OfflineIndicator] Connection restored');
        this.isOnline = true;
        this.updateUI();

        // Show success toast
        if (ui && ui.showToast) {
            ui.showToast('Connection restored! Syncing your changes...', 'success');
        }

        // Trigger background sync if supported
        this.triggerBackgroundSync();

        // Dispatch custom event for other modules
        window.dispatchEvent(new CustomEvent('connection-restored'));
    }

    /**
     * Handle offline event
     */
    handleOffline() {
        console.log('[OfflineIndicator] Connection lost');
        this.isOnline = false;
        this.updateUI();

        // Show warning toast
        if (ui && ui.showToast) {
            ui.showToast('You\'re offline. Changes will be saved locally.', 'warning');
        }

        // Dispatch custom event for other modules
        window.dispatchEvent(new CustomEvent('connection-lost'));
    }

    /**
     * Update UI based on online/offline status
     */
    updateUI() {
        if (this.isOnline) {
            this.showOnlineState();
        } else {
            this.showOfflineState();
        }

        // Update checkout buttons
        this.updateCheckoutButtons();
    }

    /**
     * Show online state UI
     */
    showOnlineState() {
        // Hide banner
        if (this.banner) {
            this.banner.classList.remove('offline-banner--visible');
            setTimeout(() => {
                if (this.isOnline) { // Check again in case it changed
                    this.banner.style.display = 'none';
                }
            }, 300);
        }

        // Hide header indicator when online (only show when there's a problem)
        if (this.headerIndicator) {
            this.headerIndicator.style.display = 'none';
        }

        // Remove offline class from body
        document.body.classList.remove('offline-mode');
    }

    /**
     * Show offline state UI
     */
    showOfflineState() {
        // Show banner
        if (this.banner) {
            this.banner.style.display = 'block';
            // Trigger reflow for animation
            void this.banner.offsetWidth;
            this.banner.classList.add('offline-banner--visible');
        }

        // Show and update header indicator (only visible when offline)
        if (this.headerIndicator) {
            this.headerIndicator.style.display = 'flex';
            this.headerIndicator.classList.add('connection-indicator--offline');
            this.headerIndicator.classList.remove('connection-indicator--online');
            this.headerIndicator.setAttribute('title', 'Offline - Limited functionality');

            const icon = this.headerIndicator.querySelector('.connection-indicator__icon');
            const text = this.headerIndicator.querySelector('.connection-indicator__text');

            if (icon) icon.className = 'fas fa-wifi-slash connection-indicator__icon';
            if (text) text.textContent = 'Offline';
        }

        // Add offline class to body for CSS hooks
        document.body.classList.add('offline-mode');
    }

    /**
     * Update checkout buttons based on online status
     */
    updateCheckoutButtons() {
        const checkoutButtons = document.querySelectorAll(
            '#proceed-checkout, .checkout-btn, button[type="submit"][form*="checkout"]'
        );

        checkoutButtons.forEach(button => {
            if (this.isOnline) {
                button.disabled = false;
                button.title = '';

                // Remove offline warning if exists
                const warning = button.parentElement?.querySelector('.offline-warning');
                if (warning) {
                    warning.remove();
                }
            } else {
                button.disabled = true;
                button.title = 'Checkout is unavailable while offline';

                // Add offline warning if doesn't exist
                if (!button.parentElement?.querySelector('.offline-warning')) {
                    const warning = document.createElement('p');
                    warning.className = 'offline-warning';

                    const icon = document.createElement('i');
                    icon.className = 'fas fa-exclamation-triangle';

                    warning.appendChild(icon);
                    warning.appendChild(document.createTextNode(' Checkout requires an internet connection'));
                    button.parentElement?.insertBefore(warning, button.nextSibling);
                }
            }
        });
    }

    /**
     * Trigger background sync for pending operations
     */
    async triggerBackgroundSync() {
        if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
            console.warn('[OfflineIndicator] Service worker not available for sync');
            return;
        }

        try {
            // Request background sync from service worker
            if ('sync' in navigator.serviceWorker) {
                const registration = await navigator.serviceWorker.ready;
                await registration.sync.register('sync-cart');
                await registration.sync.register('sync-forms');
                console.log('[OfflineIndicator] Background sync registered');
            } else {
                console.warn('[OfflineIndicator] Background Sync API not supported');
                // Fallback: manually trigger sync
                this.manualSync();
            }
        } catch (error) {
            console.error('[OfflineIndicator] Failed to register background sync:', error);
        }
    }

    /**
     * Manual sync fallback for browsers without Background Sync API
     */
    async manualSync() {
        console.log('[OfflineIndicator] Performing manual sync...');

        // Show sync status in banner
        this.showSyncStatus(true);

        try {
            // Import sync manager if available
            const { default: SyncManager } = await import('./sync-manager.js');
            const syncManager = new SyncManager();
            await syncManager.syncAll();

            // Update sync count
            this.pendingSyncCount = 0;
            this.updateSyncCount();

            if (ui && ui.showToast) {
                ui.showToast('All changes synced successfully!', 'success');
            }
        } catch (error) {
            console.error('[OfflineIndicator] Manual sync failed:', error);
            if (ui && ui.showToast) {
                ui.showToast('Some changes could not be synced. Please try again.', 'error');
            }
        } finally {
            this.showSyncStatus(false);
        }
    }

    /**
     * Show/hide sync status in banner
     */
    showSyncStatus(show) {
        if (!this.banner) return;

        const syncStatus = this.banner.querySelector('.offline-banner__sync-status');
        if (syncStatus) {
            if (show) {
                syncStatus.classList.remove('hidden');
            } else {
                syncStatus.classList.add('hidden');
            }
        }
    }

    /**
     * Update the sync count display
     */
    updateSyncCount() {
        if (!this.banner) return;

        const countElement = this.banner.querySelector('.sync-count');
        if (countElement) {
            countElement.textContent = this.pendingSyncCount.toString();
        }
    }

    /**
     * Check for pending sync operations
     */
    async checkPendingSync() {
        try {
            // Check IndexedDB for queued items
            const db = await this.openDB();
            const cartCount = await this.getQueueCount(db, 'cart');
            const formCount = await this.getQueueCount(db, 'forms');

            this.pendingSyncCount = cartCount + formCount;
            this.updateSyncCount();

            if (this.pendingSyncCount > 0) {
                console.log(`[OfflineIndicator] ${this.pendingSyncCount} items pending sync`);
            }
        } catch (error) {
            console.error('[OfflineIndicator] Failed to check pending sync:', error);
        }
    }

    /**
     * Handle messages from service worker
     */
    handleServiceWorkerMessage(event) {
        const { data } = event;

        if (!data || !data.type) return;

        console.log('[OfflineIndicator] Message from SW:', data.type);

        switch (data.type) {
            case 'SYNC_SUCCESS':
                this.handleSyncSuccess(data.data);
                break;
            case 'SYNC_FAILED':
                this.handleSyncFailed(data.data);
                break;
            case 'CACHE_UPDATED':
                console.log('[OfflineIndicator] Cache updated');
                break;
        }
    }

    /**
     * Handle successful sync
     */
    handleSyncSuccess(data) {
        console.log('[OfflineIndicator] Sync successful:', data);

        if (this.pendingSyncCount > 0) {
            this.pendingSyncCount--;
            this.updateSyncCount();
        }

        // If all synced, hide sync status
        if (this.pendingSyncCount === 0) {
            this.showSyncStatus(false);
        }
    }

    /**
     * Handle failed sync
     */
    handleSyncFailed(data) {
        console.error('[OfflineIndicator] Sync failed:', data);

        if (ui && ui.showToast) {
            ui.showToast('Failed to sync some changes. Will retry later.', 'warning');
        }
    }

    /**
     * Open IndexedDB (replicates SW DB structure)
     */
    openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('soundlightpro-sw', 2);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create all required object stores
                if (!db.objectStoreNames.contains('cart')) {
                    const cartStore = db.createObjectStore('cart', { keyPath: 'id', autoIncrement: true });
                    cartStore.createIndex('timestamp', 'timestamp', { unique: false });
                    cartStore.createIndex('status', 'status', { unique: false });
                }
                if (!db.objectStoreNames.contains('wishlist')) {
                    const wishlistStore = db.createObjectStore('wishlist', { keyPath: 'id', autoIncrement: true });
                    wishlistStore.createIndex('timestamp', 'timestamp', { unique: false });
                    wishlistStore.createIndex('status', 'status', { unique: false });
                }
                if (!db.objectStoreNames.contains('forms')) {
                    const formsStore = db.createObjectStore('forms', { keyPath: 'id', autoIncrement: true });
                    formsStore.createIndex('timestamp', 'timestamp', { unique: false });
                    formsStore.createIndex('status', 'status', { unique: false });
                }
                if (!db.objectStoreNames.contains('api')) {
                    const apiStore = db.createObjectStore('api', { keyPath: 'id', autoIncrement: true });
                    apiStore.createIndex('timestamp', 'timestamp', { unique: false });
                    apiStore.createIndex('status', 'status', { unique: false });
                }
            };
        });
    }

    /**
     * Get count of items in a queue
     */
    getQueueCount(db, storeName) {
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.count();

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } catch (error) {
                // Store might not exist yet
                resolve(0);
            }
        });
    }

    /**
     * Get current online status
     */
    getStatus() {
        return {
            isOnline: this.isOnline,
            pendingSyncCount: this.pendingSyncCount
        };
    }

    /**
     * Destroy the offline indicator (cleanup)
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('online', this.handleOnline);
        window.removeEventListener('offline', this.handleOffline);

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.removeEventListener('message', this.handleServiceWorkerMessage);
        }

        // Remove UI elements
        if (this.banner && this.banner.parentNode) {
            this.banner.parentNode.removeChild(this.banner);
        }

        if (this.headerIndicator && this.headerIndicator.parentNode) {
            this.headerIndicator.parentNode.removeChild(this.headerIndicator);
        }

        console.log('[OfflineIndicator] Destroyed');
    }
}

// Export singleton instance
let offlineIndicatorInstance = null;

/**
 * Initialize offline indicator
 * @returns {OfflineIndicator}
 */
export function initOfflineIndicator() {
    if (!offlineIndicatorInstance) {
        offlineIndicatorInstance = new OfflineIndicator();
    }
    return offlineIndicatorInstance;
}

/**
 * Get offline indicator instance
 * @returns {OfflineIndicator|null}
 */
export function getOfflineIndicator() {
    return offlineIndicatorInstance;
}

export default OfflineIndicator;
