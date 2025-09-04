/**
 * main.js
 *
 * Main application controller. Initializes the app, handles routing,
 * event listeners, and orchestrates UI updates.
 */

import * as apiService from './apiService.js';
import * as cart from './cart.js';
import * as ui from './ui.js';

// Global state for homepage products to enable filtering
let allProducts = [];
let allCategories = [];

/**
 * Main router to initialize page-specific logic.
 */
function router() {
    const path = window.location.pathname;
    // Normalize path for default file
    const page = path.split("/").pop() || 'index.html';

    switch (page) {
        case 'index.html':
            initHomePage();
            break;
        case 'product.html':
            initProductDetailPage(); // <-- UNCOMMENT THIS LINE
            break;
        case 'cart.html':
            // initCartPage();
            break;
        case 'login.html':
            // initLoginPage();
            break;
        case 'register.html':
            // initRegisterPage();
            break;
    }
}

/**
 * Initializes common application state on every page load.
 */
async function initApp() {
    // Initialize Animate on Scroll library
    AOS.init({
        duration: 800,
        easing: 'ease-in-out',
        once: true, // Only animate elements once
    });

    ui.updateCartCount(cart.getCartItemCount());
    document.addEventListener('cartUpdated', () => {
        ui.updateCartCount(cart.getCartItemCount());
    });

    try {
        const user = await apiService.getUserProfile();
        ui.updateUserAuthUI(user);
    } catch (error) {
        ui.updateUserAuthUI(null);
    }

    setupGlobalEventListeners();
}

/**
 * Sets up event listeners that are present on all pages.
 */
function setupGlobalEventListeners() {
    // Logout
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            apiService.logoutUser();
            ui.updateUserAuthUI(null);
            ui.showToast('You have been logged out.', 'info');
            if (window.location.pathname.endsWith('cart.html')) {
                window.location.href = 'index.html';
            }
        });
    }

    // User dropdown menu toggle
    const userMenuToggle = document.querySelector('.user-menu-toggle');
    if (userMenuToggle) {
        userMenuToggle.addEventListener('click', () => {
            const isExpanded = userMenuToggle.getAttribute('aria-expanded') === 'true';
            userMenuToggle.setAttribute('aria-expanded', !isExpanded);
        });
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (userMenuToggle.parentElement && !userMenuToggle.parentElement.contains(e.target)) {
                 userMenuToggle.setAttribute('aria-expanded', 'false');
            }
        });
    }
    
    // Mega Menu (simplified for global use)
    const megaMenuContainer = document.querySelector('.mega-menu-container');
    if (megaMenuContainer) {
        apiService.getCategories().then(categories => {
            ui.renderMegaMenu(categories);
        }).catch(err => console.error("Failed to load categories for mega menu:", err));
    }
}

/**
 * Initializes the Home page (index.html).
 */
async function initHomePage() {
    const productGrid = document.getElementById('product-grid');
    const featuredGrid = document.getElementById('featured-grid');

    if (!productGrid || !featuredGrid) return;

    ui.showSkeletonLoader(productGrid, 8);
    ui.showSkeletonLoader(featuredGrid, 3);

    try {
        allProducts = await apiService.getProducts();
        allCategories = await apiService.getCategories(); // Already fetched globally, but good to have here
        
        const featuredProducts = allProducts.slice(3, 6);
        
        ui.renderHeroSlider(); 
        
        new Swiper('.hero-slider', {
            loop: true,
            effect: 'fade',
            autoplay: {
                delay: 7000,
                disableOnInteraction: false,
            },
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
        });
        
        ui.renderFeaturedGrid(featuredProducts);
        ui.renderCategoryFilters(allCategories.filter(c => !c.parent));
        ui.renderProductGrid(allProducts, productGrid);
        
        setupHomepageEventListeners();
    } catch (error) {
        console.error("Error initializing homepage:", error);
        productGrid.innerHTML = `<p class="error-message">Failed to load products. Please try again later.</p>`;
    }
}

/**
 * Initializes the Product Detail page (product.html).
 */
async function initProductDetailPage() {
    const container = document.getElementById('product-detail-container');
    if (!container) return;

    // 1. Get product ID from the URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        container.innerHTML = `<p class="error-message">No product ID specified. Please go back to the products page.</p>`;
        return;
    }

    try {
        // 2. Fetch the product data from the API
        const product = await apiService.getProductById(productId);
        
        // 3. Render the product details using the ui module
        ui.renderProductDetail(product, container);
        
        // 4. Set up event listeners for this page
        setupProductDetailPageEventListeners(product);
    } catch (error) {
        console.error("Error fetching product details:", error);
        container.innerHTML = `<p class="error-message">Could not load product details. It might not exist or there was a server error.</p>`;
    }
}

/**
 * Sets up event listeners specific to the homepage (filters, add to cart).
 */
function setupHomepageEventListeners() {
    const filterContainer = document.querySelector('.filter-controls');
    if (filterContainer) {
        filterContainer.addEventListener('click', (e) => {
            const filterBtn = e.target.closest('.filter-btn');
            if (!filterBtn) return;
            
            filterContainer.querySelector('.active').classList.remove('active');
            filterBtn.classList.add('active');
            
            const category = filterBtn.dataset.category;
            filterProducts(category);
        });
    }

    const productGrid = document.getElementById('product-grid');
    productGrid.addEventListener('click', async e => {
        const cartBtn = e.target.closest('.add-to-cart-btn');
        if(!cartBtn) return;

        const productId = cartBtn.dataset.productId;
        const product = allProducts.find(p => p.id == productId);
        if(product) {
            cart.addToCart(product, 1);
            ui.showToast(`${product.name} added to cart!`, 'success');
        }
    });
}

/**
 * Sets up event listeners for the product detail page (image gallery, add to cart).
 * @param {object} product - The product data object.
 */
function setupProductDetailPageEventListeners(product) {
    // Image gallery thumbnail clicks
    const thumbnails = document.querySelectorAll('.thumbnail-img');
    const mainImage = document.getElementById('main-product-image');
    if (thumbnails.length > 0 && mainImage) {
        thumbnails.forEach(thumb => {
            thumb.addEventListener('click', () => {
                // Set the main image src to the clicked thumbnail's src
                mainImage.src = thumb.src;
                // Update active state
                document.querySelector('.thumbnail-img.active').classList.remove('active');
                thumb.classList.add('active');
            });
        });
    }

    // Add to cart form submission
    const addToCartForm = document.getElementById('add-to-cart-form');
    if (addToCartForm) {
        addToCartForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const quantityInput = document.getElementById('quantity');
            const quantity = parseInt(quantityInput.value, 10);
            
            if (quantity > 0) {
                cart.addToCart(product, quantity);
                ui.showToast(`${product.name} (x${quantity}) added to cart!`, 'success');
            }
        });
    }
}


/**
 * Filters products by category and re-renders the grid.
 * @param {string} categorySlug - The slug of the category to filter by.
 */
function filterProducts(categorySlug) {
    const productGrid = document.getElementById('product-grid');
    let filteredProducts;

    if (categorySlug === 'all') {
        filteredProducts = allProducts;
    } else {
        filteredProducts = allProducts.filter(p => {
            return p.category.toLowerCase().replace(/\s+/g, '-') === categorySlug;
        });
    }
    ui.renderProductGrid(filteredProducts, productGrid);
}


// --- App Entry Point ---
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    router();
});