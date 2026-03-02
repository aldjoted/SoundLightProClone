/**
 * brand-gallery.js
 * Fetches partner brands from the API and renders the homepage gallery.
 */

import { getBrands } from './apiService.js';
import { API_BASE_URL } from './config.js';

const BACKEND_ORIGIN = (() => {
    try {
        const url = new URL(API_BASE_URL);
        return `${url.protocol}//${url.host}`;
    } catch (error) {
        console.warn('Could not derive backend origin from API_BASE_URL:', error);
        return typeof window !== 'undefined' ? window.location.origin : '';
    }
})();

const FALLBACK_BRAND_MESSAGE = 'Partner brands coming soon.';

function resolveLogoUrl(logoPath) {
    if (!logoPath) {
        return '';
    }

    if (/^https?:\/\//i.test(logoPath)) {
        return logoPath;
    }

    try {
        return new URL(logoPath, `${BACKEND_ORIGIN || ''}/`).toString();
    } catch (error) {
        console.warn('Failed to resolve logo URL:', error);
        return logoPath;
    }
}

function ensureStatusElement(gallery) {
    let statusEl = gallery.querySelector('.brand-gallery-status');
    if (!statusEl) {
        statusEl = document.createElement('p');
        statusEl.className = 'brand-gallery-status';
        gallery.appendChild(statusEl);
    }
    return statusEl;
}

function showStatus(gallery, message, modifierClass = '') {
    const statusEl = ensureStatusElement(gallery);
    statusEl.textContent = message;
    statusEl.className = 'brand-gallery-status';
    if (modifierClass) {
        statusEl.classList.add(modifierClass);
    }
}

function clearStatus(gallery) {
    const statusEl = gallery.querySelector('.brand-gallery-status');
    if (statusEl) {
        statusEl.remove();
    }
}

function createBrandNode(brand) {
    const name = (brand?.name || '').trim();
    const slugSource = brand?.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || '';

    if (!slugSource) {
        return null;
    }

    const link = document.createElement('a');
    link.href = `search-results.html?brand=${encodeURIComponent(slugSource)}`;
    link.className = 'brand-logo-link';
    link.setAttribute('aria-label', name ? `View products from ${name}` : 'View partner brand');

    const logo = document.createElement('img');
    logo.src = resolveLogoUrl(brand?.logo || '');
    logo.alt = name ? `${name} Logo` : 'Partner Brand Logo';
    logo.className = 'brand-logo-img';
    logo.loading = 'lazy';

    link.appendChild(logo);
    return link;
}

export async function initBrandGallery({ signal } = {}) {
    const section = document.getElementById('brand-partnerships');
    const gallery = section?.querySelector('.logo-gallery');

    if (!section || !gallery) {
        return;
    }

    showStatus(gallery, 'Loading partner brands...', 'brand-gallery-status--loading');

    try {
        const options = signal ? { signal } : {};
        const response = await getBrands(options);
        const brandList = Array.isArray(response)
            ? response
            : (Array.isArray(response?.results) ? response.results : []);

        gallery.textContent = '';

        if (!brandList.length) {
            showStatus(gallery, FALLBACK_BRAND_MESSAGE);
            return;
        }

        const fragment = document.createDocumentFragment();
        let hasRenderableBrand = false;

        brandList.forEach((brand) => {
            const brandNode = createBrandNode(brand);
            if (brandNode) {
                hasRenderableBrand = true;
                fragment.appendChild(brandNode);
            }
        });

        if (!hasRenderableBrand) {
            showStatus(gallery, FALLBACK_BRAND_MESSAGE);
            return;
        }

        clearStatus(gallery);
        gallery.appendChild(fragment);
    } catch (error) {
        if (error?.name === 'AbortError') {
            return;
        }
        console.error('Unable to render brand gallery:', error);
        gallery.textContent = '';
        showStatus(gallery, 'Unable to load partner brands right now. Please try again later.', 'brand-gallery-status--error');
    }
}
