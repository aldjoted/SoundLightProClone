/**
 * main.js - Production Version (Modular Architecture)
 *
 * This file serves as the main orchestrator for the application. It imports specialized
 * modules for core functionalities like search, mobile navigation, and UI rendering,
 * then initializes them in a structured lifecycle. This keeps the main controller lean
 * and focused on high-level application setup, routing, and global event management.
 */

import * as apiService from './apiService.js';
import * as cart from './cart.js';
import * as ui from './ui.js';
import * as auth from './auth.js';
import AdvancedSearch from './advanced-search.js';
import MobileNavigation from './mobile-nav.js';
import { ListenerManager, RequestManager } from './utils.js';
import i18n from './i18n.js';
import './language-switcher.js';

// --- State Management & Cache ---

/**
 * Global state for data shared across the application.
 * @type {{products: Array<Object>, categories: Array<Object>}}
 */
const appState = {
    products: [],
    categories: [],
};

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Global resource managers
const globalListenerManager = new ListenerManager();
const globalRequestManager = new RequestManager();

/**
 * Retrieves data from a local cache or fetches it if stale or absent.
 * @param {string} key - The cache key.
 * @param {Function} fetcher - An async function that fetches the data.
 * @returns {Promise<any>}
 */
async function getCached(key, fetcher) {
    const cached = cache.get(key);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return Promise.resolve(cached.data);
    }
    const data = await fetcher();
    cache.set(key, { data, timestamp: Date.now() });
    return data;
}

// --- Initialization & Routing ---

globalListenerManager.add(document, 'DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    try {
        initApp();
        router();
        console.log('App initialization completed successfully');
    } catch (error) {
        console.error('App initialization failed:', error);
        // Show error message to user
        document.body.innerHTML = `
            <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
                <h2>Loading Error</h2>
                <p>There was an error loading the application. Please refresh the page.</p>
                <p><strong>Error:</strong> ${error.message}</p>
                <button onclick="location.reload()" style="padding: 10px 20px; background: #007bff; color: white; border: none; cursor: pointer;">Reload Page</button>
            </div>
        `;
    }
});

/**
 * Routes to the appropriate page initialization function based on the current URL.
 */
function router() {
    const path = window.location.pathname;
    const page = path.split("/").pop() || 'index.html';
    
    const routes = {
        'index.html': initHomePage,
        'product.html': initProductDetailPage,
        'cart.html': initCartPage,
        'login.html': initLoginPage,
        'register.html': initRegisterPage,
        'search-results.html': initSearchResultsPage,
    };

    const initFunction = routes[page];
    if (initFunction) {
        // Cancel previous page requests
        globalRequestManager.abort('currentRoute');
        const controller = globalRequestManager.create('currentRoute');
        const { signal } = controller;
        
        const maybePromise = initFunction(signal);
        Promise.resolve(maybePromise).catch(error => {
            if (error.name !== 'AbortError') {
                console.error(`Error initializing page ${page}:`, error);
                ui.showToast('Failed to load page content.', 'error');
            }
        });
    }
}

/**
 * Initializes global components and event listeners that run on every page.
 */
async function initApp() {
    console.log('Starting app initialization...');
    
    try {
        // Initialize internationalization
        console.log('Initializing i18n...');
        setupI18n();
        
        if (window.AOS) AOS.init({ duration: 800, once: true });

        ui.updateCartCount(cart.getCartItemCount());
        globalListenerManager.add(document, 'cartUpdated', () => ui.updateCartCount(cart.getCartItemCount()));
        
        console.log('Cart and UI initialized');
        
        try {
            // Try to get user profile only if we might have a refresh token
            // This reduces unnecessary 401 calls for anonymous users
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
                const user = await apiService.getUserProfile();
                ui.updateUserAuthUI(user);
                console.log('User authenticated:', user.username);
            } else {
                // No refresh token, user is not logged in
                ui.updateUserAuthUI(null);
                console.log('User not logged in - showing guest UI');
            }
        } catch (error) {
            // If getUserProfile fails, user is not authenticated or token expired
            ui.updateUserAuthUI(null);
            console.log('User authentication failed - showing guest UI');
        }

        // --- Orchestration ---
        // Instantiate the imported modules to activate them.
        console.log('Initializing modules...');
        new AdvancedSearch();
        new MobileNavigation();
        console.log('Modules initialized');

        setupGlobalEventListeners();
        console.log('Global event listeners set up');
        
    } catch (error) {
        console.error('Error in initApp:', error);
        throw error;
    }
}

/**
 * Sets up global event listeners using delegation for performance and simplicity.
 */
