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

function getBrandSlug() {
    const params = new URLSearchParams(window.location.search);
    return (params.get('brand') || '').trim();
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
    const brandSlug = getBrandSlug();
    
    showSkeletonLoader(grid, 8);
    const abort = new AbortController();
    const { signal } = abort;

    try {
        // Fetch products and categories in parallel if we need category name
        const promises = [apiService.getProducts(searchQuery, { signal }, categorySlug, brandSlug)];

        if (categorySlug) {
            promises.push(apiService.getCategories({ signal }));
        }

        if (brandSlug) {
            promises.push(apiService.getBrands({ signal }));
        }

        const results = await Promise.all(promises);

        let index = 0;
        const products = results[index++] || [];
        const categories = categorySlug ? (results[index++] || []) : [];
        const brands = brandSlug ? (results[index++] || []) : [];

        const brandList = Array.isArray(brands) ? brands : (Array.isArray(brands?.results) ? brands.results : []);
        const selectedBrand = brandSlug ? brandList.find((brand) => brand.slug === brandSlug) : null;
        
        // Update subtitle based on what we're searching/filtering
        if (subtitle) {
            if (categorySlug && brandSlug) {
                const category = findCategoryBySlug(categories, categorySlug);
                const categoryName = category ? category.name : 'this category';
                const brandName = selectedBrand ? selectedBrand.name : brandSlug.replace(/-/g, ' ');

                if (searchQuery) {
                    subtitle.textContent = `Looking for "${searchQuery}" in ${brandName} · ${categoryName}`;
                } else {
                    subtitle.textContent = `Showing ${brandName} products in ${categoryName}`;
                }
            } else if (categorySlug) {
                const category = findCategoryBySlug(categories, categorySlug);
                const categoryName = category ? category.name : 'this category';
                
                if (searchQuery) {
                    subtitle.textContent = `Looking for "${searchQuery}" in ${categoryName}`;
                } else {
                    subtitle.textContent = `Browsing ${categoryName}`;
                }
            } else if (brandSlug) {
                const brandName = selectedBrand ? selectedBrand.name : brandSlug.replace(/-/g, ' ');

                if (searchQuery) {
                    subtitle.textContent = `Looking for "${searchQuery}" in ${brandName}`;
                } else {
                    subtitle.textContent = `Showing products from ${brandName}`;
                }
            } else if (searchQuery) {
                subtitle.textContent = `Looking for "${searchQuery}"`;
            } else {
                subtitle.textContent = 'Showing all products';
            }
        }
        
        renderProductGrid(products, grid);
        
        if (products.length === 0) {
            grid.textContent = '';
            const p = document.createElement('p');
            p.className = 'info-message';
            
            if (searchQuery && categorySlug && brandSlug) {
                p.textContent = `No results for "${searchQuery}" in this brand and category.`;
            } else if (searchQuery && brandSlug) {
                p.textContent = `No results for "${searchQuery}" in this brand. Try a different term.`;
            } else if (searchQuery && categorySlug) {
                p.textContent = `No results for "${searchQuery}" in this category. Try a different term or browse other categories.`;
            } else if (searchQuery) {
                p.textContent = `No results for "${searchQuery}". Try a different term.`;
            } else if (categorySlug && brandSlug) {
                p.textContent = 'No products found for this brand in the selected category.';
            } else if (brandSlug) {
                p.textContent = 'No products found for this brand yet.';
            } else if (categorySlug) {
                p.textContent = 'No products found in this category.';
            } else {
                p.textContent = 'No results.';
            }
            
            grid.appendChild(p);
        }
    } catch (err) {
        console.error('Search results error', err);
        grid.textContent = '';
        const p = document.createElement('p');
        p.className = 'error-message';
        p.textContent = 'Failed to load results. Please retry.';
        grid.appendChild(p);
        showToast('Failed to load search results.', 'error');
    }
});
