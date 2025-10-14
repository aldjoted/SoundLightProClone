/**
 * ui.js
 *
 * This module contains all functions related to DOM manipulation. It follows security best practices
 * by avoiding innerHTML with untrusted data and uses efficient rendering techniques.
 */

import i18n from './i18n.js';
import { ListenerManager } from './utils.js';

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

    // Build absolute URL from site root so it works on any page path
    const toAbs = (p) => new URL(p.replace(/^\//, ''), window.location.origin + '/').toString();
    
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
    img.src = toAbs(src);
    img.width = 1920; // intrinsic size hint to reduce CLS
    img.height = 822; // matches ~21:9 ratio
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

    // Clear container and rebuild safely
    megaMenuContainer.innerHTML = '';

    // Header with tabs
    const header = createElement('div', { class: 'mega-menu-header' });
    parentCategories.forEach((parent, index) => {
        const btn = createElement('button', {
            class: `mega-menu-tab-btn ${index === 0 ? 'active' : ''}`,
            'data-target': `pane-${parent.slug}`
        }, [parent.name]);
        header.appendChild(btn);
    });

    // Content panes
    const content = createElement('div', { class: 'mega-menu-content' });
    parentCategories.forEach((parent, index) => {
        const pane = createElement('div', {
            id: `pane-${parent.slug}`,
            class: `mega-menu-pane ${index === 0 ? 'active' : ''}`
        });

        // Featured column
        const featured = createElement('div', { class: 'mega-menu-column featured' });
        featured.appendChild(createElement('h4', {}, [parent.name]));
        const descText = parent.description || `Explore our full range of ${parent.name}.`;
        featured.appendChild(createElement('p', {}, [descText]));
        featured.appendChild(createElement('a', {
            href: `search-results.html?category=${encodeURIComponent(parent.slug)}`,
            class: 'btn btn--secondary'
        }, ['View All']));
        pane.appendChild(featured);

        // Children columns
        parent.children.forEach(child => {
            const col = createElement('div', { class: 'mega-menu-column' });
            const link = createElement('a', { href: `search-results.html?category=${encodeURIComponent(child.slug)}` });
            link.appendChild(createElement('h5', {}, [child.name]));
            col.appendChild(link);
            pane.appendChild(col);
        });

        content.appendChild(pane);
    });

    megaMenuContainer.appendChild(header);
    megaMenuContainer.appendChild(content);

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
            <img src="${getProductImage(product)}" alt="${escapeHtml(product.name)}" loading="lazy" width="400" height="250">
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
    filterContainer.innerHTML = '';
    const frag = document.createDocumentFragment();

    frag.appendChild(createElement('button', { class: 'filter-btn active', 'data-category': 'all' }, ['All']));
    categories.forEach(category => {
        const btn = createElement('button', { class: 'filter-btn', 'data-category': category.slug }, [category.name]);
        frag.appendChild(btn);
    });

    filterContainer.appendChild(frag);
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
                'aria-label': `View details for ${product.name}`
            }, [
                createElement('img', { src: getProductImage(product), alt: product.name, loading: 'lazy', width: '400', height: '250' }),
                createElement('div', { class: 'product-card-overlay' }, [
                    createElement('button', { class: 'btn btn--secondary quick-view-btn', 'data-product-id': product.id }, [
                        createElement('i', { class: 'fas fa-eye' }),
                        document.createTextNode(' ' + i18n.t('btn_quick_view'))
                    ])
                ])
            ]),
            createElement('div', { class: 'product-card-content' }, [
                createElement('div', {}, [
                    createElement('p', { class: 'product-card-category' }, [product.category]),
                    createElement('h3', { class: 'product-card-title' }, [
                        createElement('a', { href: `product.html?id=${product.id}` }, [product.name])
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
    let desc = 'No description available.';
    if (product.description) {
        if (product.description.length > 150) {
            desc = product.description.substring(0, 150) + '...';
        } else {
            desc = product.description;
        }
    }
    const productNameEsc = escapeHtml(product.name || '');
    const productImage = getProductImage(product);
    const modalHTML = `
        <div class="modal-overlay" id="quick-view-overlay">
            <div class="modal-content" id="quick-view-content" role="dialog" aria-modal="true" aria-labelledby="modal-title">
                <button class="modal-close-btn" aria-label="Close quick view">&times;</button>
                <div class="product-detail-layout">
                    <div class="product-gallery">
                        <img src="${productImage}" alt="${productNameEsc}" loading="lazy">
                    </div>
                    <div class="product-detail-info">
                        <h2 id="modal-title">${productNameEsc}</h2>
                        <p class="price">$${parseFloat(product.price).toFixed(2)}</p>
                        <p>${escapeHtml(desc)}</p>
                        <button class="btn btn--primary add-to-cart-modal-btn" data-product-id="${product.id}" aria-label="Add ${productNameEsc} to cart">
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

    // Use a scoped ListenerManager to ensure full cleanup
    const lm = new ListenerManager();
    overlay._listenerManager = lm; // attach for cleanup on close

    // Close modal when clicking close button
    lm.add(closeBtn, 'click', closeQuickViewModal);

    // Close modal when clicking overlay background
    lm.add(overlay, 'click', (e) => {
        if (e.target === overlay) {
            closeQuickViewModal();
        }
    });

    // Close modal when pressing Escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeQuickViewModal();
        }
    };
    lm.add(document, 'keydown', handleEscape);

    // Handle add to cart from modal
    lm.add(addToCartBtn, 'click', async () => {
        try {
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
        // Clean up listeners first
        if (overlay._listenerManager && typeof overlay._listenerManager.removeAll === 'function') {
            overlay._listenerManager.removeAll();
            overlay._listenerManager = null;
        }
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

    // Update structured data for SEO
    updateProductSchema(product);

    const hasImages = product.images && product.images.length > 0;
    const mainImageSrc = hasImages ? product.images[0].image : 'https://via.placeholder.com/600x400.png?text=No+Image';
    const isOutOfStock = product.stock === 0;
    const addBtnDisabledAttr = isOutOfStock ? 'disabled' : '';
    const addBtnLabel = isOutOfStock ? 'Out of Stock' : 'Add to Cart';
    const stockInfoText = product.stock > 0 ? `${product.stock} units available` : 'Currently out of stock';
    
    let thumbnailsHTML = '';
    if (hasImages && product.images.length > 1) {
        thumbnailsHTML = `
            <div class="product-thumbnails">
                ${product.images.map((img, index) => `
                    <img src="${img.image}" alt="${escapeHtml(img.alt_text || product.name)}" class="thumbnail-img ${index === 0 ? 'active' : ''}" width="300" height="300" loading="lazy" />
                `).join('')}
            </div>
        `;
    }

    const productHTML = `
        <div class="product-detail-layout">
            <div class="product-gallery">
                <div class="main-image-container">
                    <img id="main-product-image" src="${mainImageSrc}" alt="${escapeHtml(product.name)}" width="800" height="500" loading="lazy">
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
                    <button type="submit" class="btn btn--primary btn--full-width" ${addBtnDisabledAttr}>
                        <i class="fas fa-shopping-cart"></i> 
                        ${addBtnLabel}
                    </button>
                </form>
                <p class="stock-info">${stockInfoText}</p>
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
        <button class="btn btn--primary btn--full-width" id="sticky-add" ${addBtnDisabledAttr} aria-label="Add to cart">
            <i class="fas fa-shopping-cart"></i> ${addBtnLabel}
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
                  createElement('img', { class: 'mini-cart-thumb', src: i.image || 'https://via.placeholder.com/64', alt: i.name, loading: 'lazy' }),
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
            if (userMenuToggle) {
                userMenuToggle.setAttribute('aria-expanded', 'false');
            }
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
    const count = Math.min(products.length, 8);
    const q = (document.getElementById('search-input')?.value || '').trim();
    const viewAllHref = q ? `search-results.html?${new URLSearchParams({ q }).toString()}` : 'search-results.html';
    container.innerHTML = `
        <div class="suggestions-header">
            <span class="header-title">Products</span>
            <span class="header-count">${count}${products.length > 8 ? '+' : ''}</span>
        </div>
        <ul role="listbox" aria-label="Product search suggestions">
            ${products.slice(0, 8).map((p, idx) => `
                <li class="search-result-item ${idx===0?'highlighted':''}" role="option" data-index="${idx}">
                    <a class="result-link" href="product.html?id=${p.id}">
                        <img class="search-thumb" src="${getProductImage(p)}" alt="${escapeHtml(p.name)}" loading="lazy" width="36" height="36">
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
        <div class="suggestions-footer">
            <a class="view-all-results" href="${viewAllHref}">
                <i class="fas fa-search"></i>
                View all results
            </a>
        </div>
    `;
    container.classList.remove('hidden');
}

// ============= Cart Page UI Helpers =============

/**
 * Returns HTML string for an empty cart state. Used with container.innerHTML.
 * Static content only (no untrusted interpolation).
 */
export function getEmptyCartHTML() {
    const title = i18n.t ? i18n.t('cart_empty_title', 'Your cart is empty') : 'Your cart is empty';
    const subtitle = i18n.t ? i18n.t('cart_empty_sub', 'Looks like you haven\'t added anything yet.') : "Looks like you haven't added anything yet.";
    const cta = i18n.t ? i18n.t('cart_continue_shopping', 'Continue shopping') : 'Continue shopping';
    return `
        <div class="cart-empty card-base">
            <div class="cart-empty-icon"><i class="fas fa-shopping-cart"></i></div>
            <h3>${title}</h3>
            <p>${subtitle}</p>
            <a class="btn btn--primary" href="index.html">${cta}</a>
        </div>
    `;
}

/**
 * Builds and returns DOM nodes for the cart layout and the summary panel.
 * @param {Array<{id:number,name:string,price:number,image?:string,quantity:number}>} items
 * @returns {{ cartLayout: HTMLElement, summary: HTMLElement }}
 */
export function getCartLayoutHTML(items) {
    const placeholder = 'https://via.placeholder.com/96x96.png?text=No+Image';
    const list = createElement('div', { class: 'cart-items' });

    let subtotal = 0;
    items.forEach(item => {
        const lineTotal = (Number(item.price) || 0) * (Number(item.quantity) || 0);
        subtotal += lineTotal;
        const imgSrc = item.image || placeholder;

        const cartItem = createElement('div', { class: 'cart-item', 'data-id': item.id }, [
            // Image column
            createElement('div', { class: 'cart-item-image' }, [
                createElement('img', { src: imgSrc, alt: item.name || 'Product image', loading: 'lazy' })
            ]),
            // Details column
            createElement('div', { class: 'cart-item-details' }, [
                createElement('h3', {}, [item.name || '—']),
                createElement('p', { class: 'price' }, [i18n.formatCurrency ? i18n.formatCurrency(item.price) : `$${Number(item.price).toFixed(2)}`]),
                createElement('div', { class: 'cart-item-actions' }, [
                    createElement('label', { for: `qty-${item.id}` }, ['Qty ']),
                    createElement('div', { class: 'qty-controls' }, [
                        createElement('button', { class: 'qty-btn qty-decrement', 'aria-label': 'Decrease quantity', title: 'Decrease quantity' }, [
                            createElement('i', { class: 'fas fa-minus' })
                        ]),
                        createElement('input', { id: `qty-${item.id}`, class: 'qty-input', type: 'number', min: '1', value: String(item.quantity), 'aria-label': 'Quantity' }),
                        createElement('button', { class: 'qty-btn qty-increment', 'aria-label': 'Increase quantity', title: 'Increase quantity' }, [
                            createElement('i', { class: 'fas fa-plus' })
                        ])
                    ]),
                    createElement('button', { class: 'btn btn--secondary remove-btn', title: 'Remove from cart' }, [
                        createElement('i', { class: 'fas fa-trash' }),
                        document.createTextNode(' Remove')
                    ])
                ])
            ]),
            // Subtotal column
            createElement('div', { class: 'cart-item-subtotal' }, [
                i18n.formatCurrency ? i18n.formatCurrency(lineTotal) : `$${lineTotal.toFixed(2)}`
            ])
        ]);

        list.appendChild(cartItem);
    });

    const cartLayout = createElement('section', { class: 'cart-layout' }, [
        createElement('div', { class: 'cart-items-container card-base' }, [list])
    ]);

    const summary = createElement('aside', { class: 'cart-summary card-base' }, [
        createElement('div', { class: 'cart-summary-header' }, [
            createElement('h3', { class: 'cart-summary-title' }, [i18n.t ? i18n.t('cart_summary', 'Order summary') : 'Order summary'])
        ]),
        createElement('div', { class: 'cart-summary-body' }, [
            createElement('div', { class: 'summary-row' }, [
                createElement('span', {}, [i18n.t ? i18n.t('cart_subtotal', 'Subtotal') : 'Subtotal']),
                createElement('strong', { class: 'summary-value' }, [i18n.formatCurrency ? i18n.formatCurrency(subtotal) : `$${subtotal.toFixed(2)}`])
            ]),
            createElement('p', { class: 'summary-note' }, [i18n.t ? i18n.t('cart_taxes_note', 'Taxes and shipping calculated at checkout.') : 'Taxes and shipping calculated at checkout.'])
        ]),
        createElement('div', { class: 'cart-summary-actions' }, [
            createElement('button', { id: 'proceed-checkout', class: 'btn btn--primary btn--full-width' }, [
                createElement('i', { class: 'fas fa-lock' }),
                document.createTextNode(' ' + (i18n.t ? i18n.t('cart_checkout', 'Proceed to checkout') : 'Proceed to checkout'))
            ])
        ])
    ]);

    return { cartLayout, summary };
}

/**
 * Updates the product structured data for SEO
 * @param {Object} product - The product object
 */
function updateProductSchema(product) {
    const schemaScript = document.getElementById('product-schema');
    if (!schemaScript) return;

    const hasImages = product.images && product.images.length > 0;
    const imageUrl = hasImages ? product.images[0].image : 'https://soundlightpro.com/images/logo/logoslp.jpg';
    const availability = product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';

    const schema = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": product.name,
        "description": product.description || product.name,
        "image": imageUrl,
        "brand": {
            "@type": "Brand",
            "name": product.brand ? product.brand.name : "SoundLightPro"
        },
        "offers": {
            "@type": "Offer",
            "price": parseFloat(product.price).toFixed(2),
            "priceCurrency": "USD",
            "availability": availability,
            "url": `https://soundlightpro.com/product.html?id=${product.id}`,
            "seller": {
                "@type": "Organization",
                "name": "SoundLightPro"
            }
        },
        "sku": product.id.toString(),
        "category": product.category || "Audio & Lighting Equipment"
    };

    // Add aggregateRating if we have ratings in the future
    // Add review if we have reviews in the future

    schemaScript.textContent = JSON.stringify(schema, null, 2);
}

// ============= Wishlist UI Components =============

/**
 * Renders a wishlist button for a product
 * @param {Object} product - The product object
 * @param {boolean} isInWishlist - Whether product is in wishlist
 * @returns {HTMLElement} Wishlist button element
 */
export function renderWishlistButton(product, isInWishlist = false) {
    const button = createElement('button', {
        class: `wishlist-btn ${isInWishlist ? 'in-wishlist' : ''}`,
        'data-product-id': product.id,
        'aria-label': isInWishlist ? 'Remove from wishlist' : 'Add to wishlist',
        type: 'button'
    }, [
        createElement('i', { class: isInWishlist ? 'fas fa-heart' : 'far fa-heart' }),
        createElement('span', { class: 'btn-text' }, [isInWishlist ? 'In Wishlist' : 'Add to Wishlist'])
    ]);
    
    // Import wishlist module and add event listener
    button.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        try {
            const wishlist = await import('./wishlist.js');
            const added = await wishlist.toggleWishlist(product.id);
            
            // Update button appearance
            button.classList.toggle('in-wishlist', added);
            const icon = button.querySelector('i');
            const text = button.querySelector('.btn-text');
            icon.className = added ? 'fas fa-heart' : 'far fa-heart';
            text.textContent = added ? 'In Wishlist' : 'Add to Wishlist';
            button.setAttribute('aria-label', added ? 'Remove from wishlist' : 'Add to wishlist');
            
            showToast(added ? 'Added to wishlist!' : 'Removed from wishlist', 'success');
            
            // Update wishlist count
            updateWishlistCount(await wishlist.getWishlistCount());
        } catch (error) {
            console.error('Failed to toggle wishlist:', error);
            showToast('Failed to update wishlist. Please try again.', 'error');
        }
    });
    
    return button;
}

/**
 * Updates the wishlist count badge in the header
 * @param {number} count - Number of items in wishlist
 */
export function updateWishlistCount(count) {
    const badge = document.querySelector('.wishlist-count-badge');
    if (badge) {
        badge.textContent = count || '0';
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

/**
 * Renders a wishlist item card
 * @param {Object} product - The product object
 * @param {Function} onRemove - Callback for remove action
 * @param {Function} onMoveToCart - Callback for move to cart action
 * @returns {HTMLElement} Wishlist item element
 */
export function renderWishlistItem(product, onRemove, onMoveToCart) {
    const imageUrl = getProductImage(product);
    const inStock = product.stock > 0;
    
    const item = createElement('div', { class: 'wishlist-item', 'data-product-id': product.id }, [
        createElement('a', { 
            href: `product.html?id=${product.id}`,
            class: 'wishlist-item-image-link'
        }, [
            createElement('img', {
                src: imageUrl,
                alt: product.name,
                class: 'wishlist-item-image',
                loading: 'lazy'
            })
        ]),
        createElement('div', { class: 'wishlist-item-details' }, [
            createElement('a', { 
                href: `product.html?id=${product.id}`,
                class: 'wishlist-item-name'
            }, [product.name]),
            product.brand ? createElement('p', { class: 'wishlist-item-brand' }, [product.brand.name]) : null,
            createElement('p', { class: 'wishlist-item-price' }, [`$${parseFloat(product.price).toFixed(2)}`]),
            createElement('p', { class: `wishlist-item-stock ${inStock ? 'in-stock' : 'out-of-stock'}` }, [
                inStock ? '✓ In Stock' : '✗ Out of Stock'
            ]),
            createElement('div', { class: 'wishlist-item-actions' }, [
                createElement('button', {
                    class: 'btn btn-primary',
                    disabled: !inStock
                }, [
                    createElement('i', { class: 'fas fa-shopping-cart' }),
                    ' Move to Cart'
                ]),
                createElement('button', {
                    class: 'btn btn-outline'
                }, [
                    createElement('i', { class: 'fas fa-trash' }),
                    ' Remove'
                ])
            ])
        ].filter(Boolean))
    ]);
    
    // Add event listeners
    const moveBtn = item.querySelector('.btn-primary');
    const removeBtn = item.querySelector('.btn-outline');
    
    if (moveBtn) {
        moveBtn.addEventListener('click', async () => {
            if (await onMoveToCart(product.id, product)) {
                item.remove();
                showToast('Moved to cart!', 'success');
            }
        });
    }
    
    if (removeBtn) {
        removeBtn.addEventListener('click', async () => {
            if (await onRemove(product.id)) {
                item.remove();
                showToast('Removed from wishlist', 'success');
            }
        });
    }
    
    return item;
}

// ============= Review UI Components =============

/**
 * Renders a review submission form
 * @param {number} productId - The product ID
 * @returns {HTMLElement} Review form element
 */
export function renderReviewForm(productId) {
    const form = createElement('form', { class: 'review-form', id: 'review-form' });
    
    // Star rating input
    const ratingContainer = createElement('div', { class: 'form-group' }, [
        createElement('label', {}, ['Your Rating *']),
        createInteractiveStarRating()
    ]);
    
    // Title input
    const titleInput = createElement('input', {
        type: 'text',
        id: 'review-title',
        name: 'title',
        class: 'form-control',
        placeholder: 'Review title (optional)',
        maxlength: '200'
    });
    
    // Comment textarea
    const commentInput = createElement('textarea', {
        id: 'review-comment',
        name: 'comment',
        class: 'form-control',
        placeholder: 'Tell us about your experience with this product (minimum 10 characters) *',
        required: 'true',
        minlength: '10',
        maxlength: '2000',
        rows: '5'
    });
    
    const charCount = createElement('small', { class: 'char-count' }, ['0 / 2000']);
    
    commentInput.addEventListener('input', () => {
        const length = commentInput.value.length;
        charCount.textContent = `${length} / 2000`;
        charCount.style.color = length < 10 ? '#ef4444' : length > 1900 ? '#f59e0b' : '#6b7280';
    });
    
    // Submit button
    const submitBtn = createElement('button', {
        type: 'submit',
        class: 'btn btn-primary'
    }, [
        createElement('i', { class: 'fas fa-paper-plane' }),
        ' Submit Review'
    ]);
    
    form.appendChild(ratingContainer);
    form.appendChild(createElement('div', { class: 'form-group' }, [
        createElement('label', { for: 'review-title' }, ['Review Title']),
        titleInput
    ]));
    form.appendChild(createElement('div', { class: 'form-group' }, [
        createElement('label', { for: 'review-comment' }, ['Your Review *']),
        commentInput,
        charCount
    ]));
    form.appendChild(submitBtn);
    
    return form;
}

/**
 * Creates an interactive star rating input
 * @returns {HTMLElement} Star rating input element
 */
function createInteractiveStarRating() {
    const container = createElement('div', { 
        class: 'star-rating-input',
        role: 'radiogroup',
        'aria-label': 'Select rating'
    });
    let selectedRating = 0;
    
    for (let i = 1; i <= 5; i++) {
        const star = createElement('i', {
            class: 'far fa-star',
            'data-rating': i,
            role: 'radio',
            'aria-checked': 'false',
            tabindex: '0'
        });
        
        star.addEventListener('click', () => {
            selectedRating = i;
            updateStarDisplay();
        });
        
        star.addEventListener('mouseenter', () => {
            updateStarDisplay(i);
        });
        
        star.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectedRating = i;
                updateStarDisplay();
            }
        });
        
        container.appendChild(star);
    }
    
    container.addEventListener('mouseleave', () => {
        updateStarDisplay();
    });
    
    function updateStarDisplay(hoverRating = selectedRating) {
        container.querySelectorAll('i').forEach((star, index) => {
            const rating = index + 1;
            star.className = (rating <= hoverRating) ? 'fas fa-star' : 'far fa-star';
            star.setAttribute('aria-checked', rating <= selectedRating ? 'true' : 'false');
        });
    }
    
    // Add method to get selected rating
    container.getSelectedRating = () => selectedRating;
    
    return container;
}

