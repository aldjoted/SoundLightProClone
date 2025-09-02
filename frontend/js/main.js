/**
 * main.js
 *
 * This is the main entry point for the frontend application.
 * It initializes the app, sets up event listeners, and routes
 * logic based on the current page.
 */

import * as apiService from './apiService.js';
import * as cart from './cart.js';
import * as ui from './ui.js';

// Add your Stripe Publishable Key here
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51S2oQBFVZncPKiqnc8eCAGLTI2jJ11fu0L6CAciKfVVSGWnvGL0aC2C4xtPn0J0deDUtpDltnKSSLWA5hXxbMoIZ00hILr9HLe'; 

/**
 * The main router function. It checks the current page path and calls
 * the appropriate initialization function.
 */
function router() {
    const path = window.location.pathname;

    if (path === '/' || path.endsWith('/index.html')) {
        initHomePage();
    } else if (path.endsWith('/product.html')) {
        initProductDetailPage();
    } else if (path.endsWith('/cart.html')) {
        initCartPage(); // <<< UPDATED
    } else if (path.endsWith('/login.html')) {
        initLoginPage();
    } else if (path.endsWith('/register.html')) {
        initRegisterPage();
    }
}

/**
 * Initializes common application state on every page load.
 * - Checks user authentication status.
 * - Updates the cart count in the header.
 * - Sets up global event listeners (logout, cart updates).
 */
async function initApp() {
    // Update cart count on initial load
    ui.updateCartCount(cart.getCartItemCount());

    // Listen for custom 'cartUpdated' event to update count in header
    document.addEventListener('cartUpdated', () => {
        ui.updateCartCount(cart.getCartItemCount());
    });

    // Check if user is logged in and update header UI
    try {
        const user = await apiService.getUserProfile();
        ui.updateUserAuthUI(user);
    } catch (error) {
        ui.updateUserAuthUI(null);
    }

    // Add logout functionality
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            apiService.logoutUser();
            ui.updateUserAuthUI(null);
            window.location.href = 'index.html';
        });
    }
}

// --- Page Initializers ---

async function initHomePage() {
    const productGrid = document.getElementById('product-grid');
    if (!productGrid) return;
    ui.showLoader(productGrid);
    try {
        const products = await apiService.getProducts();
        ui.renderProductGrid(products);
    } catch (error) {
        ui.showErrorMessage(productGrid, `Error loading products: ${error.message}`);
    }

    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    if (searchForm && searchInput) {
        searchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const query = searchInput.value.trim();
            ui.showLoader(productGrid);
            try {
                const products = await apiService.getProducts(query);
                ui.renderProductGrid(products);
            } catch (error) {
                ui.showErrorMessage(productGrid, `Error searching products: ${error.message}`);
            }
        });
    }
}

async function initProductDetailPage() {
    const container = document.getElementById('product-detail-container');
    if (!container) return;
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        ui.showErrorMessage(container, 'Product not found. No ID provided.');
        return;
    }

    ui.showLoader(container);

    try {
        const product = await apiService.getProductById(productId);
        ui.renderProductDetails(product);

        const addToCartForm = document.getElementById('add-to-cart-form');
        if (addToCartForm) {
            addToCartForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const quantityInput = document.getElementById('quantity-input');
                const quantity = parseInt(quantityInput.value, 10);
                
                if (quantity > 0) {
                    cart.addToCart(product, quantity);
                    alert(`${quantity} x ${product.name} added to cart!`);
                }
            });
        }
    } catch (error) {
        ui.showErrorMessage(container, `Error loading product details: ${error.message}`);
    }
}

// ===================================================================
// ========================== NEW SECTION ============================
// ===================================================================

/**
 * Initializes the Cart page.
 * - Renders cart items.
 * - Sets up event listeners for quantity changes, item removal, and checkout.
 * - Initializes Stripe Elements for payment processing.
 */
