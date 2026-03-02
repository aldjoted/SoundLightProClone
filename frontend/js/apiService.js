/**
 * apiService.js
 *
 * This module centralizes all communication with the backend API.
 * It handles fetching data, sending data, and managing authentication tokens with robust error handling.
 * @module apiService
 */

import { API_BASE_URL } from './config.js';
import { APIError, RetryManager } from './utils.js';
import { RateLimiter, CSPNonceManager } from './security.js';

// Initialize global retry manager with sensible defaults
const retryManager = new RetryManager({
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    exponentialBase: 2,
    jitterFactor: 0.1
});

// Initialize rate limiter for API calls
const apiRateLimiter = new RateLimiter();

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
 * ✅ SECURITY ARCHITECTURE (FIXED):
 * =================================
 * - Access tokens: Stored in memory and mirrored to sessionStorage for per-tab persistence.
 * - Refresh tokens: Managed exclusively by the backend as secure, httpOnly cookies.
 *
 * ⚠️ VULNERABILITY REMEDIATED:
 * ----------------------------
 * localStorage is no longer used for refresh token storage, eliminating token exposure to XSS.
 *
 * HOW IT WORKS NOW:
 * -----------------
 * 1. Login/Refresh endpoints return a Set-Cookie header (e.g. refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/api/).
 * 2. JavaScript never reads the cookie; the browser sends it automatically on credentialed requests.
 * 3. All fetch calls include credentials so the cookie is attached when needed.
 * 4. Logout triggers backend cookie invalidation; the browser removes it via Set-Cookie Max-Age=0.
 *
 * @namespace tokenManager
 * @see https://owasp.org/www-community/HttpOnly
 */
const ACCESS_TOKEN_KEY = 'slp_access_token';
const USER_STORAGE_KEY = 'slp_user_profile';

function setStoredUserProfile(user) {
    try {
        if (user) {
            sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
        } else {
            sessionStorage.removeItem(USER_STORAGE_KEY);
        }
    } catch (storageError) {
        console.warn('User profile persistence unavailable:', storageError);
    }
}

function getStoredUserProfile() {
    try {
        const raw = sessionStorage.getItem(USER_STORAGE_KEY);
        if (!raw) {
            return null;
        }
        return JSON.parse(raw);
    } catch (storageError) {
        console.warn('Failed to read cached user profile:', storageError);
        return null;
    }
}

function clearStoredUserProfile() {
    setStoredUserProfile(null);
}

