/**
 * apiService.js
 * 
 * This module centralizes all communication with the backend API.
 * It handles fetching data, sending data, and managing authentication tokens.
 */

// Base URL for the Django API. 
// Change this to your production URL when deploying.
const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

/**
 * A helper function to manage JWT access and refresh tokens in LocalStorage.
 */
const tokenManager = {
    getAccessToken: () => localStorage.getItem('accessToken'),
    setAccessToken: (token) => localStorage.setItem('accessToken', token),
    getRefreshToken: () => localStorage.getItem('refreshToken'),
    setRefreshToken: (token) => localStorage.setItem('refreshToken', token),
    clearTokens: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
    }
};

/**
 * A helper function to handle API responses.
 * It checks for errors and parses the JSON body.
 * @param {Response} response The raw response from the fetch call.
 * @returns {Promise<any>} A promise that resolves with the JSON data.
 */
const handleResponse = async (response) => {
    if (response.status === 204) { // No Content
        return null;
    }
    const data = await response.json();
    if (!response.ok) {
        // Log the error details for easier debugging
        console.error('API Error:', response.status, data);
        // Create a user-friendly error message
        const errorMessage = data.detail || data.error || JSON.stringify(data);
        throw new Error(errorMessage);
    }
    return data;
};

/**
 * The main fetch function that handles authentication and token refreshing.
 * @param {string} url The API endpoint to call.
 * @param {object} options The options for the fetch call (method, headers, body).
 * @returns {Promise<any>} The JSON response from the API.
 */
async function apiFetch(url, options = {}) {
    // Set default headers
    options.headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    // Add the JWT access token to the Authorization header if it exists
    const accessToken = tokenManager.getAccessToken();
    if (accessToken) {
        options.headers['Authorization'] = `Bearer ${accessToken}`;
    }

    let response = await fetch(`${API_BASE_URL}${url}`, options);

    // Check if the access token expired (401 Unauthorized)
    if (response.status === 401) {
        const refreshToken = tokenManager.getRefreshToken();
        if (refreshToken) {
            try {
                // Attempt to refresh the token
                const refreshResponse = await fetch(`${API_BASE_URL}/token/refresh/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh: refreshToken }),
                });
                
                const newTokens = await handleResponse(refreshResponse);
                tokenManager.setAccessToken(newTokens.access);
                
                // Retry the original request with the new token
                options.headers['Authorization'] = `Bearer ${newTokens.access}`;
                response = await fetch(`${API_BASE_URL}${url}`, options);

            } catch (refreshError) {
                console.error('Failed to refresh token:', refreshError);
                // If refresh fails, log the user out
                tokenManager.clearTokens();
                // Redirect to login page to re-authenticate
                window.location.href = '/login.html';
                // Throw an error to stop the original fetch chain
                throw new Error('Session expired. Please log in again.');
            }
        }
    }
    
    return handleResponse(response);
}

// --- Exported API functions ---

// --- Product Catalog ---
export const getProducts = (searchQuery = '') => {
    const url = searchQuery ? `/products/?search=${encodeURIComponent(searchQuery)}` : '/products/';
    return apiFetch(url);
};

export const getProductById = (productId) => {
    return apiFetch(`/products/${productId}/`);
};

// --- Authentication ---
export const loginUser = async (username, password) => {
    const response = await apiFetch('/token/', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
    // On successful login, store both tokens
    tokenManager.setAccessToken(response.access);
    tokenManager.setRefreshToken(response.refresh);
    return response;
};

export const registerUser = (userData) => {
    return apiFetch('/register/', {
        method: 'POST',
        body: JSON.stringify(userData),
    });
};

export const getUserProfile = () => {
    return apiFetch('/user/');
};

// Logout is handled client-side by clearing tokens
export const logoutUser = () => {
    tokenManager.clearTokens();
};

// --- Checkout ---
export const createOrder = (orderData) => {
    // orderData should include { items, shipping_info, stripe_token }
    return apiFetch('/orders/create/', {
        method: 'POST',
        body: JSON.stringify(orderData),
    });
};