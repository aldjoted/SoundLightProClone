/**
 * Module de Navigation Mobile Avancée
 * Gère l'ouverture/fermeture du menu mobile avec animations fluides
 */

class MobileNavigation {
    constructor() {
        this.isOpen = false;
        this.categories = [];
        this.init();
    }

    init() {
        this.createMobileNavStructure();
        this.setupEventListeners();
        this.loadCategories();
    }

    createMobileNavStructure() {
        const headerWrapper = document.querySelector('.header-wrapper');
        if (!headerWrapper) return;

        // Créer le bouton hamburger amélioré
        const toggleButton = document.createElement('button');
        toggleButton.className = 'mobile-menu-toggle';
        toggleButton.setAttribute('aria-label', 'Toggle mobile menu');
        toggleButton.innerHTML = `
            <div class="hamburger">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;

        // Créer l'overlay
        const overlay = document.createElement('div');
        overlay.className = 'mobile-overlay';

        // Créer le panneau de navigation
        const navPanel = document.createElement('div');
        navPanel.className = 'mobile-nav-panel';
        navPanel.innerHTML = `
            <div class="mobile-nav-header">
                <h3>Menu</h3>
                <button class="mobile-close-btn" aria-label="Close menu">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="mobile-nav-content">
                <div class="mobile-nav-section">
                    <h4>Navigation</h4>
                    <a href="index.html" class="mobile-nav-link">
                        <i class="fas fa-home"></i>
                        <span>Accueil</span>
                    </a>
                    <div id="mobile-categories-container"></div>
                    <a href="about.html" class="mobile-nav-link">
                        <i class="fas fa-users"></i>
                        <span>À Propos</span>
                    </a>
                    <a href="services.html" class="mobile-nav-link">
                        <i class="fas fa-cogs"></i>
                        <span>Services</span>
                    </a>
                    <a href="contact.html" class="mobile-nav-link">
                        <i class="fas fa-envelope"></i>
                        <span>Contact</span>
                    </a>
                    <a href="cart.html" class="mobile-nav-link">
                        <i class="fas fa-shopping-cart"></i>
                        <span>Panier</span>
                        <span id="mobile-cart-badge" class="cart-badge">0</span>
                    </a>
                </div>
                <div class="mobile-auth-section">
                    <div id="mobile-auth-container"></div>
                </div>
            </div>
        `;

        // Ajouter les éléments au DOM
        headerWrapper.appendChild(toggleButton);
        document.body.appendChild(overlay);
        document.body.appendChild(navPanel);

        // Stocker les références
        this.toggleButton = toggleButton;
        this.overlay = overlay;
        this.navPanel = navPanel;
        this.closeButton = navPanel.querySelector('.mobile-close-btn');
    }

    setupEventListeners() {
        // Ouvrir/fermer avec le bouton hamburger
        this.toggleButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // Fermer avec l'overlay
        this.overlay.addEventListener('click', () => {
            this.close();
        });

        // Fermer avec le bouton X
        this.closeButton.addEventListener('click', () => {
            this.close();
        });

        // Fermer avec Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // Gestion des catégories extensibles
        document.addEventListener('click', (e) => {
            const categoryToggle = e.target.closest('.mobile-category-toggle');
            if (categoryToggle) {
                this.toggleCategory(categoryToggle);
            }
        });

        // Mettre à jour le badge du panier
        document.addEventListener('cartUpdated', () => {
            this.updateCartBadge();
        });

        // Fermer le menu lors de la navigation
        document.addEventListener('click', (e) => {
            const link = e.target.closest('.mobile-nav-link');
            if (link && !link.classList.contains('mobile-category-toggle')) {
                setTimeout(() => this.close(), 150);
            }
        });
    }

    async loadCategories() {
        try {
            // Importer dynamiquement le service API
            const apiService = await import('./apiService.js');
            const categories = await apiService.getCategories();
            this.categories = categories;
            this.renderCategories();
        } catch (error) {
            console.error('Erreur lors du chargement des catégories:', error);
        }
    }

    renderCategories() {
        const container = document.getElementById('mobile-categories-container');
        if (!container) return;

        const parentCategories = this.categories.filter(cat => !cat.parent);
        
        container.innerHTML = parentCategories.map(category => `
            <div class="mobile-category-item">
                <button class="mobile-category-toggle" data-category="${category.slug}">
                    <span>
                        <i class="fas fa-cube"></i>
                        ${category.name}
                    </span>
                    <i class="fas fa-chevron-down chevron"></i>
                </button>
                <div class="mobile-subcategories" data-category="${category.slug}">
                    ${category.children ? category.children.map(child => `
                        <a href="index.html#products?category=${child.slug}" class="mobile-subcategory-link">
                            ${child.name}
                        </a>
                    `).join('') : ''}
                    <a href="index.html#products?category=${category.slug}" class="mobile-subcategory-link">
                        <strong>Voir tout ${category.name}</strong>
                    </a>
                </div>
            </div>
        `).join('');
    }

    toggleCategory(toggleButton) {
        const categorySlug = toggleButton.dataset.category;
        const subcategories = document.querySelector(`.mobile-subcategories[data-category="${categorySlug}"]`);
        
        // Fermer toutes les autres catégories
        document.querySelectorAll('.mobile-category-toggle.expanded').forEach(btn => {
            if (btn !== toggleButton) {
                btn.classList.remove('expanded');
                const otherSubs = document.querySelector(`.mobile-subcategories[data-category="${btn.dataset.category}"]`);
                if (otherSubs) otherSubs.classList.remove('expanded');
            }
        });

        // Toggle la catégorie actuelle
        toggleButton.classList.toggle('expanded');
        if (subcategories) {
            subcategories.classList.toggle('expanded');
        }
    }

    updateCartBadge() {
        const badge = document.getElementById('mobile-cart-badge');
        if (badge) {
            // Importer dynamiquement le module cart
            import('./cart.js').then(cartModule => {
                const count = cartModule.getCartItemCount();
                badge.textContent = count;
                badge.style.display = count > 0 ? 'inline-flex' : 'none';
            });
        }
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.isOpen = true;
        this.toggleButton.classList.add('active');
        this.overlay.classList.add('active');
        this.navPanel.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Focus management pour l'accessibilité
        this.closeButton.focus();
    }

    close() {
        this.isOpen = false;
        this.toggleButton.classList.remove('active');
        this.overlay.classList.remove('active');
        this.navPanel.classList.remove('active');
        document.body.style.overflow = '';
        
        // Retourner le focus au bouton hamburger
        this.toggleButton.focus();
    }
}

// Initialiser la navigation mobile quand le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
    new MobileNavigation();
});

export default MobileNavigation;
