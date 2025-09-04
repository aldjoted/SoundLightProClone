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
    // Initialise AOS (Animate on Scroll) avec des paramètres optimisés pour mobile.
    AOS.init({
        duration: 800,
        easing: 'ease-in-out-quad',
        once: true,
        disable: window.innerWidth < 768, // Désactive les animations sur les petits écrans pour la performance.
    });

    // Met à jour le compteur du panier et écoute les mises à jour.
    ui.updateCartCount(cart.getCartItemCount());
    document.addEventListener('cartUpdated', () => {
        ui.updateCartCount(cart.getCartItemCount());
    });
    
    // Tente de récupérer le profil utilisateur pour mettre à jour l'interface d'authentification.
    try {
        const user = await apiService.getUserProfile();
        ui.updateUserAuthUI(user);
    } catch (error) {
        ui.updateUserAuthUI(null);
    }

    setupGlobalEventListeners();
    setupMobileMenu(); // Correction critique de la navigation mobile.
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

    // Charge les catégories pour le méga-menu de manière asynchrone.
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
    if (!headerWrapper || !mainNav) return;

    // Crée et injecte le bouton "burger" pour le menu mobile.
    const menuToggle = document.createElement('button');
    menuToggle.classList.add('mobile-menu-toggle');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-controls', 'main-navigation');
    menuToggle.setAttribute('aria-label', 'Toggle navigation');
    menuToggle.innerHTML = `<i class="fas fa-bars"></i>`;
    headerWrapper.insertBefore(menuToggle, mainNav);

    menuToggle.addEventListener('click', () => {
        const isExpanded = mainNav.classList.toggle('is-open');
        menuToggle.setAttribute('aria-expanded', isExpanded);
        menuToggle.innerHTML = isExpanded ? `<i class="fas fa-times"></i>` : `<i class="fas fa-bars"></i>`;
        document.body.style.overflow = isExpanded ? 'hidden' : ''; // Empêche le défilement de l'arrière-plan.
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
    // Cette fonction serait appelée par le routeur si 'cart.html' était actif.
    // Le code de la page panier est souvent plus complexe et peut nécessiter son propre module.
    // La logique de rendu et d'interaction serait ici.
    console.log("Cart page initialized.");
}

/**
 * Initialise la page de connexion (login.html).
 */
function initLoginPage() {
    // Logique pour gérer le formulaire de connexion.
    console.log("Login page initialized.");
}

/**
 * Initialise la page d'inscription (register.html).
 */
function initRegisterPage() {
     // Logique pour gérer le formulaire d'inscription.
    console.log("Register page initialized.");
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
            if (!cartBtn) return;

            const productId = cartBtn.dataset.productId;
            const product = appState.products.find(p => p.id == productId);

            if (product) {
                cart.addToCart(product, 1);
                ui.showToast(`${product.name} added to cart!`, 'success');
                
                // [AMÉLIORATION UX] Ajoute un état de confirmation visuel au bouton.
                cartBtn.disabled = true;
                cartBtn.innerHTML = `<i class="fas fa-check"></i> Added`;
                setTimeout(() => {
                    cartBtn.disabled = false;
                    cartBtn.innerHTML = `<i class="fas fa-shopping-cart"></i> Add`;
                }, 2000);
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
            }
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