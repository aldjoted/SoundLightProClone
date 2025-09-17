/**
 * advanced-search.js
 *
 * This module exports the AdvancedSearch class, which encapsulates all logic for the
 * site's predictive and filterable search functionality. It is instantiated by main.js.
 * Features include debounced live search, search history, voice search, and advanced filtering.
 */
import * as apiService from './apiService.js';
import * as cart from './cart.js';
import { showToast } from './ui.js';

class AdvancedSearch {
    constructor() {
        this.searchInput = document.getElementById('search-input');
        if (!this.searchInput) return; // Gracefully exit if search is not on the page

        this.suggestionsContainer = document.getElementById('search-suggestions');
        this.searchForm = document.getElementById('search-form');
        this.searchContainer = this.searchInput.closest('.search-container');
        
        this.currentQuery = '';
        this.searchHistory = this.getSearchHistory();
        this.debounceTimeout = null;
    this.isListening = false;
    this.lastQueryIssued = '';
    this.abortController = null;
        
        this.init();
    }

    /**
     * Initializes the search module by creating UI and setting up listeners.
     */
    init() {
        this.createAdvancedSearchInterface();
        this.setupEventListeners();
        this.setupVoiceSearch();
    }

    /**
     * Dynamically creates and injects the advanced search UI components.
     */
    createAdvancedSearchInterface() {
        if (!this.searchContainer) return;

        const advancedElements = document.createElement('div');
        advancedElements.className = 'advanced-search-controls';
        advancedElements.innerHTML = `
            <button type="button" class="voice-search-btn" title="Voice Search" aria-label="Search by voice">
                <i class="fas fa-microphone"></i>
            </button>
            <button type="button" class="search-filters-btn" title="Advanced Filters" aria-label="Show advanced search filters">
                <i class="fas fa-sliders-h"></i>
            </button>
            <div class="search-filters-panel hidden" role="dialog" aria-modal="true" aria-labelledby="filters-header">
                <div class="filters-header">
                    <h4 id="filters-header">Search Filters</h4>
                    <button class="close-filters-btn" aria-label="Close filters"><i class="fas fa-times"></i></button>
                </div>
                <div class="filters-content">
                    <div class="filter-group">
                        <label for="category-filter">Category</label>
                        <select id="category-filter"><option value="">All Categories</option></select>
                    </div>
                    <div class="filter-group">
                        <label for="brand-filter">Brand</label>
                        <select id="brand-filter"><option value="">All Brands</option></select>
                    </div>
                    <div class="filter-group">
                        <label>Price Range</label>
                        <div class="price-range">
                            <input type="number" id="min-price" placeholder="Min $" min="0" aria-label="Minimum price">
                            <span>to</span>
                            <input type="number" id="max-price" placeholder="Max $" min="0" aria-label="Maximum price">
                        </div>
                    </div>
                    <div class="filter-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="in-stock-only"> <span>In Stock Only</span>
                        </label>
                    </div>
                </div>
                <div class="filter-actions">
                    <button type="button" class="btn btn-secondary clear-filters-btn">Clear</button>
                    <button type="button" class="btn btn-primary apply-filters-btn">Apply</button>
                </div>
            </div>
        `;

        this.searchForm.insertAdjacentElement('afterend', advancedElements);
        this.suggestionsContainer.className = 'search-suggestions-container advanced';
    }

