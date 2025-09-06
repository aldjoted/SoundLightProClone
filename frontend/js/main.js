/**
 * main.js - Version Optimisée
 *
 * Ce contrôleur principal a été entièrement revu pour améliorer l'expérience utilisateur,
 * les performances et l'accessibilité. Il inclut :
 * - Un système de cache pour réduire les appels réseau.
 * - Une gestion robuste des erreurs avec des actions de récupération.
 * - Une initialisation progressive des composants pour un affichage plus rapide.
 * - Des gestionnaires d'événements optimisés (debounce, feedback visuel).
 * - Des fonctionnalités d'accessibilité améliorées (navigation clavier, ARIA).
 * - Une logique responsive pour une expérience mobile fluide.
 */

import * as apiService from './apiService.js';
import * as cart from './cart.js';
import * as ui from './ui.js';

// --- État Global et Cache ---

// État global de l'application pour un suivi centralisé.
const appState = {
    products: [],
    categories: [],
    isMobile: window.innerWidth < 1024,
};

// Système de cache simple pour limiter les requêtes API répétitives.
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Récupère des données depuis le cache ou via une fonction de fetch.
 * @param {string} key - La clé unique pour les données en cache.
 * @param {Function} fetcher - La fonction asynchrone pour récupérer les données si le cache est vide.
 * @returns {Promise<any>} Les données demandées.
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


// --- Routage et Initialisation ---

/**
 * Routeur principal qui dirige vers la fonction d'initialisation de la page appropriée.
 * Gère un état de chargement global pour une meilleure transition entre les pages.
 */
function router() {
    const path = window.location.pathname;
    const page = path.split("/").pop() || 'index.html';
    
    // Les fonctions d'initialisation pour chaque page.
    const routes = {
        'index.html': initHomePage,
        'product.html': initProductDetailPage,
        'cart.html': initCartPage,
        'login.html': initLoginPage,
        'register.html': initRegisterPage,
    };

    const initFunction = routes[page];
    if (initFunction) {
        initFunction().catch(error => {
            console.error(`Error initializing page ${page}:`, error);
            ui.showToast('Failed to load page content.', 'error');
        });
    }
}

/**
 * Initialise les composants et les fonctionnalités communs à toutes les pages.
 */
async function initApp() {
    // Initialise AOS (Animate on Scroll) avec garde
    if (window.AOS && typeof AOS.init === 'function') {
        AOS.init({
            duration: 800,
            easing: 'ease-in-out-quad',
            once: true,
            disable: window.innerWidth < 768,
        });
    }

    // Met à jour le compteur du panier et écoute les mises à jour.
    ui.updateCartCount(cart.getCartItemCount());
    document.addEventListener('cartUpdated', () => {
        ui.updateCartCount(cart.getCartItemCount());
    });
    
    // Tente de récupérer le profil utilisateur
    try {
        const user = await apiService.getUserProfile();
        ui.updateUserAuthUI(user);
    } catch (error) {
        ui.updateUserAuthUI(null);
    }

    setupGlobalEventListeners();

    // Initialiser la navigation mobile avancée (fallback si module absent)
    try {
        await import('./mobile-nav.js');
    } catch {
        setupMobileMenu();
    }
    // Initialiser la recherche avancée (ignorer si non présent)
    try {
        await import('./advanced-search.js');
    } catch {
        // no-op
    }
}


// --- Gestionnaires d'Événements Globaux ---

/**
 * Configure les écouteurs d'événements présents sur toutes les pages (header, footer, etc.).
 */