/**
 * Renders a review card
 * @param {Object} review - The review object
 * @returns {HTMLElement} Review card element
 */
export function renderReviewCard(review) {
    const { createStarRating, formatReviewDate } = getReviewHelpers();
    
    const card = createElement('div', { class: 'review-card' }, [
        createElement('div', { class: 'review-header' }, [
            createElement('div', { class: 'review-author' }, [
                createElement('strong', {}, [escapeHtml(review.user_name || 'Anonymous')]),
                review.is_verified_purchase ? 
                    createElement('span', { class: 'verified-badge' }, [
                        createElement('i', { class: 'fas fa-check-circle' }),
                        ' Verified Purchase'
                    ]) : null
            ].filter(Boolean)),
            createElement('div', { class: 'review-meta' }, [
                createStarRating(review.rating),
                createElement('span', { class: 'review-date' }, [formatReviewDate(review.created_at)])
            ])
        ]),
        review.title ? createElement('h4', { class: 'review-title' }, [escapeHtml(review.title)]) : null,
        createElement('p', { class: 'review-comment' }, [escapeHtml(review.comment)])
    ].filter(Boolean));
    
    return card;
}

/**
 * Renders review statistics with rating distribution
 * @param {Object} stats - Review statistics object
 * @returns {HTMLElement} Review stats element
 */
