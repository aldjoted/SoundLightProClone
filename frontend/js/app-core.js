import * as ui from './ui.js';
import { ListenerManager, RequestManager } from './utils.js';

// ============= Error Boundary =============

/**
 * Provides centralized error logging, user-friendly messages, and error recovery.
 */
class ErrorBoundary {
    static errorLog = [];

    static handleError(error, context = 'Unknown') {
        console.error(`[${context}] Error:`, error);

        this.logError(error, context);

        if (window.Sentry) {
            window.Sentry.captureException(error, {
                tags: { context },
                extra: {
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                },
            });
        }

        const userMessage = this.getUserFriendlyMessage(error, context);
        if (userMessage && ui.showToast) {
            ui.showToast(userMessage, 'error');
        }
    }

    static logError(error, context) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            context,
            message: error?.message,
            stack: error?.stack,
            userAgent: navigator.userAgent,
            url: window.location.href,
        };

        try {
            const logs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
            logs.push(errorEntry);
            const recentLogs = logs.slice(-20);
            localStorage.setItem('errorLogs', JSON.stringify(recentLogs));
            this.errorLog = recentLogs;
        } catch (e) {
            console.error('Failed to log error to localStorage:', e);
        }
    }

    static getUserFriendlyMessage(error, context) {
        if (error?.name === 'TypeError' && error.message.includes('fetch')) {
            return 'Network error. Please check your connection and try again.';
        }

        if (error?.name === 'AbortError') {
            return null;
        }

        if (error?.name === 'APIError') {
            return typeof error.getUserMessage === 'function'
                ? error.getUserMessage()
                : error.message;
        }

        const contextMessages = {
            'Initializing home page': 'Failed to load page content. Please refresh.',
            'Loading product': 'Failed to load product details. Please try again.',
            'Submitting form': 'Failed to submit form. Please check your input and try again.',
            'Loading cart': 'Failed to load cart. Your items are safe, please refresh.',
        };

        return contextMessages[context] || 'An unexpected error occurred. Please try again.';
    }

    static wrap(fn, context) {
        return async function wrappedFunction(...args) {
            try {
                return await fn.apply(this, args);
            } catch (error) {
                ErrorBoundary.handleError(error, context);
                throw error;
            }
        };
    }

    static getErrorLogs() {
        return [...this.errorLog];
    }

    static clearErrorLogs() {
        this.errorLog = [];
        try {
            localStorage.removeItem('errorLogs');
        } catch (e) {
            console.error('Failed to clear error logs:', e);
        }
    }
}

window.addEventListener('error', (event) => {
    if (event?.error) {
        ErrorBoundary.handleError(event.error, 'Global error');
    }
});

window.addEventListener('unhandledrejection', (event) => {
    if (event?.reason) {
        ErrorBoundary.handleError(event.reason, 'Unhandled promise rejection');
        event.preventDefault();
    }
});

// ============= Cache Utilities =============

class SmartCache {
    constructor() {
        this.cache = new Map();
        this.strategies = {
            products: { ttl: 5 * 60 * 1000, staleWhileRevalidate: true },
            categories: { ttl: 30 * 60 * 1000, staleWhileRevalidate: false },
            userProfile: { ttl: 2 * 60 * 1000, staleWhileRevalidate: false },
        };
    }

    async get(key, fetcher, strategyName = 'products') {
        const strategy = this.strategies[strategyName] || this.strategies.products;
        const cached = this.cache.get(key);
        const now = Date.now();

        if (cached) {
            const age = now - cached.timestamp;

            if (age < strategy.ttl) {
                return cached.data;
            }

            if (strategy.staleWhileRevalidate) {
                this.refreshInBackground(key, fetcher, strategyName);
                return cached.data;
            }
        }

        const data = await fetcher();
        this.cache.set(key, { data, timestamp: now });
        return data;
    }

    async refreshInBackground(key, fetcher, strategyName) {
        try {
            const data = await fetcher();
            this.cache.set(key, { data, timestamp: Date.now() });
        } catch (error) {
            console.warn(`Background refresh failed for ${key}:`, error);
        }
    }

    invalidate(key) {
        this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
    }
}

class RequestCache {
    constructor() {
        this.pending = new Map();
    }

    async get(key, fetcher) {
        if (this.pending.has(key)) {
            return this.pending.get(key);
        }

        const promise = fetcher().finally(() => {
            this.pending.delete(key);
        });

        this.pending.set(key, promise);
        return promise;
    }

    invalidate(key) {
        this.pending.delete(key);
    }

    clear() {
        this.pending.clear();
    }
}

const cache = new SmartCache();
const requestCache = new RequestCache();

const globalListenerManager = new ListenerManager();
const globalRequestManager = new RequestManager();

const appState = {
    products: [],
    categories: [],
};

async function getCached(key, fetcher, strategy = 'products') {
    return cache.get(key, fetcher, strategy);
}

export {
    ErrorBoundary,
    SmartCache,
    RequestCache,
    cache,
    requestCache,
    appState,
    globalListenerManager,
    globalRequestManager,
    getCached,
};
