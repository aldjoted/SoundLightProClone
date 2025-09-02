/**
 * ui.js
 * 
 * This module contains all functions related to DOM manipulation.
 * It's responsible for rendering products, updating the cart display,
 * showing messages, and managing the UI state based on user authentication.
 */

// --- Product Rendering ---

/**
 * Renders a grid of product cards on the homepage.
 * @param {Array<Object>} products - An array of product objects from the API.
 */
export function renderProductGrid(products) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    if (products.length === 0) {
        grid.innerHTML = '<p class="info-message">No products found.</p>';
        return;
    }

    grid.innerHTML = products.map(product => `
        <div class="product-card">
            <a href="product.html?id=${product.id}" class="product-card-image-link">
                <img src="${product.image ? product.image : 'https://via.placeholder.com/300'}" alt="${product.name}">
            </a>
            <div class="product-card-content">
                <h3 class="product-card-title">${product.name}</h3>
                <p class="product-card-price">$${parseFloat(product.price).toFixed(2)}</p>
                <a href="product.html?id=${product.id}" class="button">View Details</a>
            </div>
        </div>
    `).join('');
}

/**
 * Renders the details for a single product on the product detail page.
 * @param {Object} product - The product object from the API.
 */
export function renderProductDetails(product) {
    const container = document.getElementById('product-detail-container');
    if (!container) return;

    container.innerHTML = `
        <div class="product-detail-layout">
            <div class="product-detail-image">
                <img src="${product.image ? product.image : 'https://via.placeholder.com/600'}" alt="${product.name}">
            </div>
            <div class="product-detail-info">
                <h1>${product.name}</h1>
                <p class="product-detail-price">$${parseFloat(product.price).toFixed(2)}</p>
                <p class="product-detail-stock">
                    <span class="${product.stock > 0 ? 'in-stock' : 'out-of-stock'}">
                        ${product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                    </span>
                </p>
                <p class="product-detail-description">${product.description || ''}</p>
                
                <form id="add-to-cart-form" data-product-id="${product.id}">
                    <div class="product-detail-actions">
                        <input type="number" id="quantity-input" value="1" min="1" max="${product.stock}" ${product.stock === 0 ? 'disabled' : ''}>
                        <button type="submit" class="button" ${product.stock === 0 ? 'disabled' : ''}>
                            Add to Cart
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

// --- Cart UI ---

/**
 * Updates the cart item count displayed in the header.
 * @param {number} count - The number of items in the cart.
 */
export function updateCartCount(count) {
    const cartCountElement = document.getElementById('cart-item-count');
    if (cartCountElement) {
        cartCountElement.textContent = count;
    }
}

// ===================================================================
// ========================== NEW SECTION ============================
// ===================================================================

/**
 * Renders the entire cart page, including items and summary.
 * @param {Array<Object>} cartItems - The array of items from the cart module.
 * @param {number} cartTotal - The calculated total price of the cart.
 */
export function renderCart(cartItems, cartTotal) {
    const container = document.getElementById('cart-container');
    if (!container) return;

    if (cartItems.length === 0) {
        container.innerHTML = '<p class="info-message">Your cart is empty.</p>';
        document.getElementById('checkout-section').classList.add('hidden');
        return;
    }

    const itemsHTML = cartItems.map(item => `
        <div class="cart-item" data-product-id="${item.id}">
            <img src="${item.image || 'https://via.placeholder.com/100'}" alt="${item.name}">
            <div class="cart-item-info">
                <h3>${item.name}</h3>
                <p>$${item.price.toFixed(2)}</p>
            </div>
            <div class="cart-item-quantity">
                <input type="number" class="quantity-update-input" value="${item.quantity}" min="1">
            </div>
            <p class="cart-item-subtotal">$${(item.price * item.quantity).toFixed(2)}</p>
            <div class="cart-item-actions">
                <button class="remove-item-btn">Remove</button>
            </div>
        </div>
    `).join('');

    const summaryHTML = `
        <div class="cart-summary">
            <h2>Cart Summary</h2>
            <div class="cart-total">
                <span>Total:</span>
                <strong>$${cartTotal.toFixed(2)}</strong>
            </div>
            <button id="checkout-btn" class="button">Proceed to Checkout</button>
        </div>
    `;

    container.innerHTML = `
        <div class="cart-items-container">
            ${itemsHTML}
        </div>
        ${summaryHTML}
    `;
}
// ===================================================================
// ======================== END NEW SECTION ==========================
// ===================================================================


// --- Authentication UI ---

/**
 * Updates the header UI based on the user's login status.
 * @param {Object|null} user - The user object, or null if logged out.
 */
export function updateUserAuthUI(user) {
    const authLinks = document.getElementById('auth-links');
    const userInfo = document.getElementById('user-info');
    const usernameDisplay = document.getElementById('username-display');

    if (authLinks && userInfo && usernameDisplay) {
        if (user) {
            // User is logged in
            authLinks.classList.add('hidden');
            userInfo.classList.remove('hidden');
            usernameDisplay.textContent = `Welcome, ${user.username}`;
        } else {
            // User is logged out
            authLinks.classList.remove('hidden');
            userInfo.classList.add('hidden');
            usernameDisplay.textContent = '';
        }
    }
}

// --- General UI Helpers ---

/**
 * Shows a loading indicator in a specified container.
 * @param {HTMLElement} container - The element to show the loader in.
 */
export function showLoader(container) {
    if (container) {
        container.innerHTML = '<div class="loader">Loading...</div>';
    }
}

/**
 * Displays an error message in a specified container.
 * @param {HTMLElement} container - The element to show the error in.
 * @param {string} message - The error message to display.
 */
export function showErrorMessage(container, message) {
    if (container) {
        container.innerHTML = `<p class="error-message">${message}</p>`;
    }
}

/**
 * Displays a generic message in a form or container.
 * @param {string} elementId - The ID of the element where the message should be displayed.
 * @param {string} message - The message text.
 * @param {boolean} isError - If true, styles the message as an error.
 */
export function showFormMessage(elementId, message, isError = false) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.className = isError ? 'error-message' : 'info-message';
        element.classList.remove('hidden');
    }
}