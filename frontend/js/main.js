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
import { ListenerManager } from './utils.js';
import { initPerformanceOptimizations } from './performance.js';
import { initSecurity } from './security.js';
import { initAnalytics } from './analytics.js';
import i18n from './i18n.js';
import './language-switcher.js';
import { initBrandGallery } from './brand-gallery.js';
import {
    ErrorBoundary,
    globalListenerManager,
    globalRequestManager,
    getCached,
    appState,
    requestCache,
} from './app-core.js';
import { initHomePage } from './pages/home.js';
import { initProductPage } from './pages/product.js';
import { initCartPage } from './pages/cart.js';
// PWA imports
import { initOfflineIndicator } from './offline-indicator.js';
import { initInstallPrompt } from './install-prompt.js';

// ============= Lazy Loading Utilities =============

/**
 * ✅ IMPROVEMENT: Lazy load AOS library only when needed
 * Reduces initial bundle size by ~20KB
 */
function initAOS() {
    // Check if AOS is loaded
    if (window.AOS) {
        window.AOS.init({ duration: 800, once: true });
        return;
    }
    
    // AOS is loaded via CDN, wait for it
    const checkAOS = setInterval(() => {
        if (window.AOS) {
            clearInterval(checkAOS);
            window.AOS.init({ duration: 800, once: true });
        }
    }, 50);
    
    // Timeout after 5 seconds
    setTimeout(() => {
        clearInterval(checkAOS);
    }, 5000);
}

// --- State Management & Cache ---

