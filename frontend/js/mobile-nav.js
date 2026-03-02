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
            const hamburger = document.createElement('span');
            hamburger.className = 'hamburger-icon';
            hamburger.appendChild(document.createElement('span'));
            hamburger.appendChild(document.createElement('span'));
            hamburger.appendChild(document.createElement('span'));
            toggleButton.appendChild(hamburger);
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

        const navHeader = document.createElement('div');
        navHeader.className = 'mobile-nav-header';

        const h3 = document.createElement('h3');
        h3.textContent = 'Menu';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'mobile-close-btn';
        closeBtn.setAttribute('aria-label', 'Close menu');
        const closeIcon = document.createElement('i');
        closeIcon.className = 'fas fa-times';
        closeBtn.appendChild(closeIcon);

        navHeader.appendChild(h3);
        navHeader.appendChild(closeBtn);

        const navContent = document.createElement('div');
        navContent.className = 'mobile-nav-content';

        // Navigation Section
        const navSection = document.createElement('div');
        navSection.className = 'mobile-nav-section';

        const h4Nav = document.createElement('h4');
        h4Nav.textContent = 'Navigation';
        navSection.appendChild(h4Nav);

        const createNavLink = (href, iconClass, text) => {
            const a = document.createElement('a');
            a.href = href;
            a.className = 'mobile-nav-link';
            const i = document.createElement('i');
            i.className = iconClass;
            const span = document.createElement('span');
            span.textContent = text;
            a.appendChild(i);
            a.appendChild(span);
            return a;
        };

        navSection.appendChild(createNavLink('index.html', 'fas fa-home', 'Home'));

        const categoriesContainer = document.createElement('div');
        categoriesContainer.id = 'mobile-categories-container';
        navSection.appendChild(categoriesContainer);

        navSection.appendChild(createNavLink('about.html', 'fas fa-users', 'About Us'));
        navSection.appendChild(createNavLink('services.html', 'fas fa-cogs', 'Services'));
        navSection.appendChild(createNavLink('contact.html', 'fas fa-envelope', 'Contact'));

        // Account Section
        const accountSection = document.createElement('div');
        accountSection.className = 'mobile-nav-section';

        const h4Account = document.createElement('h4');
        h4Account.textContent = 'Account';
        accountSection.appendChild(h4Account);

        const cartLink = document.createElement('a');
        cartLink.href = 'cart.html';
        cartLink.className = 'mobile-nav-link mobile-cart-link';

        const cartIcon = document.createElement('i');
        cartIcon.className = 'fas fa-shopping-cart';

        const cartText = document.createElement('span');
        cartText.textContent = 'Cart';

        const cartBadge = document.createElement('span');
        cartBadge.id = 'mobile-cart-badge';
        cartBadge.className = 'mobile-cart-badge';
        cartBadge.textContent = '0';

        cartLink.appendChild(cartIcon);
        cartLink.appendChild(cartText);
        cartLink.appendChild(cartBadge);

        accountSection.appendChild(cartLink);

        const authContainer = document.createElement('div');
        authContainer.id = 'mobile-auth-container';
        accountSection.appendChild(authContainer);

        navContent.appendChild(navSection);
        navContent.appendChild(accountSection);

        navPanel.appendChild(navHeader);
        navPanel.appendChild(navContent);

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

            container.textContent = ''; // Clear container

            parentCategories.forEach(category => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'mobile-category-item';

                const button = document.createElement('button');
                button.className = 'mobile-category-toggle';
                button.dataset.categorySlug = category.slug;
                button.setAttribute('aria-expanded', 'false');
                button.setAttribute('aria-label', `Toggle ${category.name} subcategories`);

                const span = document.createElement('span');
                const icon = document.createElement('i');
                icon.className = 'fas fa-cube';
                span.appendChild(icon);
                span.appendChild(document.createTextNode(category.name));

                const chevron = document.createElement('i');
                chevron.className = 'fas fa-chevron-down chevron';

                button.appendChild(span);
                button.appendChild(chevron);

                const subDiv = document.createElement('div');
                subDiv.className = 'mobile-subcategories';
                subDiv.dataset.categorySlug = category.slug;

                category.children.forEach(child => {
                    const a = document.createElement('a');
                    a.href = `search-results.html?category=${encodeURIComponent(child.slug)}`;
                    a.className = 'mobile-subcategory-link';
                    a.textContent = child.name;
                    subDiv.appendChild(a);
                });

                const viewAllLink = document.createElement('a');
                viewAllLink.href = `search-results.html?category=${encodeURIComponent(category.slug)}`;
                viewAllLink.className = 'mobile-subcategory-link';
                const strong = document.createElement('strong');
                strong.textContent = `View all ${category.name}`;
                viewAllLink.appendChild(strong);
                subDiv.appendChild(viewAllLink);

                itemDiv.appendChild(button);
                itemDiv.appendChild(subDiv);
                container.appendChild(itemDiv);
            });

        } catch (error) {
            console.error('Failed to load categories for mobile nav:', error);
            container.textContent = '';
            const p = document.createElement('p');
            p.className = 'mobile-nav-error';
            p.textContent = 'Could not load categories.';
            container.appendChild(p);
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
            // Always display the badge (like the header cart badge)
            badge.style.display = 'inline-flex';
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

        container.textContent = ''; // Clear previous links
        if (desktopAuth && !desktopAuth.classList.contains('hidden')) {
            container.appendChild(desktopAuth.cloneNode(true));
        } else if (desktopUser && !desktopUser.classList.contains('hidden')) {
            const dashboardLink = document.createElement('a');
            dashboardLink.href = 'dashboard.html';
            dashboardLink.className = 'mobile-nav-link';

            const dashIcon = document.createElement('i');
            dashIcon.className = 'fas fa-tachometer-alt';
            const dashSpan = document.createElement('span');
            dashSpan.textContent = 'Dashboard';

            dashboardLink.appendChild(dashIcon);
            dashboardLink.appendChild(dashSpan);
            container.appendChild(dashboardLink);

            const logoutButton = document.createElement('button');
            logoutButton.id = 'mobile-logout-button';
            logoutButton.className = 'mobile-nav-link';

            const logoutIcon = document.createElement('i');
            logoutIcon.className = 'fas fa-sign-out-alt';
            const logoutSpan = document.createElement('span');
            logoutSpan.setAttribute('data-i18n', 'nav_logout');
            logoutSpan.textContent = 'Logout';

            logoutButton.appendChild(logoutIcon);
            logoutButton.appendChild(logoutSpan);

            logoutButton.onclick = () => document.getElementById('logout-button')?.click();
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