function initCartPage() {
    const cartContainer = document.getElementById('cart-container');
    if (!cartContainer) return;

    // Function to render and re-render the cart
    const displayCart = () => {
        const cartItems = cart.getCart();
        const cartTotal = cart.getCartTotal();
        ui.renderCart(cartItems, cartTotal);
        addCartEventListeners(); // Re-add listeners after every render
    };

    // Initial render
    displayCart();

    // Re-render the cart UI whenever the cart data changes
    document.addEventListener('cartUpdated', displayCart);

    // Stripe integration
    const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
    const elements = stripe.elements();
    const cardElement = elements.create('card');
    cardElement.mount('#card-element');

    const checkoutForm = document.getElementById('checkout-form');
    checkoutForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const submitBtn = document.getElementById('submit-payment-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';

        try {
            // 1. Create a payment method token from the card details
            const { token, error } = await stripe.createToken(cardElement);

            if (error) {
                ui.showFormMessage('card-errors', error.message, true);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Pay Now';
                return;
            }

            // 2. Gather shipping information
            const shipping_info = {
                first_name: document.getElementById('first_name').value,
                last_name: document.getElementById('last_name').value,
                email: document.getElementById('email').value,
                address: document.getElementById('address').value,
                postal_code: document.getElementById('postal_code').value,
                city: document.getElementById('city').value,
            };

            // 3. Prepare order data for the backend
            const orderData = {
                items: cart.getCart(),
                shipping_info: shipping_info,
                stripe_token: token.id,
            };

            // 4. Send the order to the backend
            const createdOrder = await apiService.createOrder(orderData);

            // 5. Handle success
            cart.clearCart();
            alert('Payment successful! Your order has been placed.');
            // Redirect to a 'thank you' page or homepage
            window.location.href = '/index.html';

        } catch (apiError) {
            ui.showFormMessage('checkout-message', `Order failed: ${apiError.message}`, true);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Pay Now';
        }
    });
}

/**
 * Adds event listeners to the cart items after they have been rendered.
 */
function addCartEventListeners() {
    const cartContainer = document.getElementById('cart-container');
    if (!cartContainer) return;

    // Event delegation for remove and quantity update buttons
    cartContainer.addEventListener('click', (e) => {
        const target = e.target;
        const cartItem = target.closest('.cart-item');
        if (!cartItem) return;

        const productId = parseInt(cartItem.dataset.productId, 10);

        if (target.classList.contains('remove-item-btn')) {
            cart.removeFromCart(productId);
        }
    });

    cartContainer.addEventListener('change', (e) => {
        const target = e.target;
        if (target.classList.contains('quantity-update-input')) {
            const cartItem = target.closest('.cart-item');
            const productId = parseInt(cartItem.dataset.productId, 10);
            const newQuantity = parseInt(target.value, 10);
            if (newQuantity > 0) {
                cart.updateCartItemQuantity(productId, newQuantity);
            }
        }
    });

    // "Proceed to Checkout" button
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', async () => {
             // Check if user is logged in before showing checkout
            try {
                await apiService.getUserProfile();
                // If successful, show checkout form
                document.getElementById('checkout-section').classList.remove('hidden');
                checkoutBtn.classList.add('hidden'); // Hide the button
            } catch (error) {
                // If not logged in, redirect to login page
                alert('You must be logged in to proceed to checkout.');
                window.location.href = `/login.html?next=cart.html`;
            }
        });
    }
}

// ===================================================================
// ======================== END NEW SECTION ==========================
// ===================================================================

function initLoginPage() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const messageEl = document.getElementById('form-message');
            messageEl.classList.add('hidden');

            const username = loginForm.username.value;
            const password = loginForm.password.value;

            try {
                await apiService.loginUser(username, password);
                // Check for a 'next' URL parameter to redirect back after login
                const nextUrl = new URLSearchParams(window.location.search).get('next');
                window.location.href = nextUrl || 'index.html'; 
            } catch (error) {
                ui.showFormMessage('form-message', `Login failed: ${error.message}`, true);
            }
        });
    }
}

function initRegisterPage() {
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const messageEl = document.getElementById('form-message');
            messageEl.classList.add('hidden');

            const userData = {
                username: registerForm.username.value, password: registerForm.password.value,
                password2: registerForm.password2.value, email: registerForm.email.value,
                first_name: registerForm.first_name.value, last_name: registerForm.last_name.value,
            };

            try {
                await apiService.registerUser(userData);
                window.location.href = 'login.html?registered=true';
            } catch (error) {
                ui.showFormMessage('form-message', `Registration failed: ${error.message}`, true);
            }
        });
    }
}

// --- App Entry Point ---
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    router();
});