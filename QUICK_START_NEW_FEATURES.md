# Quick Start Guide - New Features Implementation

This guide will help you quickly complete and test the new wishlist, reviews, and related products features.

## Prerequisites Completed ✅

- ✅ Backend models created
- ✅ Migrations generated
- ✅ Admin configurations added
- ✅ Serializers implemented
- ✅ API views and endpoints created
- ✅ Frontend JavaScript modules created
- ✅ API service methods added

## Next Steps to Complete

### Step 1: Apply Migrations (REQUIRED)

```powershell
cd backend
python manage.py migrate
```

This will create the new database tables for Wishlist, WishlistItem, and ProductReview.

### Step 2: Add UI Components to ui.js

Add these rendering functions to `frontend/js/ui.js`:

```javascript
// Add after existing import statements
import * as wishlist from './wishlist.js';
import { reviewManager, createStarRating, formatReviewDate, getRatingColorClass } from './reviews.js';

// Wishlist UI Components
export function renderWishlistButton(product, isInWishlist) {
    const button = createElement('button', {
        class: `wishlist-btn ${isInWishlist ? 'in-wishlist' : ''}`,
        'data-product-id': product.id,
        'aria-label': isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'
    }, [
        createElement('i', { class: isInWishlist ? 'fas fa-heart' : 'far fa-heart' }),
        createElement('span', {}, [isInWishlist ? 'In Wishlist' : 'Add to Wishlist'])
    ]);
    
    button.addEventListener('click', async (e) => {
        e.preventDefault();
        const added = await wishlist.toggleWishlist(product.id);
        button.classList.toggle('in-wishlist', added);
        button.querySelector('i').className = added ? 'fas fa-heart' : 'far fa-heart';
        button.querySelector('span').textContent = added ? 'In Wishlist' : 'Add to Wishlist';
        showToast(added ? 'Added to wishlist!' : 'Removed from wishlist', 'success');
    });
    
    return button;
}

export function updateWishlistCount(count) {
    const badge = document.querySelector('.wishlist-count-badge');
    if (badge) {
        badge.textContent = count || '0';
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

// Review UI Components
export function renderReviewForm(productId) {
    const form = createElement('form', { class: 'review-form', id: 'review-form' });
    
    // Star rating input
    const ratingContainer = createElement('div', { class: 'form-group' }, [
        createElement('label', { for: 'rating' }, ['Your Rating *']),
        createInteractiveStarRating()
    ]);
    
    // Title input
    const titleInput = createElement('input', {
        type: 'text',
        id: 'review-title',
        name: 'title',
        class: 'form-control',
        placeholder: 'Review title (optional)',
        maxlength: '200'
    });
    
    // Comment textarea
    const commentInput = createElement('textarea', {
        id: 'review-comment',
        name: 'comment',
        class: 'form-control',
        placeholder: 'Tell us about your experience with this product *',
        required: 'true',
        minlength: '10',
        maxlength: '2000',
        rows: '5'
    });
    
    const charCount = createElement('small', { class: 'char-count' }, ['0 / 2000']);
    
    commentInput.addEventListener('input', () => {
        charCount.textContent = `${commentInput.value.length} / 2000`;
    });
    
    // Submit button
    const submitBtn = createElement('button', {
        type: 'submit',
        class: 'btn btn-primary'
    }, [
        createElement('i', { class: 'fas fa-paper-plane' }),
        ' Submit Review'
    ]);
    
    form.appendChild(ratingContainer);
    form.appendChild(createElement('div', { class: 'form-group' }, [
        createElement('label', { for: 'review-title' }, ['Review Title']),
        titleInput
    ]));
    form.appendChild(createElement('div', { class: 'form-group' }, [
        createElement('label', { for: 'review-comment' }, ['Your Review *']),
        commentInput,
        charCount
    ]));
    form.appendChild(submitBtn);
    
    return form;
}

function createInteractiveStarRating() {
    const container = createElement('div', { class: 'star-rating-input' });
    let selectedRating = 0;
    
    for (let i = 1; i <= 5; i++) {
        const star = createElement('i', {
            class: 'far fa-star',
            'data-rating': i
        });
        
        star.addEventListener('click', () => {
            selectedRating = i;
            updateStarDisplay();
        });
        
        star.addEventListener('mouseenter', () => {
            updateStarDisplay(i);
        });
        
        container.appendChild(star);
    }
    
    container.addEventListener('mouseleave', () => {
        updateStarDisplay();
    });
    
    function updateStarDisplay(hoverRating = selectedRating) {
        container.querySelectorAll('i').forEach((star, index) => {
            star.className = (index < hoverRating) ? 'fas fa-star' : 'far fa-star';
        });
    }
    
    container.getSelectedRating = () => selectedRating;
    
    return container;
}

export function renderReviewCard(review) {
    const card = createElement('div', { class: 'review-card' }, [
        createElement('div', { class: 'review-header' }, [
            createElement('div', { class: 'review-author' }, [
                createElement('strong', {}, [review.user_name]),
                review.is_verified_purchase ? 
                    createElement('span', { class: 'verified-badge' }, [
                        createElement('i', { class: 'fas fa-check-circle' }),
                        ' Verified Purchase'
                    ]) : null
            ].filter(Boolean)),
            createElement('div', { class: 'review-meta' }, [
                createStarRating(review.rating),
                createElement('span', { class: 'review-date' }, [formatReviewDate(review.created_at)])
            ])
        ]),
        review.title ? createElement('h4', { class: 'review-title' }, [review.title]) : null,
        createElement('p', { class: 'review-comment' }, [review.comment])
    ].filter(Boolean));
    
    return card;
}

export function renderReviewStats(stats) {
    if (!stats || stats.review_count === 0) {
        return createElement('div', { class: 'no-reviews' }, [
            'No reviews yet. Be the first to review this product!'
        ]);
    }
    
    const ratingClass = getRatingColorClass(stats.average_rating);
    
    return createElement('div', { class: 'review-stats' }, [
        createElement('div', { class: 'rating-summary' }, [
            createElement('div', { class: `average-rating ${ratingClass}` }, [
                createElement('span', { class: 'rating-value' }, [stats.average_rating.toFixed(1)]),
                createStarRating(Math.round(stats.average_rating))
            ]),
            createElement('div', { class: 'review-count' }, [
                `Based on ${stats.review_count} ${stats.review_count === 1 ? 'review' : 'reviews'}`
            ])
        ]),
        renderRatingDistribution(stats)
    ]);
}

function renderRatingDistribution(stats) {
    const container = createElement('div', { class: 'rating-distribution' });
    
    for (let rating = 5; rating >= 1; rating--) {
        const count = stats.rating_distribution[rating] || 0;
        const percentage = stats.review_count > 0 ? 
            Math.round((count / stats.review_count) * 100) : 0;
        
        const row = createElement('div', { class: 'distribution-row' }, [
            createElement('span', { class: 'star-label' }, [`${rating} ⭐`]),
            createElement('div', { class: 'distribution-bar' }, [
                createElement('div', {
                    class: 'distribution-fill',
                    style: `width: ${percentage}%`
                })
            ]),
            createElement('span', { class: 'distribution-count' }, [`${count}`])
        ]);
        
        container.appendChild(row);
    }
    
    return container;
}

// Related Products UI
export function renderRelatedProducts(products) {
    if (!products || products.length === 0) {
        return null;
    }
    
    const section = createElement('section', { class: 'related-products' }, [
        createElement('h2', {}, ['You May Also Like']),
        createElement('div', { class: 'related-products-grid' })
    ]);
    
    const grid = section.querySelector('.related-products-grid');
    
    products.forEach(product => {
        const card = renderProductCard(product);
        grid.appendChild(card);
    });
    
    return section;
}
```

