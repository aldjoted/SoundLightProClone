/**
 * wishlist.js
 * 
 * This module manages the wishlist state for both authenticated and guest users.
 * - For guests: Uses localStorage (similar to cart.js)
 * - For authenticated users: Syncs with backend API
 * - Supports offline operations with background sync
 */

import { StateManager } from './utils.js';

const WISHLIST_KEY = 'guestWishlist';

// Initialize the wishlist state manager for guest users
const wishlistStateManager = new StateManager(WISHLIST_KEY, { productIds: [] });

// Track if user is authenticated
let isAuthenticated = false;
let serverWishlist = null;

// Set up event listeners for state changes
wishlistStateManager.addEventListener('change', (event) => {
    // Emit wishlist updated event
    document.dispatchEvent(new CustomEvent('wishlistUpdated', {
        detail: {
            wishlist: event.detail.newState.productIds,
            oldWishlist: event.detail.oldState.productIds || []
        }
    }));
});

// Handle storage quota exceeded errors
wishlistStateManager.addEventListener('quotaExceeded', (event) => {
    console.error('Wishlist storage quota exceeded:', event.detail.error);
    document.dispatchEvent(new CustomEvent('wishlistStorageError', {
        detail: {
            error: event.detail.error,
            message: 'Wishlist storage is full. Some items may not be saved.'
        }
    }));
});

/**
 * Initialize wishlist with user authentication status
 * @param {boolean} authenticated - Whether user is authenticated
 * @param {Object|null} userWishlist - Server wishlist data for authenticated users
 */
export function initWishlist(authenticated = false, userWishlist = null) {
    isAuthenticated = authenticated;
    
    if (authenticated && userWishlist) {
        serverWishlist = userWishlist;
        
        // Sync guest wishlist with server if there are guest items
        const guestProductIds = getGuestWishlist();
        if (guestProductIds.length > 0) {
            // Queue sync operation (will be handled by sync-manager)
            queueWishlistSync(guestProductIds);
        }
    }
}

/**
 * Get the current wishlist (guest or server)
 * @returns {Array<number>} Array of product IDs
 */
export function getWishlist() {
    if (isAuthenticated && serverWishlist) {
        return serverWishlist.items.map(item => item.product.id);
    }
    return getGuestWishlist();
}

/**
 * Get full wishlist data (with product details for authenticated users)
 * @returns {Array<Object>|Array<number>} Full wishlist or product IDs
 */
export function getWishlistData() {
    if (isAuthenticated && serverWishlist) {
        return serverWishlist.items;
    }
    return getGuestWishlist();
}

/**
 * Get guest wishlist from localStorage
 * @returns {Array<number>} Array of product IDs
 */
function getGuestWishlist() {
    const state = wishlistStateManager.getState();
    return state.productIds || [];
}

/**
 * Update guest wishlist in localStorage
 * @param {Array<number>} productIds - Array of product IDs
 */
function updateGuestWishlist(productIds) {
    wishlistStateManager.update({ productIds });
}

/**
 * Check if a product is in the wishlist
 * @param {number} productId - The product ID to check
 * @returns {boolean} True if product is in wishlist
 */
export function isInWishlist(productId) {
    const wishlist = getWishlist();
    return wishlist.includes(productId);
}

/**
 * Add a product to the wishlist
 * @param {number} productId - The product ID to add
 * @returns {Promise<boolean>} Success status
 */
export async function addToWishlist(productId) {
    if (!productId) {
        console.error('Invalid product ID for addToWishlist');
        return false;
    }

    // Check if already in wishlist
    if (isInWishlist(productId)) {
        console.log('Product already in wishlist');
        return false;
    }

    if (isAuthenticated) {
        // Add to server wishlist
        try {
            const apiService = await import('./apiService.js');
            const result = await apiService.addToWishlist(productId);
            
            // Update local server wishlist cache
            if (serverWishlist) {
                serverWishlist.items.push(result);
            }
            
            // Emit event
            document.dispatchEvent(new CustomEvent('wishlistUpdated', {
                detail: { wishlist: getWishlist() }
            }));
            
            return true;
        } catch (error) {
            console.error('Failed to add to server wishlist:', error);
            
            // If offline, queue the operation
            if (error.code === 'NETWORK_ERROR') {
                queueWishlistAdd(productId);
                
                // Add to local cache optimistically
                if (serverWishlist) {
                    serverWishlist.items.push({ product: { id: productId } });
                }
                
                document.dispatchEvent(new CustomEvent('wishlistUpdated', {
                    detail: { wishlist: getWishlist(), offline: true }
                }));
                
                return true;
            }
            
            return false;
        }
    } else {
        // Add to guest wishlist
        const currentWishlist = getGuestWishlist();
        updateGuestWishlist([...currentWishlist, productId]);
        return true;
    }
}

/**
 * Remove a product from the wishlist
 * @param {number} productId - The product ID to remove
 * @returns {Promise<boolean>} Success status
 */
