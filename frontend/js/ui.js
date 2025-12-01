/**

 * ui.js

 *

 * This module contains all functions related to DOM manipulation. It follows security best practices

 * by avoiding innerHTML with untrusted data and uses efficient rendering techniques.

 */



import i18n from './i18n.js';
import { createStarRating, formatReviewDate, calculateRatingPercentages, getRatingColorClass } from './reviews.js';

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
const DEFAULT_PRODUCT_PLACEHOLDER = 'images/placeholder.svg';

function getProductImage(product, variant = 'full') {

    const sources = resolveProductPrimaryImage(product);

    if (variant === 'thumb') {

        return sources.thumb || sources.full || DEFAULT_PRODUCT_PLACEHOLDER;

    }

    return sources.full || DEFAULT_PRODUCT_PLACEHOLDER;

}

const IMAGE_VARIANT_KEYS = {

    full: [

        'image_large_url',

        'image_large',

        'large_url',

        'large',

        'image_full_url',

        'image_full',

        'full_url',

        'full',

        'image_original',

        'original',

        'high',

        'image',

        'url',

        'src'

    ],

    thumb: [

        'image_thumb_url',

        'image_thumbnail_url',

        'image_thumb',

        'thumbnail_url',

        'thumbnail',

        'thumb_url',

        'thumb',

        'image_small_url',

        'image_small',

        'small',

        'preview',

        'mini',

        'micro',

        'image'

    ]

};

const DIRECT_PRODUCT_IMAGE_KEYS = [

    'image_large_url',

    'image_full_url',

    'hero_image',

    'image_large',

    'image_full',

    'image_url',

    'image'

];

function normalizeKey(key) {

    return typeof key === 'string' ? key.toLowerCase().replace(/[-_\s]+/g, '') : '';

}

function pickImageVariant(source, variantKeys) {

    if (!source || typeof source !== 'object') {

        return '';

    }

    const entries = Object.entries(source);

    for (const [key, value] of entries) {

        if (typeof value !== 'string' || !value) {

            continue;

        }

        const normalizedKey = normalizeKey(key);

        const match = variantKeys.some((variantKey) => normalizedKey.includes(normalizeKey(variantKey)));

        if (match) {

            return value;

        }

    }

    for (const [, value] of entries) {

        if (value && typeof value === 'object') {

            const nested = pickImageVariant(value, variantKeys);

            if (nested) {

                return nested;

            }

        }

    }

    return '';

}

function resolveGalleryImageSources(imageData) {

    if (!imageData) {

        return { full: '', thumb: '', alt: '' };

    }

    if (typeof imageData === 'string') {

        return { full: imageData, thumb: imageData, alt: '' };

    }

    const alt = typeof imageData.alt_text === 'string' ? imageData.alt_text : '';

    let full = pickImageVariant(imageData, IMAGE_VARIANT_KEYS.full);

    let thumb = pickImageVariant(imageData, IMAGE_VARIANT_KEYS.thumb);

    if (!full && typeof imageData.image === 'string') {

        full = imageData.image;

    }

    if (!thumb) {

        if (typeof imageData.thumbnail === 'string') {

            thumb = imageData.thumbnail;

        } else if (typeof imageData.thumb === 'string') {

            thumb = imageData.thumb;

        } else if (typeof imageData.small === 'string') {

            thumb = imageData.small;

        }

    }

    if (!thumb) {

        thumb = full;

    }

    return { full, thumb, alt };

}

