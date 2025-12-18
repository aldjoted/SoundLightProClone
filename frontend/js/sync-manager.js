/**
 * sync-manager.js
 * 
 * Manages background synchronization of data when the application
 * goes offline and comes back online.
 * 
 * Features:
 * - Queue failed API requests
 * - Retry when connection restored
 * - Integrate with cart StateManager
 * - Show user feedback for sync status
 * 
 * @version 1.0.0
 */

import { cartStateManager } from './cart.js';
import * as ui from './ui.js';

function normalizeCartItemsShape(items) {
    if (!items) {
        return [];
    }
    if (Array.isArray(items)) {
        return items;
    }
    if (typeof items === 'object') {
        return Object.values(items);
    }
    return [];
}

/**
 * SyncManager class handles queuing and syncing of offline operations
 */
class SyncManager {
    constructor() {
        this.db = null;
        this.isInitialized = false;
        this.syncInProgress = false;
        
        // Bind methods
        this.handleOnline = this.handleOnline.bind(this);
        this.handleStorageUpdate = this.handleStorageUpdate.bind(this);
        
        this.init();
    }
    
    /**
     * Initialize the sync manager
     */
    async init() {
        console.log('[SyncManager] Initializing...');
        
        try {
            // Open IndexedDB
            this.db = await this.openDB();
            
            // Set up event listeners
            window.addEventListener('online', this.handleOnline);
            
            // Listen for storage updates (cross-tab sync)
            window.addEventListener('storage', this.handleStorageUpdate);
            
            // Listen for cart updates
            if (cartStateManager) {
                cartStateManager.addEventListener('change', (event) => {
                    this.handleCartChange(event.detail);
                });
            }
            
            this.isInitialized = true;
            console.log('[SyncManager] Initialized successfully');
            
            // Check if we're online and have pending syncs
            if (navigator.onLine) {
                this.checkPendingSync();
            }
        } catch (error) {
            console.error('[SyncManager] Initialization failed:', error);
        }
    }
    
