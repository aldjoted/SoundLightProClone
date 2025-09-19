/**
 * ui.js
 *
 * This module contains all functions related to DOM manipulation. It follows security best practices
 * by avoiding innerHTML with untrusted data and uses efficient rendering techniques.
 */

import i18n from './i18n.js';

// ============= Helper Functions =============

/**
 * Escapes HTML entities to prevent XSS attacks.
 * @param {string} text - The text to escape.
 * @returns {string} The escaped text.
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Helper to get the primary image URL from a product object.
 * @param {Object} product - The product object.
 * @returns {string} The URL of the first image or a placeholder.
 */
function getProductImage(product) {
    return (product.images && product.images.length > 0)
        ? product.images[0].image
        : 'https://via.placeholder.com/400x300.png?text=No+Image';
}

/**
 * Creates a DOM element with given attributes and children.
 * @param {string} tag - The HTML tag for the element.
 * @param {object} [attributes={}] - An object of attributes to set on the element.
 * @param {(string|Node)[]} [children=[]] - An array of child nodes or strings to append.
 * @returns {HTMLElement} The created element.
 */
function isSafeUrl(url) {
    try {
        const u = new URL(url, window.location.origin);
        return ['http:', 'https:', 'data:'].includes(u.protocol);
    } catch { return false; }
}

function createElement(tag, attributes = {}, children = []) {
    const el = document.createElement(tag);
    for (const key in attributes) {
        const val = attributes[key];
        if (key === 'href' || key === 'src') {
            if (typeof val === 'string' && isSafeUrl(val)) {
                el.setAttribute(key, val);
            } else {
                // Skip unsafe URLs
                continue;
            }
        } else if (key.toLowerCase().startsWith('on')) {
            // Disallow inline event handlers
            continue;
        } else if (key === 'style' && typeof val === 'object') {
            Object.assign(el.style, val);
        } else {
            el.setAttribute(key, val);
        }
    }
    children.forEach(child => {
        if (typeof child === 'string') {
            el.appendChild(document.createTextNode(child));
        } else {
            el.appendChild(child);
        }
    });
    return el;
}

// ============= Toast & Loading UI =============

/**
 * Displays a toast notification.
 * @param {string} message - The message to display.
 * @param {'success'|'error'|'info'} [type='info'] - The type of toast.
 */
export function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const iconClass = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    }[type];

    const toast = createElement('div', { class: `toast ${type}` }, [
        createElement('i', { class: `fas ${iconClass}` }),
        createElement('span', {}, [message])
    ]);
    
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

/**
 * Renders skeleton placeholder cards for a better loading experience.
 * @param {HTMLElement} container - The grid container to fill.
 * @param {number} [count=8] - The number of skeleton cards to create.
 */
export function showSkeletonLoader(container, count = 8) {
    if (!container) return;
    container.innerHTML = ''; // Clear previous content
    for (let i = 0; i < count; i++) {
        const shimmer = createElement('div', { class: 'skeleton-shimmer' });
        const skeletonCard = createElement('div', { class: 'skeleton-card' }, [shimmer]);
        container.appendChild(skeletonCard);
    }
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
    const frag = document.createDocumentFragment();
    images.forEach((src, index) => {
        const slide = document.createElement('div');
        slide.className = 'swiper-slide';
        const img = document.createElement('img');
        img.className = 'slide-bg';
        img.alt = `Promotional banner ${index + 1}`;
        img.src = src;
        if (index > 0) img.loading = 'lazy';
        const overlay = document.createElement('div');
        overlay.className = 'slide-overlay';
        slide.appendChild(img);
        slide.appendChild(overlay);
        frag.appendChild(slide);
    });
    swiperWrapper.appendChild(frag);
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
                 <a href="index.html#products?category=${parent.slug}" class="btn btn--secondary">View All</a>
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
    
    // Set up tab switching functionality
    setupMegaMenuTabSwitching(megaMenuContainer);
}

/**
 * Sets up tab switching functionality for the mega menu.
 * @param {HTMLElement} megaMenuContainer - The mega menu container element.
 */