function setupGlobalEventListeners() {
    globalListenerManager.add(document.body, 'click', (e) => {
        const target = e.target;
        
        // User menu toggle
        const userMenuToggle = target.closest('.user-menu-toggle');
        if (userMenuToggle) {
            e.stopPropagation();
            const isExpanded = userMenuToggle.getAttribute('aria-expanded') === 'true';
            userMenuToggle.setAttribute('aria-expanded', !isExpanded);
            return;
        }

        // Logout button
        if (target.closest('#logout-button')) {
            apiService.logoutUser();
            ui.updateUserAuthUI(null);
            ui.showToast('You have been logged out.', 'info');
            if (window.location.pathname.endsWith('cart.html')) {
                window.location.href = 'index.html';
            }
            return;
        }
        
        // Close user menu on outside click
        if (document.querySelector('.user-menu-toggle[aria-expanded="true"]') && !target.closest('.user-menu')) {
            document.querySelector('.user-menu-toggle').setAttribute('aria-expanded', 'false');
        }
    });

    // Delegated listener for dynamically loaded product grids
    const productGrid = document.getElementById('product-grid');
    if (productGrid) {
        globalListenerManager.add(productGrid, 'click', handleProductGridActions);
    }
}

/**
 * Handles actions within a product grid (Add to Cart, Quick View).
 * @param {MouseEvent} e - The click event.
 */
async function handleProductGridActions(e) {
    const cartBtn = e.target.closest('.add-to-cart-btn');
    if (cartBtn) {
        const productId = parseInt(cartBtn.dataset.productId, 10);
        const product = appState.products.find(p => p.id === productId);
        if (product) {
            cart.addToCart(product, 1);
            ui.showToast(`${product.name} added to cart!`, 'success');
            
            cartBtn.disabled = true;
            cartBtn.innerHTML = `<i class="fas fa-check"></i> Added`;
            setTimeout(() => {
                cartBtn.disabled = false;
                cartBtn.innerHTML = `<i class="fas fa-shopping-cart"></i> Add`;
            }, 1500);

            ui.renderMiniCart(cart.getCart());
        }
        return;
    }

    const quickViewBtn = e.target.closest('.quick-view-btn');
    if (quickViewBtn) {
        e.preventDefault();
        const productId = quickViewBtn.dataset.productId;
        try {
            const product = await apiService.getProductById(productId);
            ui.renderQuickViewModal(product);
        } catch (error) {
            console.error("Failed to load product for quick view:", error);
            ui.showToast('Could not load product details.', 'error');
        }
    }
}

/**
 * Setup internationalization system
 */
function setupI18n() {
    // Listen for language changes to update dynamic content
    i18n.addListener((newLanguage) => {
        console.log(`Language switched to: ${newLanguage}`);
        
        // Update cart messages and UI elements
        const cartCount = cart.getCartItemCount();
        ui.updateCartCount(cartCount);
        
        // Re-render dynamic content if needed
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        
        // Update toast messages if any are visible
        const toasts = document.querySelectorAll('.toast');
        toasts.forEach(toast => {
            // Toast messages will be in the new language for new toasts
            // Existing toasts will remain in their original language
        });
        
        // Update any dynamic content that might need translation
        updateDynamicTranslations();
    });
    
    // Initial translation of the page
    i18n.translatePage();
}

/**
 * Update dynamic content translations
 */
function updateDynamicTranslations() {
    // Update cart button text
    const cartButtons = document.querySelectorAll('.add-to-cart-btn');
    cartButtons.forEach(btn => {
        if (!btn.disabled && btn.innerHTML.includes('Add')) {
            btn.innerHTML = `<i class="fas fa-shopping-cart"></i> ${i18n.t('btn_add_to_cart')}`;
        }
    });
    
    // Update search placeholder
    const searchInputs = document.querySelectorAll('input[type="search"], .search-input');
    searchInputs.forEach(input => {
        input.placeholder = i18n.t('search_placeholder');
    });
    
    // Update any other dynamic elements that need translation
    const elements = document.querySelectorAll('[data-i18n-dynamic]');
    elements.forEach(element => {
        const key = element.getAttribute('data-i18n-dynamic');
        if (key) {
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = i18n.t(key);
            } else {
                element.textContent = i18n.t(key);
            }
        }
    });
}

// --- Page Initializers ---

/**
 * Initializes the Home Page.
 */
