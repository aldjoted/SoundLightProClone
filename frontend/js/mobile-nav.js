/**
 * mobile-nav.js
 *
 * This module exports the MobileNavigation class, which creates and manages the entire
 * mobile menu experience. It features dynamic category loading, accessible focus trapping,
 * and seamless integration with the application's authentication and cart state.
 * It is instantiated by main.js.
 */
import * as apiService from './apiService.js';
import * as cart from './cart.js';

class MobileNavigation {
    constructor() {
        this.isOpen = false;
        this.focusableElements = [];
        this.init();
    }

    /**
     * Initializes the component by creating the DOM structure and setting up listeners.
     */
    init() {
        this.createMobileNavStructure();
        if (this.toggleButton) {
            this.setupEventListeners();
            this.loadAndRenderCategories();
            this.updateCartBadge();
            this.updateAuthLinks();
        }
    }

    /**
     * Dynamically creates and injects the mobile navigation elements into the DOM.
     * This ensures the navigation works even if the initial HTML is minimal.
     */
    createMobileNavStructure() {
        const headerWrapper = document.querySelector('.header-wrapper');
        // Fail gracefully if the header doesn't exist on the page.
        if (!headerWrapper) return;

        // Check if toggle button already exists in HTML
        let toggleButton = headerWrapper.querySelector('.mobile-menu-toggle');
        
        // Only create toggle button if it doesn't exist (backward compatibility)
        if (!toggleButton) {
            toggleButton = document.createElement('button');
            toggleButton.className = 'mobile-menu-toggle';
            toggleButton.setAttribute('aria-label', 'Toggle mobile menu');
            toggleButton.setAttribute('aria-expanded', 'false');
            toggleButton.setAttribute('aria-controls', 'mobile-nav-panel');
            toggleButton.innerHTML = `<span class="hamburger-icon"><span></span><span></span><span></span></span>`;
            headerWrapper.appendChild(toggleButton);
        }

        // Create the semi-transparent overlay
        const overlay = document.createElement('div');
        overlay.className = 'mobile-overlay';

        // Create the main navigation panel
        const navPanel = document.createElement('div');
        navPanel.id = 'mobile-nav-panel';
        navPanel.className = 'mobile-nav-panel';
        navPanel.setAttribute('aria-hidden', 'true');
        navPanel.innerHTML = `
            <div class="mobile-nav-header">
                <h3>Menu</h3>
                <button class="mobile-close-btn" aria-label="Close menu"><i class="fas fa-times"></i></button>
            </div>
            <div class="mobile-nav-content">
                <div class="mobile-nav-section">
                    <h4>Navigation</h4>
                    <a href="index.html" class="mobile-nav-link"><i class="fas fa-home"></i><span>Home</span></a>
                    <div id="mobile-categories-container"></div>
                    <a href="about.html" class="mobile-nav-link"><i class="fas fa-users"></i><span>About Us</span></a>
                    <a href="services.html" class="mobile-nav-link"><i class="fas fa-cogs"></i><span>Services</span></a>
                    <a href="contact.html" class="mobile-nav-link"><i class="fas fa-envelope"></i><span>Contact</span></a>
                </div>
                <div class="mobile-nav-section">
                    <h4>Account</h4>
                    <a href="cart.html" class="mobile-nav-link"><i class="fas fa-shopping-cart"></i><span>Cart</span><span id="mobile-cart-badge" class="cart-badge">0</span></a>
                    <div id="mobile-auth-container"></div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(navPanel);

        // Store references to the elements
        this.toggleButton = toggleButton;
        this.overlay = overlay;
        this.navPanel = navPanel;
        this.closeButton = navPanel.querySelector('.mobile-close-btn');
    }

    /**
     * Sets up all necessary event listeners using an efficient event delegation pattern where possible.
     */
    setupEventListeners() {
        this.toggleButton.addEventListener('click', () => this.toggle());
        this.overlay.addEventListener('click', () => this.close());
        this.closeButton.addEventListener('click', () => this.close());
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) this.close();
            if (e.key === 'Tab' && this.isOpen) this.trapFocus(e);
        });

        // Use event delegation on the panel for dynamic content (categories, links)
        this.navPanel.addEventListener('click', (e) => {
            const categoryToggle = e.target.closest('.mobile-category-toggle');
            if (categoryToggle) {
                this.toggleCategory(categoryToggle);
                return; // Prevent closing the panel when toggling a category
            }

            // Close panel after a link is clicked to allow navigation to proceed
            const link = e.target.closest('a');
            if (link) {
                setTimeout(() => this.close(), 150);
            }
        });

        document.addEventListener('cartUpdated', () => this.updateCartBadge());
    }

    /**
     * Fetches category data from the API and renders it into the mobile navigation.
     */
    async loadAndRenderCategories() {
        const container = document.getElementById('mobile-categories-container');
        if (!container) return;

        try {
            const categories = await apiService.getCategories();
            const parentCategories = categories.filter(cat => !cat.parent);
            
            container.innerHTML = parentCategories.map(category => `
                <div class="mobile-category-item">
                    <button class="mobile-category-toggle" data-category-slug="${category.slug}" aria-expanded="false" aria-label="Toggle ${category.name} subcategories">
                        <span><i class="fas fa-cube"></i>${category.name}</span>
                        <i class="fas fa-chevron-down chevron"></i>
                    </button>
                    <div class="mobile-subcategories" data-category-slug="${category.slug}">
                        ${category.children.map(child => `
                            <a href="index.html#products?category=${child.slug}" class="mobile-subcategory-link">${child.name}</a>
                        `).join('')}
                        <a href="index.html#products?category=${category.slug}" class="mobile-subcategory-link">
                            <strong>View all ${category.name}</strong>
                        </a>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Failed to load categories for mobile nav:', error);
            container.innerHTML = `<p class="mobile-nav-error">Could not load categories.</p>`;
        }
    }

    /**
     * Handles the accordion-style opening and closing of category submenus.
     * @param {HTMLElement} toggleButton - The category button that was clicked.
     */
    toggleCategory(toggleButton) {
        const isExpanded = toggleButton.getAttribute('aria-expanded') === 'true';
        const slug = toggleButton.dataset.categorySlug;
        const subcategories = this.navPanel.querySelector(`.mobile-subcategories[data-category-slug="${slug}"]`);

        // Close any other open categories first
        this.navPanel.querySelectorAll('.mobile-category-toggle[aria-expanded="true"]').forEach(btn => {
            if (btn !== toggleButton) {
                btn.setAttribute('aria-expanded', 'false');
                this.navPanel.querySelector(`.mobile-subcategories[data-category-slug="${btn.dataset.categorySlug}"]`)?.classList.remove('expanded');
            }
        });

        // Toggle the current category
        toggleButton.setAttribute('aria-expanded', !isExpanded);
        subcategories?.classList.toggle('expanded');
    }

    /**
     * Updates the cart item count badge in the mobile navigation.
     */
    updateCartBadge() {
        const badge = document.getElementById('mobile-cart-badge');
        if (badge) {
            const count = cart.getCartItemCount();
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline-flex' : 'none';
        }
    }

    /**
     * Clones and injects the desktop auth links into the mobile panel.
     * This ensures the login/register or user profile links are always in sync.
     */
    updateAuthLinks() {
        const container = document.getElementById('mobile-auth-container');
        const desktopAuth = document.querySelector('#auth-links');
        const desktopUser = document.querySelector('#user-info');
        if (!container) return;

        container.innerHTML = ''; // Clear previous links
        if (desktopAuth && !desktopAuth.classList.contains('hidden')) {
            container.appendChild(desktopAuth.cloneNode(true));
        } else if (desktopUser && !desktopUser.classList.contains('hidden')) {
            // Re-create user info for mobile context
            const userInfoClone = desktopUser.querySelector('.user-menu-toggle').cloneNode(true);
            const userLink = document.createElement('a');
            userLink.href = "#"; // Placeholder for profile page
            userLink.className = "mobile-nav-link";
            userLink.innerHTML = userInfoClone.innerHTML;
            container.appendChild(userLink);

            const logoutButton = document.createElement('button');
            logoutButton.id = "mobile-logout-button"; // Unique ID
            logoutButton.className = "mobile-nav-link";
            logoutButton.innerHTML = `<i class="fas fa-sign-out-alt"></i><span>Logout</span>`;
            logoutButton.onclick = () => document.getElementById('logout-button')?.click(); // Trigger main logout logic
            container.appendChild(logoutButton);
        }
    }

    /**
     * Toggles the visibility of the mobile navigation panel.
     */
    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    /**
     * Opens the mobile navigation panel with proper ARIA attributes and focus management.
     */
    open() {
        this.isOpen = true;
        this.toggleButton.classList.add('active');
        this.toggleButton.setAttribute('aria-expanded', 'true');
        this.overlay.classList.add('active');
        this.navPanel.classList.add('active');
        this.navPanel.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        // A11Y: Set up focus trapping
        this.updateFocusableElements();
        this.closeButton.focus();
    }

    /**
     * Closes the mobile navigation panel and restores focus.
     */
    close() {
        this.isOpen = false;
        this.toggleButton.classList.remove('active');
        this.toggleButton.setAttribute('aria-expanded', 'false');
        this.overlay.classList.remove('active');
        this.navPanel.classList.remove('active');
        this.navPanel.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        
        // A11Y: Return focus to the button that opened the menu
        this.toggleButton.focus();
    }

    /**
     * Updates the list of focusable elements within the open panel.
     */
    updateFocusableElements() {
        const focusableSelector = 'a[href], button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])';
        this.focusableElements = Array.from(this.navPanel.querySelectorAll(focusableSelector))
            .filter(el => !el.hasAttribute('disabled') && !el.closest('[aria-hidden="true"]'));
    }

    /**
     * Traps the focus within the mobile navigation panel for accessibility.
     * @param {KeyboardEvent} e - The keyboard event.
     */
    trapFocus(e) {
        if (this.focusableElements.length === 0) return;

        const firstElement = this.focusableElements[0];
        const lastElement = this.focusableElements[this.focusableElements.length - 1];

        if (e.shiftKey) { // Shift + Tab
            if (document.activeElement === firstElement) {
                lastElement.focus();
                e.preventDefault();
            }
        } else { // Tab
            if (document.activeElement === lastElement) {
                firstElement.focus();
                e.preventDefault();
            }
        }
    }
}

export default MobileNavigation;