function setupGlobalEventListeners() {
    // Bouton de déconnexion.
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            apiService.logoutUser();
            ui.updateUserAuthUI(null);
            ui.showToast('You have been logged out.', 'info');
            // Redirige si l'utilisateur se déconnecte depuis une page protégée.
            if (window.location.pathname.endsWith('cart.html')) {
                window.location.href = 'index.html';
            }
        });
    }

    // Menu déroulant de l'utilisateur avec gestion de l'accessibilité.
    const userMenuToggle = document.querySelector('.user-menu-toggle');
    if (userMenuToggle) {
        userMenuToggle.addEventListener('click', (e) => {
            e.stopPropagation(); // Empêche la fermeture immédiate.
            const isExpanded = userMenuToggle.getAttribute('aria-expanded') === 'true';
            userMenuToggle.setAttribute('aria-expanded', !isExpanded);
        });

        // Ferme le menu si l'utilisateur clique en dehors.
        document.addEventListener('click', () => {
            userMenuToggle.setAttribute('aria-expanded', 'false');
        });
    }

    // Mega-menu keyboard navigation for tabs
    const megaMenu = document.getElementById('products-mega-menu');
    if (megaMenu) {
        megaMenu.addEventListener('click', (e) => {
            const tabButton = e.target.closest('.mega-menu-tab-btn');
            if (!tabButton) return;
            megaMenu.querySelector('.mega-menu-tab-btn.active')?.classList.remove('active');
            megaMenu.querySelector('.mega-menu-pane.active')?.classList.remove('active');
            tabButton.classList.add('active');
            const targetPaneId = tabButton.dataset.target;
            document.getElementById(targetPaneId)?.classList.add('active');
        });
        megaMenu.addEventListener('keydown', (e) => {
            const tabs = Array.from(megaMenu.querySelectorAll('.mega-menu-tab-btn'));
            if (!tabs.length) return;
            const current = document.activeElement;
            const idx = tabs.indexOf(current);
            if (idx === -1) return;
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                tabs[(idx + 1) % tabs.length].focus();
                tabs[(idx + 1) % tabs.length].click();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                tabs[(idx - 1 + tabs.length) % tabs.length].focus();
                tabs[(idx - 1 + tabs.length) % tabs.length].click();
            }
        });
    }

    // Load categories into mega-menu
    const megaMenuContainer = document.querySelector('.mega-menu-container');
    if (megaMenuContainer) {
        getCached('categories', apiService.getCategories)
            .then(categories => ui.renderMegaMenu(categories))
            .catch(err => console.error("Failed to load categories for mega menu:", err));
    }
}

/**
 * [CORRECTIF CRITIQUE] Implémente la logique pour le menu de navigation mobile.
 */
function setupMobileMenu() {
    const headerWrapper = document.querySelector('.header-wrapper');
    const mainNav = document.querySelector('.main-nav');
    const authLinks = document.querySelector('#auth-links');
    if (!headerWrapper || !mainNav) return;

    // 1. Cloner les liens d'authentification pour les ajouter au menu mobile
    const mobileAuthLinks = authLinks.cloneNode(true);
    mobileAuthLinks.classList.add('mobile-auth-links');
    mainNav.querySelector('ul').appendChild(mobileAuthLinks);

    // 2. Créer et injecter le bouton "burger"
    const menuToggle = document.createElement('button');
    menuToggle.classList.add('mobile-menu-toggle');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-controls', 'main-navigation');
    menuToggle.setAttribute('aria-label', 'Toggle navigation');
    menuToggle.innerHTML = `<i class="fas fa-bars"></i>`;
    // Insérer le bouton avant la navigation pour un ordre logique dans le DOM
    headerWrapper.insertBefore(menuToggle, mainNav);

    // 3. Ajouter l'écouteur d'événement pour ouvrir/fermer le menu
    menuToggle.addEventListener('click', () => {
        const isExpanded = mainNav.classList.toggle('is-open');
        menuToggle.setAttribute('aria-expanded', isExpanded);
        menuToggle.innerHTML = isExpanded ? `<i class="fas fa-times"></i>` : `<i class="fas fa-bars"></i>`;
        document.body.classList.toggle('no-scroll', isExpanded); // Empêche le défilement de l'arrière-plan.
    });
}


// --- Initialisation des Pages Spécifiques ---

/**
 * Initialise la page d'accueil (index.html).
 * Charge les produits et catégories, puis affiche les différents composants.
 */
