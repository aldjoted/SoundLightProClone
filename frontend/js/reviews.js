/**
 * reviews.js
 * 
 * This module handles product reviews and ratings functionality.
 * - Fetching and displaying reviews
 * - Submitting new reviews
 * - Rating aggregation and statistics
 * - Review sorting and filtering
 */

/**
 * Review manager class
 */
class ReviewManager {
    constructor() {
        this.reviews = [];
        this.stats = null;
        this.currentSort = 'recent';
    }

    /**
     * Load reviews for a product
     * @param {number} productId - Product ID
     * @param {string} sort - Sort order (recent, highest, verified)
     * @returns {Promise<Array>} Array of reviews
     */
    async loadReviews(productId, sort = 'recent') {
        try {
            const apiService = await import('./apiService.js');
            this.reviews = await apiService.getProductReviews(productId, sort);
            this.currentSort = sort;
            return this.reviews;
        } catch (error) {
            console.error('Failed to load reviews:', error);
            throw error;
        }
    }

    /**
     * Load review statistics for a product
     * @param {number} productId - Product ID
     * @returns {Promise<Object>} Review statistics
     */
    async loadStats(productId) {
        try {
            const apiService = await import('./apiService.js');
            this.stats = await apiService.getProductReviewStats(productId);
            return this.stats;
        } catch (error) {
            console.error('Failed to load review stats:', error);
            throw error;
        }
    }

    /**
     * Submit a new review
     * @param {number} productId - Product ID
     * @param {Object} reviewData - Review data (rating, title, comment)
     * @returns {Promise<Object>} Created review
     */
    async submitReview(productId, reviewData) {
        try {
            const apiService = await import('./apiService.js');
            const review = await apiService.createProductReview(productId, reviewData);
            
            // Add to local reviews array
            this.reviews.unshift(review);
            
            // Emit event
            document.dispatchEvent(new CustomEvent('reviewSubmitted', {
                detail: { review, productId }
            }));
            
            return review;
        } catch (error) {
            console.error('Failed to submit review:', error);
            throw error;
        }
    }

    /**
     * Get reviews
     * @returns {Array} Current reviews
     */
    getReviews() {
        return this.reviews;
    }

    /**
     * Get stats
     * @returns {Object} Current stats
     */
    getStats() {
        return this.stats;
    }

    /**
     * Get current sort order
     * @returns {string} Current sort
     */
    getCurrentSort() {
        return this.currentSort;
    }
}

/**
 * Create a star rating element
 * @param {number} rating - Rating value (1-5)
 * @param {boolean} interactive - Whether stars are clickable
 * @returns {HTMLElement} Star rating element
 */
export function createStarRating(rating, interactive = false) {
    const container = document.createElement('div');
    container.className = interactive ? 'star-rating interactive' : 'star-rating';
    container.setAttribute('role', interactive ? 'radiogroup' : 'img');
    container.setAttribute('aria-label', `${rating} out of 5 stars`);

    for (let i = 1; i <= 5; i++) {
        const star = document.createElement('i');
        star.className = i <= rating ? 'fas fa-star' : 'far fa-star';
        star.setAttribute('data-rating', i);
        
        if (interactive) {
            star.setAttribute('role', 'radio');
            star.setAttribute('aria-checked', i <= rating ? 'true' : 'false');
            star.setAttribute('tabindex', '0');
        }
        
        container.appendChild(star);
    }

    return container;
}

/**
 * Format review date
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export function formatReviewDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return `${months} ${months === 1 ? 'month' : 'months'} ago`;
    } else {
        const years = Math.floor(diffDays / 365);
        return `${years} ${years === 1 ? 'year' : 'years'} ago`;
    }
}

/**
 * Validate review form data
 * @param {Object} formData - Form data to validate
 * @returns {Object} Validation result { valid: boolean, errors: Object }
 */
export function validateReviewForm(formData) {
    const errors = {};

    if (!formData.rating || formData.rating < 1 || formData.rating > 5) {
        errors.rating = 'Please select a rating between 1 and 5 stars';
    }

    if (!formData.comment || formData.comment.trim().length < 10) {
        errors.comment = 'Review comment must be at least 10 characters long';
    }

    if (formData.comment && formData.comment.trim().length > 2000) {
        errors.comment = 'Review comment must not exceed 2000 characters';
    }

    if (formData.title && formData.title.trim().length > 200) {
        errors.title = 'Review title must not exceed 200 characters';
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors
    };
}

/**
 * Calculate rating percentage for distribution bars
 * @param {Object} stats - Review stats with rating_distribution
 * @returns {Object} Rating percentages
 */
export function calculateRatingPercentages(stats) {
    if (!stats || !stats.rating_distribution) {
        return { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    }

    const total = stats.review_count || 0;
    if (total === 0) {
        return { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    }

    const percentages = {};
    for (let i = 1; i <= 5; i++) {
        const count = stats.rating_distribution[i] || 0;
        percentages[i] = Math.round((count / total) * 100);
    }

    return percentages;
}

/**
 * Get rating color class based on rating value
 * @param {number} rating - Rating value (1-5)
 * @returns {string} Color class name
 */
export function getRatingColorClass(rating) {
    if (rating >= 4.5) return 'rating-excellent';
    if (rating >= 3.5) return 'rating-good';
    if (rating >= 2.5) return 'rating-average';
    if (rating >= 1.5) return 'rating-poor';
    return 'rating-very-poor';
}

// Export the ReviewManager class
export { ReviewManager };

// Create and export a singleton instance
export const reviewManager = new ReviewManager();
