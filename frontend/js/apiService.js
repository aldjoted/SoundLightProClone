/**
 * apiService.js
 *
 * This module centralizes all communication with the backend API.
 * It handles fetching data, sending data, and managing authentication tokens with robust error handling.
 * @module apiService
 */

import { API_BASE_URL } from './config.js';

function resolveLoginUrl() {
    try {
        return new URL('login.html', window.location.href).toString();
    } catch {
        return 'login.html';
    }
}

/**
 * Manages JWT access and refresh tokens in LocalStorage.
 * @namespace tokenManager
 */
const tokenManager = {
    /** @returns {string|null} */
    getAccessToken: () => localStorage.getItem('accessToken'),
    /** @param {string} token */
    setAccessToken: (token) => localStorage.setItem('accessToken', token),
    /** @returns {string|null} */
    getRefreshToken: () => localStorage.getItem('refreshToken'),
    /** @param {string} token */
    setRefreshToken: (token) => localStorage.setItem('refreshToken', token),
    clearTokens: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
    }
};

/**
 * Handles API responses, parsing JSON and throwing standardized errors.
 * @param {Response} response The raw response from a fetch call.
 * @returns {Promise<any>} A promise that resolves with the JSON data or null.
 * @throws {Error} Throws a formatted error for non-successful responses.
 */
const handleResponse = async (response) => {
    if (response.status === 204) { // No Content
        return null;
    }
    let data = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        data = await response.json();
    } else {
        // Fallback: attempt text for better diagnostics
        const text = await response.text();
        try { data = JSON.parse(text); } catch { data = { detail: text }; }
    }
    if (!response.ok) {
        console.error('API Error:', response.status, data);
        const errorMessage = data.detail || data.error || JSON.stringify(data);
        throw new Error(errorMessage);
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
                throw new Error('Authentication required.');
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
                throw new Error('Session expired. Please log in again.');
            }
        }
        
        return handleResponse(response);
    } catch (error) {
        if (error && error.name === 'AbortError') {
            throw error;
        }
        // PRODUCTION GRADE: Handle network errors (e.g., offline)
        if (error instanceof TypeError) { // Indicates a network error
            console.error("Network error:", error);
            throw new Error("Network error. Please check your connection.");
        }
        throw error; // Re-throw other errors (like from handleResponse)
    }
}

// --- Exported API functions ---
export { apiFetch };

/**
 * Fetches a list of products, optionally filtered by a search query.
 * @param {string} [searchQuery=''] - The search term.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of products.
 */
export const getProducts = (searchQuery = '', options = {}) => {
    const url = searchQuery ? `/products/?search=${encodeURIComponent(searchQuery)}` : '/products/';
    return apiFetch(url, options);
};

/**
 * Fetches a single product by its ID.
 * @param {string|number} productId - The ID of the product.
 * @returns {Promise<Object>} A promise that resolves to the product object.
 */
export const getProductById = (productId, options = {}) => apiFetch(`/products/${productId}/`, options);

/**
 * Fetches all product categories.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of categories.
 */
export const getCategories = (options = {}) => apiFetch('/categories/', options);

/**
 * Logs in a user and stores authentication tokens.
 * @param {string} username - The user's username.
 * @param {string} password - The user's password.
 * @returns {Promise<Object>} A promise that resolves to the token object.
 */
export const loginUser = async (username, password) => {
    const response = await apiFetch('/token/', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
    tokenManager.setAccessToken(response.access);
    tokenManager.setRefreshToken(response.refresh);
    return response;
};

/**
 * Registers a new user.
 * @param {Object} userData - The user's registration data.
 * @returns {Promise<Object>} A promise that resolves to the new user's data.
 */
export const registerUser = (userData) => apiFetch('/register/', {
    method: 'POST',
    body: JSON.stringify(userData),
});

/**
 * Fetches the profile of the currently logged-in user.
 * @returns {Promise<Object>} A promise that resolves to the user's profile.
 */
export const getUserProfile = () => apiFetch('/user/');

/**
 * Logs out the user by clearing stored tokens.
 */
export const logoutUser = () => tokenManager.clearTokens();

/**
 * Creates a new order.
 * @param {Object} orderData - The order data, including items and shipping info.
 * @returns {Promise<Object>} A promise that resolves to the created order details.
 */
export const createOrder = (orderData) => apiFetch('/orders/create/', {
    method: 'POST',
    body: JSON.stringify(orderData),
});