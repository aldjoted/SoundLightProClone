/**
 * advanced-search.js (Enhanced)
 *
 * Lean, efficient live search with adaptive debouncing for better UX.
 * Features: debounced suggestions, full search redirect, and adaptive timing.
 */
import * as apiService from './apiService.js';
import * as cart from './cart.js';
import { renderSearchSuggestions, showToast } from './ui.js';
import { debounce } from './utils.js';
import { GoogleAnalytics } from './analytics.js';

/**
 * Adaptive Debouncer - Adjusts delay based on typing speed
 * Fast typing = shorter delay for better responsiveness
 * Slow typing = longer delay to save API calls
 */
class AdaptiveDebouncer {
    constructor(minDelay = 150, maxDelay = 400) {
        this.minDelay = minDelay;
        this.maxDelay = maxDelay;
        this.recentInputs = [];
    }

    /**
     * Calculates appropriate delay based on typing speed
     * @returns {number} The delay in milliseconds
     */
    getDelay() {
        const now = Date.now();
        // Keep only inputs from the last second
        this.recentInputs = this.recentInputs.filter(t => now - t < 1000);

        // If user is typing rapidly (3+ inputs in last second), use shorter delay
        if (this.recentInputs.length > 3) {
            return this.minDelay; // Fast typing = fast response
        }
        return this.maxDelay; // Slow typing = save API calls
    }

    /**
     * Creates a debounced function with adaptive timing
     * @param {Function} fn - Function to debounce
     * @returns {Function} Debounced function
     */
    debounce(fn) {
        let timeout;
        return (...args) => {
            this.recentInputs.push(Date.now());
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args), this.getDelay());
        };
    }
}

class AdvancedSearch {
    constructor() {
        this.input = document.getElementById('search-input');
        this.form = document.getElementById('search-form');
        this.container = document.getElementById('search-suggestions');
        if (!this.input || !this.form || !this.container) return;

        this.query = '';
        this.abortController = null;
        this.items = [];
        this.highlightIndex = -1;

        // ARIA setup for combobox pattern
        this.input.setAttribute('role', 'combobox');
        this.input.setAttribute('aria-autocomplete', 'list');
        this.input.setAttribute('aria-expanded', 'false');
        this.input.setAttribute('aria-haspopup', 'listbox');

        // ✅ Use adaptive debouncer for better UX
        const adaptiveDebouncer = new AdaptiveDebouncer();
        this.debouncedSearch = adaptiveDebouncer.debounce(() => this.search());

        this.bindEvents();
    }

    bindEvents() {
        this.input.addEventListener('input', () => {
            this.query = this.input.value.trim();
            if (this.query.length < 2) {
                this.hideSuggestions();
                return;
            }
            // Use the debounced search function
            this.debouncedSearch();
        });

        this.input.addEventListener('focus', () => {
            if (this.container.innerHTML.trim()) this.showSuggestions();
        });
        this.input.addEventListener('keydown', (e) => this.handleInputKeydown(e));

        document.addEventListener('click', (e) => {
            const root = this.input.closest('.search-container');
            if (!root || !root.contains(e.target)) this.hideSuggestions();
        });

        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            const q = this.input.value.trim();
            if (!q) return;
            const params = new URLSearchParams({ q });
            window.location.href = `search-results.html?${params.toString()}`;
        });

        this.container.addEventListener('click', (e) => {
            const quickAdd = e.target.closest('.quick-add-btn');
            if (quickAdd) {
                e.preventDefault();
                const product = {
                    id: parseInt(quickAdd.dataset.id, 10),
                    name: quickAdd.dataset.name,
                    price: parseFloat(quickAdd.dataset.price),
                    images: quickAdd.dataset.image ? [{ image: quickAdd.dataset.image }] : [],
                };
                cart.addToCart(product, 1);
                showToast(`${product.name} added to cart!`, 'success');
            }
        });
    }

    handleInputKeydown(e) {
        const key = e.key;
        if (key === 'Escape') {
            this.hideSuggestions();
            return;
        }
        // Keyboard navigation only when suggestions are visible
        if (this.container?.classList?.contains('hidden') === false) {
            if (key === 'ArrowDown') {
                e.preventDefault();
                this.moveHighlight(1);
                return;
            }
            if (key === 'ArrowUp') {
                e.preventDefault();
                this.moveHighlight(-1);
                return;
            }
            if (key === 'Enter') {
                if (this.highlightIndex >= 0 && this.items[this.highlightIndex]) {
                    e.preventDefault();
                    const link = this.items[this.highlightIndex]?.querySelector('a.result-link');
                    if (link?.href) {
                        window.location.href = link.href;
                    } else {
                        this.form.requestSubmit();
                    }
                }
            }
        }
    }

    async search() {
        // cancel previous
        if (this.abortController) this.abortController.abort();
        this.abortController = new AbortController();
        const { signal } = this.abortController;

        try {
            const products = await apiService.getProducts(this.query, { signal });
            renderSearchSuggestions(products, this.container);
            this.initKeyboardState();
            this.showSuggestions();

            // Track search analytics
            GoogleAnalytics.trackSearch(this.query, products?.length || 0);
        } catch (err) {
            if (err?.name === 'AbortError') return;
            this.container.innerHTML = '';
            const noResults = document.createElement('div');
            noResults.className = 'search-no-results';

            const icon = document.createElement('i');
            icon.className = 'far fa-frown';

            const p = document.createElement('p');
            p.textContent = 'Search failed. Try again.';

            noResults.appendChild(icon);
            noResults.appendChild(p);
            this.container.appendChild(noResults);
            this.showSuggestions();
        }
    }

    showSuggestions() {
        this.container.classList.remove('hidden');
        this.input.setAttribute('aria-expanded', 'true');
    }
    hideSuggestions() {
        this.container.classList.add('hidden');
        this.container.innerHTML = '';
        this.items = [];
        this.highlightIndex = -1;
        this.input.removeAttribute('aria-activedescendant');
        this.input.setAttribute('aria-expanded', 'false');
    }

    initKeyboardState() {
        // Ensure the listbox has an ID and wire aria-controls
        const ul = this.container.querySelector('ul[role="listbox"]');
        if (ul) {
            if (!ul.id) ul.id = 'search-suggestions-list';
            this.input.setAttribute('aria-controls', ul.id);
        }
        this.items = Array.from(this.container.querySelectorAll('li.search-result-item'));
        this.highlightIndex = this.items.length ? 0 : -1;
        this.syncHighlight();
    }

    moveHighlight(delta) {
        if (!this.items.length) return;
        const next = (this.highlightIndex + delta + this.items.length) % this.items.length;
        this.highlightIndex = next;
        this.syncHighlight();
    }

    syncHighlight() {
        this.items.forEach((li, idx) => {
            const isActive = idx === this.highlightIndex;
            li.classList.toggle('highlighted', isActive);
            li.setAttribute('aria-selected', String(isActive));
            if (!li.id) li.id = `search-option-${idx}`;
            if (isActive) {
                this.input.setAttribute('aria-activedescendant', li.id);
                // Keep highlighted item in view
                li.scrollIntoView({ block: 'nearest' });
            }
        });
        if (this.highlightIndex === -1) {
            this.input.removeAttribute('aria-activedescendant');
        }
    }
}

export default AdvancedSearch;