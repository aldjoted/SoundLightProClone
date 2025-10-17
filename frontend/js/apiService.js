/**
 * apiService.js
 *
 * This module centralizes all communication with the backend API.
 * It handles fetching data, sending data, and managing authentication tokens with robust error handling.
 * @module apiService
 */

import { API_BASE_URL } from './config.js';
import { APIError, RetryManager } from './utils.js';

// Initialize global retry manager with sensible defaults
const retryManager = new RetryManager({
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    exponentialBase: 2,
    jitterFactor: 0.1
});

function resolveLoginUrl() {
    try {
        return new URL('login.html', window.location.href).toString();
    } catch {
        return 'login.html';
    }
}

/**
 * Manages JWT access tokens in memory and refresh tokens.
 * 
 * SECURITY ARCHITECTURE:
 * - Access tokens: Stored in memory (secure, lost on page reload)
 * - Refresh tokens: Currently in localStorage (temporary implementation)
 * 
 * ⚠️ SECURITY LIMITATION:
 * Using localStorage for refresh tokens instead of httpOnly cookies.
 * 
 * RISK: Vulnerable to XSS attacks - malicious scripts can read localStorage
 * 
 * TODO: Migrate to httpOnly cookies when backend supports it
 * Required backend changes:
 * 1. Set refresh token as httpOnly cookie in login response
 * 2. Add endpoint to clear cookies on logout
 * 3. Handle CORS with credentials: 'include'
 * 
 * @namespace tokenManager
 */
const tokenManager = (() => {
    let accessToken = null;
    
    return {
        /** @returns {string|null} */
        getAccessToken: () => accessToken,
        
        /** @param {string} token */
        setAccessToken: (token) => { 
            accessToken = token; 
        },
        
        /** 
         * Gets the refresh token.
         * ⚠️ Currently reads from localStorage - not secure against XSS
         * @returns {string|null} 
         */
        getRefreshToken: () => {
            // ⚠️ SECURITY LIMITATION: Using localStorage instead of httpOnly cookies
            // TODO: Migrate to httpOnly cookies when backend supports it
            // Risk: Vulnerable to XSS attacks
            return localStorage.getItem('refreshToken');
        },
        
        /** 
         * Sets the refresh token.
         * ⚠️ Currently stores in localStorage - not secure against XSS
         * @param {string} token 
         */
        setRefreshToken: (token) => {
            // ⚠️ SECURITY LIMITATION: Using localStorage instead of httpOnly cookies
            // TODO: Migrate to httpOnly cookies when backend supports it
            // Risk: Vulnerable to XSS attacks
            localStorage.setItem('refreshToken', token);
        },
        
        clearTokens: () => {
            accessToken = null;
            localStorage.removeItem('refreshToken');
            // TODO: When httpOnly cookies are implemented, call backend to clear cookie
        }
    };
})();

/**
 * Handles API responses, parsing JSON and throwing standardized errors.
 * @param {Response} response The raw response from a fetch call.
 * @returns {Promise<any>} A promise that resolves with the JSON data or null.
 * @throws {APIError} Throws a formatted APIError for non-successful responses.
 */
const handleResponse = async (response) => {
    if (response.status === 204) { // No Content
        return null;
    }
    
    let data = null;
    const contentType = response.headers.get('content-type') || '';
    
    try {
        if (contentType.includes('application/json')) {
            data = await response.json();
        } else {
            // Fallback: attempt text for better diagnostics
            const text = await response.text();
            try { 
                data = JSON.parse(text); 
            } catch { 
                data = { detail: text }; 
            }
        }
    } catch (parseError) {
        // Log parse error for debugging and return structured error
        console.warn('Failed to parse API response:', parseError);
        data = { detail: 'Invalid response format' };
    }
    
    if (!response.ok) {
        const errorMessage = data?.detail || data?.error || data?.message || 'Unknown error occurred';
        const errorCode = data?.code || `HTTP_${response.status}`;
        
        console.error('API Error:', {
            status: response.status,
            statusText: response.statusText,
            data,
            url: response.url
        });
        
        throw new APIError(errorMessage, response.status, errorCode, response);
    }
    
    return data;
};

// --- Single-flight token refresh management ---
// ✅ Improved: Better race condition handling with synchronous reset
let refreshPromise = null;

/**
 * Refreshes the access token using the refresh token.
 * Implements single-flight pattern to prevent multiple concurrent refresh requests.
 * @param {Function} getRefreshToken - Function that returns the refresh token.
 * @returns {Promise<Object>} Promise that resolves with new tokens.
 */
