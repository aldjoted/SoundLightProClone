/**
 * Système de Recherche Avancée avec Intelligence Artificielle
 */

class AdvancedSearch {
    constructor() {
        this.searchInput = document.getElementById('search-input');
        this.suggestionsContainer = document.getElementById('search-suggestions');
        this.searchForm = document.getElementById('search-form');
        this.isSearchOpen = false;
        this.currentQuery = '';
        this.searchHistory = this.getSearchHistory();
        this.debounceTimeout = null;
        
        this.init();
    }

    init() {
        this.createAdvancedSearchInterface();
        this.setupEventListeners();
        this.setupVoiceSearch();
    }

    createAdvancedSearchInterface() {
        // Améliorer le conteneur de recherche existant
        const searchContainer = document.querySelector('.search-container');
        if (!searchContainer) return;

        // Ajouter les nouveaux éléments
        const advancedElements = document.createElement('div');
        advancedElements.innerHTML = `
            <button type="button" class="voice-search-btn" title="Recherche vocale" aria-label="Recherche vocale">
                <i class="fas fa-microphone"></i>
            </button>
            <button type="button" class="search-filters-btn" title="Filtres avancés" aria-label="Filtres avancés">
                <i class="fas fa-sliders-h"></i>
            </button>
            <div class="search-filters-panel hidden">
                <div class="filters-header">
                    <h4>Filtres de Recherche</h4>
                    <button class="close-filters-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="filters-content">
                    <div class="filter-group">
                        <label>Catégorie</label>
                        <select id="category-filter">
                            <option value="">Toutes les catégories</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Marque</label>
                        <select id="brand-filter">
                            <option value="">Toutes les marques</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Gamme de prix</label>
                        <div class="price-range">
                            <input type="number" id="min-price" placeholder="Min €" min="0">
                            <span>à</span>
                            <input type="number" id="max-price" placeholder="Max €" min="0">
                        </div>
                    </div>
                    <div class="filter-group">
                        <label>Disponibilité</label>
                        <label class="checkbox-label">
                            <input type="checkbox" id="in-stock-only">
                            <span>En stock uniquement</span>
                        </label>
                    </div>
                    <div class="filter-actions">
                        <button type="button" class="btn btn-secondary clear-filters-btn">Effacer</button>
                        <button type="button" class="btn btn-primary apply-filters-btn">Appliquer</button>
                    </div>
                </div>
            </div>
        `;

        // Modifier la structure existante
        const searchForm = searchContainer.querySelector('#search-form');
        searchForm.insertAdjacentElement('afterend', advancedElements);

        // Améliorer le conteneur de suggestions
        this.suggestionsContainer.className = 'search-suggestions-container advanced';
    }

