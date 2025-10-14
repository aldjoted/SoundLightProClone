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
import { initPerformanceOptimizations } from './performance.js';
import { initSecurity } from './security.js';
import { initAnalytics } from './analytics.js';
import i18n from './i18n.js';
import './language-switcher.js';
// PWA imports
import { initOfflineIndicator } from './offline-indicator.js';
import { initSyncManager } from './sync-manager.js';
import { initInstallPrompt } from './install-prompt.js';

// --- State Management & Cache ---

/**
 * Global state for data shared across the application.
 * @type {{products: Array<Object>, categories: Array<Object>}}
 */
const appState = {
    products: [],
    categories: [],
};

/**
 * Smart cache with strategy-based TTL and stale-while-revalidate support
 * ✅ Improved: Different strategies for different data types
 */
class SmartCache {
    constructor() {
        this.cache = new Map();
        // Define cache strategies for different data types
        this.strategies = {
            products: { ttl: 5 * 60 * 1000, staleWhileRevalidate: true }, // 5 min, SWR enabled
            categories: { ttl: 30 * 60 * 1000, staleWhileRevalidate: false }, // 30 min, no SWR (changes rarely)
            userProfile: { ttl: 2 * 60 * 1000, staleWhileRevalidate: false } // 2 min, no SWR (sensitive data)
        };
    }
    
    /**
     * Gets data from cache or fetches it
     * @param {string} key - Cache key
     * @param {Function} fetcher - Async function to fetch data
     * @param {string} strategyName - Name of the cache strategy to use
     * @returns {Promise<any>} The cached or fetched data
     */
    async get(key, fetcher, strategyName = 'products') {
        const strategy = this.strategies[strategyName] || this.strategies.products;
        const cached = this.cache.get(key);
        const now = Date.now();
        
        if (cached) {
            const age = now - cached.timestamp;
            
            // Return immediately if fresh
            if (age < strategy.ttl) {
                return cached.data;
            }
            
            // Stale-while-revalidate: return stale data
            // while refreshing in background
            if (strategy.staleWhileRevalidate) {
                this.refreshInBackground(key, fetcher, strategyName);
                return cached.data;
            }
        }
        
        // No cache or expired without SWR - fetch fresh data
        const data = await fetcher();
        this.cache.set(key, { data, timestamp: now });
        return data;
    }
    
    /**
     * Refreshes cache in background (for stale-while-revalidate)
     * @param {string} key - Cache key
     * @param {Function} fetcher - Async function to fetch data
     * @param {string} strategyName - Name of the cache strategy
     */
    async refreshInBackground(key, fetcher, strategyName) {
        try {
            const data = await fetcher();
            this.cache.set(key, { data, timestamp: Date.now() });
        } catch (error) {
            console.warn(`Background refresh failed for ${key}:`, error);
            // Keep stale data on error
        }
    }
    
    /**
     * Manually invalidates a cache entry
     * @param {string} key - Cache key to invalidate
     */
    invalidate(key) {
        this.cache.delete(key);
    }
    
    /**
     * Clears all cache entries
     */
    clear() {
        this.cache.clear();
    }
}

const cache = new SmartCache();

// Global resource managers
const globalListenerManager = new ListenerManager();
const globalRequestManager = new RequestManager();

/**
 * Retrieves data from cache or fetches it if stale or absent.
 * @param {string} key - The cache key.
 * @param {Function} fetcher - An async function that fetches the data.
 * @param {string} strategy - The cache strategy to use ('products', 'categories', 'userProfile').
 * @returns {Promise<any>}
 */
async function getCached(key, fetcher, strategy = 'products') {
    return cache.get(key, fetcher, strategy);
}

// --- Initialization & Routing ---

