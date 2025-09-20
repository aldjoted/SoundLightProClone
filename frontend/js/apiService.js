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
 * Manages JWT access tokens in memory and refresh tokens via httpOnly cookies.
 * This approach prevents XSS attacks by keeping access tokens out of localStorage.
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
        /** @returns {string|null} */
        getRefreshToken: () => {
            // Refresh token should be handled via httpOnly cookie on server
            // For backward compatibility, check localStorage temporarily
            return localStorage.getItem('refreshToken');
        },
        /** @param {string} token */
        setRefreshToken: (token) => {
            // Store in localStorage temporarily for backward compatibility
            // TODO: Implement httpOnly cookie storage on server side
            localStorage.setItem('refreshToken', token);
        },
        clearTokens: () => {
            accessToken = null;
            localStorage.removeItem('refreshToken');
            // Server should clear httpOnly cookie when this is called
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
let refreshInFlight = null;
async function refreshAccessToken(getRefreshToken) {
    if (!refreshInFlight) {
        const refreshToken = getRefreshToken();
        refreshInFlight = (async () => {
            const res = await fetch(`${API_BASE_URL}/token/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: refreshToken }),
            });
            const data = await handleResponse(res);
            return data;
        })().finally(() => {
            // Allow a new refresh in future after resolution
            setTimeout(() => { refreshInFlight = null; }, 0);
        });
    }
    return refreshInFlight;
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
export const getProducts = async (searchQuery = '', options = {}, useRetry = true) => {
    const url = searchQuery ? `/products/?search=${encodeURIComponent(searchQuery)}` : '/products/';
    
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
 * @returns {Promise<Object>} A promise that resolves to the token object.
 */
export const loginUser = async (username, password) => {
    if (!username || !password) {
        throw new APIError('Username and password are required', 400, 'MISSING_CREDENTIALS');
    }
    
    try {
        const response = await apiFetch('/token/', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
        
        if (!response.access || !response.refresh) {
            throw new APIError('Invalid response format from login', 500, 'INVALID_LOGIN_RESPONSE');
        }
        
        tokenManager.setAccessToken(response.access);
        tokenManager.setRefreshToken(response.refresh);
        return response;
    } catch (error) {
        console.error('Login failed:', error);
        if (error instanceof APIError) {
            throw new APIError(
                error.status === 401 ? 'Invalid username or password' : error.getUserMessage(),
                error.status,
                error.code,
                error.response
            );
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
            throw new APIError(
                `Registration failed: ${error.getUserMessage()}`,
                error.status,
                error.code,
                error.response
            );
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
 * Logs out the user by clearing stored tokens.
 */
export const logoutUser = () => {
    try {
        tokenManager.clearTokens();
    } catch (error) {
        console.error('Error during logout:', error);
        // Force clear even if there's an error
        localStorage.removeItem('refreshToken');
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