### Step 3: Create Wishlist HTML Page

Create `frontend/wishlist.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Wishlist - Sound Light Pro</title>
    <meta name="description" content="View and manage your saved products wishlist">
    
    <!-- Stylesheets -->
    <link rel="stylesheet" href="css/main.css">
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <!-- Header (include your existing header) -->
    
    <main class="wishlist-page">
        <div class="container">
            <header class="page-header">
                <h1 data-i18n="wishlist_title">My Wishlist</h1>
                <p data-i18n="wishlist_subtitle">Save your favorite items for later</p>
            </header>
            
            <div id="wishlist-container" class="wishlist-container">
                <!-- Wishlist items will be rendered here -->
            </div>
        </div>
    </main>
    
    <!-- Footer (include your existing footer) -->
    
    <!-- Scripts -->
    <script type="module" src="js/main.js"></script>
</body>
</html>
```

### Step 4: Update product.html

Add review and related products sections to `frontend/product.html`:

```html
<!-- Add after product details section -->

<!-- Reviews Section -->
<section class="product-reviews" id="product-reviews-section">
    <div class="reviews-header">
        <h2 data-i18n="reviews_title">Customer Reviews</h2>
        <div id="review-stats-container"></div>
    </div>
    
    <div class="reviews-controls">
        <button class="btn btn-outline" id="write-review-btn" data-i18n="write_review">
            Write a Review
        </button>
        <select id="review-sort" class="form-control">
            <option value="recent" data-i18n="sort_recent">Most Recent</option>
            <option value="highest" data-i18n="sort_highest">Highest Rated</option>
            <option value="verified" data-i18n="sort_verified">Verified Purchases</option>
        </select>
    </div>
    
    <div id="review-form-container" class="hidden"></div>
    <div id="reviews-list-container"></div>
</section>

<!-- Related Products Section -->
<section id="related-products-section"></section>
```