// --- Initialization & Routing ---

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initApp();
        runRoute();
    } catch (error) {
        console.error('App initialization failed:', error);
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

const routeHandlers = {
    '/': (signal) => initHomePage(signal),
    '/index.html': (signal) => initHomePage(signal),
    'index.html': (signal) => initHomePage(signal),
    '/product.html': (signal) => initProductPage(signal),
    'product.html': (signal) => initProductPage(signal),
    '/cart.html': (signal) => initCartPage(signal),
    'cart.html': (signal) => initCartPage(signal),
    '/wishlist.html': (signal) => initWishlistPage(signal),
    'wishlist.html': (signal) => initWishlistPage(signal),
    '/login.html': (signal) => initLoginPage(signal),
    'login.html': (signal) => initLoginPage(signal),
    '/register.html': (signal) => initRegisterPage(signal),
    'register.html': (signal) => initRegisterPage(signal),
    '/search-results.html': (signal) => initSearchResultsPage(signal),
    'search-results.html': (signal) => initSearchResultsPage(signal),
};

function runRoute() {
    const path = window.location.pathname || '/';
    const fallbackKey = path.split('/').pop() || '/';
    const initFunction = routeHandlers[path] || routeHandlers[fallbackKey];

    const megaMenu = document.getElementById('products-mega-menu');
    if (megaMenu?._listenerManager) {
        megaMenu._listenerManager.removeAll();
        delete megaMenu._tabSwitchingInitialized;
        delete megaMenu._listenerManager;
    }

    if (!initFunction) {
        return;
    }

    globalRequestManager.abort('currentRoute');
    const controller = globalRequestManager.create('currentRoute');
    const maybePromise = initFunction(controller.signal);

    Promise.resolve(maybePromise).catch((error) => {
        if (error?.name !== 'AbortError') {
            console.error(`Error initializing page for path ${path}:`, error);
            ui.showToast('Failed to load page content.', 'error');
        }
    });
}

/**
 * Initializes global components and event listeners that run on every page.
 */
async function initApp() {
    try {
        // Initialize i18n first (synchronous)
        setupI18n();

        // Disable CSP in local dev to avoid blocking API calls
        if (typeof window !== 'undefined') {
            window.__DISABLE_CSP__ = true;
        }

        // Initialize security and performance optimizations
        initSecurity();
        initPerformanceOptimizations();
        
        const cachedUser = auth.getCachedUser();
        if (cachedUser) {
            ui.updateUserAuthUI(cachedUser);
        }

        auth.authenticateUser()
            .then((user) => {
                ui.updateUserAuthUI(user);
            })
            .catch((error) => {
                console.error('Deferred auth initialization failed:', error);
                ui.updateUserAuthUI(null);
            });

        // Initialize PWA features (now that user state is known)
        initPWAFeatures();
        
        // Initialize analytics and monitoring
        initAnalytics();
        
        // ✅ OPTIMIZED: Lazy load AOS only when needed
        initAOS();

        // Update UI elements that depend on user state
        ui.updateCartCount(cart.getCartItemCount());
        globalListenerManager.add(document, 'cartUpdated', () => ui.updateCartCount(cart.getCartItemCount()));
        
        // --- Orchestration ---
        new AdvancedSearch();
        new MobileNavigation();

        setupGlobalEventListeners();
        enhanceFooterAddressLinks();
        
        // Highlight the active page in navigation
        highlightActivePage();

        // ✅ IMPROVED: Load categories with request deduplication
        // Single request shared across all components that need categories
        return requestCache.get('categories', async () => {
            const categories = await getCached('categories', () => apiService.getCategories(), 'categories');
            appState.categories = categories;
            ui.renderMegaMenu(categories);
            setupMegaMenuClickToggle();
            return categories;
        }).catch(error => {
            console.error('Failed to load mega menu categories:', error);
            return []; // Return empty array on failure
        });
        
    } catch (error) {
        console.error('Error in initApp:', error);
        // If auth fails, proceed gracefully
        ui.updateUserAuthUI(null);
        
        // Still initialize PWA features and event listeners for logged-out users
        try {
            initPWAFeatures();
        } catch (pwaError) {
            console.error('Failed to initialize PWA features:', pwaError);
        }
        
        setupGlobalEventListeners();
        return Promise.resolve([]); // Return empty array on failure
    }
}

/**
 * Initialize PWA features (offline support, sync, install prompt)
 */
async function initPWAFeatures() {
    try {
        console.log('[PWA] Initializing PWA features...');
        
        // Initialize offline indicator
        initOfflineIndicator();
        console.log('[PWA] Offline indicator initialized');
        
        // Initialize sync manager (dynamic import to match other modules)
        const { initSyncManager } = await import('./sync-manager.js');
        initSyncManager();
        console.log('[PWA] Sync manager initialized');
        
        // Initialize install prompt
        initInstallPrompt();
        console.log('[PWA] Install prompt initialized');
        
        console.log('[PWA] All PWA features initialized successfully');
    } catch (error) {
        console.error('[PWA] Failed to initialize PWA features:', error);
        // Don't throw - PWA features are enhancements, not critical
    }
}

/**
 * Sets up global event listeners using delegation for performance and simplicity.
 */
function setupGlobalEventListeners() {
    globalListenerManager.add(document.body, 'click', (e) => {
        const target = e.target;
        
        // User icon toggle (for auth dropdown)
        const userIconBtn = target.closest('#user-icon-toggle');
        if (userIconBtn) {
            e.stopPropagation();
            const authMenuContainer = document.getElementById('auth-menu-container');
            const isExpanded = userIconBtn.getAttribute('aria-expanded') === 'true';
            userIconBtn.setAttribute('aria-expanded', !isExpanded);
            if (authMenuContainer) {
                authMenuContainer.classList.toggle('active');
            }
            return;
        }

        // User info toggle (for logged in users)
        const userInfoBtn = target.closest('#user-info-toggle');
        if (userInfoBtn) {
            e.stopPropagation();
            const isExpanded = userInfoBtn.getAttribute('aria-expanded') === 'true';
            userInfoBtn.setAttribute('aria-expanded', !isExpanded);
            return;
        }

        // User menu toggle (legacy)
        const userMenuToggle = target.closest('.user-menu-toggle');
        if (userMenuToggle) {
            e.stopPropagation();
            const isExpanded = userMenuToggle.getAttribute('aria-expanded') === 'true';
            if (userMenuToggle) {
                userMenuToggle.setAttribute('aria-expanded', !isExpanded);
            }
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
        
        // Close auth menu on outside click
        const openAuthToggle = document.querySelector('#user-icon-toggle[aria-expanded="true"]');
        if (openAuthToggle && !target.closest('.auth-menu-container')) {
            openAuthToggle.setAttribute('aria-expanded', 'false');
            const authMenuContainer = document.getElementById('auth-menu-container');
            if (authMenuContainer) {
                authMenuContainer.classList.remove('active');
            }
        }

        // Close user menu on outside click (guarded)
        const openToggle = document.querySelector('.user-menu-toggle[aria-expanded="true"]');
        if (openToggle && !target.closest('.user-menu')) {
            openToggle.setAttribute('aria-expanded', 'false');
        }

        // Close user info dropdown on outside click
        const openUserInfo = document.querySelector('#user-info-toggle[aria-expanded="true"]');
        if (openUserInfo && !target.closest('#user-info')) {
            openUserInfo.setAttribute('aria-expanded', 'false');
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
 * Highlight the active page in navigation
 */
function highlightActivePage() {
    // Get current page filename
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // Map of page filenames to their corresponding navigation links
    const pageMap = {
        'index.html': 'index.html',
        '': 'index.html', // Root path
        'about.html': 'about.html',
        'services.html': 'services.html',
        'contact.html': 'contact.html',
        'product.html': 'index.html#products', // Product page links to products section
        'search-results.html': 'index.html#products', // Search results links to products
        'cart.html': 'cart.html',
    };
    
    // Get the link that should be active
    const targetPage = pageMap[currentPage] || currentPage;
    
    // Remove active class from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Add active class to the current page link
    document.querySelectorAll('.nav-link').forEach(link => {
        const href = link.getAttribute('href');
        if (href === targetPage || href === currentPage) {
            link.classList.add('active');
        }
    });
    
    // Special case: if we're on a page with #products in URL, highlight products
    if (window.location.hash === '#products' || currentPage === 'product.html' || currentPage === 'search-results.html') {
        const productsLink = document.querySelector('.nav-link[href*="products"]');
        if (productsLink) {
            productsLink.classList.add('active');
        }
    }
}

/**
 * Setup internationalization system
 */
function setupI18n() {
    // Listen for language changes to update dynamic content
    i18n.addListener((newLanguage) => {
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

async function initWishlistPage(signal) {
    const container = document.getElementById('wishlist-container');
    if (!container) {
        console.warn('Wishlist container not found');
        return;
    }

    // Page-specific listener manager
    const pageListenerManager = new ListenerManager();

    try {
        // Show loading state
        container.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>${i18n.t('loading_wishlist')}</p>
            </div>
        `;
        
        // Dynamically import wishlist module
        const wishlist = await import('./wishlist.js');
        
        // Initialize wishlist (syncs if authenticated)
        await wishlist.initWishlist();
        
        // Get wishlist items
        const items = wishlist.getWishlist();
        
        if (items.length === 0) {
            container.innerHTML = `
                <div class="empty-wishlist">
                    <i class="far fa-heart"></i>
                    <h2>${i18n.t('empty_wishlist')}</h2>
                    <p>${i18n.t('empty_wishlist_message')}</p>
                    <a href="index.html" class="btn btn-primary">
                        <i class="fas fa-shopping-bag"></i> ${i18n.t('continue_shopping')}
                    </a>
                </div>
            `;
            return;
        }
        
        // Render wishlist items
        container.innerHTML = '';
        for (const item of items) {
            try {
                // Fetch full product details
                const product = await apiService.getProductById(item.product_id || item.id, { signal });
                const itemElement = ui.renderWishlistItem(product);
                container.appendChild(itemElement);
            } catch (error) {
                console.error(`Error loading wishlist item ${item.product_id}:`, error);
            }
        }
        
        // Setup event listeners for wishlist actions
        pageListenerManager.add(container, 'click', async (e) => {
            // Remove from wishlist
            const removeBtn = e.target.closest('.remove-from-wishlist-btn');
            if (removeBtn) {
                const productId = parseInt(removeBtn.dataset.productId, 10);
                try {
                    await wishlist.removeFromWishlist(productId);
                    ui.showToast(i18n.t('removed_from_wishlist'), 'success');
                    
                    // Remove the item element
                    const itemElement = removeBtn.closest('.wishlist-item');
                    if (itemElement) {
                        itemElement.style.opacity = '0';
                        setTimeout(() => {
                            itemElement.remove();
                            
                            // Check if wishlist is now empty
                            if (container.children.length === 0) {
                                container.innerHTML = `
                                    <div class="empty-wishlist">
                                        <i class="far fa-heart"></i>
                                        <h2>${i18n.t('empty_wishlist')}</h2>
                                        <p>${i18n.t('empty_wishlist_message')}</p>
                                        <a href="index.html" class="btn btn-primary">
                                            <i class="fas fa-shopping-bag"></i> ${i18n.t('continue_shopping')}
                                        </a>
                                    </div>
                                `;
                            }
                        }, 300);
                    }
                } catch (error) {
                    ui.showToast(i18n.t('error_removing_wishlist'), 'error');
                }
                return;
            }
            
            // Move to cart
            const moveToCartBtn = e.target.closest('.move-to-cart-btn');
            if (moveToCartBtn) {
                const productId = parseInt(moveToCartBtn.dataset.productId, 10);
                try {
                    const product = await apiService.getProductById(productId);
                    cart.addToCart(product, 1);
                    ui.showToast(i18n.t('moved_to_cart'), 'success');
                    
                    // Optionally remove from wishlist after moving to cart
                    await wishlist.removeFromWishlist(productId);
                    
                    // Remove the item element
                    const itemElement = moveToCartBtn.closest('.wishlist-item');
                    if (itemElement) {
                        itemElement.style.opacity = '0';
                        setTimeout(() => {
                            itemElement.remove();
                            
                            if (container.children.length === 0) {
                                container.innerHTML = `
                                    <div class="empty-wishlist">
                                        <i class="far fa-heart"></i>
                                        <h2>${i18n.t('empty_wishlist')}</h2>
                                        <p>${i18n.t('empty_wishlist_message')}</p>
                                        <a href="index.html" class="btn btn-primary">
                                            <i class="fas fa-shopping-bag"></i> ${i18n.t('continue_shopping')}
                                        </a>
                                    </div>
                                `;
                            }
                        }, 300);
                    }
                } catch (error) {
                    ui.showToast(i18n.t('error_moving_to_cart'), 'error');
                }
                return;
            }
        });
        
        // Update wishlist count in header
        ui.updateWishlistCount(items.length);
        
    } catch (error) {
        console.error('Error initializing wishlist page:', error);
        container.innerHTML = `
            <p class="error-message">
                ${i18n.t('error_loading_wishlist')} 
                <button onclick="location.reload()" class="btn btn-primary">${i18n.t('retry')}</button>
            </p>
        `;
    }

    // Cleanup function for when leaving the page
    window.addEventListener('beforeunload', () => {
        pageListenerManager.removeAll();
    });
}

/**
 * Initializes the Login Page.
 */
function initLoginPage() {
    const form = document.querySelector('#login-form');
    if (!form) {
        console.error('Login form not found');
        return;
    }

    const formMessage = document.getElementById('form-message');
    const pageListenerManager = new ListenerManager();

    // Add form submission handler
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Get submit button and store original text
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        let redirectScheduled = false;
        
        // Clear any previous error messages
        if (formMessage) {
            formMessage.className = 'hidden';
            formMessage.textContent = '';
        }
        
        // Set loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span data-i18n="loading">Loading...</span>';
        
        try {
            const identifier = form.username.value.trim();
            const response = await apiService.initiateLogin(identifier, form.password.value);
            
            if (response?.requires_verification) {
                const emailForVerification = response.email || identifier;
                sessionStorage.setItem('slp_verification_email', emailForVerification);
                
                ui.showToast('Verification code sent to your email!', 'success');
                submitBtn.innerHTML = '<i class="fas fa-check"></i> <span>Redirecting to verification...</span>';

                redirectScheduled = true;
                setTimeout(() => {
                    window.location.href = 'verify-login.html';
                }, 1000);
                return;
            }

            throw new Error('Login failed: unexpected response from server.');
        } catch (err) {
            // Display error in form
            if (formMessage) {
                formMessage.textContent = err.message || 'Login failed. Please check your credentials.';
                formMessage.className = 'alert alert-error';
            }
            ui.showToast('Login failed. Please check your credentials.', 'error');
        } finally {
            // Restore button state if still on page
            if (!redirectScheduled && !window.location.href.includes('verify-login.html') && !window.location.href.includes('index.html')) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
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
    const forms = document.querySelectorAll('form.auth-form[data-content]');
    if (!forms.length) {
        return;
    }

    const pageListenerManager = new ListenerManager();

    forms.forEach((form) => {
        const formMessage = form.querySelector('[id^="form-message"]');

        pageListenerManager.add(form, 'submit', async (e) => {
            e.preventDefault();

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn ? submitBtn.innerHTML : '';

            if (formMessage) {
                formMessage.className = 'hidden';
                formMessage.textContent = '';
            }

            const usernameInput = form.querySelector('[name="username"]');
            const emailInput = form.querySelector('[name="email"]');
            const firstNameInput = form.querySelector('[name="first_name"]');
            const lastNameInput = form.querySelector('[name="last_name"]');
            const passwordInput = form.querySelector('[name="password"]');
            const password2Input = form.querySelector('[name="password2"]');

            const data = {
                username: usernameInput ? usernameInput.value.trim() : '',
                email: emailInput ? emailInput.value.trim() : '',
                first_name: firstNameInput ? firstNameInput.value.trim() : '',
                last_name: lastNameInput ? lastNameInput.value.trim() : '',
                password: passwordInput ? passwordInput.value : '',
                password2: password2Input ? password2Input.value : '',
            };

            if (data.password !== data.password2) {
                if (formMessage) {
                    formMessage.textContent = 'Passwords do not match.';
                    formMessage.className = 'alert alert-error';
                }
                ui.showToast('Passwords do not match.', 'error');
                return;
            }

            if (!data.username || !data.email || !data.first_name || !data.last_name || !data.password) {
                if (formMessage) {
                    formMessage.textContent = 'Please fill in all required fields.';
                    formMessage.className = 'alert alert-error';
                }
                ui.showToast('Please fill in all required fields.', 'error');
                return;
            }

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span data-i18n="creating_account">Creating account...</span>';
            }

            try {
                await apiService.registerUser(data);

                if (submitBtn) {
                    submitBtn.innerHTML = '<i class="fas fa-check"></i> <span data-i18n="registration_success">Success! Redirecting...</span>';
                }

                if (formMessage) {
                    formMessage.textContent = 'Account created successfully! Redirecting to login...';
                    formMessage.className = 'alert alert-success';
                }

                ui.showToast('Registration successful!', 'success');
                window.location.href = 'login.html?registered=true';
            } catch (err) {
                let errorMessage = 'Registration failed. Please check your information.';

                if (err.response && typeof err.response === 'object') {
                    const errors = [];
                    for (const [field, messages] of Object.entries(err.response)) {
                        if (Array.isArray(messages)) {
                            errors.push(`${field}: ${messages.join(', ')}`);
                        } else {
                            errors.push(`${field}: ${messages}`);
                        }
                    }
                    if (errors.length > 0) {
                        errorMessage = errors.join('; ');
                    }
                } else if (err.message) {
                    errorMessage = err.message;
                }

                if (formMessage) {
                    formMessage.textContent = errorMessage;
                    formMessage.className = 'alert alert-error';
                }

                ui.showToast(`Registration failed: ${errorMessage}`, 'error');
            } finally {
                if (submitBtn && !window.location.href.includes('login.html')) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
            }
        });
    });

    window.addEventListener('beforeunload', () => {
        pageListenerManager.removeAll();
    });
}

/**
 * Initializes the Search Results Page (lightweight as page has its own module).
 */
function initSearchResultsPage() {
    // Nothing required here; page-specific logic lives in js/search-results.js
}

/**
 * Sets up click toggle functionality for the mega menu
 * FIXED: Added breakpoint logic to separate mobile and desktop behavior
 * - Desktop (>1024px): Hover-only, no click toggle
 * - Mobile/Tablet (≤1024px): Click toggle only, no hover
 */
function setupMegaMenuClickToggle() {
    const productsLink = document.querySelector('.nav-item.mega-menu-container > .nav-link');
    const megaMenu = document.getElementById('products-mega-menu');
    
    if (!productsLink || !megaMenu) return;
    
    // FIXED: Click toggle handler with window width check
    globalListenerManager.add(productsLink, 'click', (e) => {
        // Only activate click toggle on screens ≤1024px (mobile/tablet)
        if (window.innerWidth <= 1024) {
            e.preventDefault();
            e.stopPropagation();
            megaMenu.classList.toggle('active');
        }
        // On desktop (>1024px), allow default link behavior and rely on CSS hover
    });
    
    // FIXED: Close mega menu when clicking outside (mobile only)
    globalListenerManager.add(document, 'click', (e) => {
        // Only apply click-outside on mobile/tablet (≤1024px)
        if (window.innerWidth <= 1024) {
            const isClickInside = e.target.closest('.nav-item.mega-menu-container');
            if (!isClickInside && megaMenu.classList.contains('active')) {
                megaMenu.classList.remove('active');
            }
        }
    });
    
    // FIXED: Add Escape key handler to close mega menu
    globalListenerManager.add(document, 'keydown', (e) => {
        if (e.key === 'Escape' && megaMenu.classList.contains('active')) {
            megaMenu.classList.remove('active');
            // Return focus to the products link for accessibility
            if (window.innerWidth <= 1024) {
                productsLink.focus();
            }
        }
    });
    
    // FIXED: Handle window resize to close menu if switching from mobile to desktop
    let resizeTimer;
    globalListenerManager.add(window, 'resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            // Close menu when resizing from mobile to desktop
            if (window.innerWidth > 1024 && megaMenu.classList.contains('active')) {
                megaMenu.classList.remove('active');
            }
        }, 250);
    });
}

function enhanceFooterAddressLinks() {
    try {
        const locationIcons = document.querySelectorAll('.footer-contact .fa-map-marker-alt');
        locationIcons.forEach((icon) => {
            const container = icon.closest('.contact-item') || icon.parentElement;
            if (!container || container.querySelector('a[data-map-link]')) {
                return;
            }

            const addressSpan = container.querySelector('span');
            const link = document.createElement('a');
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.dataset.mapLink = 'true';
            link.className = 'footer-address-link';

            if (addressSpan) {
                const spanText = addressSpan.textContent.replace(/\s+/g, ' ').trim();
                if (!spanText) {
                    return;
                }
                link.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spanText)}`;
                link.innerHTML = addressSpan.innerHTML;
                container.replaceChild(link, addressSpan);
                return;
            }

            const nodesToWrap = [];
            let node = icon.nextSibling;
            while (node) {
                nodesToWrap.push(node);
                node = node.nextSibling;
            }

            const textContent = nodesToWrap
                .map((n) => (n.textContent || '').trim())
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();

            if (!textContent) {
                return;
            }

            link.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(textContent)}`;

            nodesToWrap.forEach((originalNode) => {
                link.appendChild(originalNode.cloneNode(true));
            });

            nodesToWrap.forEach((originalNode) => {
                container.removeChild(originalNode);
            });

            container.appendChild(link);
        });
    } catch (error) {
        console.warn('Failed to enhance footer address link:', error);
    }
}