export async function removeFromWishlist(productId) {
    if (!productId) {
        console.error('Invalid product ID for removeFromWishlist');
        return false;
    }

    if (isAuthenticated) {
        // Remove from server wishlist
        try {
            const apiService = await import('./apiService.js');
            await apiService.removeFromWishlist(productId);
            
            // Update local server wishlist cache
            if (serverWishlist) {
                serverWishlist.items = serverWishlist.items.filter(
                    item => item.product.id !== productId
                );
            }
            
            // Emit event
            document.dispatchEvent(new CustomEvent('wishlistUpdated', {
                detail: { wishlist: getWishlist() }
            }));
            
            return true;
        } catch (error) {
            console.error('Failed to remove from server wishlist:', error);
            
            // If offline, queue the operation
            if (error.code === 'NETWORK_ERROR') {
                queueWishlistRemove(productId);
                
                // Remove from local cache optimistically
                if (serverWishlist) {
                    serverWishlist.items = serverWishlist.items.filter(
                        item => item.product.id !== productId
                    );
                }
                
                document.dispatchEvent(new CustomEvent('wishlistUpdated', {
                    detail: { wishlist: getWishlist(), offline: true }
                }));
                
                return true;
            }
            
            return false;
        }
    } else {
        // Remove from guest wishlist
        const currentWishlist = getGuestWishlist();
        updateGuestWishlist(currentWishlist.filter(id => id !== productId));
        return true;
    }
}

/**
 * Toggle a product in the wishlist (add if not present, remove if present)
 * @param {number} productId - The product ID to toggle
 * @returns {Promise<boolean>} True if added, false if removed
 */
export async function toggleWishlist(productId) {
    if (isInWishlist(productId)) {
        await removeFromWishlist(productId);
        return false;
    } else {
        await addToWishlist(productId);
        return true;
    }
}

/**
 * Clear the entire wishlist
 */
export async function clearWishlist() {
    if (isAuthenticated && serverWishlist) {
        // Clear server wishlist (remove all items)
        try {
            const apiService = await import('./apiService.js');
            const productIds = getWishlist();
            
            for (const productId of productIds) {
                await apiService.removeFromWishlist(productId);
            }
            
            serverWishlist.items = [];
            
            document.dispatchEvent(new CustomEvent('wishlistUpdated', {
                detail: { wishlist: [] }
            }));
        } catch (error) {
            console.error('Failed to clear server wishlist:', error);
        }
    } else {
        // Clear guest wishlist
        wishlistStateManager.clear({ productIds: [] });
    }
}

/**
 * Get wishlist item count
 * @returns {number} Number of items in wishlist
 */
export function getWishlistCount() {
    return getWishlist().length;
}

/**
 * Move item from wishlist to cart
 * @param {number} productId - The product ID to move
 * @param {Object} product - The full product object
 * @returns {Promise<boolean>} Success status
 */
export async function moveToCart(productId, product) {
    try {
        // Import cart module
        const cart = await import('./cart.js');
        
        // Add to cart
        cart.addToCart(product, 1);
        
        // Remove from wishlist
        await removeFromWishlist(productId);
        
        return true;
    } catch (error) {
        console.error('Failed to move item to cart:', error);
        return false;
    }
}

/**
 * Queue wishlist sync operation for authenticated users
 * @param {Array<number>} guestProductIds - Guest wishlist product IDs
 */
async function queueWishlistSync(guestProductIds) {
    try {
        // Try to use sync manager
        const { getSyncManager } = await import('./sync-manager.js');
        const syncManager = getSyncManager();
        
        if (syncManager) {
            await syncManager.queueWishlistOperation('sync', {
                items: guestProductIds.map(id => ({ product_id: id }))
            });
        } else {
            // Fallback to localStorage queue
            const syncQueue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
            syncQueue.push({
                type: 'wishlist-sync',
                data: { items: guestProductIds.map(id => ({ product_id: id })) },
                timestamp: Date.now()
            });
            localStorage.setItem('syncQueue', JSON.stringify(syncQueue));
        }
        
        // Clear guest wishlist after queuing sync
        updateGuestWishlist([]);
    } catch (error) {
        console.error('Failed to queue wishlist sync:', error);
    }
}

/**
 * Queue add to wishlist operation (for offline support)
 * @param {number} productId - Product ID to add
 */
async function queueWishlistAdd(productId) {
    try {
        // Try to use sync manager
        const { getSyncManager } = await import('./sync-manager.js');
        const syncManager = getSyncManager();
        
        if (syncManager) {
            await syncManager.queueWishlistOperation('add', { productId });
        } else {
            // Fallback to localStorage queue
            const syncQueue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
            syncQueue.push({
                type: 'wishlist-add',
                data: { product_id: productId },
                timestamp: Date.now()
            });
            localStorage.setItem('syncQueue', JSON.stringify(syncQueue));
        }
    } catch (error) {
        console.error('Failed to queue wishlist add:', error);
    }
}

/**
 * Queue remove from wishlist operation (for offline support)
 * @param {number} productId - Product ID to remove
 */
async function queueWishlistRemove(productId) {
    try {
        // Try to use sync manager
        const { getSyncManager } = await import('./sync-manager.js');
        const syncManager = getSyncManager();
        
        if (syncManager) {
            await syncManager.queueWishlistOperation('remove', { productId });
        } else {
            // Fallback to localStorage queue
            const syncQueue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
            syncQueue.push({
                type: 'wishlist-remove',
                data: { product_id: productId },
                timestamp: Date.now()
            });
            localStorage.setItem('syncQueue', JSON.stringify(syncQueue));
        }
    } catch (error) {
        console.error('Failed to queue wishlist remove:', error);
    }
}

/**
 * Get wishlist statistics
 * @returns {Object} Wishlist statistics
 */
export function getWishlistStats() {
    const wishlist = getWishlist();
    return {
        itemCount: wishlist.length,
        isEmpty: wishlist.length === 0,
        isAuthenticated: isAuthenticated
    };
}

// Export the state manager for advanced usage if needed
export { wishlistStateManager };
