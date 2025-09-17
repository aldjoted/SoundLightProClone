/**
 * config.js
 *
 * Centralized runtime configuration for the frontend.
 * Values can be overridden by a server-injected window.__APP_CONFIG__ object.
 */

const runtime = (typeof window !== 'undefined' && window.__APP_CONFIG__) || {};

export const API_BASE_URL = runtime.API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

export const FEATURES = {
    enableVoiceSearch: runtime.enableVoiceSearch ?? true,
};

export default { API_BASE_URL, FEATURES };