function setupMegaMenuTabSwitching(megaMenuContainer) {
    const tabButtons = megaMenuContainer.querySelectorAll('.mega-menu-tab-btn');
    const tabPanes = megaMenuContainer.querySelectorAll('.mega-menu-pane');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = button.dataset.target;
            
            // Remove active class from all buttons and panes
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Show the corresponding pane
            const targetPane = megaMenuContainer.querySelector(`#${targetId}`);
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });
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
            <img src="${getProductImage(product)}" alt="${escapeHtml(product.name)}" loading="lazy">
            <div class="focus-card-content">
                <h3>${escapeHtml(product.name)}</h3>
                <p>${escapeHtml(product.category)}</p>
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
 * Renders a grid of product cards using secure DOM creation methods.
 * @param {Array<Object>} products - An array of product objects.
 * @param {HTMLElement} container - The element to render the grid into.
 */
export function renderProductGrid(products, container) {
    if (!container) return;
    container.innerHTML = ''; // Clear existing content or skeletons

    if (products.length === 0) {
        container.appendChild(createElement('p', { class: 'info-message' }, [i18n.t('search_no_results')]));
        return;
    }
    
    const fragment = document.createDocumentFragment();
    products.forEach(product => {
        const card = createElement('div', { class: 'product-card card-base' }, [
            createElement('a', {
                href: `product.html?id=${product.id}`,
                class: 'product-card-image',
                'aria-label': `View details for ${escapeHtml(product.name)}`
            }, [
                createElement('img', { src: getProductImage(product), alt: escapeHtml(product.name), loading: 'lazy' }),
                createElement('div', { class: 'product-card-overlay' }, [
                    createElement('button', { class: 'btn btn--secondary quick-view-btn', 'data-product-id': product.id }, [
                        createElement('i', { class: 'fas fa-eye' }),
                        document.createTextNode(' ' + i18n.t('btn_quick_view'))
                    ])
                ])
            ]),
            createElement('div', { class: 'product-card-content' }, [
                createElement('div', {}, [
                    createElement('p', { class: 'product-card-category' }, [escapeHtml(product.category)]),
                    createElement('h3', { class: 'product-card-title' }, [
                        createElement('a', { href: `product.html?id=${product.id}` }, [escapeHtml(product.name)])
                    ])
                ]),
                createElement('div', { class: 'product-card-footer' }, [
                    createElement('p', { class: 'product-card-price' }, [i18n.formatCurrency(product.price)]),
                    createElement('button', { class: 'btn btn--secondary add-to-cart-btn', 'data-product-id': product.id }, [
                        createElement('i', { class: 'fas fa-shopping-cart' }),
                        document.createTextNode(' ' + i18n.t('btn_add_to_cart'))
                    ])
                ])
            ])
        ]);
        fragment.appendChild(card);
    });
    container.appendChild(fragment);
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
                        <p>${product.description ? product.description.substring(0, 150) + (product.description.length > 150 ? '...' : '') : 'No description available.'}</p>
                        <button class="btn btn--primary add-to-cart-modal-btn" data-product-id="${product.id}">
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
    
    // Set up event listeners for the modal
    setupQuickViewEventListeners(product);
}

/**
 * Sets up event listeners for the quick view modal.
 * @param {Object} product - The product object.
 */
function setupQuickViewEventListeners(product) {
    const overlay = document.getElementById('quick-view-overlay');
    const closeBtn = overlay.querySelector('.modal-close-btn');
    const addToCartBtn = overlay.querySelector('.add-to-cart-modal-btn');
    
    // Close modal when clicking close button
    closeBtn.addEventListener('click', closeQuickViewModal);
    
    // Close modal when clicking overlay background
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeQuickViewModal();
        }
    });
    
    // Close modal when pressing Escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeQuickViewModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Handle add to cart from modal
    addToCartBtn.addEventListener('click', async () => {
        try {
            // Dynamically import cart module to avoid circular dependencies
            const cart = await import('./cart.js');
            cart.addToCart(product, 1);
            showToast(`${product.name} added to cart!`, 'success');
            
            // Update button state temporarily
            addToCartBtn.disabled = true;
            addToCartBtn.innerHTML = `<i class="fas fa-check"></i> Added`;
            setTimeout(() => {
                addToCartBtn.disabled = false;
                addToCartBtn.innerHTML = `<i class="fas fa-shopping-cart"></i> Add to Cart`;
            }, 1500);
            
            // Update cart count and mini cart
            updateCartCount(cart.getCartItemCount());
            renderMiniCart(cart.getCart());
        } catch (error) {
            console.error('Error adding product to cart:', error);
            showToast('Failed to add product to cart.', 'error');
        }
    });
}