    setupEventListeners() {
        // Recherche en temps réel améliorée
        this.searchInput.addEventListener('input', (e) => {
            this.currentQuery = e.target.value.trim();
            this.debouncedSearch();
        });

        // Gestion du focus et blur
        this.searchInput.addEventListener('focus', () => {
            this.openSearch();
        });

        // Navigation au clavier dans les suggestions
        this.searchInput.addEventListener('keydown', (e) => {
            this.handleKeyNavigation(e);
        });

        // Fermer la recherche quand on clique ailleurs
        document.addEventListener('click', (e) => {
            if (!this.searchInput.closest('.search-container').contains(e.target)) {
                this.closeSearch();
            }
        });

        // Gestionnaires pour les boutons
        this.setupButtonHandlers();

        // Soumission du formulaire
        this.searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.performFullSearch();
        });
    }

    setupButtonHandlers() {
        // Bouton recherche vocale
        const voiceBtn = document.querySelector('.voice-search-btn');
        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => {
                this.toggleVoiceSearch();
            });
        }

        // Bouton filtres
        const filtersBtn = document.querySelector('.search-filters-btn');
        const filtersPanel = document.querySelector('.search-filters-panel');
        if (filtersBtn && filtersPanel) {
            filtersBtn.addEventListener('click', () => {
                filtersPanel.classList.toggle('hidden');
            });

            // Fermer les filtres
            const closeBtn = document.querySelector('.close-filters-btn');
            closeBtn.addEventListener('click', () => {
                filtersPanel.classList.add('hidden');
            });

            // Appliquer les filtres
            const applyBtn = document.querySelector('.apply-filters-btn');
            applyBtn.addEventListener('click', () => {
                this.applyFilters();
            });

            // Effacer les filtres
            const clearBtn = document.querySelector('.clear-filters-btn');
            clearBtn.addEventListener('click', () => {
                this.clearFilters();
            });
        }
    }

    setupVoiceSearch() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            // Masquer le bouton si la reconnaissance vocale n'est pas supportée
            const voiceBtn = document.querySelector('.voice-search-btn');
            if (voiceBtn) voiceBtn.style.display = 'none';
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'fr-FR';

        this.recognition.onresult = (event) => {
            const result = event.results[0][0].transcript;
            this.searchInput.value = result;
            this.currentQuery = result;
            this.debouncedSearch();
            this.stopVoiceSearch();
        };

        this.recognition.onerror = () => {
            this.stopVoiceSearch();
        };

        this.recognition.onend = () => {
            this.stopVoiceSearch();
        };
    }

    debouncedSearch() {
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = setTimeout(() => {
            this.performSearch();
        }, 300);
    }

    async performSearch() {
        if (this.currentQuery.length < 2) {
            this.renderSearchHistory();
            return;
        }

        try {
            // Afficher un loader
            this.showSearchLoader();

            // Importer le service API
            const apiService = await import('./apiService.js');
            const products = await apiService.getProducts(this.currentQuery);

            // Analyser et enrichir les résultats
            const enrichedResults = this.enrichSearchResults(products);

            this.renderSearchResults(enrichedResults);
        } catch (error) {
            console.error('Erreur de recherche:', error);
            this.renderSearchError();
        }
    }

    enrichSearchResults(products) {
        // Ajouter la logique de scoring et de pertinence
        return products.map(product => {
            const relevanceScore = this.calculateRelevance(product, this.currentQuery);
            return {
                ...product,
                relevanceScore,
                matchType: this.getMatchType(product, this.currentQuery)
            };
        }).sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    calculateRelevance(product, query) {
        const queryLower = query.toLowerCase();
        let score = 0;

        // Correspondance exacte dans le nom (score élevé)
        if (product.name.toLowerCase().includes(queryLower)) {
            score += 10;
        }

        // Correspondance dans la catégorie
        if (product.category.toLowerCase().includes(queryLower)) {
            score += 5;
        }

        // Correspondance dans la description
        if (product.description && product.description.toLowerCase().includes(queryLower)) {
            score += 3;
        }

        // Bonus pour les produits en stock
        if (product.stock > 0) {
            score += 2;
        }

        return score;
    }

    getMatchType(product, query) {
        const queryLower = query.toLowerCase();
        if (product.name.toLowerCase().startsWith(queryLower)) {
            return 'exact';
        }
        if (product.name.toLowerCase().includes(queryLower)) {
            return 'partial';
        }
        return 'related';
    }

    renderSearchResults(products) {
        if (!this.suggestionsContainer) return;

        if (products.length === 0) {
            this.suggestionsContainer.innerHTML = `
                <div class="search-no-results">
                    <i class="fas fa-search"></i>
                    <p>Aucun produit trouvé pour "${this.currentQuery}"</p>
                    <button class="btn btn-secondary suggest-alternative">Suggestions alternatives</button>
                </div>
            `;
            this.suggestionsContainer.style.display = 'block';
            return;
        }

        // Grouper les résultats par type de correspondance
        const exactMatches = products.filter(p => p.matchType === 'exact').slice(0, 3);
        const partialMatches = products.filter(p => p.matchType === 'partial').slice(0, 4);
        const relatedMatches = products.filter(p => p.matchType === 'related').slice(0, 2);

        let html = '<div class="search-results-container">';

        if (exactMatches.length > 0) {
            html += this.renderResultsSection('Correspondances exactes', exactMatches, 'exact');
        }

        if (partialMatches.length > 0) {
            html += this.renderResultsSection('Résultats pertinents', partialMatches, 'partial');
        }

        if (relatedMatches.length > 0) {
            html += this.renderResultsSection('Produits similaires', relatedMatches, 'related');
        }

        // Ajouter les actions rapides
        html += `
            <div class="search-actions">
                <a href="#" class="search-action view-all-results">
                    <i class="fas fa-list"></i>
                    Voir tous les ${products.length} résultats
                </a>
                <button class="search-action save-search">
                    <i class="fas fa-bookmark"></i>
                    Sauvegarder cette recherche
                </button>
            </div>
        `;

        html += '</div>';

        this.suggestionsContainer.innerHTML = html;
        this.suggestionsContainer.style.display = 'block';

        // Sauvegarder la recherche
        this.saveToHistory(this.currentQuery);
    }

    renderResultsSection(title, products, type) {
        return `
            <div class="results-section ${type}">
                <h5 class="results-section-title">${title}</h5>
                <ul class="results-list">
                    ${products.map(product => `
                        <li class="search-result-item" data-product-id="${product.id}">
                            <a href="product.html?id=${product.id}" class="result-link">
                                <img src="${this.getProductImage(product)}" alt="${product.name}" loading="lazy">
                                <div class="result-details">
                                    <span class="result-name">${this.highlightMatch(product.name, this.currentQuery)}</span>
                                    <span class="result-category">${product.category}</span>
                                    <span class="result-price">€${parseFloat(product.price).toFixed(2)}</span>
                                    ${product.stock > 0 ? '<span class="result-stock in-stock">En stock</span>' : '<span class="result-stock out-stock">Rupture</span>'}
                                </div>
                                <div class="result-actions">
                                    <button class="quick-add-btn" data-product-id="${product.id}" title="Ajout rapide">
                                        <i class="fas fa-cart-plus"></i>
                                    </button>
                                </div>
                            </a>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    highlightMatch(text, query) {
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    getProductImage(product) {
        return (product.images && product.images.length > 0) 
            ? product.images[0].image 
            : 'https://via.placeholder.com/60x60.png?text=No+Image';
    }

    renderSearchHistory() {
        if (this.searchHistory.length === 0) return;

        const html = `
            <div class="search-history">
                <h5>Recherches récentes</h5>
                <ul>
                    ${this.searchHistory.slice(0, 5).map(query => `
                        <li class="history-item">
                            <button class="history-query" data-query="${query}">
                                <i class="fas fa-history"></i>
                                ${query}
                            </button>
                            <button class="remove-history" data-query="${query}">
                                <i class="fas fa-times"></i>
                            </button>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;

        this.suggestionsContainer.innerHTML = html;
        this.suggestionsContainer.style.display = 'block';
    }

    showSearchLoader() {
        this.suggestionsContainer.innerHTML = `
            <div class="search-loader">
                <div class="loader-spinner"></div>
                <p>Recherche en cours...</p>
            </div>
        `;
        this.suggestionsContainer.style.display = 'block';
    }

    renderSearchError() {
        this.suggestionsContainer.innerHTML = `
            <div class="search-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Erreur lors de la recherche. Veuillez réessayer.</p>
            </div>
        `;
    }

    toggleVoiceSearch() {
        const voiceBtn = document.querySelector('.voice-search-btn');
        
        if (this.recognition && !this.isListening) {
            this.startVoiceSearch();
        } else if (this.isListening) {
            this.stopVoiceSearch();
        }
    }

    startVoiceSearch() {
        this.isListening = true;
        const voiceBtn = document.querySelector('.voice-search-btn');
        voiceBtn.classList.add('listening');
        voiceBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
        
        this.recognition.start();
    }

    stopVoiceSearch() {
        this.isListening = false;
        const voiceBtn = document.querySelector('.voice-search-btn');
        voiceBtn.classList.remove('listening');
        voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        
        if (this.recognition) {
            this.recognition.stop();
        }
    }

    openSearch() {
        this.isSearchOpen = true;
        if (this.currentQuery.length < 2) {
            this.renderSearchHistory();
        }
    }

    closeSearch() {
        this.isSearchOpen = false;
        this.suggestionsContainer.style.display = 'none';
    }

    saveToHistory(query) {
        if (!this.searchHistory.includes(query)) {
            this.searchHistory.unshift(query);
            this.searchHistory = this.searchHistory.slice(0, 10); // Garder seulement les 10 dernières
            localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
        }
    }

    getSearchHistory() {
        try {
            return JSON.parse(localStorage.getItem('searchHistory')) || [];
        } catch {
            return [];
        }
    }

    handleKeyNavigation(e) {
        const items = this.suggestionsContainer.querySelectorAll('.search-result-item, .history-item');
        if (items.length === 0) return;

        let currentIndex = -1;
        items.forEach((item, index) => {
            if (item.classList.contains('highlighted')) {
                currentIndex = index;
            }
        });

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                currentIndex = Math.min(currentIndex + 1, items.length - 1);
                break;
            case 'ArrowUp':
                e.preventDefault();
                currentIndex = Math.max(currentIndex - 1, -1);
                break;
            case 'Enter':
                e.preventDefault();
                if (currentIndex >= 0) {
                    const link = items[currentIndex].querySelector('a');
                    if (link) link.click();
                }
                return;
            case 'Escape':
                this.closeSearch();
                return;
        }

        // Mettre à jour la surbrillance
        items.forEach((item, index) => {
            item.classList.toggle('highlighted', index === currentIndex);
        });
    }

    performFullSearch() {
        // Rediriger vers une page de résultats complets
        const params = new URLSearchParams({
            q: this.currentQuery,
            category: document.getElementById('category-filter')?.value || '',
            brand: document.getElementById('brand-filter')?.value || '',
            min_price: document.getElementById('min-price')?.value || '',
            max_price: document.getElementById('max-price')?.value || '',
            in_stock: document.getElementById('in-stock-only')?.checked || false
        });

        window.location.href = `search-results.html?${params.toString()}`;
    }

    applyFilters() {
        this.performSearch();
        document.querySelector('.search-filters-panel').classList.add('hidden');
    }

    clearFilters() {
        document.getElementById('category-filter').value = '';
        document.getElementById('brand-filter').value = '';
        document.getElementById('min-price').value = '';
        document.getElementById('max-price').value = '';
        document.getElementById('in-stock-only').checked = false;
    }
}

// Initialiser la recherche avancée
document.addEventListener('DOMContentLoaded', () => {
    new AdvancedSearch();
});

export default AdvancedSearch;
