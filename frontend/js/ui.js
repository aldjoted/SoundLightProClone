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

    swiperWrapper.innerHTML = ''; 

    images.forEach((src, index) => {
        const slide = document.createElement('div');
        slide.className = 'swiper-slide';
        const loadingAttr = index === 0 ? '' : 'loading="lazy"';
        slide.innerHTML = `
            <img src="${src}" alt="Promotional banner ${index + 1}" class="slide-bg" ${loadingAttr} />
            <div class="slide-overlay"></div>
        `;
        swiperWrapper.appendChild(slide);
    });
}

/**
 * Renders an interactive tabbed mega menu.
 * @param {Array<Object>} categories - An array of category objects from the API.
 */
export function renderMegaMenu(categories) {
    const megaMenuContainer = document.getElementById('products-mega-menu');
    if (!megaMenuContainer) return;

    const parentCategories = categories.filter(c => c.parent === null && c.children.length > 0);
    
    // 1. Construire les onglets
    const tabsHTML = parentCategories.map((parent, index) => `
        <button class="mega-menu-tab-btn ${index === 0 ? 'active' : ''}" data-target="pane-${parent.slug}">
            ${parent.name}
        </button>
    `).join('');

    // 2. Construire les panneaux de contenu
    const panesHTML = parentCategories.map((parent, index) => `
        <div id="pane-${parent.slug}" class="mega-menu-pane ${index === 0 ? 'active' : ''}">
            <div class="mega-menu-column featured">
                 <h4>${parent.name}</h4>
                 <p>${parent.description || `Explore our full range of ${parent.name}.`}</p>
                 <a href="index.html#products?category=${parent.slug}" class="btn btn-secondary">View All</a>
            </div>
            ${parent.children.map(child => `
                <div class="mega-menu-column">
                    <a href="index.html#products?category=${child.slug}">
                        <h5>${child.name}</h5>
                    </a>
                </div>
            `).join('')}
        </div>
    `).join('');

    // 3. Assembler le tout
    const megaMenuHTML = `
        <div class="mega-menu-header">
            ${tabsHTML}
        </div>
        <div class="mega-menu-content">
            ${panesHTML}
        </div>
    `;

    megaMenuContainer.innerHTML = megaMenuHTML;
}

/**
 * Helper to get the primary image URL from a product object.
 * @param {Object} product - The product object.
 * @returns {string} The URL of the first image or a placeholder.
 */
function getProductImage(product) {
    const placeholder = 'https://via.placeholder.com/400x300.png?text=No+Image';
    if (product.images && product.images.length > 0) {
        return product.images[0].image;
    }
    return placeholder;
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
            <img src="${getProductImage(product)}" alt="${product.name}" loading="lazy">
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
                <img src="${getProductImage(product)}" alt="${product.name}" loading="lazy">
                <div class="product-card-overlay">
                    <button class="btn btn-secondary quick-view-btn" data-product-id="${product.id}">
                        <i class="fas fa-eye"></i> Quick View
                    </button>
                </div>
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

/**
 * Renders a quick view modal for a product.
 * @param {Object} product - The product object to display.
 */
export function renderQuickViewModal(product) {
    const modalHTML = `
        <div class="modal-overlay" id="quick-view-overlay">
            <div class="modal-content" id="quick-view-content" role="dialog" aria-modal="true" aria-labelledby="modal-title">
                <button class="modal-close-btn" aria-label="Close quick view">&times;</button>
                <div class="product-detail-layout">
                    <div class="product-gallery">
                        <img src="${getProductImage(product)}" alt="${product.name}">
                    </div>
                    <div class="product-detail-info">
                        <h2 id="modal-title">${product.name}</h2>
                        <p class="price">$${parseFloat(product.price).toFixed(2)}</p>
                        <p>${product.description.substring(0, 150)}...</p>
                        <button class="btn btn-primary add-to-cart-modal-btn" data-product-id="${product.id}">
                            <i class="fas fa-shopping-cart"></i> Add to Cart
                        </button>
                        <a href="product.html?id=${product.id}" class="view-full-details">View full details &rarr;</a>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.classList.add('no-scroll');
}

/**
 * Renders the full product detail page.
 * @param {Object} product - The product object from the API.
 * @param {HTMLElement} container - The element to render the details into.
 */
export function renderProductDetail(product, container) {
    if (!container || !product) return;

    // Set the browser tab title
    document.title = `${product.name} - SoundLightPro`;

    const hasImages = product.images && product.images.length > 0;
    const mainImageSrc = hasImages ? product.images[0].image : 'https://via.placeholder.com/600x400.png?text=No+Image';
    
    let thumbnailsHTML = '';
    if (hasImages && product.images.length > 1) {
        thumbnailsHTML = `
            <div class="product-thumbnails">
                ${product.images.map((img, index) => `
                    <img src="${img.image}" alt="${img.alt_text || product.name}" class="thumbnail-img ${index === 0 ? 'active' : ''}" />
                `).join('')}
            </div>
        `;
    }

    const productHTML = `
        <div class="product-detail-layout">
            <div class="product-gallery">
                <div class="main-image-container">
                    <img id="main-product-image" src="${mainImageSrc}" alt="${product.name}">
                </div>
                ${thumbnailsHTML}
            </div>
            <div class="product-detail-info">
                <p class="category">${product.category}</p>
                <h1>${product.name}</h1>
                <p class="brand">Brand: <strong>${product.brand ? product.brand.name : 'N/A'}</strong></p>
                <p class="price">$${parseFloat(product.price).toFixed(2)}</p>
                <div class="description">
                    <p>${product.description || 'No description available.'}</p>
                </div>
                <form id="add-to-cart-form" class="add-to-cart-form">
                    <input type="number" id="quantity" value="1" min="1" max="${product.stock}" aria-label="Quantity">
                    <button type="submit" class="btn btn-primary" ${product.stock === 0 ? 'disabled' : ''}>
                        <i class="fas fa-shopping-cart"></i> 
                        ${product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                </form>
                <p class="stock-info">
                    ${product.stock > 0 ? `${product.stock} units available` : 'Currently out of stock'}
                </p>
            </div>
        </div>
    `;

    container.innerHTML = productHTML;
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

/**
 * Renders live search suggestions.
 * @param {Array<Object>} products - Array of matching products.
 * @param {HTMLElement} container - The container to render suggestions into.
 */
export function renderSearchSuggestions(products, container) {
    if (!container) return;

    if (products.length === 0) {
        container.innerHTML = `<p class="no-results">No products found.</p>`;
        return;
    }

    container.innerHTML = `
        <ul>
            ${products.slice(0, 5).map(product => `
                <li>
                    <a href="product.html?id=${product.id}">
                        <img src="${getProductImage(product)}" alt="${product.name}" loading="lazy">
                        <div class="suggestion-details">
                            <span class="name">${product.name}</span>
                            <span class="price">$${parseFloat(product.price).toFixed(2)}</span>
                        </div>
                    </a>
                </li>
            `).join('')}
            ${products.length > 5 ? '<li><a href="#" class="view-all-results">View all ' + products.length + ' results</a></li>' : ''}
        </ul>
    `;
}