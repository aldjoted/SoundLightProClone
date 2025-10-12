import * as apiService from './apiService.js';
import { renderProductGrid, showSkeletonLoader, showToast } from './ui.js';

function getQuery() {
    const params = new URLSearchParams(window.location.search);
    return (params.get('q') || '').trim();
}

function getCategorySlug() {
    const params = new URLSearchParams(window.location.search);
    return (params.get('category') || '').trim();
}

/**
 * Find a category by slug in the categories tree
 * @param {Array} categories - Array of categories
 * @param {string} slug - Category slug to find
 * @returns {Object|null} - Category object or null if not found
 */
function findCategoryBySlug(categories, slug) {
    for (const category of categories) {
        if (category.slug === slug) {
            return category;
        }
        if (category.children && category.children.length > 0) {
            const found = findCategoryBySlug(category.children, slug);
            if (found) return found;
        }
    }
    return null;
}

document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('results-grid');
    const subtitle = document.getElementById('results-subtitle');
    if (!grid) return;

    const searchQuery = getQuery();
    const categorySlug = getCategorySlug();
    
    showSkeletonLoader(grid, 8);
    const abort = new AbortController();
    const { signal } = abort;

    try {
        // Fetch products and categories in parallel if we need category name
        const promises = [apiService.getProducts(searchQuery, { signal }, categorySlug)];
        
        if (categorySlug) {
            promises.push(apiService.getCategories({ signal }));
        }
        
        const results = await Promise.all(promises);
        const products = results[0];
        const categories = results[1] || [];
        
        // Update subtitle based on what we're searching/filtering
        if (subtitle) {
            if (categorySlug) {
                const category = findCategoryBySlug(categories, categorySlug);
                const categoryName = category ? category.name : 'this category';
                
                if (searchQuery) {
                    subtitle.textContent = `Looking for "${searchQuery}" in ${categoryName}`;
                } else {
                    subtitle.textContent = `Browsing ${categoryName}`;
                }
            } else if (searchQuery) {
                subtitle.textContent = `Looking for "${searchQuery}"`;
            } else {
                subtitle.textContent = 'Showing all products';
            }
        }
        
        renderProductGrid(products, grid);
        
        if (products.length === 0) {
            grid.innerHTML = '';
            const p = document.createElement('p');
            p.className = 'info-message';
            
            if (searchQuery && categorySlug) {
                p.textContent = `No results for "${searchQuery}" in this category. Try a different term or browse other categories.`;
            } else if (searchQuery) {
                p.textContent = `No results for "${searchQuery}". Try a different term.`;
            } else if (categorySlug) {
                p.textContent = 'No products found in this category.';
            } else {
                p.textContent = 'No results.';
            }
            
            grid.appendChild(p);
        }
    } catch (err) {
        console.error('Search results error', err);
        grid.innerHTML = '';
        const p = document.createElement('p');
        p.className = 'error-message';
        p.textContent = 'Failed to load results. Please retry.';
        grid.appendChild(p);
        showToast('Failed to load search results.', 'error');
    }
});
