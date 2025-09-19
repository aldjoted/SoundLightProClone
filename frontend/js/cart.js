/**
 * cart.js
 * 
 * This module manages the shopping cart state using a StateManager for better
 * cross-tab synchronization, error handling, and event management.
 */

import { StateManager } from './utils.js';

const CART_KEY = 'shoppingCart';

// Initialize the cart state manager
const cartStateManager = new StateManager(CART_KEY, { items: [] });

// Set up event listeners for state changes
cartStateManager.addEventListener('change', (event) => {
    // Emit the legacy cartUpdated event for backward compatibility
    document.dispatchEvent(new CustomEvent('cartUpdated', {
        detail: {
            cart: event.detail.newState.items,
            oldCart: event.detail.oldState.items || []
        }
    }));
});

// Handle storage quota exceeded errors
cartStateManager.addEventListener('quotaExceeded', (event) => {
    console.error('Cart storage quota exceeded:', event.detail.error);
    // Could implement cleanup logic here (remove oldest items, compress data, etc.)
    // For now, just emit an event that the UI can handle
    document.dispatchEvent(new CustomEvent('cartStorageError', {
        detail: {
            error: event.detail.error,
            message: 'Cart storage is full. Some items may not be saved.'
        }
    }));
});

/**
 * Retrieves the cart items from the state manager.
 * @returns {Array<Object>} An array of cart item objects.
 */
function getCart() {
    const state = cartStateManager.getState();
    return state.items || [];
}

/**
 * Updates the cart state with new items.
 * @param {Array<Object>} items - The new cart items array.
 */
function updateCartState(items) {
    cartStateManager.update({ items });
}

/**
 * Adds a product to the cart. If the product is already in the cart, it updates the quantity.
 * @param {Object} product - The product object to add.
 * @param {number} quantity - The quantity to add.
 */
export function addToCart(product, quantity) {
    if (!product || !product.id || quantity <= 0) {
        console.error('Invalid product or quantity for addToCart');
        return;
    }

    const currentItems = getCart();
    const existingItemIndex = currentItems.findIndex(item => item.id === product.id);

    // Determine the image to store in the cart
    const imageUrl = (product.images && product.images.length > 0) 
        ? product.images[0].image 
        : null;

    let newItems;
    if (existingItemIndex > -1) {
        // Product exists, update quantity
        newItems = currentItems.map((item, index) => 
            index === existingItemIndex 
                ? { ...item, quantity: item.quantity + quantity }
                : item
        );
    } else {
        // Product is new, add it to the cart
        const newItem = {
            id: product.id,
            name: product.name,
            price: parseFloat(product.price),
            image: imageUrl,
            quantity: quantity,
            addedAt: new Date().toISOString() // Track when item was added
        };
        newItems = [...currentItems, newItem];
    }

    updateCartState(newItems);
}

/**
 * Updates the quantity of a specific item in the cart.
 * @param {number} productId - The ID of the product to update.
 * @param {number} quantity - The new quantity. Must be 1 or more.
 */
export function updateCartItemQuantity(productId, quantity) {
    if (!productId || quantity <= 0) {
        console.error('Invalid productId or quantity for updateCartItemQuantity');
        return;
    }

    const currentItems = getCart();
    const itemIndex = currentItems.findIndex(item => item.id === productId);

    if (itemIndex > -1) {
        const newItems = currentItems.map((item, index) => 
            index === itemIndex 
                ? { ...item, quantity, updatedAt: new Date().toISOString() }
                : item
        );
        updateCartState(newItems);
    }
}

/**
 * Removes an item from the cart completely.
 * @param {number} productId - The ID of the product to remove.
 */
export function removeFromCart(productId) {
    if (!productId) {
        console.error('Invalid productId for removeFromCart');
        return;
    }

    const currentItems = getCart();
    const newItems = currentItems.filter(item => item.id !== productId);
    updateCartState(newItems);
}

/**
 * Clears the entire cart.
 */
export function clearCart() {
    cartStateManager.clear({ items: [] });
}

/**
 * Calculates the total number of items in the cart.
 * @returns {number} The total count of all items.
 */
export function getCartItemCount() {
    const items = getCart();
    return items.reduce((total, item) => total + item.quantity, 0);
}

/**
 * Calculates the total price of all items in the cart.
 * @returns {number} The total price.
 */
export function getCartTotal() {
    const items = getCart();
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
}

/**
 * Gets cart statistics for analytics or debugging.
 * @returns {Object} Cart statistics.
 */
export function getCartStats() {
    const items = getCart();
    return {
        itemCount: items.length,
        totalQuantity: getCartItemCount(),
        totalValue: getCartTotal(),
        isEmpty: items.length === 0,
        oldestItem: items.length > 0 ? items.reduce((oldest, item) => 
            new Date(item.addedAt || 0) < new Date(oldest.addedAt || 0) ? item : oldest
        ) : null
    };
}

/**
 * Validates cart data integrity.
 * @returns {Object} Validation result with any issues found.
 */
export function validateCart() {
    const items = getCart();
    const issues = [];

    items.forEach((item, index) => {
        if (!item.id) issues.push(`Item at index ${index} missing ID`);
        if (!item.name) issues.push(`Item at index ${index} missing name`);
        if (typeof item.price !== 'number' || item.price < 0) {
            issues.push(`Item at index ${index} has invalid price`);
        }
        if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
            issues.push(`Item at index ${index} has invalid quantity`);
        }
    });

    return {
        isValid: issues.length === 0,
        issues
    };
}

// Export getCart to be used by the cart page to render items
export { getCart };

// Export the state manager for advanced usage if needed
export { cartStateManager };