async function initHomePage(signal) {
    console.log('Initializing homepage...');
    const productGrid = document.getElementById('product-grid');
    const featuredGrid = document.getElementById('featured-grid');
    if (!productGrid || !featuredGrid) {
        console.warn('Product grid or featured grid not found');
        return;
    }

    // Page-specific listener manager
    const pageListenerManager = new ListenerManager();

    ui.showSkeletonLoader(productGrid, 8);
    ui.showSkeletonLoader(featuredGrid, 3);

    try {
        console.log('Fetching products and categories...');
        const [products, categories] = await Promise.all([
            getCached('products', () => apiService.getProducts('', { signal })),
            getCached('categories', () => apiService.getCategories({ signal }))
        ]);

        console.log(`Loaded ${products.length} products and ${categories.length} categories`);

        appState.products = products;
        appState.categories = categories;

        console.log('Rendering UI components...');
        ui.renderHeroSlider();
        
        if (window.Swiper) {
            new Swiper('.hero-slider', {
                loop: true, effect: 'fade', autoplay: { delay: 7000, disableOnInteraction: false },
                pagination: { el: '.swiper-pagination', clickable: true },
                navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
                lazy: true,
            });
        }
        
        ui.renderFeaturedGrid(products.slice(0, 3));
        ui.renderCategoryFilters(categories.filter(c => !c.parent));
        ui.renderMegaMenu(categories);
        ui.renderProductGrid(products, productGrid);
        
        console.log('UI components rendered successfully');
        
        const filterControls = document.querySelector('.filter-controls');
        if (filterControls) {
            pageListenerManager.add(filterControls, 'click', (e) => {
                const filterBtn = e.target.closest('.filter-btn');
                if (!filterBtn) return;
                document.querySelector('.filter-controls .active')?.classList.remove('active');
                filterBtn.classList.add('active');
                filterProducts(filterBtn.dataset.category);
            });
        }

        // Cleanup function for when leaving the page
        window.addEventListener('beforeunload', () => {
            pageListenerManager.removeAll();
        });

    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error("Error initializing homepage:", error);
            productGrid.innerHTML = `<p class="error-message">Failed to load products: ${error.message} <button onclick="location.reload()">Retry</button></p>`;
        }
    }
}

/**
 * Initializes the Product Detail Page.
 */
async function initProductDetailPage(signal) {
    const container = document.getElementById('product-detail-container');
    if (!container) return;

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        container.innerHTML = `<p class="error-message">No product specified. <a href="index.html">Return to products</a>.</p>`;
        return;
    }

    try {
        const product = await apiService.getProductById(productId, { signal });
        ui.renderProductDetail(product, container);
        setupProductDetailPageEventListeners(product);
    } catch (error) {
        console.error("Error fetching product details:", error);
        container.innerHTML = `<p class="error-message">Could not load product. It may not exist. <a href="index.html">Return to products</a>.</p>`;
    }
}

/**
 * Initializes the Cart Page and its dynamic rendering.
 */
function initCartPage() {
    const container = document.getElementById('cart-container');
    const checkoutSection = document.getElementById('checkout-section');
    if (!container) return;

    // Page-specific listener manager
    const pageListenerManager = new ListenerManager();

    const render = () => {
        const items = cart.getCart();
        container.innerHTML = ''; // Clear previous content

        if (items.length === 0) {
            container.innerHTML = ui.getEmptyCartHTML(); // Use a UI function for the template
            checkoutSection.classList.add('hidden');
            return;
        }

        const { cartLayout, summary } = ui.getCartLayoutHTML(items);
        container.appendChild(cartLayout);
        container.appendChild(summary);
        
        checkoutSection.classList.remove('hidden');
    };

    pageListenerManager.add(container, 'change', (e) => {
        if (e.target.classList.contains('qty-input')) {
            const id = parseInt(e.target.closest('.cart-item').dataset.id, 10);
            const qty = Math.max(1, parseInt(e.target.value, 10) || 1);
            cart.updateCartItemQuantity(id, qty);
        }
    });

    pageListenerManager.add(container, 'click', (e) => {
        const itemEl = e.target.closest('.cart-item');
        if (itemEl) {
            const id = parseInt(itemEl.dataset.id, 10);
            if (e.target.closest('.qty-increment')) {
                const input = itemEl.querySelector('.qty-input');
                const current = Math.max(1, parseInt(input.value, 10) || 1);
                const next = current + 1;
                input.value = String(next);
                cart.updateCartItemQuantity(id, next);
                return;
            }
            if (e.target.closest('.qty-decrement')) {
                const input = itemEl.querySelector('.qty-input');
                const current = Math.max(1, parseInt(input.value, 10) || 1);
                const next = Math.max(1, current - 1);
                input.value = String(next);
                cart.updateCartItemQuantity(id, next);
                return;
            }
        }
        if (e.target.closest('.remove-btn')) {
            const id = parseInt(e.target.closest('.cart-item').dataset.id, 10);
            cart.removeFromCart(id);
        }
        if (e.target.closest('#proceed-checkout')) {
            checkoutSection.scrollIntoView({ behavior: 'smooth' });
        }
    });

    pageListenerManager.add(document, 'cartUpdated', render);
    render();

    // Cleanup function for when leaving the page
    window.addEventListener('beforeunload', () => {
        pageListenerManager.removeAll();
    });
}

