import * as apiService from '../apiService.js';
import * as cart from '../cart.js';
import * as ui from '../ui.js';
import i18n from '../i18n.js';
import { ListenerManager } from '../utils.js';

export async function initProductPage(signal) {
    const container = document.getElementById('product-detail-container');
    if (!container) return;

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        container.innerHTML = `<p class="error-message">No product specified. <a href="index.html">Return to products</a>.</p>`;
        return;
    }

    try {
        const product = await apiService.getProductById(productId, { signal });
        ui.renderProductDetail(product, container);
        await setupProductDetailPageEventListeners(product);

        await loadProductReviews(productId);
        await loadRelatedProducts(productId);
    } catch (error) {
        console.error('Error fetching product details:', error);
        container.innerHTML = `<p class="error-message">Could not load product. It may not exist. <a href="index.html">Return to products</a>.</p>`;
    }
}

async function loadProductReviews(productId) {
    const statsContainer = document.getElementById('review-stats-container');
    const listContainer = document.getElementById('reviews-list-container');
    const formContainer = document.getElementById('review-form-container');

    if (statsContainer) {
        statsContainer.classList.add('review-stats-container');
    }
    if (listContainer) {
        listContainer.classList.add('reviews-list-container');
    }
    if (formContainer) {
        formContainer.classList.add('review-form-container');
    }

    if (!statsContainer || !listContainer) {
        console.warn('Review containers not found on page');
        return;
    }

    try {
        const { ReviewManager } = await import('../reviews.js');
        const reviewManager = new ReviewManager(productId);

        const stats = await reviewManager.loadStats(productId);
        if (stats) {
            ui.renderReviewStats(stats, statsContainer);
        }

        const reviews = await reviewManager.loadReviews(productId);
        if (reviews && reviews.length > 0) {
            reviews.forEach((review) => {
                const reviewCard = ui.renderReviewCard(review);
                listContainer.appendChild(reviewCard);
            });
        } else {
            listContainer.innerHTML = `
                <div class="no-reviews">
                    <i class="far fa-comment-alt"></i>
                    <h3>${i18n.t('no_reviews', 'No customer stories yet')}</h3>
                    <p>${i18n.t('be_first_review', 'Be the first to share how this gear performs and inspire fellow creatives!')}</p>
                </div>
            `;
        }

        const writeReviewBtn = document.getElementById('write-review-btn');
        if (writeReviewBtn && formContainer) {
            writeReviewBtn.addEventListener('click', () => {
                formContainer.classList.toggle('hidden');
                if (!formContainer.classList.contains('hidden')) {
                    const reviewForm = ui.renderReviewForm(productId);
                    formContainer.innerHTML = '';
                    formContainer.appendChild(reviewForm);

                    const form = formContainer.querySelector('form');
                    if (form) {
                        form.addEventListener('submit', async (e) => {
                            e.preventDefault();
                            try {
                                await reviewManager.submitReview(productId, {
                                    rating: form.rating.value,
                                    title: form.title.value,
                                    comment: form.comment.value,
                                });

                                ui.showToast(i18n.t('review_submitted'), 'success');
                                formContainer.classList.add('hidden');

                                listContainer.innerHTML = '<div class="reviews-loading"><div class="spinner"></div></div>';
                                const updatedReviews = await reviewManager.loadReviews(productId);
                                listContainer.innerHTML = '';
                                updatedReviews.forEach((review) => {
                                    const reviewCard = ui.renderReviewCard(review);
                                    listContainer.appendChild(reviewCard);
                                });

                                const updatedStats = await reviewManager.loadStats(productId);
                                if (updatedStats) {
                                    ui.renderReviewStats(updatedStats, statsContainer);
                                }
                            } catch (error) {
                                ui.showToast(error.message || i18n.t('review_submit_error'), 'error');
                            }
                        });

                        const cancelBtn = form.querySelector('.btn-secondary');
                        if (cancelBtn) {
                            cancelBtn.addEventListener('click', () => {
                                formContainer.classList.add('hidden');
                            });
                        }
                    }
                }
            });
        }

        const sortSelect = document.getElementById('review-sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', async (e) => {
                listContainer.innerHTML = '<div class="reviews-loading"><div class="spinner"></div></div>';
                const sortedReviews = await reviewManager.loadReviews(productId, e.target.value);
                listContainer.innerHTML = '';
                sortedReviews.forEach((review) => {
                    const reviewCard = ui.renderReviewCard(review);
                    listContainer.appendChild(reviewCard);
                });
            });
        }
    } catch (error) {
        console.error('Error loading product reviews:', error);
        if (listContainer) {
            listContainer.innerHTML = `<p class="error-message">${i18n.t('error_loading_reviews')}</p>`;
        }
    }
}