### Step 5: Add CSS Styles

Create `frontend/css/components/wishlist.css`:

```css
/* Wishlist Button */
.wishlist-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: 2px solid var(--border-color);
    background: white;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.wishlist-btn:hover {
    border-color: var(--primary-color);
    color: var(--primary-color);
}

.wishlist-btn.in-wishlist {
    background: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
}

.wishlist-btn.in-wishlist i {
    color: #ff4757;
}

.wishlist-count-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    background: var(--danger-color);
    color: white;
    border-radius: 50%;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    font-weight: bold;
}

/* Wishlist Page */
.wishlist-container {
    display: grid;
    gap: 1.5rem;
}

.wishlist-item {
    display: flex;
    gap: 1.5rem;
    padding: 1.5rem;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.wishlist-item-image {
    width: 120px;
    height: 120px;
    object-fit: cover;
    border-radius: 8px;
}

.wishlist-item-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.wishlist-item-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: auto;
}
```

Create `frontend/css/components/reviews.css`:

```css
/* Review Components */
.review-card {
    padding: 1.5rem;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    margin-bottom: 1rem;
}

.review-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: 1rem;
}

.review-author {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.verified-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    background: #10b981;
    color: white;
    border-radius: 4px;
    font-size: 0.75rem;
}

.star-rating {
    display: inline-flex;
    gap: 0.25rem;
    color: #fbbf24;
}

.star-rating-input {
    display: flex;
    gap: 0.5rem;
    font-size: 2rem;
}

.star-rating-input i {
    cursor: pointer;
    transition: all 0.2s ease;
}

.star-rating-input i:hover {
    transform: scale(1.2);
}

/* Review Stats */
.review-stats {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 2rem;
    padding: 2rem;
    background: #f9fafb;
    border-radius: 12px;
    margin-bottom: 2rem;
}

.average-rating {
    text-align: center;
}

.rating-value {
    display: block;
    font-size: 3rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
}

.rating-excellent { color: #10b981; }
.rating-good { color: #3b82f6; }
.rating-average { color: #f59e0b; }
.rating-poor { color: #ef4444; }

.rating-distribution {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.distribution-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.distribution-bar {
    flex: 1;
    height: 8px;
    background: #e5e7eb;
    border-radius: 4px;
    overflow: hidden;
}

.distribution-fill {
    height: 100%;
    background: #fbbf24;
    transition: width 0.3s ease;
}

/* Review Form */
.review-form {
    padding: 2rem;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    margin-bottom: 2rem;
}

.review-form .form-group {
    margin-bottom: 1.5rem;
}

.char-count {
    display: block;
    text-align: right;
    color: #6b7280;
    margin-top: 0.25rem;
}
```