const tokenManager = (() => {
    let accessToken = null;

    try {
        const storedToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
        if (storedToken) {
            accessToken = storedToken;
        }
    } catch (storageError) {
        console.warn('Session storage is not accessible. Tokens will not persist across pages.', storageError);
    }
    
    return {
        /** @returns {string|null} */
        getAccessToken: () => accessToken,
        
        /** @param {string} token */
        setAccessToken: (token) => { 
            accessToken = token; 
            try {
                if (token) {
                    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
                } else {
                    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
                }
            } catch (storageError) {
                console.warn('Failed to persist access token in session storage:', storageError);
            }
        },
        
        /** 
         * Gets the refresh token.
         * ✅ SECURITY FIX: Always returns null because the browser manages the
         * httpOnly refresh cookie automatically on credentialed requests.
         *
         * @returns {string|null} 
         */
        getRefreshToken: () => {
            return null;
        },
        
        /** 
         * Sets the refresh token.
         * ✅ SECURITY FIX: No-op because the backend issues secure, httpOnly cookies.
         *
         * @param {string} token 
         */
        setRefreshToken: (_token) => {
            // Refresh token is managed via httpOnly cookie set by the backend.
        },
        
        /**
         * Clears all authentication tokens.
         * ✅ SECURITY FIX: Backend `/logout/` endpoint clears the httpOnly cookie.
         */
        clearTokens: () => {
            accessToken = null;
            try {
                sessionStorage.removeItem(ACCESS_TOKEN_KEY);
            } catch (storageError) {
                console.warn('Failed to clear access token from session storage:', storageError);
            }
            setStoredUserProfile(null);
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
let isRefreshing = false;
let lastRefreshAttempt = 0;
const REFRESH_COOLDOWN_MS = 2000; // Prevent rapid refresh attempts

/**
 * Checks if we should attempt a token refresh.
 * Prevents rapid successive refresh attempts.
 * @returns {boolean} True if enough time has passed since last attempt
 */
function canAttemptRefresh() {
    const now = Date.now();
    if (now - lastRefreshAttempt < REFRESH_COOLDOWN_MS) {
        console.debug('[Auth] Refresh cooldown active, skipping attempt');
        return false;
    }
    return true;
}

/**
 * Refreshes the access token while preventing concurrent refresh races.
 *
 * ✅ SECURITY FIX: The request body no longer includes a refresh token. The backend
 * reads the secure, httpOnly cookie automatically because `credentials: 'include'` is set.
 * 
 * ✅ IMPROVED: Better error handling and cooldown mechanism
 *
 * @returns {Promise<Object>} Promise that resolves with new tokens.
 * @throws {APIError} If refresh fails
 */
async function refreshAccessToken() {
    // If a refresh is already in progress, return the existing promise
    if (refreshPromise) {
        console.debug('[Auth] Reusing existing refresh promise');
        return refreshPromise;
    }
    
    // Check cooldown
    if (!canAttemptRefresh()) {
        throw new APIError('Refresh rate limited', 429, 'REFRESH_COOLDOWN');
    }
    
    lastRefreshAttempt = Date.now();
    isRefreshing = true;
    
    refreshPromise = (async () => {
        try {
            console.debug('[Auth] Attempting token refresh via httpOnly cookie');
            
            const res = await fetch(`${API_BASE_URL}/token/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',  // ✅ Include credentials for httpOnly cookies
            });

            // Capture CSP nonce if provided
            try { CSPNonceManager.extractFromResponse(res); } catch { }
            
            // Handle specific error cases
            if (res.status === 401) {
                console.debug('[Auth] Refresh token invalid or not present - user not authenticated');
                throw new APIError('Session expired', 401, 'REFRESH_TOKEN_INVALID');
            }
            
            if (res.status === 429) {
                console.warn('[Auth] Refresh rate limited by server');
                throw new APIError('Too many refresh attempts', 429, 'REFRESH_RATE_LIMITED');
            }
            
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new APIError(
                    errorData.detail || 'Token refresh failed',
                    res.status,
                    'REFRESH_FAILED'
                );
            }
            
            const data = await res.json();
            console.debug('[Auth] Token refresh successful');
            return data;
            
        } finally {
            isRefreshing = false;
            // Reset after a short delay to avoid rapid successive requests
            setTimeout(() => { refreshPromise = null; }, 100);
        }
    })();
    
    return refreshPromise;
}

/**
 * Ensures a valid access token is available.
 * 
 * ✅ IMPROVED: Better handling of missing tokens and refresh failures.
 * - Returns existing token if valid
 * - Attempts refresh via httpOnly cookie if no token
 * - Does NOT redirect to login (let caller decide)
 * 
 * @returns {Promise<string|null>} Access token or null if unavailable
 */
async function ensureAccessToken() {
    const existingToken = tokenManager.getAccessToken();
    
    // If we have a token, return it (assume it's valid, 401 handler will refresh if needed)
    if (existingToken) {
        return existingToken;
    }
    
    // No token in memory - try to refresh using httpOnly cookie
    console.debug('[Auth] No access token in memory, attempting refresh');

    try {
        const tokens = await refreshAccessToken();
        if (tokens?.access) {
            tokenManager.setAccessToken(tokens.access);
            console.debug('[Auth] Access token obtained via refresh');
            return tokens.access;
        }
    } catch (error) {
        // Log but don't throw - just return null to indicate no valid session
        if (error?.status === 401) {
            console.debug('[Auth] No valid session (refresh token missing/invalid)');
        } else {
            console.warn('[Auth] Unable to ensure access token:', error?.message || error);
        }
    }

    // No valid session - clear any stale data
    tokenManager.clearTokens();
    return null;
}

/**
 * Core fetch function with built-in authentication and token refresh logic.
 * 
 * ✅ IMPROVED: Better 401 handling
 * - Attempts token refresh on 401
 * - Only redirects to login if refresh fails and not already on login page
 * - Preserves request context during retry
 * 
 * @param {string} url The API endpoint (e.g., '/products/').
 * @param {RequestInit} options The options for the fetch call.
 * @returns {Promise<any>} The JSON response from the API.
 */
async function apiFetch(url, options = {}) {
    // Check rate limit before making request
    const rateLimitKey = `api:${url.split('?')[0]}`; // Use base URL without query params
    if (!apiRateLimiter.checkLimit(rateLimitKey, 60, 60000)) { // 60 requests per minute per endpoint
        throw new APIError('Too many requests. Please wait a moment.', 429, 'RATE_LIMIT_EXCEEDED');
    }

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

        // Capture CSP nonce if provided
        try { CSPNonceManager.extractFromResponse(response); } catch { }

        // Handle 401 Unauthorized - attempt token refresh
        if (response.status === 401) {
            console.debug(`[API] 401 received for ${url}, attempting refresh`);
            
            try {
                const newTokens = await refreshAccessToken();
                if (newTokens?.access) {
                    tokenManager.setAccessToken(newTokens.access);
                    
                    // Retry the original request with new token
                    options.headers['Authorization'] = `Bearer ${newTokens.access}`;
                    console.debug(`[API] Retrying ${url} with new token`);
                    response = await fetch(`${API_BASE_URL}${url}`, options);

                    // Capture CSP nonce if provided
                    try { CSPNonceManager.extractFromResponse(response); } catch { }
                } else {
                    throw new APIError('Token refresh returned no access token', 401, 'TOKEN_REFRESH_EMPTY');
                }
            } catch (refreshError) {
                console.debug('[API] Token refresh failed:', refreshError?.message || refreshError);
                
                // Clear tokens on refresh failure
                tokenManager.clearTokens();
                
                // Only redirect to login if:
                // 1. Not already on login-related pages
                // 2. This was an authenticated request that failed
                const currentPath = window.location.pathname.toLowerCase();
                const isAuthPage = currentPath.includes('login') || 
                                   currentPath.includes('register') || 
                                   currentPath.includes('verify') ||
                                   currentPath.includes('reset-password') ||
                                   currentPath.includes('forgot-password');
                
                if (!isAuthPage && accessToken) {
                    // User had a session that is now invalid - redirect to login
                    console.info('[API] Session expired, redirecting to login');
                    window.location.href = resolveLoginUrl();
                }
                
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
            console.error("[API] Network error:", error);
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
export { API_BASE_URL, apiFetch, ensureAccessToken, getStoredUserProfile, clearStoredUserProfile };

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
export const getProducts = async (searchQuery = '', options = {}, categorySlug = '', brandSlug = '', useRetry = true) => {
    let url = '/products/';
    const params = [];
    
    if (searchQuery) {
        params.push(`search=${encodeURIComponent(searchQuery)}`);
    }
    
    if (categorySlug) {
        params.push(`category=${encodeURIComponent(categorySlug)}`);
    }

    if (brandSlug) {
        params.push(`brand=${encodeURIComponent(brandSlug)}`);
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
 * Fetches partner brands.
 * @param {Object} [options={}] - Fetch options (e.g., { signal }).
 * @param {boolean} [useRetry=true] - Whether to retry on transient errors.
 * @returns {Promise<Array<Object>>} A promise resolving to the list of brands.
 */
export const getBrands = async (options = {}, useRetry = true) => {
    const fetchFn = useRetry ?
        () => apiFetchWithRetry('/brands/', options) :
        () => apiFetch('/brands/', options);

    try {
        return await fetchFn();
    } catch (error) {
        console.error('Failed to fetch brands:', error);
        if (error instanceof APIError) {
            throw new APIError(
                `Failed to load brands: ${error.getUserMessage()}`,
                error.status,
                error.code,
                error.response
            );
        }
        throw error;
    }
};

/**
 * Initiates the login flow by submitting credentials to trigger the 2FA challenge.
 *
 * ✅ SECURITY IMPROVEMENT: Only performs the first leg of authentication
 * - Validates credentials and requests that the backend send the verification code
 * - Does not return or persist access tokens; those are issued after verifyLoginCode()
 * - Clears any residual in-memory/session tokens to avoid mixing sessions
 *
 * @param {string} identifier - The user's username or email address.
 * @param {string} password - The user's password.
 * @param {boolean} [_useCookie=false] - Maintained for compatibility; not used.
 * @returns {Promise<Object>} A promise that resolves with the verification challenge payload.
 */
export const initiateLogin = async (identifier, password, _useCookie = false) => {
    if (!identifier || !password) {
        throw new APIError('Username or email and password are required', 400, 'MISSING_CREDENTIALS');
    }

    try {
        const trimmedIdentifier = identifier.trim();
        const payload = {
            username: trimmedIdentifier,
            identifier: trimmedIdentifier,
        };

        if (trimmedIdentifier.includes('@')) {
            payload.email = trimmedIdentifier;
        }

        const response = await apiFetch('/token/', {
            method: 'POST',
            body: JSON.stringify({
                ...payload,
                password,
            }),
        });

        if (response?.requires_verification) {
            tokenManager.clearTokens();
            return response;
        }

        console.error('Unexpected login response (requires_verification missing):', response);
        throw new APIError(
            'Login failed due to an unexpected server response. Please retry or contact support.',
            500,
            'UNEXPECTED_LOGIN_RESPONSE',
            response,
        );
    } catch (error) {
        console.error('Login initiation failed:', error);
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
 * Verifies the 6-digit login code and completes authentication.
 * 
 * ✅ NEW: 2FA email verification
 * - Verifies the code sent to user's email
 * - Returns JWT tokens upon successful verification
 * - Stores tokens in memory and localStorage
 * 
 * @param {string} email - The user's email address.
 * @param {string} code - The 6-digit verification code.
 * @returns {Promise<Object>} A promise that resolves to the token object.
 */
export const verifyLoginCode = async (email, code) => {
    if (!email || !code) {
        throw new APIError('Email and verification code are required', 400, 'MISSING_VERIFICATION_DATA');
    }
    
    try {
        const response = await apiFetch('/verify-login/', {
            method: 'POST',
            body: JSON.stringify({ email, code }),
        });
        
        if (!response.access) {
            throw new APIError('Invalid response format from verification', 500, 'INVALID_VERIFICATION_RESPONSE');
        }
        
        // Store access token in memory
        tokenManager.setAccessToken(response.access);
        
        // Note: Refresh token is set via httpOnly cookie by the backend
        // No need to store it in localStorage anymore
        
        return response;
    } catch (error) {
        console.error('Verification failed:', error);
        if (error instanceof APIError) {
            let message = error.getUserMessage();
            if (error.status === 401) {
                message = error.response?.detail || 'Invalid or expired verification code';
            } else if (error.status === 423) {
                message = error.response?.detail || 'Account is temporarily locked. Please try again later.';
            } else if (error.status === 429) {
                message = 'Too many verification attempts. Please try again in a few minutes.';
            }
            throw new APIError(message, error.status, error.code, error.response);
        }
        throw error;
    }
};

/**
 * Resends the 6-digit login verification code.
 * 
 * ✅ NEW: Resend verification code functionality
 * - Requests a new verification code to be sent to the user's email
 * - Rate limited to 3 requests per minute
 * 
 * @param {string} email - The user's email address.
 * @returns {Promise<Object>} A promise that resolves with the response.
 */
export const resendVerificationCode = async (email) => {
    if (!email) {
        throw new APIError('Email is required', 400, 'MISSING_EMAIL');
    }
    
    try {
        return await apiFetch('/resend-verification/', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
    } catch (error) {
        console.error('Resend verification failed:', error);
        if (error instanceof APIError) {
            let message = error.getUserMessage();
            if (error.status === 423) {
                message = error.response?.detail || 'Account is temporarily locked.';
            } else if (error.status === 429) {
                message = 'Too many resend attempts. Please wait before trying again.';
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
 * httpOnly cookie pattern as initiateLogin().
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
        const profile = await fetchFn();
        setStoredUserProfile(profile);
        return profile;
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

/**
 * Registers a stock availability notification request.
 * @param {number|string} productId - The product identifier from the catalog.
 * @param {string} email - Email address to notify once restocked.
 * @returns {Promise<Object>} The created notification request payload.
 */
export const requestStockNotification = async (productId, email) => {
    if (!productId) {
        throw new APIError('Product ID is required', 400, 'INVALID_PRODUCT_ID');
    }

    const trimmedEmail = (email || '').trim();
    if (!trimmedEmail) {
        throw new APIError('Email is required', 400, 'INVALID_EMAIL');
    }

    try {
        return await apiFetch(`/products/${productId}/notify/`, {
            method: 'POST',
            body: JSON.stringify({ email: trimmedEmail })
        });
    } catch (error) {
        console.error('Failed to create stock notification request:', error);
        if (error instanceof APIError) {
            throw new APIError(
                `Unable to register notification: ${error.getUserMessage()}`,
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

// --- Quote (Devis) API Functions ---

/**
 * Creates a new quote (devis) from cart items.
 * @param {Object} quoteData - The quote data including items, customer info, and addresses.
 * @returns {Promise<Object>} A promise that resolves to the created quote with quote_number.
 */
export const createQuote = async (quoteData) => {
    if (!quoteData?.items?.length) {
        throw new APIError('Quote must contain at least one item', 400, 'EMPTY_QUOTE');
    }
    
    if (!quoteData?.customer_name || !quoteData?.email) {
        throw new APIError('Customer name and email are required', 400, 'MISSING_CUSTOMER_INFO');
    }
    
    try {
        return await apiFetch('/quotes/', {
            method: 'POST',
            body: JSON.stringify(quoteData),
        });
    } catch (error) {
        console.error('Failed to create quote:', error);
        if (error instanceof APIError) {
            throw new APIError(
                `Failed to create quote: ${error.getUserMessage()}`,
                error.status,
                error.code,
                error.response
            );
        }
        throw error;
    }
};

/**
 * Fetches quote details by quote number.
 * @param {string} quoteNumber - The quote number (e.g., Q-20231025-ABCD).
 * @returns {Promise<Object>} A promise that resolves to the quote details.
 */
export const getQuoteDetails = async (quoteNumber, accessToken = '') => {
    if (!quoteNumber) {
        throw new APIError('Quote number is required', 400, 'INVALID_QUOTE_NUMBER');
    }
    
    try {
        const token = String(accessToken || '').trim();
        const qs = token ? `?token=${encodeURIComponent(token)}` : '';
        return await apiFetch(`/quotes/${quoteNumber}/${qs}`);
    } catch (error) {
        console.error('Failed to fetch quote details:', error);
        if (error instanceof APIError) {
            throw new APIError(
                `Failed to load quote: ${error.getUserMessage()}`,
                error.status,
                error.code,
                error.response
            );
        }
        throw error;
    }
};

/**
 * Gets the download URL for a quote PDF.
 * @param {string} quoteNumber - The quote number.
 * @returns {string} The URL to download the quote PDF.
 */
/**
 * Downloads a quote PDF using fetch + Authorization header instead of
 * leaking the JWT in a URL query parameter.
 * Falls back to returning a plain URL when no token is available.
 *
 * @param {string} quoteNumber - The quote number.
 * @param {string} accessToken - JWT access token (used via header, never URL).
 * @returns {string} An object-URL pointing to the downloaded blob, or the bare endpoint URL.
 */
export const getQuotePDFUrl = (quoteNumber, accessToken = '') => {
    const base = `${API_BASE_URL}/quotes/${encodeURIComponent(quoteNumber)}/pdf/`;
    const token = String(accessToken || '').trim();
    if (!token) {
        return base;
    }
    // Return plain URL — the caller should use downloadQuotePDF() for authenticated downloads
    return base;
};

/**
 * Downloads a quote PDF via fetch with Authorization header.
 * Returns an object URL suitable for window.open() or <a> href.
 * @param {string} quoteNumber - The quote number.
 * @returns {Promise<string>} Object URL for the PDF blob.
 */
export const downloadQuotePDF = async (quoteNumber) => {
    const url = `/quotes/${encodeURIComponent(quoteNumber)}/pdf/`;
    const accessToken = tokenManager.getAccessToken();
    const headers = { 'Accept': 'application/pdf' };
    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }
    const res = await fetch(`${API_BASE_URL}${url}`, {
        method: 'GET',
        headers,
        credentials: 'include',
    });
    if (!res.ok) {
        throw new APIError('Failed to download quote PDF', res.status, 'PDF_DOWNLOAD_FAILED');
    }
    const blob = await res.blob();
    return URL.createObjectURL(blob);
};

/**
 * Fetches quotes for the authenticated user.
 * @returns {Promise<Array>} A promise that resolves to an array of quotes.
 */
export const getUserQuotes = async () => {
    try {
        return await apiFetch('/dashboard/quotes/');
    } catch (error) {
        console.error('Failed to fetch user quotes:', error);
        if (error instanceof APIError) {
            throw new APIError(
                `Failed to load quotes: ${error.getUserMessage()}`,
                error.status,
                error.code,
                error.response
            );
        }
        throw error;
    }
};