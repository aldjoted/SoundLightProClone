/**
 * ui.js
 * 
 * This module contains all functions related to DOM manipulation, including
 * rendering components, handling UI states (loading, errors), and managing notifications.
 */

// ============= Toast Notification Utility =============
const toastContainer = document.getElementById('toast-container');

/**
 * Displays a toast notification.
 * @param {string} message - The message to display.
 * @param {string} type - 'success', 'error', or 'info'.
 */
export function showToast(message, type = 'info') {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    if (type === 'error') iconClass = 'fa-exclamation-circle';

    toast.innerHTML = `<i class="fas ${iconClass}"></i><span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// ============= Loading State Utilities =============
/**
 * Renders skeleton placeholder cards for a better loading experience.
 * @param {HTMLElement} container - The grid container to fill.
 * @param {number} count - The number of skeleton cards to create.
 */
export function showSkeletonLoader(container, count = 8) {
    if (!container) return;
    let skeletons = '';
    for (let i = 0; i < count; i++) {
        skeletons += '<div class="skeleton-card"><div class="skeleton-shimmer"></div></div>';
    }
    container.innerHTML = skeletons;
}

// ============= Component Rendering =============

/**
 * Renders the hero slider slides for Swiper.js using static banner images.
 * @param {Array<Object>} _unused
 */
export function renderHeroSlider(_unused = []) {
    const swiperWrapper = document.querySelector('.swiper-wrapper');
    if (!swiperWrapper) return;

    // List of images from your folder structure
    const images = [
        'images/hero/soundlightpro-banner-home1.jpg',
        'images/hero/soundlightpro-banner-home2.jpg',
        'images/hero/soundlightpro-banner-home22.jpg',
        'images/hero/soundlightpro-banner-home2222.jpg',
        'images/hero/soundlightpro-banner-home3.jpg',
        'images/hero/soundlightpro-banner-home4.jpg',
        'images/hero/soundlightpro-banner-home6.jpg',
        'images/hero/MYO-ACOUSTIC-SOUNDLIGHTPRO.png'
    ];

    swiperWrapper.innerHTML = ''; // Clear existing content (like skeletons)

    images.forEach((src, index) => {
        const slide = document.createElement('div');
        slide.className = 'swiper-slide';
        // Performance: Don't lazy load the first image as it's above the fold.
        const loadingAttr = index === 0 ? '' : 'loading="lazy"';
        slide.innerHTML = `
            <img src="${src}" alt="Promotional banner ${index + 1}" class="slide-bg" ${loadingAttr} />
            <div class="slide-overlay"></div>
        `;
        swiperWrapper.appendChild(slide);
    });
}

/**
 * Renders the content for the products mega menu.
 * @param {Array<Object>} categories - An array of category objects from the API.
 */
export function renderMegaMenu(categories) {
    const familyContainer = document.getElementById('mega-menu-family-content');
    const featuresContainer = document.getElementById('mega-menu-features-content');
    if (!familyContainer || !featuresContainer) return;

    // --- Render "By Family" View ---
    const parentCategories = categories.filter(c => c.parent === null);
    let familyHTML = '';
    parentCategories.forEach(parent => {
        const childCategories = categories.filter(c => c.parent === parent.id);
        familyHTML += `
            <div class="mega-menu-column">
                <h4>${parent.name}</h4>
                <ul>
                    ${childCategories.map(child => `<li><a href="index.html#products?category=${child.slug}">${child.name}</a></li>`).join('')}
                </ul>
            </div>
        `;
    });
    familyContainer.innerHTML = familyHTML || '<p>No categories found.</p>';

    // --- Render "By Features" View ---
    // This view displays the main parent categories as clickable items
    let featuresHTML = parentCategories.map(parent => `
        <div class="mega-menu-column">
            <a href="index.html#products?category=${parent.slug}">
                <h4>${parent.name}</h4>
                <!-- Optionally add an image here -->
            </a>
        </div>
    `).join('');
    featuresContainer.innerHTML = featuresHTML || '<p>No features found.</p>';
}


/**
 * Renders the featured focus grid on the homepage.
 * @param {Array<Object>} products - An array of product objects to feature.
 */
export function renderFeaturedGrid(products) {
    const grid = document.getElementById('featured-grid');
    if (!grid) return;

    grid.innerHTML = products.map(product => `
        <a href="product.html?id=${product.id}" class="focus-card">
            <img src="${product.image || 'https://via.placeholder.com/600x400'}" alt="${product.name}" loading="lazy">
            <div class="focus-card-content">
                <h3>${product.name}</h3>
                <p>${product.category}</p>
            </div>
        </a>
    `).join('');
}

/**
 * Renders category filter buttons.
 * @param {Array<Object>} categories - Array of category objects.
 */
export function renderCategoryFilters(categories) {
    const filterContainer = document.querySelector('.filter-controls');
    if(!filterContainer) return;

    let buttonsHTML = '<button class="filter-btn active" data-category="all">All</button>';
    categories.forEach(category => {
        buttonsHTML += `<button class="filter-btn" data-category="${category.slug}">${category.name}</button>`;
    });
    filterContainer.innerHTML = buttonsHTML;
}

/**
 * Renders a grid of product cards.
 * @param {Array<Object>} products - An array of product objects from the API.
 * @param {HTMLElement} container - The element to render the grid into.
 */
export function renderProductGrid(products, container) {
    if (!container) return;

    if (products.length === 0) {
        container.innerHTML = '<p class="info-message">No products found matching your criteria.</p>';
        return;
    }

    container.innerHTML = products.map(product => `
        <div class="product-card">
            <a href="product.html?id=${product.id}" class="product-card-image" aria-label="View details for ${product.name}">
                <img src="${product.image ? product.image : 'https://via.placeholder.com/300'}" alt="${product.name}" loading="lazy">
            </a>
            <div class="product-card-content">
                <div>
                    <p class="product-card-category">${product.category}</p>
                    <h3 class="product-card-title"><a href="product.html?id=${product.id}">${product.name}</a></h3>
                </div>
                <div class="product-card-footer">
                    <p class="product-card-price">$${parseFloat(product.price).toFixed(2)}</p>
                    <button class="btn btn-secondary add-to-cart-btn" data-product-id="${product.id}">
                        <i class="fas fa-shopping-cart"></i> Add
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}


// ============= UI State Management =============

/**
 * Updates the cart item count displayed in the header.
 * @param {number} count - The number of items in the cart.
 */
export function updateCartCount(count) {
    const cartCountElement = document.getElementById('cart-item-count');
    if (cartCountElement) {
        cartCountElement.textContent = count;
        cartCountElement.classList.toggle('hidden', count === 0);
    }
}

/**
 * Updates the header UI based on the user's login status.
 * @param {Object|null} user - The user object, or null if logged out.
 */
export function updateUserAuthUI(user) {
    const authLinks = document.getElementById('auth-links');
    const userInfo = document.getElementById('user-info');
    const usernameDisplay = document.getElementById('username-display');
    const userMenuToggle = document.querySelector('.user-menu-toggle');

    if (authLinks && userInfo && usernameDisplay) {
        if (user) {
            authLinks.classList.add('hidden');
            userInfo.classList.remove('hidden');
            usernameDisplay.textContent = user.username;
            userMenuToggle.setAttribute('aria-expanded', 'false');
        } else {
            authLinks.classList.remove('hidden');
            userInfo.classList.add('hidden');
        }
    }
}