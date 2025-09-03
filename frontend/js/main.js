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
            // initProductDetailPage();
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
            if (!userMenuToggle.parentElement.contains(e.target)) {
                 userMenuToggle.setAttribute('aria-expanded', 'false');
            }
        });
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
        // Fetch products and categories in parallel
        [allProducts, allCategories] = await Promise.all([
            apiService.getProducts(),
            apiService.getCategories()
        ]);
        
        // --- Populate UI components ---
        const sliderProducts = allProducts.slice(0, 3);
        const featuredProducts = allProducts.slice(3, 6);
        
        ui.renderHeroSlider(sliderProducts);
        initSlider();
        
        ui.renderFeaturedGrid(featuredProducts);
        ui.renderCategoryFilters(allCategories.filter(c => !c.parent)); // Only top-level categories
        ui.renderProductGrid(allProducts, productGrid);
        
        setupHomepageEventListeners();
    } catch (error) {
        console.error("Error initializing homepage:", error);
        productGrid.innerHTML = `<p class="error-message">Failed to load products. Please try again later.</p>`;
    }
}

/**
 * Sets up event listeners specific to the homepage (filters, add to cart).
 */
function setupHomepageEventListeners() {
    // Product category filtering
    const filterContainer = document.querySelector('.filter-controls');
    if (filterContainer) {
        filterContainer.addEventListener('click', (e) => {
            const filterBtn = e.target.closest('.filter-btn');
            if (!filterBtn) return;
            
            // Update active button style
            filterContainer.querySelector('.active').classList.remove('active');
            filterBtn.classList.add('active');
            
            const category = filterBtn.dataset.category;
            filterProducts(category);
        });
    }

    // Add to cart from product grid (event delegation)
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
 * Filters products by category and re-renders the grid.
 * @param {string} categorySlug - The slug of the category to filter by.
 */
function filterProducts(categorySlug) {
    const productGrid = document.getElementById('product-grid');
    let filteredProducts;

    if (categorySlug === 'all') {
        filteredProducts = allProducts;
    } else {
        // This simple filter works for top-level categories.
        // For nested categories, a more complex recursive function would be needed.
        filteredProducts = allProducts.filter(p => {
            // Normalize category name from API to match slug
            return p.category.toLowerCase().replace(/\s+/g, '-') === categorySlug;
        });
    }
    ui.renderProductGrid(filteredProducts, productGrid);
}

/**
 * Initializes and controls the hero slider functionality.
 */
function initSlider() {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    const nextBtn = document.querySelector('.slider-control.next');
    const prevBtn = document.querySelector('.slider-control.prev');

    // Guard clause: If there's 1 or 0 slides, hide controls and stop.
    if (slides.length <= 1) {
        if(nextBtn) nextBtn.style.display = 'none';
        if(prevBtn) prevBtn.style.display = 'none';
        if(dots.length > 0) dots[0].parentElement.style.display = 'none';
        return;
    }

    let currentSlide = 0;
    let slideInterval = setInterval(nextSlide, 7000); // Auto-play every 7 seconds

    function goToSlide(n) {
        // Deactivate current slide and dot
        slides[currentSlide].classList.remove('active');
        dots[currentSlide].classList.remove('active');
        dots[currentSlide].setAttribute('aria-selected', 'false');
        
        // Calculate next slide index, wrapping around if necessary
        currentSlide = (n + slides.length) % slides.length;
        
        // Activate new slide and dot
        slides[currentSlide].classList.add('active');
        dots[currentSlide].classList.add('active');
        dots[currentSlide].setAttribute('aria-selected', 'true');
    }

    function nextSlide() {
        goToSlide(currentSlide + 1);
    }

    function prevSlide() {
        goToSlide(currentSlide - 1);
    }

    // Resets the auto-play timer whenever the user interacts with the slider
    function resetInterval() {
        clearInterval(slideInterval);
        slideInterval = setInterval(nextSlide, 7000);
    }

    // Event Listeners
    nextBtn.addEventListener('click', () => {
        nextSlide();
        resetInterval();
    });

    prevBtn.addEventListener('click', () => {
        prevSlide();
        resetInterval();
    });

    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            goToSlide(parseInt(dot.dataset.index));
            resetInterval();
        });
    });
}


// --- App Entry Point ---
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    router();
});