function resolveProductPrimaryImage(product) {

    if (!product) {

        return { full: '', thumb: '', alt: '' };

    }

    for (const key of DIRECT_PRODUCT_IMAGE_KEYS) {

        if (typeof product[key] === 'string' && product[key]) {

            return { full: product[key], thumb: product[key], alt: product.name || '' };

        }

    }

    if (product.main_image) {

        const main = resolveGalleryImageSources(product.main_image);

        if (main.full) {

            return main;

        }

    }

    if (Array.isArray(product.images) && product.images.length > 0) {

        const first = resolveGalleryImageSources(product.images[0]);

        if (first.full || first.thumb) {

            return first;

        }

    }

    return { full: '', thumb: '', alt: '' };

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

    // Check if already rendered to avoid re-rendering
    if (swiperWrapper.children.length > 1) return;

    // Build absolute URL from site root so it works on any page path
    const toAbs = (p) => {
        // Normalize path to absolute URL from current page location
        if (p.startsWith('http://') || p.startsWith('https://')) return p;
        // If path starts with /, make it relative to origin
        if (p.startsWith('/')) {
            return new URL(p, window.location.origin).toString();
        }
        // Otherwise, make it relative to current document
        return new URL(p, window.location.href).toString();
    };
    
    // Hero slide content with images, titles, descriptions, and CTAs
    const slides = [
        {
            image: 'images/hero/soundlightpro-banner-home1.jpg',
            title: i18n.t('hero_slide1_title', 'Professional Sound Systems'),
            subtitle: i18n.t('hero_slide1_subtitle', 'Premium audio equipment for events & venues'),
            cta: i18n.t('hero_slide1_cta', 'Shop Audio'),
            ctaLink: 'search-results.html?category=sound-systems'
        },
        {
            image: 'images/hero/soundlightpro-banner-home2.jpg',
            title: i18n.t('hero_slide2_title', 'Stage Lighting Solutions'),
            subtitle: i18n.t('hero_slide2_subtitle', 'Create stunning visual experiences'),
            cta: i18n.t('hero_slide2_cta', 'Explore Lighting'),
            ctaLink: 'search-results.html?category=lighting'
        },
        {
            image: 'images/hero/soundlightpro-banner-home22.jpg',
            title: i18n.t('hero_slide3_title', 'DJ Equipment'),
            subtitle: i18n.t('hero_slide3_subtitle', 'Everything you need to rock the party'),
            cta: i18n.t('hero_slide3_cta', 'View DJ Gear'),
            ctaLink: 'search-results.html?category=dj-equipment'
        },
        {
            image: 'images/hero/soundlightpro-banner-home2222.jpg',
            title: i18n.t('hero_slide4_title', 'Special Effects'),
            subtitle: i18n.t('hero_slide4_subtitle', 'Fog machines, lasers & more'),
            cta: i18n.t('hero_slide4_cta', 'Shop Effects'),
            ctaLink: 'search-results.html?category=stage-effects'
        },
        {
            image: 'images/hero/soundlightpro-banner-home3.jpg',
            title: i18n.t('hero_slide5_title', 'New Arrivals'),
            subtitle: i18n.t('hero_slide5_subtitle', 'Discover the latest professional gear'),
            cta: i18n.t('hero_slide5_cta', 'See What\'s New'),
            ctaLink: 'search-results.html?sort=newest'
        },
        {
            image: 'images/hero/soundlightpro-banner-home4.jpg',
            title: i18n.t('hero_slide6_title', 'Expert Support'),
            subtitle: i18n.t('hero_slide6_subtitle', 'Professional advice & installation services'),
            cta: i18n.t('hero_slide6_cta', 'Contact Us'),
            ctaLink: 'contact.html'
        },
        {
            image: 'images/hero/soundlightpro-banner-home6.jpg',
            title: i18n.t('hero_slide7_title', 'Complete Event Solutions'),
            subtitle: i18n.t('hero_slide7_subtitle', 'Sound, light & stage equipment packages'),
            cta: i18n.t('hero_slide7_cta', 'View Packages'),
            ctaLink: 'services.html'
        },
        {
            image: 'images/hero/MYO-ACOUSTIC-SOUNDLIGHTPRO.png',
            title: i18n.t('hero_slide8_title', 'MYO Acoustic Series'),
            subtitle: i18n.t('hero_slide8_subtitle', 'Premium acoustic solutions for any venue'),
            cta: i18n.t('hero_slide8_cta', 'Learn More'),
            ctaLink: 'search-results.html?brand=myo-acoustic'
        }
    ];

    swiperWrapper.innerHTML = '';
    const frag = document.createDocumentFragment();
    
    slides.forEach((slideData, index) => {
        const slide = document.createElement('div');
        slide.className = 'swiper-slide';
        
        const img = document.createElement('img');
        img.className = 'slide-bg';
        img.alt = slideData.title;
        img.src = toAbs(slideData.image);
        img.width = 1920;
        img.height = 822;
        if (index > 0) img.loading = 'lazy';
        
        const overlay = document.createElement('div');
        overlay.className = 'slide-overlay';
        
        // Create hero content
        const heroContent = document.createElement('div');
        heroContent.className = 'hero-content';
        heroContent.innerHTML = `
            <h2 class="hero-title">${escapeHtml(slideData.title)}</h2>
            <p class="hero-subtitle">${escapeHtml(slideData.subtitle)}</p>
            <a href="${slideData.ctaLink}" class="btn btn--primary hero-cta">
                ${escapeHtml(slideData.cta)}
                <i class="fas fa-arrow-right"></i>
            </a>
        `;
        
        slide.appendChild(img);
        slide.appendChild(overlay);
        slide.appendChild(heroContent);
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

    // Optimization: Check if content already exists and matches
    // This prevents unnecessary DOM thrashing on re-initialization
    if (megaMenuContainer.children.length > 0 && megaMenuContainer._renderedCategories === JSON.stringify(categories.map(c => c.id))) {
        return;
    }

    const parentCategories = categories.filter(c => c.parent === null && c.children.length > 0);



    // Clear container and rebuild safely
    // FIXED: Reset initialization flag when rebuilding
    megaMenuContainer._tabSwitchingInitialized = false;

    megaMenuContainer.innerHTML = '';
    
    // Store signature of rendered categories
    megaMenuContainer._renderedCategories = JSON.stringify(categories.map(c => c.id));

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

            

            // Add grandchildren (sub-subcategories) if they exist

            if (child.children && child.children.length > 0) {

                const list = createElement('ul', { class: 'mega-menu-list' });

                child.children.forEach(grandchild => {

                    const item = createElement('li');

                    const sublink = createElement('a', { 

                        href: `search-results.html?category=${encodeURIComponent(grandchild.slug)}` 

                    }, [grandchild.name]);

                    item.appendChild(sublink);

                    list.appendChild(item);

                });

                col.appendChild(list);

            }

            

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

 * FIXED: Prevent duplicate event listeners by checking if already initialized

 * @param {HTMLElement} megaMenuContainer - The mega menu container element.

 */

function setupMegaMenuTabSwitching(megaMenuContainer) {

    // FIXED: Check if already initialized to prevent duplicate listeners

    if (megaMenuContainer._tabSwitchingInitialized) {

        console.log('Mega menu tabs already initialized, skipping...');

        return;

    }

    

    const tabButtons = megaMenuContainer.querySelectorAll('.mega-menu-tab-btn');

    const tabPanes = megaMenuContainer.querySelectorAll('.mega-menu-pane');

    

    console.log('Setting up mega menu tab switching:', tabButtons.length, 'buttons,', tabPanes.length, 'panes');

    
    
    tabButtons.forEach((button, index) => {

        // Use direct event listener instead of ListenerManager for reliability
        button.addEventListener('click', (e) => {

            e.preventDefault();

            e.stopPropagation();

            

            const targetId = button.dataset.target;

            console.log('Tab clicked:', button.textContent, 'target:', targetId);

            
            
            // Remove active class from all buttons and panes

            tabButtons.forEach(btn => btn.classList.remove('active'));

            tabPanes.forEach(pane => pane.classList.remove('active'));

            
            
            // Add active class to clicked button

            button.classList.add('active');

            
            
            // Show the corresponding pane

            const targetPane = megaMenuContainer.querySelector(`#${targetId}`);

            if (targetPane) {

                targetPane.classList.add('active');

                console.log('Activated pane:', targetId);

            } else {

                console.error('Target pane not found:', targetId);

            }

        });

    });

    

    // FIXED: Mark as initialized to prevent duplicate setup

    megaMenuContainer._tabSwitchingInitialized = true;

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

                createElement('img', { src: getProductImage(product), alt: product.name, loading: 'lazy', width: '400', height: '250' })

            ]),
            
            // Modern Action Bar
            createElement('div', { class: 'product-card-actions' }, [
                createElement('button', { class: 'btn-card-action quick-view-btn', 'data-product-id': product.id, 'aria-label': i18n.t('btn_quick_view') }, [
                    createElement('i', { class: 'fas fa-eye' })
                ]),
                createElement('button', { class: 'btn-card-action btn-card-primary add-to-cart-btn', 'data-product-id': product.id }, [
                    createElement('i', { class: 'fas fa-shopping-cart' }),
                    document.createTextNode(' ' + i18n.t('btn_add_to_cart'))
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

                    createElement('p', { class: 'product-card-price' }, [i18n.formatCurrency(product.price)])

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

    document.title = `${escapeHtml(product.name)} - SoundLightPro`;
    updateProductSchema(product);

    const primaryImage = resolveProductPrimaryImage(product);
    const mainImageSrc = primaryImage.full || DEFAULT_PRODUCT_PLACEHOLDER;
    const mainImageThumb = primaryImage.thumb && primaryImage.thumb !== primaryImage.full
        ? primaryImage.thumb
        : '';
    const mainImageAlt = primaryImage.alt || product.name || 'Product image';

    const rawStock = Number(product.stock);
    const stockCount = Number.isFinite(rawStock) && rawStock > 0 ? rawStock : 0;
    const isOutOfStock = stockCount === 0;
    const quantityValue = isOutOfStock ? 0 : 1;
    const quantityMin = isOutOfStock ? 0 : 1;
    const quantityMax = stockCount > 0 ? stockCount : 1;

    const addBtnDisabledAttr = isOutOfStock ? 'disabled' : '';
    const quantityDisabledAttr = isOutOfStock ? 'disabled' : '';

    const addBtnLabel = isOutOfStock
        ? i18n.t('product_out_of_stock', 'Out of Stock')
        : i18n.t('btn_add_to_cart', 'Add to Cart');

    const wishlistLabel = i18n.t('add_to_wishlist', 'Add to Wishlist');

    const stockBadgeLabel = isOutOfStock
        ? i18n.t('product_out_of_stock', 'Out of Stock')
        : i18n.t('product_in_stock', 'In Stock');

    const stockBadgeStatus = isOutOfStock
        ? 'status-out'
        : stockCount <= 3
            ? 'status-low'
            : 'status-in';

    const stockInfoClass = isOutOfStock
        ? 'is-out'
        : stockCount <= 3
            ? 'is-low'
            : 'is-in';

    const stockInfoText = isOutOfStock
        ? i18n.t('product_stock_unavailable', 'Currently out of stock')
        : stockCount <= 3
            ? `Only ${stockCount} left in stock`
            : `${stockCount} units available`;

    let thumbnailsHTML = '';
    if (Array.isArray(product.images) && product.images.length > 1) {
        thumbnailsHTML = `
            <div class="product-thumbnails">
                ${product.images.map((img, index) => {
                    const sources = resolveGalleryImageSources(img);
                    const thumbSrc = sources.thumb || DEFAULT_PRODUCT_PLACEHOLDER;
                    const fullSrc = sources.full || thumbSrc;
                    const alt = sources.alt || product.name || '';
                    return `
                    <img
                        src="${escapeHtml(thumbSrc)}"
                        data-full-src="${escapeHtml(fullSrc)}"
                        data-thumb-src="${escapeHtml(thumbSrc)}"
                        data-alt="${escapeHtml(alt)}"
                        alt="${escapeHtml(alt)}"
                        class="thumbnail-img ${index === 0 ? 'active' : ''}"
                        width="100"
                        height="100"
                        loading="lazy"
                    />
                `; }).join('')}
            </div>
        `;
    }

    const categoryName = product.category ? escapeHtml(product.category) : 'N/A';
    const brandName = product.brand ? escapeHtml(product.brand.name) : 'N/A';
    const descriptionText = product.description
        ? escapeHtml(product.description)
        : 'No description available.';

    const priceLabel = i18n.formatCurrency ? i18n.formatCurrency(product.price) : `$${parseFloat(product.price).toFixed(2)}`;

    const productHTML = `
        <div class="product-detail-layout">
            <div class="product-gallery">
                <div class="main-image-container">
                    <img
                        id="main-product-image"
                        src="${escapeHtml(mainImageSrc)}"
                        alt="${escapeHtml(mainImageAlt)}"
                        width="600"
                        height="400"
                        loading="eager"
                        decoding="async"
                        data-full-src="${escapeHtml(mainImageSrc)}"
                        ${mainImageThumb ? `data-thumb-src="${escapeHtml(mainImageThumb)}"` : ''}
                    />
                </div>
                ${thumbnailsHTML}
            </div>
            <div class="product-detail-info">
                <div class="product-info-header">
                    <div class="product-pill-group">
                        ${product.category ? `<span class="product-pill">${categoryName}</span>` : ''}
                        <span class="product-pill ${stockBadgeStatus}">${escapeHtml(stockBadgeLabel)}</span>
                    </div>
                    <h1>${escapeHtml(product.name)}</h1>
                </div>
                <div class="product-price-block">
                    <p class="price">${escapeHtml(priceLabel)}</p>
                </div>
                <ul class="product-meta">
                    <li>
                        <span class="label">Category</span>
                        <span class="value">${categoryName}</span>
                    </li>
                    <li>
                        <span class="label">Brand</span>
                        <span class="value">${brandName}</span>
                    </li>
                </ul>
                <div class="description">
                    <h2 class="product-section-title">Description</h2>
                    <p>${descriptionText}</p>
                </div>

                ${renderProductMediaSection(product)}

                <div class="product-actions">
                    <form id="add-to-cart-form" class="add-to-cart-form">
                        <div class="quantity-control">
                            <label for="quantity">Quantity:</label>
                            <input
                                type="number"
                                id="quantity"
                                value="${quantityValue}"
                                min="${quantityMin}"
                                max="${quantityMax}"
                                ${quantityDisabledAttr}
                            />
                        </div>
                        <button type="submit" class="btn btn--primary" ${addBtnDisabledAttr}>
                            <i class="fas fa-shopping-cart"></i>
                            ${escapeHtml(addBtnLabel)}
                        </button>
                    </form>
                    <div id="notify-me-container" class="hidden">
                        <p data-i18n="out_of_stock_notify">This product is out of stock. Enter your email to be notified when it's back.</p>
                        <form id="notify-me-form">
                            <input type="email" id="notify-email" placeholder="Enter your email" required>
                            <button type="submit" class="btn btn-secondary" data-i18n="notify_me">Notify Me</button>
                        </form>
                    </div>
                    <div class="product-secondary-actions">
                        <button type="button" class="wishlist-btn" aria-label="${escapeHtml(wishlistLabel)}">
                            <i class="far fa-heart"></i>
                            <span class="btn-text">${escapeHtml(wishlistLabel)}</span>
                        </button>
                    </div>
                </div>
                <p class="stock-info ${stockInfoClass}">${escapeHtml(stockInfoText)}</p>
            </div>
        </div>
    `;

    container.innerHTML = productHTML;

    // Remove existing sticky CTA if present
    const existingSticky = document.getElementById('sticky-cta');
    if (existingSticky) {
        existingSticky.remove();
    }

    // Add sticky CTA for mobile
    const sticky = document.createElement('div');
    sticky.className = 'sticky-cta';
    sticky.id = 'sticky-cta';
    sticky.innerHTML = `
        <p class="price">${escapeHtml(priceLabel)}</p>
        <input
            type="number"
            class="qty"
            id="sticky-qty"
            value="${quantityValue}"
            min="${quantityMin}"
            max="${quantityMax}"
            ${quantityDisabledAttr}
        />
        <button class="btn btn--primary" id="sticky-add" ${addBtnDisabledAttr}>
            <i class="fas fa-shopping-cart"></i> ${escapeHtml(addBtnLabel)}
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

        createElement('aside', { class: 'mini-cart-drawer', role: 'dialog', 'aria-label': 'Mini cart', 'aria-modal': 'true' }, [

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

        // Always show the badge, even when count is 0

        cartCountElement.classList.remove('hidden');

    }

}



/**

 * Updates the header UI based on the user's login status.

 * @param {Object|null} user - The user object, or null if logged out.

 */

export function updateUserAuthUI(user) {

    const authMenuContainer = document.getElementById('auth-menu-container');
    const userInfo = document.getElementById('user-info');

    const usernameDisplay = document.getElementById('username-display');
    const userDropdownMenu = document.getElementById('user-dropdown-menu');



    if (authMenuContainer && userInfo) {
        if (user) {

            authMenuContainer.classList.add('hidden');
            userInfo.classList.remove('hidden');

            if (usernameDisplay) {
            usernameDisplay.textContent = user.username;

            }

            if (userDropdownMenu) {
                userDropdownMenu.innerHTML = `
                    <a href="dashboard.html" class="user-dropdown-link">
                        <i class="fas fa-tachometer-alt"></i>
                        <span>Dashboard</span>
                    </a>
                    <button id="logout-button" class="logout-btn">
                        <i class="fas fa-sign-out-alt"></i>
                        <span data-i18n="nav_logout">Logout</span>
                    </button>
                `;
            }

        } else {

            authMenuContainer.classList.remove('hidden');
            userInfo.classList.add('hidden');

            if (userDropdownMenu) {
                userDropdownMenu.innerHTML = `
                    <a href="login.html" class="user-dropdown-link">
                        <i class="fas fa-sign-in-alt"></i>
                        <span data-i18n="nav_login">Login</span>
                    </a>
                    <a href="register.html" class="user-dropdown-link">
                        <i class="fas fa-user-plus"></i>
                        <span data-i18n="nav_register">Register</span>
                    </a>
                `;
            }

        }

    }
}


// ============= Review UI =============

function normalizeRatingDistribution(distribution) {
    const normalized = {};
    for (let rating = 1; rating <= 5; rating += 1) {
        const rawValue = distribution ? (distribution[rating] ?? distribution[String(rating)]) : 0;
        normalized[rating] = Number(rawValue) || 0;
    }
    return normalized;
}

function getReviewDisplayName(review) {
    if (review?.user_name) {
        return review.user_name;
    }

    const user = review?.user;
    if (user) {
        const firstName = user.first_name || '';
        const lastName = user.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();
        if (fullName) {
            return fullName;
        }
        if (user.username) {
            return user.username;
        }
    }

    return i18n.t('anonymous_user', 'Anonymous');
}

function getNameInitials(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) {
        return 'A';
    }

    const parts = trimmed.split(/\s+/).filter(Boolean);
    const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('');
    return initials || 'A';
}

function attachInteractiveStarHandlers(starContainer, ratingInput) {
    if (!starContainer || !ratingInput) {
        return;
    }

    const stars = Array.from(starContainer.querySelectorAll('i'));

    const setHover = (value) => {
        const numericValue = Number(value) || 0;
        stars.forEach((star) => {
            const starValue = Number(star.getAttribute('data-rating')) || 0;
            star.classList.toggle('hovered', numericValue > 0 && starValue <= numericValue);
        });
    };

    const setRating = (value) => {
        const numericValue = Number(value) || 0;
        ratingInput.value = String(numericValue);
        starContainer.setAttribute('aria-label', `${numericValue} out of 5 stars`);
        stars.forEach((star) => {
            const starValue = Number(star.getAttribute('data-rating')) || 0;
            if (starValue <= numericValue) {
                star.classList.add('fas', 'selected');
                star.classList.remove('far');
                star.setAttribute('aria-checked', 'true');
            } else {
                star.classList.add('far');
                star.classList.remove('fas', 'selected');
                star.setAttribute('aria-checked', 'false');
            }
        });
        setHover(0);
    };

    stars.forEach((star) => {
        const value = Number(star.getAttribute('data-rating')) || 0;
        star.addEventListener('mouseenter', () => setHover(value));
        star.addEventListener('mouseleave', () => setHover(Number(ratingInput.value) || 0));
        star.addEventListener('click', () => setRating(value));
        star.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setRating(value);
            }
        });
    });

    starContainer.addEventListener('mouseleave', () => setHover(Number(ratingInput.value) || 0));

    setRating(Number(ratingInput.value) || 0);
}

export function renderReviewStats(stats, container) {
    if (!container) return;

    container.classList.add('review-stats-container');
    container.innerHTML = '';

    if (!stats || typeof stats !== 'object') {
        container.appendChild(createElement('p', { class: 'no-review-stats' }, [
            i18n.t('no_reviews', 'No reviews yet')
        ]));
        return;
    }

    const averageRating = Number(stats.average_rating ?? 0) || 0;
    const reviewCount = Number(stats.review_count ?? 0) || 0;
    const distribution = normalizeRatingDistribution(stats.rating_distribution || {});
    const percentages = calculateRatingPercentages({
        review_count: reviewCount,
        rating_distribution: distribution,
    });

    const statsWrapper = createElement('div', { class: 'review-stats' });

    const ratingClass = getRatingColorClass(averageRating);
    const colorClass = ratingClass === 'rating-very-poor' ? 'rating-terrible' : ratingClass;
    const averageBlock = createElement('div', {
        class: `average-rating ${colorClass}`,
    });
    const averageValue = reviewCount > 0 ? averageRating.toFixed(1) : '—';
    averageBlock.appendChild(createElement('p', { class: 'average-rating-value' }, [averageValue]));

    const averageStars = createStarRating(Math.round(averageRating));
    averageStars.classList.add('average-rating-stars');
    averageStars.setAttribute('aria-label', `${averageRating.toFixed(1)} out of 5 stars`);
    averageBlock.appendChild(averageStars);

    const reviewWord = reviewCount === 1 ? i18n.t('review_single', 'review') : i18n.t('reviews_count', 'reviews');
    const basedOnLabel = i18n.t('reviews_based_on', 'based on');
    const formattedBasedOn = basedOnLabel.charAt(0).toUpperCase() + basedOnLabel.slice(1);
    const countLabel = reviewCount > 0
        ? `${formattedBasedOn} ${reviewCount} ${reviewWord}`
        : i18n.t('no_reviews', 'No reviews yet');
    averageBlock.appendChild(createElement('p', { class: 'average-rating-count' }, [countLabel]));

    statsWrapper.appendChild(averageBlock);

    const distributionList = createElement('div', { class: 'rating-distribution' });
    for (let rating = 5; rating >= 1; rating -= 1) {
        const row = createElement('div', { class: 'rating-bar' });

        const label = createElement('div', { class: 'rating-bar-label' }, [
            createElement('span', {}, [String(rating)]),
            createElement('i', { class: 'fas fa-star' }),
        ]);

        const percentage = typeof percentages[rating] === 'number' ? percentages[rating] : 0;
        const barContainer = createElement('div', {
            class: 'rating-bar-container',
            role: 'progressbar',
            'aria-valuemin': '0',
            'aria-valuemax': '100',
            'aria-valuenow': String(percentage),
        });
        const barFill = createElement('div', { class: 'rating-bar-fill' });
        barFill.style.width = `${percentage}%`;
        barContainer.appendChild(barFill);

        const countValue = distribution[rating] ?? 0;
        const countLabelEl = createElement('span', { class: 'rating-bar-count' }, [String(countValue)]);

        row.appendChild(label);
        row.appendChild(barContainer);
        row.appendChild(countLabelEl);

        distributionList.appendChild(row);
    }

    statsWrapper.appendChild(distributionList);
    container.appendChild(statsWrapper);
}

export function renderReviewCard(review) {
    const card = createElement('article', { class: 'review-card' });

    if (!review || typeof review !== 'object') {
        card.appendChild(createElement('p', { class: 'review-comment' }, [
            i18n.t('error_loading_reviews', 'Error loading reviews')
        ]));
        return card;
    }

    const ratingValue = Number(review.rating ?? 0) || 0;
    const createdAt = review.created_at || review.updated_at || new Date().toISOString();
    const displayName = getReviewDisplayName(review);
    const initials = getNameInitials(displayName);

    const header = createElement('div', { class: 'review-card-header' });
    const userInfo = createElement('div', { class: 'review-user-info' });
    const avatar = createElement('div', { class: 'review-user-avatar', 'aria-hidden': 'true' }, [initials]);
    const details = createElement('div', { class: 'review-user-details' });
    details.appendChild(createElement('p', { class: 'review-user-name' }, [displayName]));
    details.appendChild(createElement('p', { class: 'review-date' }, [formatReviewDate(createdAt)]));

    userInfo.appendChild(avatar);
    userInfo.appendChild(details);

    const ratingBadges = createElement('div', { class: 'review-rating-badges' });
    const stars = createStarRating(Math.round(ratingValue));
    stars.classList.add('review-stars');
    stars.setAttribute('aria-label', `${ratingValue} out of 5 stars`);
    ratingBadges.appendChild(stars);

    if (review.is_verified_purchase) {
        ratingBadges.appendChild(createElement('span', { class: 'verified-badge' }, [
            createElement('i', { class: 'fas fa-check-circle' }),
            document.createTextNode(i18n.t('verified_purchase', 'Verified Purchase')),
        ]));
    }

    header.appendChild(userInfo);
    header.appendChild(ratingBadges);

    card.appendChild(header);

    const titleText = review.title ? review.title.trim() : '';
    if (titleText) {
        card.appendChild(createElement('h3', { class: 'review-title' }, [titleText]));
    }

    const comment = createElement('p', { class: 'review-comment' });
    comment.textContent = review.comment ? review.comment.trim() : '';
    card.appendChild(comment);

    return card;
}

export function renderReviewForm(productId) {
    const form = createElement('form', { class: 'review-form', 'data-product-id': String(productId) });
    form.setAttribute('novalidate', 'novalidate');

    form.appendChild(createElement('h3', {}, [i18n.t('write_review', 'Write a Review')]));

    const ratingInputId = `review-rating-${productId}`;
    const ratingGroup = createElement('div', { class: 'form-group' });
    ratingGroup.appendChild(createElement('label', { for: ratingInputId }, [
        i18n.t('your_rating', 'Your Rating'),
        createElement('span', { class: 'required' }, ['*']),
    ]));

    const ratingInput = createElement('input', {
        type: 'hidden',
        id: ratingInputId,
        name: 'rating',
        value: '0',
    });
    ratingGroup.appendChild(ratingInput);

    const starControl = createStarRating(0, true);
    starControl.classList.add('star-rating-input');
    ratingGroup.appendChild(starControl);
    attachInteractiveStarHandlers(starControl, ratingInput);

    form.appendChild(ratingGroup);

    const titleGroup = createElement('div', { class: 'form-group' });
    const titleInputId = `review-title-${productId}`;
    titleGroup.appendChild(createElement('label', { for: titleInputId }, [i18n.t('review_title', 'Review Title')]));
    const titleInput = createElement('input', {
        type: 'text',
        id: titleInputId,
        name: 'title',
        maxLength: '200',
        placeholder: i18n.t('review_title_placeholder', 'Summarize your experience'),
    });
    titleGroup.appendChild(titleInput);
    form.appendChild(titleGroup);

    const commentGroup = createElement('div', { class: 'form-group' });
    const commentInputId = `review-comment-${productId}`;
    commentGroup.appendChild(createElement('label', { for: commentInputId }, [
        i18n.t('review_comment', 'Your Review'),
        createElement('span', { class: 'required' }, ['*']),
    ]));
    const commentTextarea = createElement('textarea', {
        id: commentInputId,
        name: 'comment',
        maxLength: '2000',
        rows: '5',
        placeholder: i18n.t('review_comment_placeholder', 'Share your thoughts about this product'),
        required: 'required',
    });
    commentGroup.appendChild(commentTextarea);
    const charCount = createElement('div', { class: 'char-count', 'aria-live': 'polite' }, ['0 / 2000']);
    commentGroup.appendChild(charCount);
    form.appendChild(commentGroup);

    const actions = createElement('div', { class: 'form-actions' });
    const submitButton = createElement('button', { type: 'submit', class: 'btn btn-primary' }, [
        createElement('i', { class: 'fas fa-paper-plane' }),
        document.createTextNode(` ${i18n.t('submit_review', 'Submit Review')}`),
    ]);
    const cancelButton = createElement('button', { type: 'button', class: 'btn btn-secondary' }, [
        i18n.t('form_cancel', 'Cancel'),
    ]);
    actions.appendChild(submitButton);
    actions.appendChild(cancelButton);
    form.appendChild(actions);

    const updateCharCount = () => {
        const length = commentTextarea.value.length;
        charCount.textContent = `${length} / 2000`;
    };
    commentTextarea.addEventListener('input', updateCharCount);
    updateCharCount();

    return form;
}

/**
 * Renders the related products carousel/grid on the product detail page.
 * @param {Array<Object>} products - Related products returned by the API.
 * @param {HTMLElement} container - Section element that hosts the related block.
 */
export function renderRelatedProducts(products, container) {
    if (!container) {
        return;
    }

    container.classList.add('related-products-section');
    container.innerHTML = '';

    if (!Array.isArray(products) || products.length === 0) {
        container.appendChild(createElement('div', { class: 'no-related-products' }, [
            createElement('i', { class: 'fas fa-boxes' }),
            createElement('h3', {}, [i18n.t('no_related_products', 'No related gear yet')]),
            createElement('p', {}, [i18n.t('check_back_later', 'We are curating recommendations for this item. Check back soon!')])
        ]));
        return;
    }

    const header = createElement('div', { class: 'related-products-header' }, [
        createElement('h2', {}, [i18n.t('related_products_title', 'You May Also Like')]),
        createElement('p', {}, [i18n.t('related_products_subtitle', 'Complementary gear curated just for you.')])
    ]);

    const grid = createElement('div', { class: 'related-products-grid' });

    products.forEach((product) => {
        if (!product || typeof product !== 'object') {
            return;
        }

        const productName = escapeHtml(product.name || 'Unnamed Product');
        const productUrl = `product.html?id=${product.id}`;
        const imageUrl = getProductImage(product);
        const brandName = product.brand ? escapeHtml(product.brand.name || '') : '';
        const priceLabel = i18n.formatCurrency ? i18n.formatCurrency(product.price) : `$${parseFloat(product.price || 0).toFixed(2)}`;

        const stockCount = Number(product.stock || 0);
        let stockClass = 'in-stock';
        let stockLabel = i18n.t('product_in_stock', 'In Stock');
        if (stockCount <= 0) {
            stockClass = 'out-of-stock';
            stockLabel = i18n.t('product_out_of_stock', 'Out of Stock');
        } else if (stockCount <= 3) {
            stockClass = 'low-stock';
            stockLabel = i18n.t('product_low_stock', 'Low stock');
        }

        const ratingValue = Number(product.avg_rating ?? product.average_rating ?? 0) || 0;
        const reviewTotal = Number(product.review_count ?? product.review_count_cached ?? 0) || 0;

        const card = createElement('article', { class: 'related-product-card' });

        const imageLink = createElement('a', {
            href: productUrl,
            class: 'related-product-image-container',
            'aria-label': productName
        });
        const image = createElement('img', {
            class: 'related-product-image',
            src: imageUrl,
            alt: productName,
            loading: 'lazy',
            width: '400',
            height: '400'
        });
        imageLink.appendChild(image);

        const quickViewBtn = createElement('button', {
            class: 'quick-view-badge',
            type: 'button',
            'data-product-id': String(product.id || '')
        }, [
            createElement('i', { class: 'fas fa-eye' }),
            document.createTextNode(i18n.t('quick_view', 'Quick View'))
        ]);
        quickViewBtn.addEventListener('click', (event) => {
            event.preventDefault();
            renderQuickViewModal(product);
        });
        imageLink.appendChild(quickViewBtn);

        const info = createElement('div', { class: 'related-product-info' });

        if (brandName) {
            info.appendChild(createElement('p', { class: 'related-product-brand' }, [brandName]));
        }

        info.appendChild(createElement('a', {
            class: 'related-product-name',
            href: productUrl
        }, [productName]));

        const rating = createElement('div', { class: 'related-product-rating' });
        const stars = createElement('div', { class: 'related-product-stars' });
        for (let i = 1; i <= 5; i += 1) {
            let starClass = 'far fa-star';
            if (ratingValue >= i) {
                starClass = 'fas fa-star';
            } else if (ratingValue >= i - 0.5) {
                starClass = 'fas fa-star-half-alt';
            }
            stars.appendChild(createElement('i', { class: starClass }));
        }
        rating.appendChild(stars);
        rating.appendChild(createElement('span', { class: 'related-product-rating-count' }, [
            reviewTotal > 0
                ? `${ratingValue.toFixed(1)} • ${reviewTotal} ${reviewTotal === 1 ? i18n.t('review', 'review') : i18n.t('reviews', 'reviews')}`
                : i18n.t('no_reviews_short', 'No reviews yet')
        ]));
        info.appendChild(rating);

        info.appendChild(createElement('p', { class: 'related-product-price' }, [priceLabel]));

        info.appendChild(createElement('p', { class: `related-product-stock ${stockClass}` }, [
            stockClass === 'low-stock' && stockCount > 0
                ? i18n.t('product_low_stock_count', `Only ${stockCount} left!`)
                : stockLabel
        ]));

        const actions = createElement('div', { class: 'related-product-actions' });
        const addToCartBtn = createElement('button', {
            class: 'btn btn-primary',
            type: 'button',
            'aria-label': i18n.t('btn_add_to_cart', 'Add to Cart')
        }, [
            createElement('i', { class: 'fas fa-shopping-cart' }),
            document.createTextNode(i18n.t('btn_add_to_cart', 'Add to Cart'))
        ]);

        if (stockCount <= 0) {
            addToCartBtn.disabled = true;
        }

        addToCartBtn.addEventListener('click', async (event) => {
            event.preventDefault();
            try {
                const cartModule = await import('./cart.js');
                cartModule.addToCart(product, 1);
                showToast(`${product.name} ${i18n.t('added_to_cart', 'added to cart!')}`, 'success');
                updateCartCount(cartModule.getCartItemCount());
                renderMiniCart(cartModule.getCart());
            } catch (error) {
                console.error('Error adding related product to cart:', error);
                showToast(i18n.t('error_add_to_cart', 'Unable to add this item to your cart.'), 'error');
            }
        });

        const viewDetailsBtn = createElement('a', {
            class: 'btn btn-secondary',
            href: productUrl
        }, [
            createElement('i', { class: 'fas fa-info-circle' }),
            document.createTextNode(i18n.t('view_product_details', 'View Details'))
        ]);

        actions.appendChild(addToCartBtn);
        actions.appendChild(viewDetailsBtn);
        info.appendChild(actions);

        card.appendChild(imageLink);
        card.appendChild(info);
        grid.appendChild(card);
    });

    container.appendChild(header);
    container.appendChild(grid);

    const viewAll = createElement('div', { class: 'view-all-related' }, [
        createElement('a', { class: 'btn', href: 'search-results.html' }, [
            createElement('i', { class: 'fas fa-th-large' }),
            document.createTextNode(i18n.t('browse_more_gear', 'Browse more gear'))
        ])
    ]);

    container.appendChild(viewAll);
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

                        <img class="search-thumb" src="${getProductImage(p, 'thumb')}" alt="${escapeHtml(p.name)}" loading="lazy" width="36" height="36">

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

    const primaryImage = resolveProductPrimaryImage(product);

    const imageUrl = primaryImage.full
        || (hasImages ? product.images[0].image : '')
        || 'https://soundlightpro.com/images/logo/logoslp.jpg';

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

function renderProductMediaSection(product) {
    const videos = product.videos || [];
    const attachments = product.attachments || [];

    if (videos.length === 0 && attachments.length === 0) {
        return '';
    }

    let html = '<div class="product-media-section">';
    
    if (videos.length > 0) {
        html += '<h3 class="product-section-title">Product Videos</h3><div class="video-grid">';
        videos.forEach(video => {
            html += '<div class="video-item">';
            if (video.youtube_url) {
                // Extract video ID from YouTube URL
                const videoId = getYouTubeId(video.youtube_url);
                if (videoId) {
                    html += `
                        <div class="video-wrapper">
                            <iframe 
                                src="https://www.youtube.com/embed/${videoId}" 
                                title="${escapeHtml(video.title || 'Product Video')}"
                                frameborder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowfullscreen>
                            </iframe>
                        </div>
                    `;
                }
            } else if (video.video_file) {
                html += `
                    <div class="video-wrapper">
                        <video controls preload="metadata">
                            <source src="${escapeHtml(video.video_file)}" type="video/mp4">
                            Your browser does not support the video tag.
                        </video>
                    </div>
                `;
            }
            if (video.title) {
                html += `<p class="video-title">${escapeHtml(video.title)}</p>`;
            }
            html += '</div>';
        });
        html += '</div>';
    }

    if (attachments.length > 0) {
        html += '<h3 class="product-section-title">Downloads & Manuals</h3><ul class="attachment-list">';
        attachments.forEach(att => {
            html += `
                <li>
                    <a href="${escapeHtml(att.file)}" target="_blank" class="attachment-link">
                        <i class="fas fa-file-pdf"></i>
                        <span>${escapeHtml(att.label || 'Download')}</span>
                    </a>
                </li>
            `;
        });
        html += '</ul>';
    }

    html += '</div>';
    return html;
}

function getYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

/**
 * Updates the wishlist item count displayed in the header.
 * @param {number} count - The number of items in the wishlist.
 */
export function updateWishlistCount(count) {
    const wishlistCountElement = document.getElementById('wishlist-item-count');
    if (wishlistCountElement) {
        wishlistCountElement.textContent = count;
        // Add animation for update
        wishlistCountElement.classList.add('updated');
        setTimeout(() => {
            wishlistCountElement.classList.remove('updated');
        }, 500);
    }
}

/**
 * Renders a single wishlist item card.
 * @param {Object} product - The product object.
 * @returns {HTMLElement} The wishlist item element.
 */
export function renderWishlistItem(product) {
    const item = document.createElement('div');
    item.className = 'wishlist-item';
    item.dataset.productId = product.id;
    
    const imageUrl = product.main_image || product.image || '/images/placeholder.jpg';
    const price = typeof product.price === 'number' ? product.price.toFixed(2) : product.price;
    
    item.innerHTML = `
        <div class="wishlist-item-image">
            <a href="product.html?id=${product.id}">
                <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.name)}" loading="lazy">
            </a>
        </div>
        <div class="wishlist-item-details">
            <h3 class="wishlist-item-name">
                <a href="product.html?id=${product.id}">${escapeHtml(product.name)}</a>
            </h3>
            ${product.brand_name ? `<p class="wishlist-item-brand">${escapeHtml(product.brand_name)}</p>` : ''}
            <p class="wishlist-item-price">$${escapeHtml(price)}</p>
            ${product.stock_quantity > 0 
                ? '<span class="stock-status in-stock"><i class="fas fa-check"></i> In Stock</span>'
                : '<span class="stock-status out-of-stock"><i class="fas fa-times"></i> Out of Stock</span>'
            }
        </div>
        <div class="wishlist-item-actions">
            <button class="btn btn-primary add-to-cart-btn" data-product-id="${product.id}" ${product.stock_quantity <= 0 ? 'disabled' : ''}>
                <i class="fas fa-shopping-cart"></i> Add to Cart
            </button>
            <button class="btn btn-outline remove-from-wishlist-btn" data-product-id="${product.id}" aria-label="Remove from wishlist">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    return item;
}