async function initHomePage() {
    const productGrid = document.getElementById('product-grid');
    const featuredGrid = document.getElementById('featured-grid');
    if (!productGrid || !featuredGrid) return;

    // Affiche des "skeleton loaders" pour une meilleure perception de la performance.
    ui.showSkeletonLoader(productGrid, 8);
    ui.showSkeletonLoader(featuredGrid, 3);

    try {
        // Chargement en parallèle des données nécessaires.
        const [products, categories] = await Promise.all([
            getCached('products', apiService.getProducts),
            getCached('categories', apiService.getCategories)
        ]);

        appState.products = products; // Stocke les produits pour le filtrage.
        appState.categories = categories;

        const featuredProducts = products.slice(0, 3); // Sélectionne les produits à mettre en avant.
        
        ui.renderHeroSlider(); // Le slider est statique mais son initialisation est gérée ici.
        
        // Initialisation de Swiper.js pour le carrousel.
        new Swiper('.hero-slider', {
            loop: true,
            effect: 'fade',
            autoplay: { delay: 7000, disableOnInteraction: false },
            pagination: { el: '.swiper-pagination', clickable: true },
            navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
            lazy: true, // Active le lazy loading des images du slider.
        });
        
        ui.renderFeaturedGrid(featuredProducts);
        ui.renderCategoryFilters(categories.filter(c => !c.parent)); // Affiche uniquement les catégories parentes.
        ui.renderProductGrid(products, productGrid);
        
        setupHomepageEventListeners();

        // --- Logique de Recherche Instantanée ---
        const searchInput = document.getElementById('search-input');
        const suggestionsContainer = document.getElementById('search-suggestions');
        const searchForm = document.getElementById('search-form');

        const debounce = (func, delay) => {
            let timeout;
            return function(...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), delay);
            };
        };

        const handleSearch = async (query) => {
            if (query.length < 3) {
                suggestionsContainer.innerHTML = '';
                suggestionsContainer.classList.add('hidden');
                return;
            }
            try {
                const products = await apiService.getProducts(query);
                ui.renderSearchSuggestions(products, suggestionsContainer);
            } catch (error) {
                console.error('Search failed:', error);
                suggestionsContainer.innerHTML = `<div class="search-error"><i class="fas fa-exclamation-circle"></i><p>Error fetching results.</p></div>`;
                suggestionsContainer.classList.remove('hidden');
            }
        };

        searchInput.addEventListener('input', debounce(e => handleSearch(e.target.value), 300));

        // Quick Add from suggestions (fast lane)
        suggestionsContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.quick-add-btn');
            if (!btn) return;
            e.preventDefault();
            const item = {
                id: parseInt(btn.dataset.id, 10),
                name: btn.dataset.name,
                price: parseFloat(btn.dataset.price),
                images: btn.dataset.image ? [{ image: btn.dataset.image }] : []
            };
            cart.addToCart(item, 1);
            ui.showToast(`${item.name} added to cart!`, 'success');
            ui.renderMiniCart(cart.getCart());
        });

        // Keyboard navigation for suggestions
        let highlightedIndex = 0;
        searchInput.addEventListener('keydown', (e) => {
            const items = Array.from(suggestionsContainer.querySelectorAll('.search-result-item'));
            if (!items.length) return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                items[highlightedIndex]?.classList.remove('highlighted');
                highlightedIndex = (highlightedIndex + 1) % items.length;
                items[highlightedIndex].classList.add('highlighted');
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                items[highlightedIndex]?.classList.remove('highlighted');
                highlightedIndex = (highlightedIndex - 1 + items.length) % items.length;
                items[highlightedIndex].classList.add('highlighted');
            } else if (e.key === 'Enter') {
                const link = items[highlightedIndex]?.querySelector('a.result-link');
                if (link) {
                    e.preventDefault();
                    window.location.href = link.getAttribute('href');
                }
            } else if (e.key === 'Escape') {
                suggestionsContainer.classList.add('hidden');
            }
        });

        document.addEventListener('click', (e) => {
            if (!searchForm.contains(e.target)) {
                suggestionsContainer.classList.add('hidden');
            }
        });

        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            suggestionsContainer.classList.add('hidden');
        });

    } catch (error) {
        console.error("Error initializing homepage:", error);
        productGrid.innerHTML = `<p class="error-message">Failed to load products. Please try again later. <button onclick="location.reload()">Retry</button></p>`;
    }
}

/**
 * Initialise la page de détail d'un produit (product.html).
 */
async function initProductDetailPage() {
    const container = document.getElementById('product-detail-container');
    if (!container) return;

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        container.innerHTML = `<p class="error-message">No product ID specified. <a href="index.html">Go back to products</a>.</p>`;
        return;
    }

    try {
        const product = await apiService.getProductById(productId);
        ui.renderProductDetail(product, container);
        setupProductDetailPageEventListeners(product);
    } catch (error) {
        console.error("Error fetching product details:", error);
        container.innerHTML = `<p class="error-message">Could not load product details. It might not exist or there was a server error. <button onclick="location.reload()">Retry</button></p>`;
    }
}

/**
 * Initialise la page du panier (cart.html).
 */