    /**
     * Sets up all event listeners for the search component using delegation.
     */
    setupEventListeners() {
        this.searchInput.addEventListener('input', () => {
            this.currentQuery = this.searchInput.value.trim();
            this.debouncedSearch();
        });

        this.searchInput.addEventListener('focus', () => this.openSearch());
        this.searchInput.addEventListener('keydown', (e) => this.handleKeyNavigation(e));

        document.addEventListener('click', (e) => {
            if (!this.searchContainer.contains(e.target)) {
                this.closeSearch();
            }
        });

        this.searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.performFullSearch();
        });

        // Use event delegation for dynamically added controls
        this.searchContainer.addEventListener('click', (e) => {
            const target = e.target;
            if (target.closest('.voice-search-btn')) this.toggleVoiceSearch();
            if (target.closest('.search-filters-btn')) this.toggleFiltersPanel(true);
            if (target.closest('.close-filters-btn')) this.toggleFiltersPanel(false);
            if (target.closest('.apply-filters-btn')) this.applyFilters();
            if (target.closest('.clear-filters-btn')) this.clearFilters();
        });

        this.suggestionsContainer.addEventListener('click', (e) => {
            const historyQueryBtn = e.target.closest('.history-query');
            if(historyQueryBtn) {
                this.searchInput.value = historyQueryBtn.dataset.query;
                this.performFullSearch();
            }
            const removeHistoryBtn = e.target.closest('.remove-history');
            if(removeHistoryBtn) {
                this.removeFromHistory(removeHistoryBtn.dataset.query);
                this.renderSearchHistory();
            }
        });
    }

    /**
     * Configures the SpeechRecognition API for voice search.
     */
    setupVoiceSearch() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            this.searchContainer.querySelector('.voice-search-btn')?.style.setProperty('display', 'none', 'important');
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event) => {
            const result = event.results[0][0].transcript;
            this.searchInput.value = result;
            this.currentQuery = result;
            this.debouncedSearch();
            this.stopVoiceSearch();
        };

        this.recognition.onerror = () => this.stopVoiceSearch();
        this.recognition.onend = () => this.stopVoiceSearch();
    }

    /**
     * Debounces the search input to prevent excessive API calls.
     */
    debouncedSearch() {
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = setTimeout(() => this.performSearch(), 300);
    }

    /**
     * Performs a live search for suggestions.
     */
    async performSearch() {
        if (this.currentQuery.length < 2) {
            this.renderSearchHistory();
            return;
        }
        // Cancel any in-flight request
        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();
        const { signal } = this.abortController;

        this.showSearchLoader();
        try {
            this.lastQueryIssued = this.currentQuery;
            const products = await apiService.getProducts(this.currentQuery, { signal });
            const enrichedResults = this.enrichSearchResults(products);
            // Ignore if the input changed since request was sent
            if (this.lastQueryIssued === this.currentQuery) {
                this.renderSearchResults(enrichedResults);
            }
        } catch (error) {
            if (error.name === 'AbortError') return; // Silent on cancel
            console.error('Search error:', error);
            this.renderSearchError();
        }
    }

    /**
     * Enriches search results with relevance scores and match types.
     * @param {Array<Object>} products - The raw product results.
     * @returns {Array<Object>} The sorted and enriched results.
     */
    enrichSearchResults(products) {
        const queryLower = this.currentQuery.toLowerCase();
        return products.map(product => {
            let score = 0;
            if (product.name.toLowerCase().includes(queryLower)) score += 10;
            if (product.category.toLowerCase().includes(queryLower)) score += 5;
            if (product.description?.toLowerCase().includes(queryLower)) score += 3;
            if (product.stock > 0) score += 2;
            return { ...product, relevanceScore: score };
        }).sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    /**
     * Renders the search results dropdown using secure DOM manipulation.
     * @param {Array<Object>} products - The products to render.
     */
    renderSearchResults(products) {
        this.suggestionsContainer.innerHTML = ''; // Clear previous content
        if (products.length === 0) {
            const noRes = document.createElement('div');
            noRes.className = 'search-no-results';
            noRes.appendChild(document.createElement('i')).className = 'fas fa-search';
            const p = document.createElement('p');
            p.textContent = `No products found for "${this.currentQuery}"`;
            noRes.appendChild(p);
            this.suggestionsContainer.appendChild(noRes);
            this.suggestionsContainer.style.display = 'block';
            return;
        }

        const container = document.createElement('div');
        container.className = 'search-results-container';

        const topResults = products.slice(0, 5);

        const list = document.createElement('ul');
        list.className = 'results-list';
        list.setAttribute('role', 'listbox');

        topResults.forEach(product => {
            const item = document.createElement('li');
            item.className = 'search-result-item';
            item.setAttribute('role', 'option');
            const link = document.createElement('a');
            link.href = `product.html?id=${product.id}`;
            link.className = 'result-link';
            const img = document.createElement('img');
            img.src = product.images?.[0]?.image || 'https://via.placeholder.com/60';
            img.alt = product.name;
            img.loading = 'lazy';
            const details = document.createElement('div');
            details.className = 'result-details';
            const nameSpan = document.createElement('span');
            nameSpan.className = 'result-name';
            // safe highlight: split into text + <mark>
            const parts = product.name.split(new RegExp(`(${this.currentQuery})`, 'gi'));
            parts.forEach(part => {
                if (part.toLowerCase() === this.currentQuery.toLowerCase()) {
                    const mark = document.createElement('mark');
                    mark.textContent = part;
                    nameSpan.appendChild(mark);
                } else {
                    nameSpan.appendChild(document.createTextNode(part));
                }
            });
            const catSpan = document.createElement('span');
            catSpan.className = 'result-category';
            catSpan.textContent = product.category;
            details.appendChild(nameSpan);
            details.appendChild(catSpan);
            link.appendChild(img);
            link.appendChild(details);
            item.appendChild(link);
            list.appendChild(item);
        });
        container.appendChild(list);

        const actions = document.createElement('div');
        actions.className = 'search-actions';
        const actionLink = document.createElement('a');
        actionLink.href = '#';
        actionLink.className = 'search-action view-all-results';
        const icon = document.createElement('i');
        icon.className = 'fas fa-list';
        actionLink.appendChild(icon);
        actionLink.appendChild(document.createTextNode(` See all ${products.length} results`));
        actions.appendChild(actionLink);
        container.appendChild(actions);

        this.suggestionsContainer.appendChild(container);
        this.suggestionsContainer.style.display = 'block';
        this.saveToHistory(this.currentQuery);
    }

    /**
     * Renders the user's recent search history.
     */
    renderSearchHistory() {
        this.suggestionsContainer.innerHTML = '';
        if (this.searchHistory.length === 0) {
            this.suggestionsContainer.innerHTML = `<div class="search-no-history"><p>No recent searches.</p></div>`;
            this.suggestionsContainer.style.display = 'block';
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'search-history';
        const heading = document.createElement('h5');
        heading.textContent = 'Recent Searches';
        const ul = document.createElement('ul');
        this.searchHistory.slice(0, 5).forEach(query => {
            const li = document.createElement('li');
            li.className = 'history-item';
            const btnQ = document.createElement('button');
            btnQ.className = 'history-query';
            btnQ.dataset.query = String(query);
            const i = document.createElement('i');
            i.className = 'fas fa-history';
            btnQ.appendChild(i);
            btnQ.appendChild(document.createTextNode(` ${query}`));
            const btnR = document.createElement('button');
            btnR.className = 'remove-history';
            btnR.dataset.query = String(query);
            btnR.setAttribute('aria-label', `Remove ${query} from history`);
            const ii = document.createElement('i');
            ii.className = 'fas fa-times';
            btnR.appendChild(ii);
            li.appendChild(btnQ);
            li.appendChild(btnR);
            ul.appendChild(li);
        });
        wrapper.appendChild(heading);
        wrapper.appendChild(ul);
        this.suggestionsContainer.appendChild(wrapper);
        this.suggestionsContainer.style.display = 'block';
    }
    
    // ... Other methods like showSearchLoader, renderSearchError ...
    // ... Voice search methods: toggle, start, stop ...

    openSearch() {
        if (this.currentQuery.length < 2) {
            this.renderSearchHistory();
        }
    }
    
    closeSearch() {
        this.suggestionsContainer.style.display = 'none';
    }

    // ... History management: save, get, remove ...
    // ... Keyboard navigation: handleKeyNavigation ...

    /**
     * Executes a full page search, redirecting to the results page.
     */
    performFullSearch() {
        const params = new URLSearchParams({ q: this.currentQuery });
        // Add filter values if they exist
        const category = document.getElementById('category-filter')?.value;
        if (category) params.append('category', category);
        // ... append other filters ...
        window.location.href = `search-results.html?${params.toString()}`;
    }

    toggleFiltersPanel(forceOpen) {
        const panel = this.searchContainer.querySelector('.search-filters-panel');
        if (panel) {
            panel.classList.toggle('hidden', forceOpen === false ? true : undefined);
        }
    }

    applyFilters() {
        this.performFullSearch();
        this.toggleFiltersPanel(false);
    }

    clearFilters() {
        this.searchContainer.querySelector('#category-filter').value = '';
        this.searchContainer.querySelector('#brand-filter').value = '';
        // ... clear other filter inputs ...
    }

    // --- Helper Methods ---

    highlightMatch(text) {
        const regex = new RegExp(`(${this.currentQuery})`, 'gi');
        // Sanitize text before inserting into HTML to prevent XSS
        const sanitizedText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return sanitizedText.replace(regex, '<mark>$1</mark>');
    }
    
    getSearchHistory() {
        try {
            return JSON.parse(localStorage.getItem('searchHistory')) || [];
        } catch { return []; }
    }

    saveToHistory(query) {
        if (!this.searchHistory.includes(query)) {
            this.searchHistory.unshift(query);
            this.searchHistory = this.searchHistory.slice(0, 10);
            localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
        }
    }

    removeFromHistory(queryToRemove) {
        this.searchHistory = this.searchHistory.filter(q => q !== queryToRemove);
        localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
    }
}

export default AdvancedSearch;