/**
 * Initializes the Login Page.
 */
function initLoginPage() {
    const form = document.getElementById('login-form');
    if (!form) return;

    const pageListenerManager = new ListenerManager();

    pageListenerManager.add(form, 'submit', async (e) => {
        e.preventDefault();
        try {
            await apiService.loginUser(form.username.value.trim(), form.password.value);
            ui.showToast('Login successful!', 'success');
            window.location.href = 'index.html';
        } catch (err) {
            ui.showToast('Login failed. Please check your credentials.', 'error');
        }
    });

    // Cleanup function for when leaving the page
    window.addEventListener('beforeunload', () => {
        pageListenerManager.removeAll();
    });
}

/**
 * Initializes the Register Page.
 */
function initRegisterPage() {
    auth.initRegisterPageValidation();
    const form = document.getElementById('register-form');
    if (!form) return;

    const pageListenerManager = new ListenerManager();

    pageListenerManager.add(form, 'submit', async (e) => {
        e.preventDefault();
        const data = {
            username: form.username.value.trim(), email: form.email.value.trim(),
            first_name: form.first_name.value.trim(), last_name: form.last_name.value.trim(),
            password: form.password.value, password2: form.password2.value
        };

        if (data.password !== data.password2) {
            ui.showToast('Passwords do not match.', 'error');
            return;
        }

        try {
            await apiService.registerUser(data);
            window.location.href = 'login.html?registered=true';
        } catch (err) {
            ui.showToast(`Registration failed: ${err.message}`, 'error');
        }
    });

    // Cleanup function for when leaving the page
    window.addEventListener('beforeunload', () => {
        pageListenerManager.removeAll();
    });
}

/**
 * Sets up event listeners for the product detail page.
 * @param {Object} product - The product data for the page.
 */
function setupProductDetailPageEventListeners(product) {
    const pageListenerManager = new ListenerManager();
    
    const gallery = document.querySelector('.product-gallery');
    if (gallery) {
        pageListenerManager.add(gallery, 'click', (e) => {
            const thumb = e.target.closest('.thumbnail-img');
            if (!thumb) return;
            
            const mainImage = document.getElementById('main-product-image');
            mainImage.style.opacity = '0';
            setTimeout(() => {
                mainImage.src = thumb.src;
                mainImage.style.opacity = '1';
            }, 200);

            gallery.querySelector('.thumbnail-img.active')?.classList.remove('active');
            thumb.classList.add('active');
        });
    }

    const addToCartForm = document.getElementById('add-to-cart-form');
    if (addToCartForm) {
        pageListenerManager.add(addToCartForm, 'submit', (e) => {
            e.preventDefault();
            const quantity = parseInt(document.getElementById('quantity').value, 10);
            if (quantity > 0) {
                cart.addToCart(product, quantity);
                ui.showToast(`${product.name} (x${quantity}) added to cart!`, 'success');
                ui.renderMiniCart(cart.getCart());
            }
        });
    }

    const stickyAdd = document.getElementById('sticky-add');
    if (stickyAdd) {
        pageListenerManager.add(stickyAdd, 'click', () => {
            const qty = parseInt(document.getElementById('sticky-qty').value, 10) || 1;
            cart.addToCart(product, qty);
            ui.showToast(`${product.name} (x${qty}) added to cart!`, 'success');
            ui.renderMiniCart(cart.getCart());
        });
    }

    // Cleanup function for when leaving the page
    window.addEventListener('beforeunload', () => {
        pageListenerManager.removeAll();
    });
}

/**
 * Filters the products displayed in the grid based on a category slug.
 * @param {string} categorySlug - The slug of the category to filter by, or 'all'.
 */
function filterProducts(categorySlug) {
    const productGrid = document.getElementById('product-grid');
    if (!productGrid) return;
    
    const productsToRender = categorySlug === 'all'
        ? appState.products
        : appState.products.filter(p => p.category.toLowerCase().replace(/\s+/g, '-') === categorySlug);
    
    productGrid.style.transition = 'opacity 0.3s ease-out';
    productGrid.style.opacity = '0';
    
    setTimeout(() => {
        ui.renderProductGrid(productsToRender, productGrid);
        productGrid.style.opacity = '1';
    }, 300);
}

/**
 * Initializes the Search Results Page (lightweight as page has its own module).
 */
function initSearchResultsPage() {
    // Nothing required here; page-specific logic lives in js/search-results.js
}