async function loadRelatedProducts(productId) {
    const relatedSection = document.getElementById('related-products-section');
    if (!relatedSection) {
        console.warn('Related products section not found on page');
        return;
    }

    try {
        relatedSection.innerHTML = `
            <div class="related-products-loading">
                <div class="spinner"></div>
                <p>${i18n.t('loading_related_products')}</p>
            </div>
        `;

        const relatedProducts = await apiService.getRelatedProducts(productId);

        if (relatedProducts && relatedProducts.length > 0) {
            ui.renderRelatedProducts(relatedProducts, relatedSection);
        } else {
            relatedSection.innerHTML = `
                <div class="no-related-products">
                    <i class="fas fa-boxes"></i>
                    <h3>${i18n.t('no_related_products')}</h3>
                    <p>${i18n.t('check_back_later')}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading related products:', error);
        relatedSection.innerHTML = `<p class="error-message">${i18n.t('error_loading_related')}</p>`;
    }
}

async function configureStockNotification(product, listenerManager) {
    const stock = Number(product?.stock ?? 0);
    const addToCartForm = document.getElementById('add-to-cart-form');
    const notifyContainer = document.getElementById('notify-me-container');
    const notifyForm = document.getElementById('notify-me-form');
    const emailInput = document.getElementById('notify-email');
    const stickyCTA = document.getElementById('sticky-cta');

    if (!notifyContainer || !notifyForm || !emailInput) {
        return;
    }

    if (stock <= 0) {
        addToCartForm?.classList.add('hidden');
        stickyCTA?.classList.add('hidden');
        notifyContainer.classList.remove('hidden');

        let emailPrefill = '';
        const storedProfile = apiService.getStoredUserProfile?.();
        if (storedProfile?.email) {
            emailPrefill = storedProfile.email;
        } else {
            try {
                const hasSession = await apiService.ensureAccessToken();
                if (hasSession) {
                    const profile = await apiService.getUserProfile(false);
                    emailPrefill = profile?.email || '';
                }
            } catch (profileError) {
                console.warn('Unable to resolve user profile for stock notification:', profileError);
            }
        }

        if (emailPrefill) {
            emailInput.value = emailPrefill;
            emailInput.readOnly = true;
        } else {
            emailInput.value = '';
            emailInput.readOnly = false;
        }

        listenerManager?.add(notifyForm, 'submit', async (event) => {
            event.preventDefault();

            const submitButton = notifyForm.querySelector('button[type="submit"]');
            const email = emailInput.value.trim();

            if (!email) {
                ui.showToast(i18n.t('notify_email_required', 'Please enter a valid email address.'), 'error');
                return;
            }

            submitButton?.setAttribute('disabled', 'true');

            try {
                await apiService.requestStockNotification(product.id, email);
                ui.showToast(i18n.t('stock_notify_success', "Success! We'll notify you when this is back in stock."), 'success');
            } catch (error) {
                const message = error?.getUserMessage?.() || error?.message || i18n.t('stock_notify_error', 'Something went wrong. Please try again later.');
                ui.showToast(message, 'error');
            } finally {
                submitButton?.removeAttribute('disabled');
            }
        });
    } else {
        notifyContainer.classList.add('hidden');
        addToCartForm?.classList.remove('hidden');
        stickyCTA?.classList.remove('hidden');
    }
}

async function setupProductDetailPageEventListeners(product) {
    const pageListenerManager = new ListenerManager();

    await configureStockNotification(product, pageListenerManager);

    const gallery = document.querySelector('.product-gallery');
    if (gallery) {
        pageListenerManager.add(gallery, 'click', (e) => {
            const thumb = e.target.closest('.thumbnail-img');
            if (!thumb) return;

            const mainImage = document.getElementById('main-product-image');
            if (!mainImage) return;

            const fullSrc = thumb.dataset.fullSrc || thumb.src;
            const thumbSrc = thumb.dataset.thumbSrc || thumb.src;
            const newAlt = thumb.dataset.alt || thumb.alt || product.name || '';

            if (!fullSrc) return;

            const currentFullSrc = mainImage.getAttribute('data-full-src') || mainImage.src;
            if (currentFullSrc === fullSrc) {
                gallery.querySelector('.thumbnail-img.active')?.classList.remove('active');
                thumb.classList.add('active');
                return;
            }

            mainImage.style.opacity = '0';
            setTimeout(() => {
                mainImage.src = fullSrc;
                mainImage.alt = newAlt;
                mainImage.setAttribute('data-full-src', fullSrc);
                if (thumbSrc) {
                    mainImage.setAttribute('data-thumb-src', thumbSrc);
                } else {
                    mainImage.removeAttribute('data-thumb-src');
                }
                mainImage.style.opacity = '1';
            }, 200);

            gallery.querySelector('.thumbnail-img.active')?.classList.remove('active');
            thumb.classList.add('active');
        });
    }

    const addToCartForm = document.getElementById('add-to-cart-form');
    if (addToCartForm) {
        pageListenerManager.add(addToCartForm, 'submit', (e) => {
            e.preventDefault();
            const quantity = parseInt(document.getElementById('quantity').value, 10);
            if (quantity > 0) {
                cart.addToCart(product, quantity);
                ui.showToast(`${product.name} (x${quantity}) added to cart!`, 'success');
                ui.renderMiniCart(cart.getCart());
            }
        });
    }

    const stickyAdd = document.getElementById('sticky-add');
    if (stickyAdd) {
        pageListenerManager.add(stickyAdd, 'click', () => {
            const qty = parseInt(document.getElementById('sticky-qty').value, 10) || 1;
            cart.addToCart(product, qty);
            ui.showToast(`${product.name} (x${qty}) added to cart!`, 'success');
            ui.renderMiniCart(cart.getCart());
        });
    }

    const wishlistBtn = document.querySelector('.wishlist-btn');
    if (wishlistBtn) {
        import('../wishlist.js').then((wishlistModule) => {
            const updateWishlistButtonState = (inWishlist) => {
                if (inWishlist) {
                    wishlistBtn.classList.add('in-wishlist');
                    wishlistBtn.setAttribute('aria-pressed', 'true');
                    wishlistBtn.innerHTML = `<i class="fas fa-heart"></i> <span class="btn-text">${i18n.t('in_wishlist')}</span>`;
                } else {
                    wishlistBtn.classList.remove('in-wishlist');
                    wishlistBtn.setAttribute('aria-pressed', 'false');
                    wishlistBtn.innerHTML = `<i class="far fa-heart"></i> <span class="btn-text">${i18n.t('add_to_wishlist')}</span>`;
                }
            };

            // Initialize button state
            const isInWishlist = wishlistModule.isInWishlist(product.id);
            updateWishlistButtonState(isInWishlist);

            // Handle click
            pageListenerManager.add(wishlistBtn, 'click', async () => {
                try {
                    const wasAdded = await wishlistModule.toggleWishlist(product.id);
                    updateWishlistButtonState(wasAdded);

                    if (wasAdded) {
                        ui.showToast(i18n.t('added_to_wishlist'), 'success');
                    } else {
                        ui.showToast(i18n.t('removed_from_wishlist'), 'info');
                    }

                    // Update wishlist count if the function exists
                    if (typeof ui.updateWishlistCount === 'function') {
                        const wishlistItems = wishlistModule.getWishlist();
                        ui.updateWishlistCount(wishlistItems.length);
                    }
                } catch (error) {
                    console.error('Error toggling wishlist:', error);
                    ui.showToast(i18n.t('error_wishlist', 'Error updating wishlist'), 'error');
                }
            });
        }).catch((error) => {
            console.error('Error loading wishlist module:', error);
        });
    }

    window.addEventListener('beforeunload', () => {
        pageListenerManager.removeAll();
    });
}