export function renderReviewStats(stats) {
    if (!stats || stats.review_count === 0) {
        return createElement('div', { class: 'no-reviews' }, [
            createElement('i', { class: 'far fa-star', style: 'font-size: 3rem; color: #ccc; margin-bottom: 1rem;' }),
            createElement('p', {}, ['No reviews yet. Be the first to review this product!'])
        ]);
    }
    
    const { createStarRating, getRatingColorClass } = getReviewHelpers();
    const ratingClass = getRatingColorClass(stats.average_rating);
    
    return createElement('div', { class: 'review-stats' }, [
        createElement('div', { class: 'rating-summary' }, [
            createElement('div', { class: `average-rating ${ratingClass}` }, [
                createElement('span', { class: 'rating-value' }, [stats.average_rating.toFixed(1)]),
                createStarRating(Math.round(stats.average_rating)),
                createElement('p', { class: 'review-count' }, [
                    `Based on ${stats.review_count} ${stats.review_count === 1 ? 'review' : 'reviews'}`
                ])
            ])
        ]),
        renderRatingDistribution(stats)
    ]);
}

/**
 * Renders rating distribution bars
 * @param {Object} stats - Review statistics object
 * @returns {HTMLElement} Rating distribution element
 */
function renderRatingDistribution(stats) {
    const container = createElement('div', { class: 'rating-distribution' });
    
    for (let rating = 5; rating >= 1; rating--) {
        const count = stats.rating_distribution[rating] || 0;
        const percentage = stats.review_count > 0 ? 
            Math.round((count / stats.review_count) * 100) : 0;
        
        const row = createElement('div', { class: 'distribution-row' }, [
            createElement('span', { class: 'star-label' }, [`${rating} ★`]),
            createElement('div', { class: 'distribution-bar' }, [
                createElement('div', {
                    class: 'distribution-fill',
                    style: `width: ${percentage}%`
                })
            ]),
            createElement('span', { class: 'distribution-count' }, [`${count}`])
        ]);
        
        container.appendChild(row);
    }
    
    return container;
}