Create `frontend/css/components/related-products.css`:

```css
/* Related Products */
.related-products {
    margin-top: 4rem;
    padding: 2rem 0;
    border-top: 1px solid var(--border-color);
}

.related-products h2 {
    margin-bottom: 2rem;
    text-align: center;
}

.related-products-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1.5rem;
}

@media (max-width: 768px) {
    .related-products-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}
```

### Step 6: Update main.js

Add initialization for new pages in `frontend/js/main.js`:

```javascript
// Add to router function
const routes = {
    'index.html': initHomePage,
    'product.html': initProductDetailPage,
    'cart.html': initCartPage,
    'wishlist.html': initWishlistPage, // ADD THIS
    'login.html': initLoginPage,
    'register.html': initRegisterPage,
    'search-results.html': initSearchResultsPage,
};

// Add new initialization function
async function initWishlistPage() {
    const container = document.getElementById('wishlist-container');
    if (!container) return;
    
    try {
        // Import wishlist module
        const { getWishlistData, removeFromWishlist, moveToCart } = await import('./wishlist.js');
        const wishlistData = getWishlistData();
        
        if (wishlistData.length === 0) {
            container.innerHTML = `
                <div class="empty-wishlist">
                    <i class="far fa-heart" style="font-size: 4rem; color: #ccc;"></i>
                    <h2>Your wishlist is empty</h2>
                    <p>Save your favorite products to buy them later!</p>
                    <a href="index.html" class="btn btn-primary">Continue Shopping</a>
                </div>
            `;
            return;
        }
        
        // Render wishlist items
        container.innerHTML = '';
        wishlistData.forEach(item => {
            const product = item.product || item;
            const itemEl = ui.renderWishlistItem(product, removeFromWishlist, moveToCart);
            container.appendChild(itemEl);
        });
    } catch (error) {
        console.error('Failed to load wishlist:', error);
        container.innerHTML = '<p class="error-message">Failed to load wishlist.</p>';
    }
}

// Update initProductDetailPage to include reviews and related products
async function initProductDetailPage(signal) {
    const container = document.getElementById('product-detail-container');
    if (!container) return;

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        container.innerHTML = `<p class="error-message">No product specified.</p>`;
        return;
    }

    try {
        const product = await apiService.getProductById(productId, { signal });
        ui.renderProductDetail(product, container);
        setupProductDetailPageEventListeners(product);
        
        // Load reviews
        await loadProductReviews(productId);
        
        // Load related products
        await loadRelatedProducts(productId);
    } catch (error) {
        console.error("Error fetching product details:", error);
        container.innerHTML = `<p class="error-message">Could not load product.</p>`;
    }
}

async function loadProductReviews(productId) {
    const statsContainer = document.getElementById('review-stats-container');
    const listContainer = document.getElementById('reviews-list-container');
    const formContainer = document.getElementById('review-form-container');
    
    if (!statsContainer || !listContainer) return;
    
    try {
        const { reviewManager } = await import('./reviews.js');
        
        // Load stats and reviews
        const [stats, reviews] = await Promise.all([
            reviewManager.loadStats(productId),
            reviewManager.loadReviews(productId)
        ]);
        
        // Render stats
        statsContainer.innerHTML = '';
        statsContainer.appendChild(ui.renderReviewStats(stats));
        
        // Render reviews
        listContainer.innerHTML = '';
        if (reviews.length === 0) {
            listContainer.innerHTML = '<p class="no-reviews">No reviews yet.</p>';
        } else {
            reviews.forEach(review => {
                listContainer.appendChild(ui.renderReviewCard(review));
            });
        }
        
        // Setup review form
        setupReviewForm(productId, formContainer);
        
    } catch (error) {
        console.error('Failed to load reviews:', error);
    }
}

async function loadRelatedProducts(productId) {
    const section = document.getElementById('related-products-section');
    if (!section) return;
    
    try {
        const relatedProducts = await apiService.getRelatedProducts(productId, 6);
        
        if (relatedProducts.length > 0) {
            section.innerHTML = '';
            section.appendChild(ui.renderRelatedProducts(relatedProducts));
        }
    } catch (error) {
        console.error('Failed to load related products:', error);
    }
}

function setupReviewForm(productId, formContainer) {
    const writeReviewBtn = document.getElementById('write-review-btn');
    if (!writeReviewBtn) return;
    
    writeReviewBtn.addEventListener('click', async () => {
        // Check if user is authenticated
        const user = await apiService.getUserProfile().catch(() => null);
        
        if (!user) {
            ui.showToast('Please log in to write a review', 'info');
            window.location.href = 'login.html';
            return;
        }
        
        // Show form
        formContainer.classList.remove('hidden');
        formContainer.innerHTML = '';
        const form = ui.renderReviewForm(productId);
        formContainer.appendChild(form);
        
        // Setup form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const ratingInput = form.querySelector('.star-rating-input');
            const rating = ratingInput ? ratingInput.getSelectedRating() : 0;
            
            if (rating === 0) {
                ui.showToast('Please select a rating', 'error');
                return;
            }
            
            const reviewData = {
                rating: rating,
                title: form['title'].value.trim(),
                comment: form['comment'].value.trim()
            };
            
            try {
                const { reviewManager } = await import('./reviews.js');
                await reviewManager.submitReview(productId, reviewData);
                ui.showToast('Review submitted successfully!', 'success');
                formContainer.classList.add('hidden');
                // Reload reviews
                await loadProductReviews(productId);
            } catch (error) {
                ui.showToast(`Failed to submit review: ${error.message}`, 'error');
            }
        });
    });
}
```