    /**
     * Open IndexedDB for sync queue
     */
    openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('soundlightpro-sw', 2);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores for different sync types
                if (!db.objectStoreNames.contains('cart')) {
                    const cartStore = db.createObjectStore('cart', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    cartStore.createIndex('timestamp', 'timestamp', { unique: false });
                    cartStore.createIndex('status', 'status', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('wishlist')) {
                    const wishlistStore = db.createObjectStore('wishlist', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    wishlistStore.createIndex('timestamp', 'timestamp', { unique: false });
                    wishlistStore.createIndex('status', 'status', { unique: false });
                    wishlistStore.createIndex('operation', 'operation', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('forms')) {
                    const formsStore = db.createObjectStore('forms', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    formsStore.createIndex('timestamp', 'timestamp', { unique: false });
                    formsStore.createIndex('status', 'status', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('api')) {
                    const apiStore = db.createObjectStore('api', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    apiStore.createIndex('timestamp', 'timestamp', { unique: false });
                    apiStore.createIndex('status', 'status', { unique: false });
                    apiStore.createIndex('endpoint', 'endpoint', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('forms')) {
                    const formsStore = db.createObjectStore('forms', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    formsStore.createIndex('timestamp', 'timestamp', { unique: false });
                    formsStore.createIndex('formType', 'formType', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('api')) {
                    const apiStore = db.createObjectStore('api', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    apiStore.createIndex('timestamp', 'timestamp', { unique: false });
                    apiStore.createIndex('endpoint', 'endpoint', { unique: false });
                }
            };
        });
    }
    
    /**
     * Queue a cart operation for sync
     * @param {string} operation - 'add', 'update', 'remove', 'clear'
     * @param {Object} data - Operation data
     */
    async queueCartOperation(operation, data) {
        if (!this.isInitialized) {
            console.warn('[SyncManager] Not initialized, cannot queue operation');
            return;
        }
        
        // If online, attempt immediate sync
        if (navigator.onLine) {
            try {
                await this.syncCartOperation(operation, data);
                return;
            } catch (error) {
                console.log('[SyncManager] Immediate sync failed, queueing...', error);
            }
        }
        
        // Queue for later
        const queueItem = {
            operation,
            data,
            timestamp: Date.now(),
            status: 'pending',
            retryCount: 0
        };
        
        try {
            await this.addToQueue('cart', queueItem);
            console.log('[SyncManager] Cart operation queued:', operation);
            
            // Show toast notification
            if (ui && ui.showToast) {
                ui.showToast('Changes saved locally. Will sync when online.', 'info');
            }
            
            // Dispatch event for UI updates
            window.dispatchEvent(new CustomEvent('sync-queued', {
                detail: { type: 'cart', operation }
            }));
        } catch (error) {
            console.error('[SyncManager] Failed to queue cart operation:', error);
        }
    }
    
    /**
     * Queue a wishlist operation for sync
     * @param {string} operation - 'add', 'remove', 'sync'
     * @param {Object} data - Operation data
     */
    async queueWishlistOperation(operation, data) {
        if (!this.isInitialized) {
            console.warn('[SyncManager] Not initialized, cannot queue wishlist operation');
            return;
        }
        
        // If online and user is authenticated, attempt immediate sync
        if (navigator.onLine) {
            try {
                const { ensureAccessToken } = await import('./apiService.js');
                const accessToken = await ensureAccessToken();
                if (accessToken) {
                    await this.syncWishlistOperation(operation, data);
                    return;
                }
            } catch (error) {
                console.log('[SyncManager] Immediate wishlist sync failed, queueing...', error);
            }
        }
        
        // Queue for later
        const queueItem = {
            operation,
            data,
            timestamp: Date.now(),
            status: 'pending',
            retryCount: 0
        };
        
        try {
            await this.addToQueue('wishlist', queueItem);
            console.log('[SyncManager] Wishlist operation queued:', operation);
            
            // Show toast notification
            if (ui && ui.showToast) {
                ui.showToast('Wishlist saved locally. Will sync when online.', 'info');
            }
            
            // Dispatch event for UI updates
            window.dispatchEvent(new CustomEvent('sync-queued', {
                detail: { type: 'wishlist', operation }
            }));
        } catch (error) {
            console.error('[SyncManager] Failed to queue wishlist operation:', error);
        }
    }
    
    /**
     * Queue a form submission for sync
     * @param {string} formType - Type of form (contact, newsletter, etc.)
     * @param {FormData} formData - Form data to submit
     * @param {string} endpoint - API endpoint
     */
    async queueFormSubmission(formType, formData, endpoint) {
        if (!this.isInitialized) {
            console.warn('[SyncManager] Not initialized, cannot queue form');
            return;
        }
        
        const queueItem = {
            formType,
            data: Object.fromEntries(formData.entries()),
            endpoint,
            timestamp: Date.now(),
            status: 'pending',
            retryCount: 0
        };
        
        try {
            await this.addToQueue('forms', queueItem);
            console.log('[SyncManager] Form submission queued:', formType);
            
            if (ui && ui.showToast) {
                ui.showToast('Your submission will be sent when you\'re back online.', 'info');
            }
        } catch (error) {
            console.error('[SyncManager] Failed to queue form submission:', error);
        }
    }
    
    /**
     * Queue a generic API request for sync
     * @param {string} method - HTTP method
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request data
     */
    async queueAPIRequest(method, endpoint, data) {
        if (!this.isInitialized) {
            console.warn('[SyncManager] Not initialized, cannot queue API request');
            return;
        }
        
        const queueItem = {
            method,
            endpoint,
            data,
            timestamp: Date.now(),
            status: 'pending',
            retryCount: 0
        };
        
        try {
            await this.addToQueue('api', queueItem);
            console.log('[SyncManager] API request queued:', method, endpoint);
        } catch (error) {
            console.error('[SyncManager] Failed to queue API request:', error);
        }
    }
    
    /**
     * Add item to sync queue
     * @param {string} storeName - Store to add to
     * @param {Object} item - Item to add
     */
    addToQueue(storeName, item) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            try {
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.add(item);
                
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * Get all items from a queue
     * @param {string} storeName - Store to get from
     */
    getQueue(storeName) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            // Check if the object store exists
            if (!this.db.objectStoreNames.contains(storeName)) {
                console.warn(`[SyncManager] Object store "${storeName}" does not exist`);
                resolve([]); // Return empty array instead of rejecting
                return;
            }
            
            try {
                const transaction = this.db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.getAll();
                
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } catch (error) {
                console.error(`[SyncManager] Error accessing store "${storeName}":`, error);
                reject(error);
            }
        });
    }
    
    /**
     * Remove item from queue
     * @param {string} storeName - Store to remove from
     * @param {number} id - Item ID
     */
    removeFromQueue(storeName, id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            try {
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.delete(id);
                
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * Update item status in queue
     * @param {string} storeName - Store name
     * @param {number} id - Item ID
     * @param {string} status - New status
     */
    updateQueueItemStatus(storeName, id, status) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            try {
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const getRequest = store.get(id);
                
                getRequest.onsuccess = () => {
                    const item = getRequest.result;
                    if (item) {
                        item.status = status;
                        item.retryCount = (item.retryCount || 0) + 1;
                        const updateRequest = store.put(item);
                        
                        updateRequest.onsuccess = () => resolve();
                        updateRequest.onerror = () => reject(updateRequest.error);
                    } else {
                        resolve(); // Item doesn't exist, that's okay
                    }
                };
                
                getRequest.onerror = () => reject(getRequest.error);
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * Handle online event - trigger sync
     */
    async handleOnline() {
        console.log('[SyncManager] Connection restored, initiating sync...');
        
        if (this.syncInProgress) {
            console.log('[SyncManager] Sync already in progress');
            return;
        }
        
        await this.syncAll();
    }
    
    /**
     * Sync all queued operations
     */
    async syncAll() {
        if (!this.isInitialized || !navigator.onLine) {
            console.log('[SyncManager] Cannot sync: not initialized or offline');
            return;
        }
        
        if (this.syncInProgress) {
            console.log('[SyncManager] Sync already in progress');
            return;
        }
        
        this.syncInProgress = true;
        
        try {
            // Sync cart operations
            await this.syncQueuedCart();
            
            // Sync wishlist operations
            await this.syncQueuedWishlist();
            
            // Sync form submissions
            await this.syncQueuedForms();
            
            // Sync API requests
            await this.syncQueuedAPI();
            
            console.log('[SyncManager] All sync operations completed');
            
            // Notify user
            if (ui && ui.showToast) {
                ui.showToast('All changes synced successfully!', 'success');
            }
            
            // Dispatch completion event
            window.dispatchEvent(new CustomEvent('sync-complete'));
        } catch (error) {
            console.error('[SyncManager] Sync failed:', error);
            
            if (ui && ui.showToast) {
                ui.showToast('Some changes could not be synced. Will retry later.', 'warning');
            }
        } finally {
            this.syncInProgress = false;
        }
    }
    
    /**
     * Sync queued cart operations
     */
    async syncQueuedCart() {
        const queue = await this.getQueue('cart');
        console.log(`[SyncManager] Syncing ${queue.length} cart operations...`);
        
        for (const item of queue) {
            try {
                await this.syncCartOperation(item.operation, item.data);
                await this.removeFromQueue('cart', item.id);
                console.log('[SyncManager] Cart operation synced:', item.operation);
                
                // Notify success
                window.dispatchEvent(new CustomEvent('sync-item-complete', {
                    detail: { type: 'cart', operation: item.operation }
                }));
            } catch (error) {
                console.error('[SyncManager] Failed to sync cart operation:', error);
                await this.updateQueueItemStatus('cart', item.id, 'failed');
                
                // Only retry a limited number of times
                if (item.retryCount >= 3) {
                    console.warn('[SyncManager] Max retries reached, removing from queue');
                    await this.removeFromQueue('cart', item.id);
                }
            }
        }
    }
    
    /**
     * Sync a single cart operation
     * @param {string} operation - Operation type
     * @param {Object} data - Operation data
     */
    async syncCartOperation(operation, data) {
        // This would integrate with your API service
        // For now, just simulate sync
        console.log('[SyncManager] Syncing cart operation:', operation, data);
        
        // In a real implementation, you would:
        // 1. Import apiService
        // 2. Call appropriate API endpoint
        // 3. Handle response
        
        // Example:
        // import * as apiService from './apiService.js';
        // 
        // switch (operation) {
        //     case 'add':
        //         await apiService.addToCart(data);
        //         break;
        //     case 'update':
        //         await apiService.updateCartItem(data.id, data.quantity);
        //         break;
        //     case 'remove':
        //         await apiService.removeFromCart(data.id);
        //         break;
        // }
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    /**
     * Sync queued wishlist operations
     */
    async syncQueuedWishlist() {
        const queue = await this.getQueue('wishlist');
        console.log(`[SyncManager] Syncing ${queue.length} wishlist operations...`);
        
        for (const item of queue) {
            try {
                await this.syncWishlistOperation(item.operation, item.data);
                await this.removeFromQueue('wishlist', item.id);
                console.log('[SyncManager] Wishlist operation synced:', item.operation);
                
                // Notify success
                window.dispatchEvent(new CustomEvent('sync-item-complete', {
                    detail: { type: 'wishlist', operation: item.operation }
                }));
            } catch (error) {
                console.error('[SyncManager] Failed to sync wishlist operation:', error);
                await this.updateQueueItemStatus('wishlist', item.id, 'failed');
                
                // Only retry a limited number of times
                if (item.retryCount >= 3) {
                    console.warn('[SyncManager] Max retries reached, removing from queue');
                    await this.removeFromQueue('wishlist', item.id);
                }
            }
        }
    }
    
    /**
     * Sync a single wishlist operation
     * @param {string} operation - Operation type ('add', 'remove', 'sync')
     * @param {Object} data - Operation data
     */
    async syncWishlistOperation(operation, data) {
        console.log('[SyncManager] Syncing wishlist operation:', operation, data);
        
        // Check if user is authenticated (cookie/session + in-memory/sessionStorage token)
        const { ensureAccessToken } = await import('./apiService.js');
        const accessToken = await ensureAccessToken();
        if (!accessToken) {
            console.warn('[SyncManager] User not authenticated, cannot sync wishlist to backend');
            throw new Error('Authentication required for wishlist sync');
        }
        
        // Dynamically import apiService to avoid circular dependencies
        const apiService = await import('./apiService.js');
        
        try {
            switch (operation) {
                case 'add':
                    await apiService.addToWishlist(data.productId || data.product_id);
                    break;
                    
                case 'remove':
                    // Note: Backend expects item_id, not product_id
                    if (data.itemId || data.item_id) {
                        await apiService.removeFromWishlist(data.itemId || data.item_id);
                    } else if (data.productId || data.product_id) {
                        // If we only have product_id, fetch wishlist to get item_id
                        const wishlist = await apiService.getWishlist();
                        const item = wishlist.items?.find(i => 
                            i.product.id === (data.productId || data.product_id)
                        );
                        if (item) {
                            await apiService.removeFromWishlist(item.id);
                        }
                    }
                    break;
                    
                case 'sync': {
                    const payload = Array.isArray(data?.productIds)
                        ? data.productIds
                        : Array.isArray(data?.items)
                            ? data.items
                            : [];

                    if (!payload.length) {
                        console.warn('[SyncManager] No items provided for wishlist sync');
                        break;
                    }

                    const productIds = payload
                        .map((value) => {
                            if (typeof value === 'number') {
                                return value;
                            }

                            if (typeof value === 'string') {
                                const parsed = Number.parseInt(value, 10);
                                return Number.isNaN(parsed) ? null : parsed;
                            }

                            if (value && typeof value === 'object') {
                                const candidate = value.productId ?? value.product_id ?? value.id;
                                if (typeof candidate === 'number') {
                                    return candidate;
                                }
                                if (typeof candidate === 'string') {
                                    const parsed = Number.parseInt(candidate, 10);
                                    return Number.isNaN(parsed) ? null : parsed;
                                }
                            }

                            return null;
                        })
                        .filter((id) => Number.isInteger(id) && id > 0);

                    if (!productIds.length) {
                        console.warn('[SyncManager] Wishlist sync payload did not contain valid product IDs');
                        break;
                    }

                    await apiService.syncWishlist(productIds);
                    break;
                }
                    
                default:
                    console.warn('[SyncManager] Unknown wishlist operation:', operation);
            }
        } catch (error) {
            console.error('[SyncManager] Wishlist sync error:', error);
            throw error;
        }
    }
    
    /**
     * Sync queued form submissions
     */
    async syncQueuedForms() {
        const queue = await this.getQueue('forms');
        console.log(`[SyncManager] Syncing ${queue.length} form submissions...`);
        
        for (const item of queue) {
            try {
                const formData = new FormData();
                Object.entries(item.data).forEach(([key, value]) => {
                    formData.append(key, value);
                });
                
                const response = await fetch(item.endpoint, {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    await this.removeFromQueue('forms', item.id);
                    console.log('[SyncManager] Form submission synced:', item.formType);
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
            } catch (error) {
                console.error('[SyncManager] Failed to sync form submission:', error);
                await this.updateQueueItemStatus('forms', item.id, 'failed');
            }
        }
    }
    
    /**
     * Sync queued API requests
     */
    async syncQueuedAPI() {
        const queue = await this.getQueue('api');
        console.log(`[SyncManager] Syncing ${queue.length} API requests...`);
        
        for (const item of queue) {
            try {
                const response = await fetch(item.endpoint, {
                    method: item.method,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: item.data ? JSON.stringify(item.data) : undefined
                });
                
                if (response.ok) {
                    await this.removeFromQueue('api', item.id);
                    console.log('[SyncManager] API request synced:', item.method, item.endpoint);
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
            } catch (error) {
                console.error('[SyncManager] Failed to sync API request:', error);
                await this.updateQueueItemStatus('api', item.id, 'failed');
            }
        }
    }
    
    /**
     * Check for pending sync operations
     */
    async checkPendingSync() {
        if (!this.isInitialized || !navigator.onLine) {
            return;
        }
        
        try {
            const cartQueue = await this.getQueue('cart');
            const wishlistQueue = await this.getQueue('wishlist');
            const formsQueue = await this.getQueue('forms');
            const apiQueue = await this.getQueue('api');
            
            const total = cartQueue.length + wishlistQueue.length + formsQueue.length + apiQueue.length;
            
            if (total > 0) {
                console.log(`[SyncManager] Found ${total} pending operations`);
                
                // Auto-sync if we're online
                if (navigator.onLine) {
                    setTimeout(() => this.syncAll(), 1000);
                }
            }
        } catch (error) {
            console.error('[SyncManager] Failed to check pending sync:', error);
        }
    }
    
    /**
     * Handle cart state changes
     */
    handleCartChange(detail) {
        // Cart changes are already persisted by StateManager
        // We just need to track them for potential API sync
        console.log('[SyncManager] Cart changed:', detail);
        
        // In offline mode, queue operations for sync
        if (!navigator.onLine) {
            // Determine operation type from state change
            const operation = this.determineCartOperation(detail);
            if (operation) {
                this.queueCartOperation(operation.type, operation.data);
            }
        }
    }
    
    /**
     * Determine cart operation from state change
     */
    determineCartOperation(detail) {
        if (!detail) {
            return null;
        }

        const newItems = normalizeCartItemsShape(detail.newState?.items);
        const oldItems = normalizeCartItemsShape(detail.oldState?.items);

        if (!newItems.length && !oldItems.length) {
            return null;
        }

        const oldMap = new Map(oldItems.map((item) => [String(item.id), item]));
        const newMap = new Map(newItems.map((item) => [String(item.id), item]));

        if (newMap.size > oldMap.size) {
            for (const [key, item] of newMap.entries()) {
                if (!oldMap.has(key)) {
                    return { type: 'add', data: item };
                }
            }
        }

        if (newMap.size < oldMap.size) {
            for (const [key, item] of oldMap.entries()) {
                if (!newMap.has(key)) {
                    return { type: 'remove', data: { id: item.id } };
                }
            }
        }

        for (const [key, item] of newMap.entries()) {
            const previous = oldMap.get(key);
            if (previous && previous.quantity !== item.quantity) {
                return {
                    type: 'update',
                    data: { id: item.id, quantity: item.quantity }
                };
            }
        }

        return null;
    }
    
    /**
     * Handle storage updates (cross-tab sync)
     */
    handleStorageUpdate(event) {
        // Handle cross-tab synchronization
        if (event.key === 'shoppingCart' || event.key === 'wishlist' || event.key === 'soundlightpro-sync') {
            console.log('[SyncManager] Storage updated in another tab');
            this.checkPendingSync();
        }
    }
    
    /**
     * Get sync status
     * @returns {Object} Sync status
     */
    async getStatus() {
        if (!this.isInitialized) {
            return {
                initialized: false,
                pending: 0,
                inProgress: false
            };
        }
        
        try {
            const cartQueue = await this.getQueue('cart');
            const wishlistQueue = await this.getQueue('wishlist');
            const formsQueue = await this.getQueue('forms');
            const apiQueue = await this.getQueue('api');
            
            return {
                initialized: true,
                pending: cartQueue.length + wishlistQueue.length + formsQueue.length + apiQueue.length,
                inProgress: this.syncInProgress,
                queues: {
                    cart: cartQueue.length,
                    wishlist: wishlistQueue.length,
                    forms: formsQueue.length,
                    api: apiQueue.length
                }
            };
        } catch (error) {
            console.error('[SyncManager] Failed to get status:', error);
            return {
                initialized: true,
                pending: 0,
                inProgress: this.syncInProgress,
                error: error.message
            };
        }
    }
    
    /**
     * Clear all queues (use with caution)
     */
    async clearAllQueues() {
        console.warn('[SyncManager] Clearing all sync queues');
        
        try {
            const stores = ['cart', 'wishlist', 'forms', 'api'];
            
            for (const store of stores) {
                const transaction = this.db.transaction([store], 'readwrite');
                const objectStore = transaction.objectStore(store);
                await new Promise((resolve, reject) => {
                    const request = objectStore.clear();
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            }
            
            console.log('[SyncManager] All queues cleared');
            
            if (ui && ui.showToast) {
                ui.showToast('Sync queue cleared', 'info');
            }
        } catch (error) {
            console.error('[SyncManager] Failed to clear queues:', error);
        }
    }
    
    /**
     * Destroy sync manager (cleanup)
     */
    destroy() {
        window.removeEventListener('online', this.handleOnline);
        window.removeEventListener('storage', this.handleStorageUpdate);
        
        if (this.db) {
            this.db.close();
            this.db = null;
        }
        
        this.isInitialized = false;
        console.log('[SyncManager] Destroyed');
    }
}

// Export singleton instance
let syncManagerInstance = null;

/**
 * Initialize sync manager
 * @returns {SyncManager}
 */
export function initSyncManager() {
    if (!syncManagerInstance) {
        syncManagerInstance = new SyncManager();
    }
    return syncManagerInstance;
}

/**
 * Get sync manager instance
 * @returns {SyncManager|null}
 */
export function getSyncManager() {
    return syncManagerInstance;
}

export default SyncManager;
