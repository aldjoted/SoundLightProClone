import * as apiService from './apiService.js';
import { renderProductGrid, showSkeletonLoader, showToast } from './ui.js';

function getQuery() {
    const params = new URLSearchParams(window.location.search);
    return (params.get('q') || '').trim();
}

document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('results-grid');
    const subtitle = document.getElementById('results-subtitle');
    if (!grid) return;

    const q = getQuery();
    subtitle && (subtitle.textContent = q ? `Looking for "${q}"` : 'Showing all products');

    showSkeletonLoader(grid, 8);
    const abort = new AbortController();
    const { signal } = abort;

    try {
        const products = await apiService.getProducts(q, { signal });
        renderProductGrid(products, grid);
        if (products.length === 0) {
            grid.innerHTML = `<p class="info-message">No results for "${q}". Try a different term.</p>`;
        }
    } catch (err) {
        console.error('Search results error', err);
        grid.innerHTML = `<p class="error-message">Failed to load results. Please retry.</p>`;
        showToast('Failed to load search results.', 'error');
    }
});
