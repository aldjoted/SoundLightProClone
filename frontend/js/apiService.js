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
 * ⚠️ CRITICAL SECURITY LIMITATION:
 * =================================
 * Using localStorage for refresh tokens instead of httpOnly cookies.
 * 
 * RISKS:
 * ------
 * 1. XSS Vulnerability: Any malicious script can read localStorage and steal tokens
 * 2. Token Persistence: Tokens remain even after browser closes (security vs UX tradeoff)
 * 3. No SameSite Protection: Cannot leverage browser CSRF protections
 * 
 * RECOMMENDED SOLUTION - Backend Changes:
 * ----------------------------------------
 * 
 * 1. Login Endpoint (POST /api/auth/login/):
 *    Current: Returns { access: "xxx", refresh: "yyy" }
 *    Required: Set refresh token as httpOnly cookie instead
 *    
 *    Response Headers:
 *    Set-Cookie: refreshToken=xxx; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=604800
 *    
 *    Response Body (only access token):
 *    { "access": "xxx" }
 * 
 * 2. Refresh Endpoint (POST /api/auth/refresh/):
 *    Current: Requires { refresh: "yyy" } in request body
 *    Required: Read refresh token from httpOnly cookie automatically
 *    
 *    Request: No body needed (cookie sent automatically with credentials: 'include')
 *    Response: Same as login - new access token + refresh httpOnly cookie
 * 
 * 3. Logout Endpoint (POST /api/auth/logout/):
 *    Required: Clear the httpOnly cookie
 *    
 *    Response Headers:
 *    Set-Cookie: refreshToken=; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=0
 * 
 * 4. CORS Configuration:
 *    Required: Backend must allow credentials
 *    
 *    Django settings.py:
 *    CORS_ALLOW_CREDENTIALS = True
 *    CORS_ALLOWED_ORIGINS = ['http://localhost:3000', 'https://yourdomain.com']
 *    
 *    Django views:
 *    @api_view(['POST'])
 *    @permission_classes([AllowAny])
 *    def login_view(request):
 *        # ... authenticate user ...
 *        response = Response({'access': access_token})
 *        response.set_cookie(
 *            key='refreshToken',
 *            value=refresh_token,
 *            httponly=True,
 *            secure=True,  # HTTPS only
 *            samesite='Strict',
 *            max_age=604800,  # 7 days
 *            path='/api/auth'
 *        )
 *        return response
 * 
 * FRONTEND CHANGES (After Backend Implementation):
 * -------------------------------------------------
 * 1. Remove all localStorage.setItem/getItem('refreshToken') calls
 * 2. Update tokenManager.getRefreshToken() to return null (backend handles it)
 * 3. Update tokenManager.setRefreshToken() to be a no-op
 * 4. Ensure all API calls use credentials: 'include' (already implemented)
 * 5. Remove refresh token from login/register response handling
 * 
 * SECURITY BENEFITS:
 * ------------------
 * - XSS Protection: JavaScript cannot access httpOnly cookies
 * - HTTPS Only: Secure flag prevents transmission over HTTP
 * - CSRF Protection: SameSite flag prevents cross-site requests
 * - Automatic Management: Browser handles cookie lifecycle
 * 
 * CURRENT MITIGATIONS (Until Backend Changes):
 * ----------------------------------------------
 * - Content Security Policy (CSP) reduces XSS risk
 * - Input sanitization on all user inputs
 * - Regular security audits and penetration testing
 * - Short token lifetimes (access: 5min, refresh: 7 days)
 * - HTTPS in production
 * 
 * @namespace tokenManager
 * @see https://owasp.org/www-community/HttpOnly
 * @see https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html
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
         * 
         * TODO [SECURITY]: After backend httpOnly cookie implementation:
         * - Change this to return null (backend reads from cookie automatically)
         * - Remove localStorage.getItem() call
         * - Backend will handle refresh token via httpOnly cookie
         * 
         * @returns {string|null} 
         */
        getRefreshToken: () => {
            // ⚠️ SECURITY LIMITATION: Using localStorage instead of httpOnly cookies
            // TODO [BACKEND]: Implement httpOnly cookie for refresh tokens
            // Risk: Vulnerable to XSS attacks
            return localStorage.getItem('refreshToken');
        },
        
        /** 
         * Sets the refresh token.
         * ⚠️ Currently stores in localStorage - not secure against XSS
         * 
         * TODO [SECURITY]: After backend httpOnly cookie implementation:
         * - Change this to a no-op function (backend sets cookie automatically)
         * - Remove localStorage.setItem() call
         * - Backend will set httpOnly cookie in Set-Cookie header
         * 
         * @param {string} token 
         */
        setRefreshToken: (token) => {
            // ⚠️ SECURITY LIMITATION: Using localStorage instead of httpOnly cookies
            // TODO [BACKEND]: Implement httpOnly cookie for refresh tokens
            // Risk: Vulnerable to XSS attacks
            localStorage.setItem('refreshToken', token);
        },
        
        /**
         * Clears all authentication tokens.
         * 
         * TODO [SECURITY]: After backend httpOnly cookie implementation:
         * - Keep accessToken clearing (in-memory)
         * - Remove localStorage.removeItem() call
         * - Ensure POST /api/auth/logout/ clears httpOnly cookie on backend
         */
        clearTokens: () => {
            accessToken = null;
            localStorage.removeItem('refreshToken');
            // TODO [BACKEND]: When httpOnly cookies are implemented, 
            // POST /api/auth/logout/ should clear the cookie with:
            // Set-Cookie: refreshToken=; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=0
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
 * 
 * TODO [SECURITY]: After backend httpOnly cookie implementation:
 * - Remove body: JSON.stringify({ refresh: refreshToken })
 * - Remove getRefreshToken parameter (not needed, backend reads from cookie)
 * - Backend automatically reads refreshToken from httpOnly cookie
 * - Backend response should include new access token and refresh httpOnly cookie
 * 
 * Example after migration:
 * ```
 * const res = await fetch(`${API_BASE_URL}/token/refresh/`, {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     credentials: 'include',  // Send cookies automatically
 *     // No body needed - backend reads from cookie
 * });
 * ```
 * 
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
                credentials: 'include',  // ✅ Include credentials for httpOnly cookies
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
    
    // ✅ CRITICAL: Include credentials for httpOnly cookies
    options.credentials = 'include';

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
 * 
 * TODO [SECURITY]: After backend httpOnly cookie implementation:
 * - Remove refresh token handling from response (backend sets httpOnly cookie)
 * - Keep only access token storage in memory
 * - Remove tokenManager.setRefreshToken() call
 * - Backend will set refresh token via Set-Cookie header
 * 
 * @param {string} username - The user's username.
 * @param {string} password - The user's password.
 * @param {boolean} [useCookie=false] - Reserved for future httpOnly cookie support (not implemented).
 * @returns {Promise<Object>} A promise that resolves to the token object.
 */
export const loginUser = async (username, password, useCookie = false) => {
    if (!username || !password) {
        throw new APIError('Username and password are required', 400, 'MISSING_CREDENTIALS');
    }
    
    try {
        const response = await apiFetch('/token/', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
        
        if (!response.access) {
            throw new APIError('Invalid response format from login', 500, 'INVALID_LOGIN_RESPONSE');
        }
        
        // Store access token in memory
        tokenManager.setAccessToken(response.access);
        
        // ⚠️ SECURITY LIMITATION: Store refresh token in localStorage
        // TODO [BACKEND]: After httpOnly cookie implementation, remove this block
        // Backend will automatically set refreshToken cookie via Set-Cookie header
        if (response.refresh) {
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
 * 
 * NOTE: Registration typically returns user data without tokens.
 * Users must login separately after registration.
 * If backend changes to return tokens upon registration, apply same
 * httpOnly cookie pattern as loginUser().
 * 
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
 * ✅ IMPROVED: Now clears service worker caches to prevent stale data
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
        
        // ✅ Notify service worker to clear auth-related caches
        if (navigator.serviceWorker?.controller) {
            console.log('[Auth] Notifying service worker to clear caches');
            navigator.serviceWorker.controller.postMessage({
                type: 'LOGOUT'
            });
        }
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

// --- Dashboard API Functions ---

/**
 * Fetches extended user profile data from dashboard.
 * @returns {Promise<Object>} A promise that resolves to the user profile.
 */
export const getDashboardProfile = async () => {
    try {
        return await apiFetch('/dashboard/profile/');
    } catch (error) {
        console.error('Failed to fetch dashboard profile:', error);
        if (error instanceof APIError) {
            throw new APIError(
                `Failed to load profile: ${error.getUserMessage()}`,
                error.status,
                error.code,
                error.response
            );
        }
        throw error;
    }
};

/**
 * Updates user profile data.
 * @param {Object} profileData - The profile data to update.
 * @returns {Promise<Object>} A promise that resolves to the updated profile.
 */
export const updateUserProfile = async (profileData) => {
    try {
        return await apiFetch('/dashboard/profile/', {
            method: 'PATCH',
            body: JSON.stringify(profileData),
        });
    } catch (error) {
        console.error('Failed to update user profile:', error);
        if (error instanceof APIError) {
            throw new APIError(
                `Failed to update profile: ${error.getUserMessage()}`,
                error.status,
                error.code,
                error.response
            );
        }
        throw error;
    }
};

/**
 * Updates user password.
 * @param {Object} passwordData - The password data (old_password, new_password, confirm_password).
 * @returns {Promise<Object>} A promise that resolves to the response.
 */
export const updatePassword = async (passwordData) => {
    if (!passwordData?.old_password || !passwordData?.new_password) {
        throw new APIError('Old and new passwords are required', 400, 'INVALID_PASSWORD_DATA');
    }
    
    try {
        return await apiFetch('/dashboard/profile/password/', {
            method: 'POST',
            body: JSON.stringify(passwordData),
        });
    } catch (error) {
        console.error('Failed to update password:', error);
        if (error instanceof APIError) {
            throw new APIError(
                `Failed to update password: ${error.getUserMessage()}`,
                error.status,
                error.code,
                error.response
            );
        }
        throw error;
    }
};

/**
 * Fetches shipping addresses for the user.
 * @returns {Promise<Array>} A promise that resolves to an array of addresses.
 */
export const getShippingAddresses = async () => {
    try {
        return await apiFetch('/dashboard/addresses/');
    } catch (error) {
        console.error('Failed to fetch shipping addresses:', error);
        if (error instanceof APIError) {
            throw new APIError(
                `Failed to load addresses: ${error.getUserMessage()}`,
                error.status,
                error.code,
                error.response
            );
        }
        throw error;
    }
};

/**
 * Creates a new shipping address.
 * @param {Object} addressData - The address data.
 * @returns {Promise<Object>} A promise that resolves to the created address.
 */
export const createShippingAddress = async (addressData) => {
    try {
        return await apiFetch('/dashboard/addresses/', {
            method: 'POST',
            body: JSON.stringify(addressData),
        });
    } catch (error) {
        console.error('Failed to create shipping address:', error);
        if (error instanceof APIError) {
            throw new APIError(
                `Failed to create address: ${error.getUserMessage()}`,
                error.status,
                error.code,
                error.response
            );
        }
        throw error;
    }
};

/**
 * Updates a shipping address.
 * @param {number} addressId - The ID of the address.
 * @param {Object} addressData - The address data to update.
 * @returns {Promise<Object>} A promise that resolves to the updated address.
 */
export const updateShippingAddress = async (addressId, addressData) => {
    if (!addressId) {
        throw new APIError('Address ID is required', 400, 'INVALID_ADDRESS_ID');
    }
    
    try {
        return await apiFetch(`/dashboard/addresses/${addressId}/`, {
            method: 'PATCH',
            body: JSON.stringify(addressData),
        });
    } catch (error) {
        console.error('Failed to update shipping address:', error);
        if (error instanceof APIError) {
            throw new APIError(
                `Failed to update address: ${error.getUserMessage()}`,
                error.status,
                error.code,
                error.response
            );
        }
        throw error;
    }
};

/**
 * Deletes a shipping address.
 * @param {number} addressId - The ID of the address.
 * @returns {Promise<void>}
 */
export const deleteShippingAddress = async (addressId) => {
    if (!addressId) {
        throw new APIError('Address ID is required', 400, 'INVALID_ADDRESS_ID');
    }
    
    try {
        return await apiFetch(`/dashboard/addresses/${addressId}/`, {
            method: 'DELETE',
        });
    } catch (error) {
        console.error('Failed to delete shipping address:', error);
        if (error instanceof APIError) {
            throw new APIError(
                `Failed to delete address: ${error.getUserMessage()}`,
                error.status,
                error.code,
                error.response
            );
        }
        throw error;
    }
};

/**
 * Fetches payment methods for the user.
 * @returns {Promise<Array>} A promise that resolves to an array of payment methods.
 */
export const getPaymentMethods = async () => {
    try {
        return await apiFetch('/dashboard/payment-methods/');
    } catch (error) {
        console.error('Failed to fetch payment methods:', error);
        if (error instanceof APIError) {
            throw new APIError(
                `Failed to load payment methods: ${error.getUserMessage()}`,
                error.status,
                error.code,
                error.response
            );
        }
        throw error;
    }
};

/**
 * Creates a new payment method.
 * @param {Object} paymentMethodData - The payment method data.
 * @returns {Promise<Object>} A promise that resolves to the created payment method.
 */
export const createPaymentMethod = async (paymentMethodData) => {
    try {
        return await apiFetch('/dashboard/payment-methods/', {
            method: 'POST',
            body: JSON.stringify(paymentMethodData),
        });
    } catch (error) {
        console.error('Failed to create payment method:', error);
        if (error instanceof APIError) {
            throw new APIError(
                `Failed to create payment method: ${error.getUserMessage()}`,
                error.status,
                error.code,
                error.response
            );
        }
        throw error;
    }
};

/**
 * Updates a payment method.
 * @param {number} pmId - The ID of the payment method.
 * @param {Object} paymentMethodData - The payment method data to update.
 * @returns {Promise<Object>} A promise that resolves to the updated payment method.
 */
export const updatePaymentMethod = async (pmId, paymentMethodData) => {
    if (!pmId) {
        throw new APIError('Payment method ID is required', 400, 'INVALID_PM_ID');
    }
    
    try {
        return await apiFetch(`/dashboard/payment-methods/${pmId}/`, {
            method: 'PATCH',
            body: JSON.stringify(paymentMethodData),
        });
    } catch (error) {
        console.error('Failed to update payment method:', error);
        if (error instanceof APIError) {
            throw new APIError(
                `Failed to update payment method: ${error.getUserMessage()}`,
                error.status,
                error.code,
                error.response
            );
        }
        throw error;
    }
};

/**
 * Deletes a payment method.
 * @param {number} pmId - The ID of the payment method.
 * @returns {Promise<void>}
 */
export const deletePaymentMethod = async (pmId) => {
    if (!pmId) {
        throw new APIError('Payment method ID is required', 400, 'INVALID_PM_ID');
    }
    
    try {
        return await apiFetch(`/dashboard/payment-methods/${pmId}/`, {
            method: 'DELETE',
        });
    } catch (error) {
        console.error('Failed to delete payment method:', error);
        if (error instanceof APIError) {
            throw new APIError(
                `Failed to delete payment method: ${error.getUserMessage()}`,
                error.status,
                error.code,
                error.response
            );
        }
        throw error;
    }
};

/**
 * Fetches orders for the dashboard with optional filters.
 * @param {Object} [filters={}] - The filters (status, date_from, date_to, search).
 * @returns {Promise<Array>} A promise that resolves to an array of orders.
 */
export const getDashboardOrders = async (filters = {}) => {
    try {
        const queryParams = new URLSearchParams();
        if (filters.status && filters.status !== 'all') {
            queryParams.append('status', filters.status);
        }
        if (filters.date_from) {
            queryParams.append('date_from', filters.date_from);
        }
        if (filters.date_to) {
            queryParams.append('date_to', filters.date_to);
        }
        if (filters.search) {
            queryParams.append('search', filters.search);
        }
        
        const queryString = queryParams.toString();
        const url = queryString ? `/dashboard/orders/?${queryString}` : '/dashboard/orders/';
        
        return await apiFetch(url);
    } catch (error) {
        console.error('Failed to fetch dashboard orders:', error);
        if (error instanceof APIError) {
            throw new APIError(
                `Failed to load orders: ${error.getUserMessage()}`,
                error.status,
                error.code,
                error.response
            );
        }
        throw error;
    }
};

/**
 * Fetches detailed order information.
 * @param {number} orderId - The ID of the order.
 * @returns {Promise<Object>} A promise that resolves to the order details.
 */
export const getOrderDetails = async (orderId) => {
    if (!orderId) {
        throw new APIError('Order ID is required', 400, 'INVALID_ORDER_ID');
    }
    
    try {
        return await apiFetch(`/dashboard/orders/${orderId}/`);
    } catch (error) {
        console.error('Failed to fetch order details:', error);
        if (error instanceof APIError) {
            throw new APIError(
                `Failed to load order details: ${error.getUserMessage()}`,
                error.status,
                error.code,
                error.response
            );
        }
        throw error;
    }
};

/**
 * Cancels an order.
 * @param {number} orderId - The ID of the order.
 * @returns {Promise<Object>} A promise that resolves to the updated order.
 */
export const cancelOrder = async (orderId) => {
    if (!orderId) {
        throw new APIError('Order ID is required', 400, 'INVALID_ORDER_ID');
    }
    
    try {
        return await apiFetch(`/dashboard/orders/${orderId}/`, {
            method: 'PATCH',
            body: JSON.stringify({ action: 'cancel' }),
        });
    } catch (error) {
        console.error('Failed to cancel order:', error);
        if (error instanceof APIError) {
            throw new APIError(
                `Failed to cancel order: ${error.getUserMessage()}`,
                error.status,
                error.code,
                error.response
            );
        }
        throw error;
    }
};

/**
 * Fetches reviews written by the user.
 * @returns {Promise<Array>} A promise that resolves to an array of reviews.
 */
export const getUserReviews = async () => {
    try {
        return await apiFetch('/dashboard/reviews/');
    } catch (error) {
        console.error('Failed to fetch user reviews:', error);
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
 * Updates a review.
 * @param {number} reviewId - The ID of the review.
 * @param {Object} reviewData - The review data to update.
 * @returns {Promise<Object>} A promise that resolves to the updated review.
 */
export const updateReview = async (reviewId, reviewData) => {
    if (!reviewId) {
        throw new APIError('Review ID is required', 400, 'INVALID_REVIEW_ID');
    }
    
    try {
        return await apiFetch(`/dashboard/reviews/${reviewId}/`, {
            method: 'PATCH',
            body: JSON.stringify(reviewData),
        });
    } catch (error) {
        console.error('Failed to update review:', error);
        if (error instanceof APIError) {
            throw new APIError(
                `Failed to update review: ${error.getUserMessage()}`,
                error.status,
                error.code,
                error.response
            );
        }
        throw error;
    }
};

/**
 * Deletes a review.
 * @param {number} reviewId - The ID of the review.
 * @returns {Promise<void>}
 */
export const deleteReview = async (reviewId) => {
    if (!reviewId) {
        throw new APIError('Review ID is required', 400, 'INVALID_REVIEW_ID');
    }
    
    try {
        return await apiFetch(`/dashboard/reviews/${reviewId}/`, {
            method: 'DELETE',
        });
    } catch (error) {
        console.error('Failed to delete review:', error);
        if (error instanceof APIError) {
            throw new APIError(
                `Failed to delete review: ${error.getUserMessage()}`,
                error.status,
                error.code,
                error.response
            );
        }
        throw error;
    }
};