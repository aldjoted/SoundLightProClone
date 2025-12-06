import * as apiService from '../apiService.js';
import * as ui from '../ui.js';
import { ListenerManager } from '../utils.js';
import { ErrorBoundary, getCached, appState } from '../app-core.js';
import { initBrandGallery } from '../brand-gallery.js';

async function initSwiper() {
    const heroSlider = document.querySelector('.hero-slider');
    if (!heroSlider) return;

    if (window.Swiper) {
        new window.Swiper('.hero-slider', {
            loop: true,
            effect: 'fade',
            autoplay: { delay: 7000, disableOnInteraction: false },
            pagination: { el: '.swiper-pagination', clickable: true },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
            lazy: {
                loadPrevNext: true,
                loadPrevNextAmount: 1,
                loadOnTransitionStart: true,
            },
            preloadImages: false,
            watchSlidesProgress: true,
        });
        return;
    }

    return new Promise((resolve) => {
        const checkSwiper = setInterval(() => {
            if (window.Swiper) {
                clearInterval(checkSwiper);
                new window.Swiper('.hero-slider', {
                    loop: true,
                    effect: 'fade',
                    autoplay: { delay: 7000, disableOnInteraction: false },
                    pagination: { el: '.swiper-pagination', clickable: true },
                    navigation: {
                        nextEl: '.swiper-button-next',
                        prevEl: '.swiper-button-prev',
                    },
                    lazy: {
                        loadPrevNext: true,
                        loadPrevNextAmount: 1,
                        loadOnTransitionStart: true,
                    },
                    preloadImages: false,
                    watchSlidesProgress: true,
                });
                resolve();
            }
        }, 50);

        setTimeout(() => {
            clearInterval(checkSwiper);
            resolve();
        }, 5000);
    });
}

function filterProducts(categorySlug) {
    const productGrid = document.getElementById('product-grid');
    if (!productGrid) return;

    const productsToRender = categorySlug === 'all'
        ? appState.products
        : appState.products.filter((p) => p.category.toLowerCase().replace(/\s+/g, '-') === categorySlug);

    productGrid.style.transition = 'opacity 0.3s ease-out';
    productGrid.style.opacity = '0';

    setTimeout(() => {
        ui.renderProductGrid(productsToRender, productGrid);
        productGrid.style.opacity = '1';
    }, 300);
}

export function initHomePage(signal) {
    const wrappedInit = ErrorBoundary.wrap(async () => {
        const productGrid = document.getElementById('product-grid');
        const featuredGrid = document.getElementById('featured-grid');
        if (!productGrid || !featuredGrid) {
            console.warn('Product grid or featured grid not found');
            return;
        }

        const pageListenerManager = new ListenerManager();

        initBrandGallery({ signal });

        ui.showSkeletonLoader(productGrid, 8);
        ui.showSkeletonLoader(featuredGrid, 3);

        try {
            const products = await getCached('products', () => apiService.getProducts('', { signal }, ''), 'products');

            appState.products = products;

            ui.renderHeroSlider();

            await initSwiper();

            ui.renderFeaturedGrid(products.slice(0, 3));
            ui.renderCategoryFilters(appState.categories);
            ui.renderProductGrid(products, productGrid);

            const filterControls = document.querySelector('.filter-controls');
            if (filterControls) {
                pageListenerManager.add(filterControls, 'click', (e) => {
                    const filterBtn = e.target.closest('.filter-btn');
                    if (!filterBtn) return;
                    document.querySelector('.filter-controls .active')?.classList.remove('active');
                    filterBtn.classList.add('active');
                    filterProducts(filterBtn.dataset.category);
                });
            }

            window.addEventListener('beforeunload', () => {
                pageListenerManager.removeAll();
            });
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error initializing homepage:', error);
                productGrid.innerHTML = '';
                const p = document.createElement('p');
                p.className = 'error-message';
                p.textContent = 'Failed to load products. ';

                const btn = document.createElement('button');
                btn.onclick = () => location.reload();
                btn.className = 'btn btn--primary';
                btn.textContent = 'Retry';

                p.appendChild(btn);
                productGrid.appendChild(p);
            }
        }
    }, 'Initializing home page');

    return wrappedInit();
}