async function refreshAccessToken(getRefreshToken) {
    // If a refresh is already in progress, return the existing promise
    if (refreshPromise) {
        return refreshPromise;
    }
    
    refreshPromise = (async () => {
        try {
            const refreshToken = getRefreshToken();
            const res = await fetch(`${API_BASE_URL}/token/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: refreshToken }),
            });
            return await handleResponse(res);
        } finally {
            // Reset after a short delay to avoid rapid successive requests
            setTimeout(() => { refreshPromise = null; }, 100);
        }
    })();
    
    return refreshPromise;
}

/**
 * Core fetch function with built-in authentication and token refresh logic.
 * @param {string} url The API endpoint (e.g., '/products/').
 * @param {RequestInit} options The options for the fetch call.
 * @returns {Promise<any>} The JSON response from the API.
 */
async function apiFetch(url, options = {}) {
    const isFormData = options.body instanceof FormData;
    options.headers = {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...options.headers,
    };

    const accessToken = tokenManager.getAccessToken();
    if (accessToken) {
        options.headers['Authorization'] = `Bearer ${accessToken}`;
    }

    try {
        let response = await fetch(`${API_BASE_URL}${url}`, options);

        if (response.status === 401) {
            if (!tokenManager.getRefreshToken()) {
                // If no refresh token, logout and redirect.
                tokenManager.clearTokens();
                window.location.href = resolveLoginUrl();
                throw new APIError('Authentication required.', 401, 'NO_REFRESH_TOKEN');
            }

            try {
                const newTokens = await refreshAccessToken(tokenManager.getRefreshToken);
                tokenManager.setAccessToken(newTokens.access);
                options.headers['Authorization'] = `Bearer ${newTokens.access}`;
                response = await fetch(`${API_BASE_URL}${url}`, options);
            } catch (refreshError) {
                console.error('Failed to refresh token:', refreshError);
                tokenManager.clearTokens();
                window.location.href = resolveLoginUrl();
                throw new APIError('Session expired. Please log in again.', 401, 'TOKEN_REFRESH_FAILED');
            }
        }
        
        return handleResponse(response);
    } catch (error) {
        // Handle AbortError specifically
        if (error && error.name === 'AbortError') {
            throw error;
        }
        
        // Handle network errors (e.g., offline)
        if (error instanceof TypeError) {
            console.error("Network error:", error);
            throw new APIError("Network error. Please check your connection.", 0, 'NETWORK_ERROR');
        }
        
        // Re-throw APIErrors as-is
        if (error instanceof APIError) {
            throw error;
        }
        
        // Wrap other errors in APIError
        throw new APIError(error.message || 'Unknown error occurred', 0, 'UNKNOWN_ERROR');
    }
}

// --- Exported API functions ---
export { apiFetch };

/**
 * API fetch with retry logic for better resilience.
 * @param {string} url The API endpoint.
 * @param {RequestInit} options The fetch options.
 * @param {Object} retryOptions Retry configuration options.
 * @returns {Promise<any>} The JSON response from the API.
 */
export async function apiFetchWithRetry(url, options = {}, retryOptions = {}) {
    return retryManager.execute(() => apiFetch(url, options), retryOptions);
}

/**
 * Executes a fetch operation with or without retry logic
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {boolean} useRetry - Whether to use retry logic
 * @returns {Promise<any>} - The response data
 */
const executeFetch = async (url, options, useRetry) => {
    return useRetry ? 
        apiFetchWithRetry(url, options) : 
        apiFetch(url, options);
};

/**
 * Normalizes product response data
 * @param {any} response - The API response
 * @returns {Array<Object>} - Array of products
 */
const normalizeProductsResponse = (response) => {
    // Handle paginated response - extract the results array
    if (response && typeof response === 'object' && Array.isArray(response.results)) {
        return response.results;
    }
    
    // Fallback for non-paginated response
    return Array.isArray(response) ? response : [];
};

/**
 * Fetches a list of products, optionally filtered by a search query.
 * @param {string} [searchQuery=''] - The search term.
 * @param {Object} [options={}] - Fetch options.
 * @param {boolean} [useRetry=true] - Whether to use retry logic.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of products.
 */
/**
 * Fetches products from the API with optional search query and category filter.
 * @param {string} [searchQuery=''] - The search term for filtering products.
 * @param {Object} [options={}] - Additional fetch options like signal for abort.
 * @param {string} [categorySlug=''] - The category slug for filtering products.
 * @param {boolean} [useRetry=true] - Whether to use retry logic.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of product objects.
 */
export const getProducts = async (searchQuery = '', options = {}, categorySlug = '', useRetry = true) => {
    let url = '/products/';
    const params = [];
    
    if (searchQuery) {
        params.push(`search=${encodeURIComponent(searchQuery)}`);
    }
    
    if (categorySlug) {
        params.push(`category=${encodeURIComponent(categorySlug)}`);
    }
    
    if (params.length > 0) {
        url += `?${params.join('&')}`;
    }
    
    try {
        const response = await executeFetch(url, options, useRetry);
        return normalizeProductsResponse(response);
    } catch (error) {
        console.error('Failed to fetch products:', error);
        if (error instanceof APIError) {
            // Re-throw APIErrors with additional context
            throw new APIError(
                `Failed to load products: ${error.getUserMessage()}`,
                error.status,
                error.code,
                error.response
            );
        }
        throw error;
    }
};

/**
 * Fetches a single product by its ID.
 * @param {string|number} productId - The ID of the product.
 * @param {Object} [options={}] - Fetch options.
 * @param {boolean} [useRetry=true] - Whether to use retry logic.
 * @returns {Promise<Object>} A promise that resolves to the product object.
 */
export const getProductById = async (productId, options = {}, useRetry = true) => {
    if (!productId) {
        throw new APIError('Product ID is required', 400, 'INVALID_PRODUCT_ID');
    }
    
    const fetchFn = useRetry ? 
        () => apiFetchWithRetry(`/products/${productId}/`, options) : 
        () => apiFetch(`/products/${productId}/`, options);
    
    try {
        return await fetchFn();
    } catch (error) {
        console.error(`Failed to fetch product ${productId}:`, error);
        if (error instanceof APIError) {
            throw new APIError(
                `Failed to load product: ${error.getUserMessage()}`,
                error.status,
                error.code,
                error.response
            );
        }
        throw error;
    }
};

/**
 * Fetches all product categories.
 * @param {Object} [options={}] - Fetch options.
 * @param {boolean} [useRetry=true] - Whether to use retry logic.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of categories.
 */
export const getCategories = async (options = {}, useRetry = true) => {
    const fetchFn = useRetry ? 
        () => apiFetchWithRetry('/categories/', options) : 
        () => apiFetch('/categories/', options);
    
    try {
        return await fetchFn();
    } catch (error) {
        console.error('Failed to fetch categories:', error);
        if (error instanceof APIError) {
            throw new APIError(
                `Failed to load categories: ${error.getUserMessage()}`,
                error.status,
                error.code,
                error.response
            );
        }
        throw error;
    }
};

/**
 * Logs in a user and stores authentication tokens.
 * @param {string} username - The user's username.
 * @param {string} password - The user's password.
 * @param {boolean} [useCookie=true] - Whether to use httpOnly cookies for refresh token.
 * @returns {Promise<Object>} A promise that resolves to the token object.
 */
export const loginUser = async (username, password, useCookie = true) => {
    if (!username || !password) {
        throw new APIError('Username and password are required', 400, 'MISSING_CREDENTIALS');
    }
    
    try {
        const response = await apiFetch('/token/', {
            method: 'POST',
            body: JSON.stringify({ username, password, use_cookie: useCookie }),
        });
        
        if (!response.access) {
            throw new APIError('Invalid response format from login', 500, 'INVALID_LOGIN_RESPONSE');
        }
        
        tokenManager.setAccessToken(response.access);
        
        // If not using cookies, store refresh token from response
        if (!useCookie && response.refresh) {
            tokenManager.setRefreshToken(response.refresh);
        }
        
        return response;
    } catch (error) {
        console.error('Login failed:', error);
        if (error instanceof APIError) {
            let message = error.getUserMessage();
            if (error.status === 401) {
                message = 'Invalid username or password';
            } else if (error.status === 429) {
                message = 'Too many login attempts. Please try again in a few minutes.';
            }
            throw new APIError(message, error.status, error.code, error.response);
        }
        throw error;
    }
};

/**
 * Registers a new user.
 * @param {Object} userData - The user's registration data.
 * @returns {Promise<Object>} A promise that resolves to the new user's data.
 */
export const registerUser = async (userData) => {
    if (!userData?.username || !userData?.email || !userData?.password) {
        throw new APIError('Required registration fields are missing', 400, 'MISSING_REGISTRATION_DATA');
    }
    
    try {
        return await apiFetch('/register/', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    } catch (error) {
        console.error('Registration failed:', error);
        if (error instanceof APIError) {
            let message = error.getUserMessage();
            if (error.status === 429) {
                message = 'Too many registration attempts. Please try again later.';
            }
            throw new APIError(message, error.status, error.code, error.response);
        }
        throw error;
    }
};

/**
 * Fetches the profile of the currently logged-in user.
 * @param {boolean} [useRetry=true] - Whether to use retry logic.
 * @returns {Promise<Object>} A promise that resolves to the user's profile.
 */
export const getUserProfile = async (useRetry = true) => {
    const fetchFn = useRetry ? 
        () => apiFetchWithRetry('/user/') : 
        () => apiFetch('/user/');
    
    try {
        return await fetchFn();
    } catch (error) {
        console.error('Failed to fetch user profile:', error);
        if (error instanceof APIError) {
            throw new APIError(
                `Failed to load user profile: ${error.getUserMessage()}`,
                error.status,
                error.code,
                error.response
            );
        }
        throw error;
    }
};

/**
 * Logs out the user by clearing stored tokens and notifying the backend.
 */
export const logoutUser = async () => {
    try {
        // Notify backend to invalidate refresh token cookie
        await apiFetch('/logout/', { method: 'POST' });
    } catch (error) {
        console.error('Backend logout failed, proceeding with client-side cleanup:', error);
    } finally {
        // Always clear client-side tokens
        tokenManager.clearTokens();
    }
};

/**
 * Creates a new order.
 * @param {Object} orderData - The order data, including items and shipping info.
 * @returns {Promise<Object>} A promise that resolves to the created order details.
 */
export const createOrder = async (orderData) => {
    if (!orderData?.items?.length) {
        throw new APIError('Order must contain at least one item', 400, 'EMPTY_ORDER');
    }
    
    try {
        return await apiFetch('/orders/', {
            method: 'POST',
            body: JSON.stringify(orderData),
        });
    } catch (error) {
        console.error('Failed to create order:', error);
        if (error instanceof APIError) {
            throw new APIError(
                `Failed to create order: ${error.getUserMessage()}`,
                error.status,
                error.code,
                error.response
            );
        }
        throw error;
    }
};

// --- Wishlist API Functions ---

/**
 * Fetches the user's wishlist.
 * @returns {Promise<Object>} A promise that resolves to the wishlist object with items.
 */
export const getWishlist = async () => {
    try {
        return await apiFetch('/wishlist/');
    } catch (error) {
        console.error('Failed to fetch wishlist:', error);
        if (error instanceof APIError) {
            throw new APIError(
                `Failed to load wishlist: ${error.getUserMessage()}`,
                error.status,
                error.code,
                error.response
            );
        }
        throw error;
    }
};

/**
 * Adds a product to the user's wishlist.
 * @param {number} productId - The ID of the product to add.
 * @returns {Promise<Object>} A promise that resolves to the wishlist item.
 */
export const addToWishlist = async (productId) => {
    if (!productId) {
        throw new APIError('Product ID is required', 400, 'INVALID_PRODUCT_ID');
    }
    
    try {
        return await apiFetch('/wishlist/', {
            method: 'POST',
            body: JSON.stringify({ product_id: productId }),
        });
    } catch (error) {
        console.error('Failed to add to wishlist:', error);
        if (error instanceof APIError) {
            throw new APIError(
                `Failed to add to wishlist: ${error.getUserMessage()}`,
                error.status,
                error.code,
                error.response
            );
        }
        throw error;
    }
};

/**
 * Removes a product from the user's wishlist.
 * @param {number} productId - The ID of the product to remove.
 * @returns {Promise<Object>} A promise that resolves to the response.
 */
export const removeFromWishlist = async (productId) => {
    if (!productId) {
        throw new APIError('Product ID is required', 400, 'INVALID_PRODUCT_ID');
    }
    
    try {
        return await apiFetch('/wishlist/', {
            method: 'DELETE',
            body: JSON.stringify({ product_id: productId }),
        });
    } catch (error) {
        console.error('Failed to remove from wishlist:', error);
        if (error instanceof APIError) {
            throw new APIError(
                `Failed to remove from wishlist: ${error.getUserMessage()}`,
                error.status,
                error.code,
                error.response
            );
        }
        throw error;
    }
};

/**
 * Syncs guest wishlist with authenticated user's wishlist.
 * @param {Array<number>} productIds - Array of product IDs from guest wishlist.
 * @returns {Promise<Object>} A promise that resolves to the synced wishlist.
 */
export const syncWishlist = async (productIds) => {
    if (!Array.isArray(productIds)) {
        throw new APIError('Product IDs must be an array', 400, 'INVALID_PRODUCT_IDS');
    }
    
    try {
        return await apiFetch('/wishlist/sync/', {
            method: 'POST',
            body: JSON.stringify({ product_ids: productIds }),
        });
    } catch (error) {
        console.error('Failed to sync wishlist:', error);
        if (error instanceof APIError) {
            throw new APIError(
                `Failed to sync wishlist: ${error.getUserMessage()}`,
                error.status,
                error.code,
                error.response
            );
        }
        throw error;
    }
};

// --- Product Reviews API Functions ---

/**
 * Fetches reviews for a product.
 * @param {number} productId - The ID of the product.
 * @param {string} [sort='recent'] - Sort order (recent, highest, verified).
 * @returns {Promise<Array>} A promise that resolves to an array of reviews.
 */
export const getProductReviews = async (productId, sort = 'recent') => {
    if (!productId) {
        throw new APIError('Product ID is required', 400, 'INVALID_PRODUCT_ID');
    }
    
    try {
        const url = `/products/${productId}/reviews/${sort ? `?sort=${sort}` : ''}`;
        return await apiFetch(url);
    } catch (error) {
        console.error('Failed to fetch product reviews:', error);
        if (error instanceof APIError) {
            throw new APIError(
                `Failed to load reviews: ${error.getUserMessage()}`,
                error.status,
                error.code,
                error.response
            );
        }
        throw error;
    }
};

/**
 * Fetches review statistics for a product.
 * @param {number} productId - The ID of the product.
 * @returns {Promise<Object>} A promise that resolves to review stats.
 */
export const getProductReviewStats = async (productId) => {
    if (!productId) {
        throw new APIError('Product ID is required', 400, 'INVALID_PRODUCT_ID');
    }
    
    try {
        return await apiFetch(`/products/${productId}/reviews/stats/`);
    } catch (error) {
        console.error('Failed to fetch product review stats:', error);
        if (error instanceof APIError) {
            throw new APIError(
                `Failed to load review stats: ${error.getUserMessage()}`,
                error.status,
                error.code,
                error.response
            );
        }
        throw error;
    }
};

/**
 * Creates a new product review.
 * @param {number} productId - The ID of the product.
 * @param {Object} reviewData - The review data (rating, title, comment).
 * @returns {Promise<Object>} A promise that resolves to the created review.
 */
export const createProductReview = async (productId, reviewData) => {
    if (!productId) {
        throw new APIError('Product ID is required', 400, 'INVALID_PRODUCT_ID');
    }
    
    if (!reviewData?.rating || !reviewData?.comment) {
        throw new APIError('Rating and comment are required', 400, 'INVALID_REVIEW_DATA');
    }
    
    try {
        return await apiFetch(`/products/${productId}/reviews/`, {
            method: 'POST',
            body: JSON.stringify(reviewData),
        });
    } catch (error) {
        console.error('Failed to create product review:', error);
        if (error instanceof APIError) {
            throw new APIError(
                `Failed to submit review: ${error.getUserMessage()}`,
                error.status,
                error.code,
                error.response
            );
        }
        throw error;
    }
};

// --- Related Products API Function ---

/**
 * Fetches related products for a product.
 * @param {number} productId - The ID of the product.
 * @param {number} [limit=6] - Maximum number of related products to fetch.
 * @returns {Promise<Array>} A promise that resolves to an array of related products.
 */
export const getRelatedProducts = async (productId, limit = 6) => {
    if (!productId) {
        throw new APIError('Product ID is required', 400, 'INVALID_PRODUCT_ID');
    }
    
    try {
        return await apiFetch(`/products/${productId}/related/?limit=${limit}`);
    } catch (error) {
        console.error('Failed to fetch related products:', error);
        if (error instanceof APIError) {
            throw new APIError(
                `Failed to load related products: ${error.getUserMessage()}`,
                error.status,
                error.code,
                error.response
            );
        }
        throw error;
    }
};