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
            const request = indexedDB.open('soundlightpro-sw', 1);
            
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
            
            try {
                const transaction = this.db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.getAll();
                
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } catch (error) {
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
            const formsQueue = await this.getQueue('forms');
            const apiQueue = await this.getQueue('api');
            
            const total = cartQueue.length + formsQueue.length + apiQueue.length;
            
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
        // This is a simplified version - in production you'd need more
        // sophisticated change detection
        const { newState, oldState } = detail;
        
        if (!oldState || !oldState.items) {
            return null;
        }
        
        // Check for additions
        if (newState.items.length > oldState.items.length) {
            const newItem = newState.items.find(item => 
                !oldState.items.some(oldItem => oldItem.id === item.id)
            );
            return { type: 'add', data: newItem };
        }
        
        // Check for removals
        if (newState.items.length < oldState.items.length) {
            const removedItem = oldState.items.find(item => 
                !newState.items.some(newItem => newItem.id === item.id)
            );
            return { type: 'remove', data: { id: removedItem.id } };
        }
        
        // Check for updates (quantity changes)
        for (const newItem of newState.items) {
            const oldItem = oldState.items.find(item => item.id === newItem.id);
            if (oldItem && oldItem.quantity !== newItem.quantity) {
                return { 
                    type: 'update', 
                    data: { id: newItem.id, quantity: newItem.quantity } 
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
        if (event.key === 'shoppingCart' || event.key === 'soundlightpro-sync') {
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
            const formsQueue = await this.getQueue('forms');
            const apiQueue = await this.getQueue('api');
            
            return {
                initialized: true,
                pending: cartQueue.length + formsQueue.length + apiQueue.length,
                inProgress: this.syncInProgress,
                queues: {
                    cart: cartQueue.length,
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
            const stores = ['cart', 'forms', 'api'];
            
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