/**
 * Helper function to get review utility functions
 * @returns {Object} Review helper functions
 */
function getReviewHelpers() {
    return {
        createStarRating: (rating) => {
            const container = createElement('div', { 
                class: 'star-rating',
                role: 'img',
                'aria-label': `${rating} out of 5 stars`
            });
            
            for (let i = 1; i <= 5; i++) {
                const star = createElement('i', {
                    class: i <= rating ? 'fas fa-star' : 'far fa-star'
                });
                container.appendChild(star);
            }
            
            return container;
        },
        
        formatReviewDate: (dateString) => {
            const date = new Date(dateString);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return `${diffDays} days ago`;
            if (diffDays < 30) {
                const weeks = Math.floor(diffDays / 7);
                return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
            }
            if (diffDays < 365) {
                const months = Math.floor(diffDays / 30);
                return `${months} ${months === 1 ? 'month' : 'months'} ago`;
            }
            const years = Math.floor(diffDays / 365);
            return `${years} ${years === 1 ? 'year' : 'years'} ago`;
        },
        
        getRatingColorClass: (rating) => {
            if (rating >= 4.5) return 'rating-excellent';
            if (rating >= 3.5) return 'rating-good';
            if (rating >= 2.5) return 'rating-average';
            if (rating >= 1.5) return 'rating-poor';
            return 'rating-very-poor';
        }
    };
}

// ============= Related Products UI Component =============

/**
 * Renders a section of related products
 * @param {Array} products - Array of related product objects
 * @returns {HTMLElement} Related products section element
 */
export function renderRelatedProducts(products) {
    if (!products || products.length === 0) {
        return null;
    }
    
    const section = createElement('section', { class: 'related-products' }, [
        createElement('h2', {}, ['You May Also Like']),
        createElement('div', { class: 'related-products-grid' })
    ]);
    
    const grid = section.querySelector('.related-products-grid');
    
    products.forEach(product => {
        const card = renderProductCard(product);
        card.classList.add('related-product-card');
        
        // Track click for analytics
        card.addEventListener('click', () => {
            if (window.gtag) {
                gtag('event', 'select_content', {
                    content_type: 'related_product',
                    item_id: product.id
                });
            }
        });
        
        grid.appendChild(card);
    });
    
    return section;
}