/**
 * Closes the quick view modal.
 */
function closeQuickViewModal() {
    const overlay = document.getElementById('quick-view-overlay');
    if (overlay) {
        overlay.remove();
        document.body.classList.remove('no-scroll');
    }
}

/**
 * Renders the full product detail page.
 * @param {Object} product - The product object from the API.
 * @param {HTMLElement} container - The element to render the details into.
 */
export function renderProductDetail(product, container) {
    if (!container || !product) return;

    // Set the browser tab title
    document.title = `${escapeHtml(product.name)} - SoundLightPro`;

    const hasImages = product.images && product.images.length > 0;
    const mainImageSrc = hasImages ? product.images[0].image : 'https://via.placeholder.com/600x400.png?text=No+Image';
    
    let thumbnailsHTML = '';
    if (hasImages && product.images.length > 1) {
        thumbnailsHTML = `
            <div class="product-thumbnails">
                ${product.images.map((img, index) => `
                    <img src="${img.image}" alt="${escapeHtml(img.alt_text || product.name)}" class="thumbnail-img ${index === 0 ? 'active' : ''}" />
                `).join('')}
            </div>
        `;
    }

    const productHTML = `
        <div class="product-detail-layout">
            <div class="product-gallery">
                <div class="main-image-container">
                    <img id="main-product-image" src="${mainImageSrc}" alt="${escapeHtml(product.name)}">
                </div>
                ${thumbnailsHTML}
            </div>
            <div class="product-detail-info">
                <p class="category">${escapeHtml(product.category)}</p>
                <h1>${escapeHtml(product.name)}</h1>
                <p class="brand">Brand: <strong>${product.brand ? escapeHtml(product.brand.name) : 'N/A'}</strong></p>
                <p class="price">$${parseFloat(product.price).toFixed(2)}</p>
                <div class="description">
                    <p>${escapeHtml(product.description || 'No description available.')}</p>
                </div>
                <form id="add-to-cart-form" class="add-to-cart-form">
                    <input type="number" id="quantity" value="1" min="1" max="${product.stock}" aria-label="Quantity">
                    <button type="submit" class="btn btn--primary btn--full-width" ${product.stock === 0 ? 'disabled' : ''}>
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

    // Sticky CTA (mobile)
    const sticky = document.createElement('div');
    sticky.className = 'sticky-cta';
    sticky.id = 'sticky-cta';
    sticky.innerHTML = `
        <p class="price">$${parseFloat(product.price).toFixed(2)}</p>
        <input type="number" class="qty" id="sticky-qty" value="1" min="1" max="${product.stock || 1}" aria-label="Quantity">
        <button class="btn btn--primary btn--full-width" id="sticky-add" ${product.stock === 0 ? 'disabled' : ''}>
            <i class="fas fa-shopping-cart"></i> ${product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
        </button>
    `;
    document.body.appendChild(sticky);
}

// ============= Mini Cart Drawer =============
/**
 * Renders and opens the mini-cart drawer using secure DOM methods.
 * @param {Array<Object>} items - Cart items.
 */
export function renderMiniCart(items = []) {
    document.getElementById('mini-cart-overlay')?.remove();

    const total = items.reduce((t, i) => t + i.price * i.quantity, 0);

    const content = items.length === 0
        ? [createElement('div', { class: 'mini-cart-empty' }, [
              createElement('i', { class: 'fas fa-shopping-cart', style: 'font-size:2rem;' }),
              createElement('p', {}, ['Your cart is empty.'])
          ])]
        : items.map(i =>
              createElement('div', { class: 'mini-cart-item', 'data-id': i.id }, [
                  createElement('img', { class: 'mini-cart-thumb', src: i.image || 'https://via.placeholder.com/64', alt: i.name }),
                  createElement('div', {}, [
                      createElement('p', { class: 'mini-cart-name' }, [i.name]),
                      createElement('p', { class: 'mini-cart-meta' }, [`$${i.price.toFixed(2)} • Qty: ${i.quantity}`]),
                  ]),
                  createElement('button', { class: 'mini-cart-remove', title: 'Remove' }, [
                      createElement('i', { class: 'fas fa-trash' })
                  ])
              ])
          );

    const overlay = createElement('div', { id: 'mini-cart-overlay', class: 'mini-cart-overlay active' }, [
        createElement('aside', { class: 'mini-cart-drawer', role: 'dialog', 'aria-label': 'Mini cart' }, [
            createElement('div', { class: 'mini-cart-header' }, [
                createElement('h3', { class: 'mini-cart-title' }, ['Added to Cart']),
                createElement('button', { class: 'mini-cart-close', 'aria-label': 'Close mini cart' }, [
                    createElement('i', { class: 'fas fa-times' })
                ])
            ]),
            createElement('div', { class: 'mini-cart-content' }, content),
            createElement('div', { class: 'mini-cart-footer' }, [
                createElement('div', { class: 'mini-cart-row' }, [
                    createElement('span', {}, ['Subtotal']),
                    createElement('strong', {}, [`$${total.toFixed(2)}`])
                ]),
                createElement('div', { class: 'mini-cart-actions' }, [
                    createElement('a', { href: 'cart.html', class: 'btn btn--secondary' }, ['View Cart']),
                    createElement('a', { href: 'cart.html#checkout', class: 'btn btn--primary' }, ['Checkout'])
                ])
            ])
        ])
    ]);
    
    document.body.appendChild(overlay);
    document.body.classList.add('no-scroll');

    // Add event listeners after appending
    const drawer = overlay.querySelector('.mini-cart-drawer');
    drawer.addEventListener('click', (e) => {
        if (e.target.closest('.mini-cart-close')) closeMiniCart();
        const removeBtn = e.target.closest('.mini-cart-remove');
        if (removeBtn) {
            import('./cart.js').then(cart => {
                cart.removeFromCart(parseInt(removeBtn.closest('.mini-cart-item').dataset.id, 10));
                // Re-render instead of just removing the node to update total
                renderMiniCart(cart.getCart());
            });
        }
    });
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeMiniCart();
    });
}

export function closeMiniCart() {
    const overlay = document.getElementById('mini-cart-overlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 250);
    document.body.classList.remove('no-scroll');
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
 * Renders live search suggestions (keyboard-friendly).
 * @param {Array<Object>} products - Array of matching products.
 * @param {HTMLElement} container - The container to render suggestions into.
 */
export function renderSearchSuggestions(products, container) {
    if (!container) return;
    container.classList.add('search-suggestions-container');
    if (products.length === 0) {
        container.innerHTML = `<div class="search-no-results"><i class="far fa-frown"></i><p>No products found.</p></div>`;
        container.classList.remove('hidden');
        return;
    }
    container.innerHTML = `
        <ul role="listbox">
            ${products.slice(0, 8).map((p, idx) => `
                <li class="search-result-item ${idx===0?'highlighted':''}" role="option" data-index="${idx}">
                    <a class="result-link" href="product.html?id=${p.id}">
                        <img class="search-thumb" src="${getProductImage(p)}" alt="${escapeHtml(p.name)}" loading="lazy">
                        <div class="result-details">
                            <span class="search-name">${escapeHtml(p.name)}</span>
                            <span class="search-price">$${parseFloat(p.price).toFixed(2)}</span>
                        </div>
                    </a>
                    <div class="result-actions">
                        <button class="quick-add-btn"
                            aria-label="Quick add ${escapeHtml(p.name)}"
                            data-id="${p.id}"
                            data-name="${escapeHtml(p.name)}"
                            data-price="${parseFloat(p.price)}"
                            data-image="${getProductImage(p)}">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </li>
            `).join('')}
        </ul>
    `;
    container.classList.remove('hidden');
}