### Step 7: Test the Implementation

1. **Start Backend Server:**
```powershell
cd backend
python manage.py runserver
```

2. **Start Frontend Server:**
```powershell
cd frontend
npm run dev
```

3. **Test Wishlist:**
   - Go to a product page
   - Click "Add to Wishlist"
   - Visit `/wishlist.html`
   - Verify items appear

4. **Test Reviews:**
   - Log in as a user
   - Go to a product page
   - Click "Write a Review"
   - Submit a review
   - Verify it appears in the reviews section

5. **Test Related Products:**
   - Go to any product page
   - Scroll to "You May Also Like" section
   - Verify related products display

---

## Troubleshooting

### Migration Issues
If migrations fail, try:
```powershell
python manage.py makemigrations --empty api
python manage.py migrate --fake
```

### Import Errors
Make sure all JS modules are properly imported in main.js:
```javascript
import * as wishlist from './wishlist.js';
import * as reviews from './reviews.js';
```

### CORS Issues
If API calls fail, check Django CORS settings in `backend/project/settings.py`:
```python
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',  # Vite default
    'http://127.0.0.1:5173',
]
```

---

## Next Steps

1. ✅ Apply migrations
2. ✅ Add UI components to ui.js
3. ✅ Create wishlist.html
4. ✅ Update product.html
5. ✅ Add CSS styles
6. ✅ Test all features
7. 📝 Add internationalization (i18n keys)
8. 📝 Add comprehensive tests
9. 📝 Deploy to production

**Need Help?** Check the full implementation guide in `Docs/NEW_FEATURES_IMPLEMENTATION.md`