function initCartPage() {
    const container = document.getElementById('cart-container');
    const checkoutSection = document.getElementById('checkout-section');
    if (!container) return;

    const render = () => {
        const items = cart.getCart();
        if (!items.length) {
            container.innerHTML = `
                <div class="cart-items-container">
                    <div class="empty-cart-message">
                        <div class="empty-cart-icon"><i class="fas fa-shopping-cart"></i></div>
                        <h2>Your cart is empty</h2>
                        <p>Browse our products and add items to your cart.</p>
                        <a href="index.html#products" class="btn btn-primary">Continue Shopping</a>
                    </div>
                </div>`;
            checkoutSection.classList.add('hidden');
            return;
        }

        const subtotal = items.reduce((t,i)=>t+i.price*i.quantity,0);
        container.innerHTML = `
            <div class="cart-layout">
                <div class="cart-items-container">
                    ${items.map(i => `
                        <div class="cart-item" data-id="${i.id}">
                            <div class="cart-item-image">
                                <img src="${i.image || 'https://via.placeholder.com/100'}" alt="${i.name}">
                            </div>
                            <div class="cart-item-details">
                                <h3>${i.name}</h3>
                                <span class="price">$${i.price.toFixed(2)}</span>
                            </div>
                            <div class="cart-item-actions">
                                <label class="quantity">Qty:
                                    <input type="number" min="1" value="${i.quantity}" class="qty-input">
                                </label>
                                <button class="btn btn-secondary remove-btn">Remove</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <aside class="cart-summary">
                    <h2>Summary</h2>
                    <div class="summary-row"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
                    <div class="summary-row total"><span>Total</span><span>$${subtotal.toFixed(2)}</span></div>
                    <button id="proceed-checkout" class="btn btn-primary checkout-btn">Proceed to Checkout</button>
                </aside>
            </div>
        `;

        checkoutSection.classList.toggle('hidden', false);

        // Events
        container.querySelectorAll('.qty-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const id = parseInt(e.target.closest('.cart-item').dataset.id, 10);
                const qty = Math.max(1, parseInt(e.target.value, 10) || 1);
                cart.updateCartItemQuantity(id, qty);
                render();
            });
        });
        container.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.closest('.cart-item').dataset.id, 10);
                cart.removeFromCart(id);
                render();
            });
        });

        document.getElementById('proceed-checkout')?.addEventListener('click', () => {
            window.location.hash = '#checkout';
            document.getElementById('checkout-section')?.scrollIntoView({ behavior: 'smooth' });
        });
    };

    // Hash-based reveal
    if (window.location.hash === '#checkout') {
        checkoutSection?.classList.remove('hidden');
    }
    render();
    document.addEventListener('cartUpdated', render);
}

// Login page submission
function initLoginPage() {
    const form = document.getElementById('login-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = form.username.value.trim();
        const password = form.password.value;
        try {
            await apiService.loginUser(username, password);
            ui.showToast('Login successful. Welcome!', 'success');
            setTimeout(()=>window.location.href='index.html', 500);
        } catch (err) {
            const box = document.getElementById('form-message');
            if (box) {
                box.className = '';
                box.classList.add('error');
                box.textContent = 'Invalid credentials. Please try again.';
            }
            ui.showToast('Login failed.', 'error');
        }
    });
}

// Register page submission
function initRegisterPage() {
    const form = document.getElementById('register-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            username: form.username.value.trim(),
            email: form.email.value.trim(),
            first_name: form.first_name.value.trim(),
            last_name: form.last_name.value.trim(),
            password: form.password.value,
            password2: form.password2.value
        };
        if (data.password !== data.password2) {
            ui.showToast('Passwords do not match.', 'error');
            return;
        }
        try {
            await apiService.registerUser(data);
            ui.showToast('Registration successful! Please log in.', 'success');
            setTimeout(()=>window.location.href='login.html?registered=true', 600);
        } catch (err) {
            ui.showToast('Registration failed. Please check your inputs.', 'error');
        }
    });
}

// --- Gestionnaires d'Événements Spécifiques aux Pages ---

/**
 * Configure les écouteurs d'événements pour la page d'accueil (filtres, ajout au panier).
 */
function setupHomepageEventListeners() {
    // Gestion du clic sur les filtres de catégorie.
    const filterContainer = document.querySelector('.filter-controls');
    if (filterContainer) {
        filterContainer.addEventListener('click', (e) => {
            const filterBtn = e.target.closest('.filter-btn');
            if (!filterBtn) return;

            // Met à jour l'état visuel des boutons.
            filterContainer.querySelector('.active')?.classList.remove('active');
            filterBtn.classList.add('active');

            const category = filterBtn.dataset.category;
            filterProducts(category);
        });
    }

    // Gestion de l'ajout au panier depuis la grille de produits.
    const productGrid = document.getElementById('product-grid');
    if (productGrid) {
        productGrid.addEventListener('click', async e => {
            const cartBtn = e.target.closest('.add-to-cart-btn');
            if (cartBtn) {
                const productId = cartBtn.dataset.productId;
                const product = appState.products.find(p => p.id == productId);
                if (product) {
                    cart.addToCart(product, 1);
                    ui.showToast(`${product.name} added to cart!`, 'success');
                    // Visual feedback
                    cartBtn.disabled = true;
                    cartBtn.innerHTML = `<i class="fas fa-check"></i> Added`;
                    setTimeout(() => {
                        cartBtn.disabled = false;
                        cartBtn.innerHTML = `<i class="fas fa-shopping-cart"></i> Add`;
                    }, 1500);
                    // Open mini-cart
                    ui.renderMiniCart(cart.getCart());
                }
            }

            const quickViewBtn = e.target.closest('.quick-view-btn');
            if (quickViewBtn) {
                e.preventDefault();
                const productId = quickViewBtn.dataset.productId;
                try {
                    const product = await apiService.getProductById(productId);
                    ui.renderQuickViewModal(product);

                    const overlay = document.getElementById('quick-view-overlay');
                    overlay.addEventListener('click', (event) => {
                        if (event.target === overlay || event.target.closest('.modal-close-btn')) {
                            overlay.remove();
                            document.body.classList.remove('no-scroll');
                        }
                    });
                    // Wire "Add to Cart" inside Quick View modal
                    overlay.addEventListener('click', (event) => {
                        const addBtn = event.target.closest('.add-to-cart-modal-btn');
                        if (!addBtn) return;
                        cart.addToCart(product, 1);
                        ui.showToast(`${product.name} added to cart!`, 'success');
                        ui.renderMiniCart(cart.getCart());
                    });

                } catch (error) {
                    console.error("Failed to load product for quick view:", error);
                    ui.showToast('Could not load product details.', 'error');
                }
            }
        });
    }
}

/**
 * Configure les écouteurs pour la page de détail de produit (galerie d'images, formulaire).
 * @param {object} product - L'objet produit pour la page actuelle.
 */
function setupProductDetailPageEventListeners(product) {
    // Galerie d'images : clic sur les miniatures.
    const thumbnails = document.querySelectorAll('.thumbnail-img');
    const mainImage = document.getElementById('main-product-image');
    if (thumbnails.length > 0 && mainImage) {
        thumbnails.forEach(thumb => {
            thumb.addEventListener('click', () => {
                mainImage.style.opacity = '0';
                setTimeout(() => {
                    mainImage.src = thumb.src; // Met à jour l'image principale.
                    mainImage.style.opacity = '1';
                }, 200);
                document.querySelector('.thumbnail-img.active')?.classList.remove('active');
                thumb.classList.add('active');
            });
        });
    }

    // Formulaire d'ajout au panier.
    const addToCartForm = document.getElementById('add-to-cart-form');
    if (addToCartForm) {
        addToCartForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const quantityInput = document.getElementById('quantity');
            const quantity = parseInt(quantityInput.value, 10);
            if (quantity > 0) {
                cart.addToCart(product, quantity);
                ui.showToast(`${product.name} (x${quantity}) added to cart!`, 'success');
                ui.renderMiniCart(cart.getCart()); // Open mini-cart after adding
            }
        });
    }
    const stickyAdd = document.getElementById('sticky-add');
    const stickyQty = document.getElementById('sticky-qty');
    if (stickyAdd && stickyQty) {
        stickyAdd.addEventListener('click', () => {
            const qty = Math.max(1, parseInt(stickyQty.value, 10) || 1);
            cart.addToCart(product, qty);
            ui.showToast(`${product.name} (x${qty}) added to cart!`, 'success');
            ui.renderMiniCart(cart.getCart());
        });
    }
}


// --- Fonctions Utilitaires ---

/**
 * Filtre les produits par catégorie et met à jour l'affichage de la grille.
 * @param {string} categorySlug - Le slug de la catégorie à filtrer. 'all' pour tout afficher.
 */
function filterProducts(categorySlug) {
    const productGrid = document.getElementById('product-grid');
    if (!productGrid) return;

    let filteredProducts;

    if (categorySlug === 'all') {
        filteredProducts = appState.products;
    } else {
        // Filtre les produits en se basant sur la catégorie stockée dans l'état global.
        filteredProducts = appState.products.filter(p => {
             return p.category.toLowerCase().replace(/\s+/g, '-') === categorySlug;
        });
    }

    // Anime la transition avant de rendre les nouveaux produits.
    productGrid.style.transition = 'opacity 0.3s ease';
    productGrid.style.opacity = '0';
    
    setTimeout(() => {
        ui.renderProductGrid(filteredProducts, productGrid);
        productGrid.style.opacity = '1';
    }, 300);
}


// --- Point d'Entrée de l'Application ---

/**
 * L'exécution démarre lorsque le DOM est entièrement chargé.
 */
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    router();
});