globalListenerManager.add(document, 'DOMContentLoaded', () => {
    try {
        initApp();
        router();
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
        'wishlist.html': initWishlistPage,
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
    try {
        // Initialize security measures first
        initSecurity();
        
        // Initialize performance optimizations
        initPerformanceOptimizations();
        
        // Initialize analytics and monitoring
        initAnalytics();
        
        // Initialize PWA features
        initPWAFeatures();
        
        // Initialize internationalization
        setupI18n();
        
        if (window.AOS) AOS.init({ duration: 800, once: true });

        ui.updateCartCount(cart.getCartItemCount());
        globalListenerManager.add(document, 'cartUpdated', () => ui.updateCartCount(cart.getCartItemCount()));
        
        try {
            // Try to get user profile only if we might have a refresh token
            // This reduces unnecessary 401 calls for anonymous users
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
                const user = await apiService.getUserProfile();
                ui.updateUserAuthUI(user);
            } else {
                // No refresh token, user is not logged in
                ui.updateUserAuthUI(null);
            }
        } catch (error) {
            // If getUserProfile fails, user is not authenticated or token expired
            ui.updateUserAuthUI(null);
        }

        // Load categories for mega menu on all pages
        try {
            const categories = await getCached('categories', () => apiService.getCategories(), 'categories');
            appState.categories = categories;
            ui.renderMegaMenu(categories);
        } catch (error) {
            console.error('Failed to load mega menu categories:', error);
            // Don't throw - mega menu failure shouldn't break the entire page
        }

        // --- Orchestration ---
        // Instantiate the imported modules to activate them.
        new AdvancedSearch();
        new MobileNavigation();

        setupGlobalEventListeners();
        
    } catch (error) {
        console.error('Error in initApp:', error);
        throw error;
    }
}

/**
 * Initialize PWA features (offline support, sync, install prompt)
 */
function initPWAFeatures() {
    try {
        console.log('[PWA] Initializing PWA features...');
        
        // Initialize offline indicator
        initOfflineIndicator();
        console.log('[PWA] Offline indicator initialized');
        
        // Initialize sync manager
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
        
        // User menu toggle
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
        
        // Close user menu on outside click (guarded)
        const openToggle = document.querySelector('.user-menu-toggle[aria-expanded="true"]');
        if (openToggle && !target.closest('.user-menu')) {
            openToggle.setAttribute('aria-expanded', 'false');
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
        // Categories are already loaded in appState from initApp
        // Only fetch products here
        const products = await getCached('products', () => apiService.getProducts('', { signal }, ''), 'products');
        
        appState.products = products;

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
        ui.renderCategoryFilters(appState.categories.filter(c => !c.parent));
        ui.renderProductGrid(products, productGrid);
        
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
        
        // Load reviews and related products
        await loadProductReviews(productId);
        await loadRelatedProducts(productId);
    } catch (error) {
        console.error("Error fetching product details:", error);
        container.innerHTML = `<p class="error-message">Could not load product. It may not exist. <a href="index.html">Return to products</a>.</p>`;
    }
}

/**
 * Loads and renders product reviews
 * @param {string|number} productId - The product ID
 */
async function loadProductReviews(productId) {
    const statsContainer = document.getElementById('review-stats-container');
    const listContainer = document.getElementById('reviews-list-container');
    const formContainer = document.getElementById('review-form-container');
    
    if (!statsContainer || !listContainer) {
        console.warn('Review containers not found on page');
        return;
    }

    try {
        // Dynamically import reviews module
        const { ReviewManager } = await import('./reviews.js');
        const reviewManager = new ReviewManager(productId);
        
        // Load and render stats
        const stats = await reviewManager.loadStats();
        if (stats) {
            ui.renderReviewStats(stats, statsContainer);
        }
        
        // Load and render reviews
        const reviews = await reviewManager.loadReviews();
        if (reviews && reviews.length > 0) {
            reviews.forEach(review => {
                const reviewCard = ui.renderReviewCard(review);
                listContainer.appendChild(reviewCard);
            });
        } else {
            listContainer.innerHTML = `
                <div class="no-reviews">
                    <i class="far fa-comment-alt"></i>
                    <h3>${i18n.t('no_reviews')}</h3>
                    <p>${i18n.t('be_first_review')}</p>
                </div>
            `;
        }
        
        // Setup write review button
        const writeReviewBtn = document.getElementById('write-review-btn');
        if (writeReviewBtn && formContainer) {
            writeReviewBtn.addEventListener('click', () => {
                formContainer.classList.toggle('hidden');
                if (!formContainer.classList.contains('hidden')) {
                    // Render the review form
                    const reviewForm = ui.renderReviewForm(productId);
                    formContainer.innerHTML = '';
                    formContainer.appendChild(reviewForm);
                    
                    // Setup form submission
                    const form = formContainer.querySelector('form');
                    if (form) {
                        form.addEventListener('submit', async (e) => {
                            e.preventDefault();
                            try {
                                await reviewManager.submitReview({
                                    rating: form.rating.value,
                                    title: form.title.value,
                                    comment: form.comment.value
                                });
                                
                                ui.showToast(i18n.t('review_submitted'), 'success');
                                formContainer.classList.add('hidden');
                                
                                // Reload reviews
                                listContainer.innerHTML = '<div class="reviews-loading"><div class="spinner"></div></div>';
                                const updatedReviews = await reviewManager.loadReviews();
                                listContainer.innerHTML = '';
                                updatedReviews.forEach(review => {
                                    const reviewCard = ui.renderReviewCard(review);
                                    listContainer.appendChild(reviewCard);
                                });
                                
                                // Reload stats
                                const updatedStats = await reviewManager.loadStats();
                                if (updatedStats) {
                                    ui.renderReviewStats(updatedStats, statsContainer);
                                }
                            } catch (error) {
                                ui.showToast(error.message || i18n.t('review_submit_error'), 'error');
                            }
                        });
                        
                        // Setup cancel button
                        const cancelBtn = form.querySelector('.btn-secondary');
                        if (cancelBtn) {
                            cancelBtn.addEventListener('click', () => {
                                formContainer.classList.add('hidden');
                            });
                        }
                    }
                }
            });
        }
        
        // Setup sort dropdown
        const sortSelect = document.getElementById('review-sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', async (e) => {
                listContainer.innerHTML = '<div class="reviews-loading"><div class="spinner"></div></div>';
                const sortedReviews = await reviewManager.loadReviews(e.target.value);
                listContainer.innerHTML = '';
                sortedReviews.forEach(review => {
                    const reviewCard = ui.renderReviewCard(review);
                    listContainer.appendChild(reviewCard);
                });
            });
        }
        
    } catch (error) {
        console.error('Error loading product reviews:', error);
        if (listContainer) {
            listContainer.innerHTML = `<p class="error-message">${i18n.t('error_loading_reviews')}</p>`;
        }
    }
}

/**
 * Loads and renders related products
 * @param {string|number} productId - The product ID
 */
async function loadRelatedProducts(productId) {
    const relatedSection = document.getElementById('related-products-section');
    if (!relatedSection) {
        console.warn('Related products section not found on page');
        return;
    }

    try {
        // Show loading state
        relatedSection.innerHTML = `
            <div class="related-products-loading">
                <div class="spinner"></div>
                <p>${i18n.t('loading_related_products')}</p>
            </div>
        `;
        
        // Fetch related products
        const relatedProducts = await apiService.getRelatedProducts(productId);
        
        if (relatedProducts && relatedProducts.length > 0) {
            ui.renderRelatedProducts(relatedProducts, relatedSection);
        } else {
            relatedSection.innerHTML = `
                <div class="no-related-products">
                    <i class="fas fa-boxes"></i>
                    <h3>${i18n.t('no_related_products')}</h3>
                    <p>${i18n.t('check_back_later')}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading related products:', error);
        relatedSection.innerHTML = `<p class="error-message">${i18n.t('error_loading_related')}</p>`;
    }
}

/**
 * Initializes the Wishlist Page.
 */
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
    
    // Setup wishlist button if present
    const wishlistBtn = document.querySelector('.wishlist-btn');
    if (wishlistBtn) {
        // Dynamically import and setup wishlist functionality
        import('./wishlist.js').then(wishlist => {
            // Check if product is already in wishlist
            wishlist.initWishlist().then(() => {
                const isInWishlist = wishlist.isInWishlist(product.id);
                if (isInWishlist) {
                    wishlistBtn.classList.add('in-wishlist');
                    wishlistBtn.innerHTML = '<i class="fas fa-heart"></i> <span class="btn-text">' + i18n.t('in_wishlist') + '</span>';
                }
                
                // Add click handler
                pageListenerManager.add(wishlistBtn, 'click', async () => {
                    try {
                        await wishlist.toggleWishlist(product.id);
                        const nowInWishlist = wishlist.isInWishlist(product.id);
                        
                        if (nowInWishlist) {
                            wishlistBtn.classList.add('in-wishlist');
                            wishlistBtn.innerHTML = '<i class="fas fa-heart"></i> <span class="btn-text">' + i18n.t('in_wishlist') + '</span>';
                            ui.showToast(i18n.t('added_to_wishlist'), 'success');
                        } else {
                            wishlistBtn.classList.remove('in-wishlist');
                            wishlistBtn.innerHTML = '<i class="far fa-heart"></i> <span class="btn-text">' + i18n.t('add_to_wishlist') + '</span>';
                            ui.showToast(i18n.t('removed_from_wishlist'), 'info');
                        }
                        
                        // Update wishlist count
                        const wishlistItems = wishlist.getWishlist();
                        ui.updateWishlistCount(wishlistItems.length);
                    } catch (error) {
                        console.error('Error toggling wishlist:', error);
                        ui.showToast(i18n.t('error_wishlist'), 'error');
                    }
                });
            });
        }).catch(error => {
            console.error('Error loading wishlist module:', error);
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