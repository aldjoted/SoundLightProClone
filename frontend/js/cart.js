/**
 * cart.js
 * 
 * This module manages the shopping cart state using localStorage.
 * It provides functions to add, retrieve, update, and remove items,
 * as well as to calculate totals.
 */

const CART_KEY = 'shoppingCart';

/**
 * Retrieves the cart from localStorage.
 * @returns {Array<Object>} An array of cart item objects. Returns an empty array if no cart exists.
 */
function getCart() {
    try {
        const cart = localStorage.getItem(CART_KEY);
        return cart ? JSON.parse(cart) : [];
    } catch (e) {
        console.error("Failed to parse cart from localStorage", e);
        return []; // Return empty cart on parsing error
    }
}

/**
 * Saves the cart to localStorage.
 * @param {Array<Object>} cart - The cart array to save.
 */
function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

/**
 * Adds a product to the cart. If the product is already in the cart, it updates the quantity.
 * @param {Object} product - The product object to add.
 * @param {number} quantity - The quantity to add.
 */
export function addToCart(product, quantity) {
    const cart = getCart();
    const existingItemIndex = cart.findIndex(item => item.id === product.id);

    // Determine the image to store in the cart
    const imageUrl = (product.images && product.images.length > 0) 
        ? product.images[0].image 
        : null;

    if (existingItemIndex > -1) {
        // Product exists, update quantity
        cart[existingItemIndex].quantity += quantity;
    } else {
        // Product is new, add it to the cart
        cart.push({
            id: product.id,
            name: product.name,
            price: parseFloat(product.price),
            image: imageUrl, // Use the determined image URL
            quantity: quantity,
        });
    }

    saveCart(cart);
    document.dispatchEvent(new CustomEvent('cartUpdated'));
}

/**
 * Updates the quantity of a specific item in the cart.
 * @param {number} productId - The ID of the product to update.
 * @param {number} quantity - The new quantity. Must be 1 or more.
 */
export function updateCartItemQuantity(productId, quantity) {
    const cart = getCart();
    const itemIndex = cart.findIndex(item => item.id === productId);

    if (itemIndex > -1 && quantity > 0) {
        cart[itemIndex].quantity = quantity;
        saveCart(cart);
        document.dispatchEvent(new CustomEvent('cartUpdated'));
    }
}

/**
 * Removes an item from the cart completely.
 * @param {number} productId - The ID of the product to remove.
 */
export function removeFromCart(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
    document.dispatchEvent(new CustomEvent('cartUpdated'));
}

/**
 * Clears the entire cart.
 */
export function clearCart() {
    saveCart([]);
    document.dispatchEvent(new CustomEvent('cartUpdated'));
}

/**
 * Calculates the total number of items in the cart.
 * @returns {number} The total count of all items.
 */
export function getCartItemCount() {
    const cart = getCart();
    return cart.reduce((total, item) => total + item.quantity, 0);
}

/**
 * Calculates the total price of all items in the cart.
 * @returns {number} The total price.
 */
export function getCartTotal() {
    const cart = getCart();
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

// Export getCart to be used by the cart page to render items
export { getCart };