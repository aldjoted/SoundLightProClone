/**
 * advanced-search.js (Simplified)
 *
 * Lean, efficient live search: debounced suggestions and full search redirect.
 * Removed voice search, history, and filter panel to keep UX simple.
 */
import * as apiService from './apiService.js';
import * as cart from './cart.js';
import { renderSearchSuggestions, showToast } from './ui.js';

class AdvancedSearch {
    constructor() {
        this.input = document.getElementById('search-input');
        this.form = document.getElementById('search-form');
        this.container = document.getElementById('search-suggestions');
        if (!this.input || !this.form || !this.container) return;

        this.query = '';
        this.debounceId = null;
        this.abortController = null;

        this.bindEvents();
    }

    bindEvents() {
        this.input.addEventListener('input', () => {
            this.query = this.input.value.trim();
            clearTimeout(this.debounceId);
            if (this.query.length < 2) {
                this.hideSuggestions();
                return;
            }
            this.debounceId = setTimeout(() => this.search(), 250);
        });

        this.input.addEventListener('focus', () => {
            if (this.container.innerHTML.trim()) this.showSuggestions();
        });
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.hideSuggestions();
        });

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

    async search() {
        // cancel previous
        if (this.abortController) this.abortController.abort();
        this.abortController = new AbortController();
        const { signal } = this.abortController;

        try {
            const products = await apiService.getProducts(this.query, { signal });
            renderSearchSuggestions(products, this.container);
            this.showSuggestions();
        } catch (err) {
            if (err?.name === 'AbortError') return;
            this.container.innerHTML = `<div class="search-no-results"><i class="far fa-frown"></i><p>Search failed. Try again.</p></div>`;
            this.showSuggestions();
        }
    }

    showSuggestions() { this.container.classList.remove('hidden'); }
    hideSuggestions() { this.container.classList.add('hidden'); this.container.innerHTML = ''; }
}

export default AdvancedSearch;