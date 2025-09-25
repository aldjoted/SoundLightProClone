/**
 * utils.js
 * 
 * Utility classes and functions for managing application resources, preventing memory leaks,
 * and optimizing performance.
 */

// ============= Performance Utilities =============

/**
 * Enhanced debounce function with immediate execution option.
 * Prevents function from being called until after a delay period has passed.
 * @param {Function} func - The function to debounce.
 * @param {number} wait - The delay in milliseconds.
 * @param {boolean} immediate - Whether to trigger on the leading edge instead of trailing.
 * @returns {Function} The debounced function.
 */
export function debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(this, args);
    };
}

/**
 * Throttle function to limit how often a function can be called.
 * @param {Function} func - The function to throttle.
 * @param {number} limit - The time limit in milliseconds.
 * @returns {Function} The throttled function.
 */
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Progressive image loader with placeholder support and loading states.
 */
export class ImageLoader {
    /**
     * Default placeholder for images while loading.
     */
    static DEFAULT_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxvYWRpbmcuLi48L3RleHQ+PC9zdmc+';

    /**
     * Loads an image with a placeholder and loading states.
     * @param {HTMLImageElement} img - The image element to load into.
     * @param {string} src - The source URL of the image to load.
     * @param {string} placeholder - Optional placeholder image URL.
     * @param {Object} options - Additional options for loading.
     * @returns {Promise} Promise that resolves when image loads or rejects on error.
     */
    static loadWithPlaceholder(img, src, placeholder = ImageLoader.DEFAULT_PLACEHOLDER, options = {}) {
        return new Promise((resolve, reject) => {
            // Set placeholder and loading state
            img.src = placeholder;
            img.classList.add('loading');
            
            // Add loading animation class if specified
            if (options.animate) {
                img.classList.add('image-loading-animation');
            }
            
            // Create full image to preload
            const fullImage = new Image();
            
            // Handle successful load
            fullImage.onload = () => {
                img.src = src;
                img.classList.remove('loading');
                if (options.animate) {
                    img.classList.remove('image-loading-animation');
                    img.classList.add('image-loaded');
                }
                resolve(img);
            };
            
            // Handle load error
            fullImage.onerror = () => {
                img.classList.remove('loading');
                if (options.animate) {
                    img.classList.remove('image-loading-animation');
                }
                if (options.fallback) {
                    img.src = options.fallback;
                    resolve(img);
                } else {
                    reject(new Error(`Failed to load image: ${src}`));
                }
            };
            
            // Set timeout for slow loading images
            if (options.timeout) {
                setTimeout(() => {
                    if (img.classList.contains('loading')) {
                        fullImage.onload = null;
                        fullImage.onerror = null;
                        reject(new Error(`Image load timeout: ${src}`));
                    }
                }, options.timeout);
            }
            
            // Start loading
            fullImage.src = src;
        });
    }

    /**
     * Loads multiple images in parallel with progress tracking.
     * @param {Array} imageConfigs - Array of {img, src, placeholder, options} objects.
     * @param {Function} onProgress - Optional progress callback (loaded, total).
     * @returns {Promise} Promise that resolves when all images are loaded.
     */
    static loadBatch(imageConfigs, onProgress) {
        let loaded = 0;
        const total = imageConfigs.length;
        
        const promises = imageConfigs.map(({ img, src, placeholder, options }) => {
            return ImageLoader.loadWithPlaceholder(img, src, placeholder, options)
                .then(result => {
                    loaded++;
                    if (onProgress) onProgress(loaded, total);
                    return result;
                })
                .catch(error => {
                    loaded++;
                    if (onProgress) onProgress(loaded, total);
                    throw error;
                });
        });
        
        return Promise.allSettled(promises);
    }

    /**
     * Implements lazy loading for images using Intersection Observer.
     * @param {string} selector - CSS selector for images to lazy load.
     * @param {Object} options - Options for Intersection Observer.
     */
    static setupLazyLoading(selector = 'img[data-src]', options = {}) {
        const defaultOptions = {
            root: null,
            rootMargin: '50px',
            threshold: 0.1,
            ...options
        };

        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const src = img.dataset.src;
                    const placeholder = img.dataset.placeholder;
                    
                    if (src) {
                        ImageLoader.loadWithPlaceholder(img, src, placeholder, { animate: true })
                            .catch(error => console.warn('Lazy load failed:', error));
                    }
                    
                    observer.unobserve(img);
                }
            });
        }, defaultOptions);

        document.querySelectorAll(selector).forEach(img => {
            imageObserver.observe(img);
        });

        return imageObserver;
    }
}

/**
 * Module loader for dynamic imports and code splitting.
 */
export class ModuleLoader {
    static loadedModules = new Map();
    
    /**
     * Dynamically loads a module with caching.
     * @param {string} modulePath - Path to the module to load.
     * @param {string} cacheKey - Optional cache key (defaults to modulePath).
     * @returns {Promise} Promise that resolves with the loaded module.
     */
    static async loadModule(modulePath, cacheKey = modulePath) {
        if (ModuleLoader.loadedModules.has(cacheKey)) {
            return ModuleLoader.loadedModules.get(cacheKey);
        }
        
        try {
            const module = await import(/* @vite-ignore */ modulePath);
            ModuleLoader.loadedModules.set(cacheKey, module);
            return module;
        } catch (error) {
            console.error(`Failed to load module ${modulePath}:`, error);
            throw error;
        }
    }
    
    /**
     * Preloads modules for faster subsequent loading.
     * @param {Array<string>} modulePaths - Array of module paths to preload.
     */
    static preloadModules(modulePaths) {
        modulePaths.forEach(path => {
            // Use link rel="modulepreload" for better browser support
            const link = document.createElement('link');
            link.rel = 'modulepreload';
            link.href = path;
            document.head.appendChild(link);
        });
    }
    
    /**
     * Lazy loads a module when a condition is met.
     * @param {Function} condition - Function that returns true when module should load.
     * @param {string} modulePath - Path to the module to load.
     * @param {Function} callback - Function to call with loaded module.
     * @param {number} checkInterval - How often to check condition (ms).
     */
    static loadWhen(condition, modulePath, callback, checkInterval = 100) {
        const check = () => {
            if (condition()) {
                ModuleLoader.loadModule(modulePath)
                    .then(callback)
                    .catch(error => console.error('Conditional module load failed:', error));
            } else {
                setTimeout(check, checkInterval);
            }
        };
        check();
    }
}

/**
 * State management class with cross-tab synchronization and event handling.
 * Extends EventTarget to provide built-in event handling capabilities.
 */
export class StateManager extends EventTarget {
    /**
     * Creates a new StateManager instance.
     * @param {string} key - The localStorage key to use for persistence.
     * @param {Object} defaultState - The default state object.
     */
    constructor(key, defaultState = {}) {
        super();
        this.key = key;
        this.state = this.load() || defaultState;
        
        // Sync across tabs using storage events
        window.addEventListener('storage', (e) => {
            if (e.key === this.key && e.newValue !== null) {
                try {
                    const newState = JSON.parse(e.newValue);
                    this.state = newState;
                    this.emit('change', this.state);
                } catch (error) {
                    console.error('Failed to parse state from storage event:', error);
                }
            }
        });
    }
    
    /**
     * Loads state from localStorage.
     * @returns {Object|null} The loaded state or null if not found/invalid.
     */
    load() {
        try {
            const stored = localStorage.getItem(this.key);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.error(`Failed to load state for key "${this.key}":`, error);
            return null;
        }
    }
    
    /**
     * Saves the current state to localStorage.
     */
    save() {
        try {
            localStorage.setItem(this.key, JSON.stringify(this.state));
        } catch (error) {
            console.error(`Failed to save state for key "${this.key}":`, error);
            // Handle quota exceeded or other storage errors
            if (error.name === 'QuotaExceededError') {
                this.emit('quotaExceeded', { error, state: this.state });
            }
        }
    }
    
    /**
     * Updates the state using an updater function or object.
     * @param {Function|Object} updater - Function that receives current state and returns new state, or object to merge.
     */
    update(updater) {
        const oldState = { ...this.state };
        
        if (typeof updater === 'function') {
            this.state = updater(this.state);
        } else {
            this.state = { ...this.state, ...updater };
        }
        
        this.save();
        this.emit('change', { newState: this.state, oldState });
    }
    
    /**
     * Gets the current state.
     * @returns {Object} The current state.
     */
    getState() {
        return { ...this.state };
    }
    
    /**
     * Clears the state (sets to default).
     * @param {Object} defaultState - The default state to reset to.
     */
    clear(defaultState = {}) {
        this.state = defaultState;
        this.save();
        this.emit('change', { newState: this.state, oldState: {} });
    }
    
    /**
     * Emits a custom event.
     * @param {string} event - The event name.
     * @param {any} data - The event data.
     */
    emit(event, data) {
        this.dispatchEvent(new CustomEvent(event, { detail: data }));
    }
}

/**
 * Enhanced API Error class with retry logic and better error classification.
 */
export class APIError extends Error {
    /**
     * Creates a new APIError instance.
     * @param {string} message - The error message.
     * @param {number} status - The HTTP status code.
     * @param {string} code - The error code.
     * @param {Object} response - The original response object.
     */
    constructor(message, status, code, response = null) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.code = code;
        this.response = response;
        this.timestamp = new Date().toISOString();
        
        // Determine if the error is retryable
        this.isRetryable = this._isRetryable(status);
        
        // Capture stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, APIError);
        }
    }
    
    /**
     * Determines if an error should be retried based on status code.
     * @param {number} status - The HTTP status code.
     * @returns {boolean} Whether the error is retryable.
     * @private
     */
    _isRetryable(status) {
        // Retry on server errors (5xx) and rate limiting (429)
        return status >= 500 || status === 429 || status === 408; // 408 = Request Timeout
    }
    
    /**
     * Gets a user-friendly error message.
     * @returns {string} A user-friendly error message.
     */
    getUserMessage() {
        switch (this.status) {
            case 400:
                return 'Invalid request. Please check your input.';
            case 401:
                return 'Authentication required. Please log in.';
            case 403:
                return 'Access denied. You don\'t have permission for this action.';
            case 404:
                return 'The requested resource was not found.';
            case 408:
                return 'Request timed out. Please try again.';
            case 429:
                return 'Too many requests. Please wait a moment before trying again.';
            case 500:
                return 'Server error. Please try again later.';
            case 502:
            case 503:
            case 504:
                return 'Service temporarily unavailable. Please try again later.';
            default:
                return this.message || 'An unexpected error occurred.';
        }
    }
    
    /**
     * Converts the error to a plain object for logging.
     * @returns {Object} A plain object representation of the error.
     */
    toObject() {
        return {
            name: this.name,
            message: this.message,
            status: this.status,
            code: this.code,
            timestamp: this.timestamp,
            isRetryable: this.isRetryable,
            stack: this.stack
        };
    }
}

/**
 * Retry utility with exponential backoff for API requests.
 */
export class RetryManager {
    /**
     * Creates a new RetryManager instance.
     * @param {Object} options - Retry configuration options.
     */
    constructor(options = {}) {
        this.maxRetries = options.maxRetries || 3;
        this.baseDelay = options.baseDelay || 1000; // 1 second
        this.maxDelay = options.maxDelay || 30000; // 30 seconds
        this.exponentialBase = options.exponentialBase || 2;
        this.jitterFactor = options.jitterFactor || 0.1; // 10% jitter
    }
    
    /**
     * Executes a function with retry logic and exponential backoff.
     * @param {Function} fn - The async function to retry.
     * @param {Object} options - Per-call retry options.
     * @returns {Promise} The result of the function call.
     */
    async execute(fn, options = {}) {
        const maxRetries = options.maxRetries || this.maxRetries;
        let lastError;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                
                // Don't retry if this is the last attempt
                if (attempt === maxRetries) {
                    throw error;
                }
                
                // Don't retry if the error is not retryable
                if (error instanceof APIError && !error.isRetryable) {
                    throw error;
                }
                
                // Calculate delay with exponential backoff and jitter
                const delay = this._calculateDelay(attempt);
                
                console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
                
                await this._sleep(delay);
            }
        }
        
        throw lastError;
    }
    
    /**
     * Calculates the delay for a given attempt with exponential backoff and jitter.
     * @param {number} attempt - The current attempt number (0-based).
     * @returns {number} The delay in milliseconds.
     * @private
     */
    _calculateDelay(attempt) {
        // Calculate exponential backoff delay
        let delay = this.baseDelay * Math.pow(this.exponentialBase, attempt);
        
        // Apply maximum delay cap
        delay = Math.min(delay, this.maxDelay);
        
        // Add jitter to prevent thundering herd
        const jitter = delay * this.jitterFactor * (Math.random() * 2 - 1);
        delay += jitter;
        
        return Math.round(Math.max(delay, 0));
    }
    
    /**
     * Sleep utility function.
     * @param {number} ms - Milliseconds to sleep.
     * @returns {Promise} A promise that resolves after the specified time.
     * @private
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Manages event listeners to prevent memory leaks.
 * Tracks listeners and provides centralized cleanup functionality.
 */
export class ListenerManager {
    constructor() {
        this.listeners = new Map();
    }
    
    /**
     * Adds an event listener and tracks it for cleanup.
     * @param {Element} element - The element to attach the listener to.
     * @param {string} event - The event type.
     * @param {Function} handler - The event handler function.
     * @param {Object} [options] - Event listener options.
     */
    add(element, event, handler, options) {
        const key = `${this._getElementId(element)}-${event}`;
        
        // Remove existing listener if it exists
        this.remove(element, event);
        
        element.addEventListener(event, handler, options);
        this.listeners.set(key, { element, event, handler, options });
    }
    
    /**
     * Removes a specific event listener.
     * @param {Element} element - The element to remove the listener from.
     * @param {string} event - The event type.
     */
    remove(element, event) {
        const key = `${this._getElementId(element)}-${event}`;
        const listener = this.listeners.get(key);
        
        if (listener) {
            listener.element.removeEventListener(listener.event, listener.handler);
            this.listeners.delete(key);
        }
    }
    
    /**
     * Removes all tracked event listeners.
     * Should be called when cleaning up a page or component.
     */
    removeAll() {
        this.listeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.listeners.clear();
    }
    
    /**
     * Gets the number of tracked listeners.
     * @returns {number} The number of tracked listeners.
     */
    getListenerCount() {
        return this.listeners.size;
    }
    
    /**
     * Creates a unique identifier for an element.
     * @param {Element} element - The element to create an ID for.
     * @returns {string} A unique identifier.
     * @private
     */
    _getElementId(element) {
        if (element.id) {
            return element.id;
        }
        
        if (!element._listenerId) {
            element._listenerId = `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        
        return element._listenerId;
    }
}

/**
 * AbortController wrapper for managing request cancellation.
 */
export class RequestManager {
    constructor() {
        this.controllers = new Map();
    }
    
    /**
     * Creates and tracks an AbortController.
     * @param {string} key - Unique key for the controller.
     * @returns {AbortController} The created controller.
     */
    create(key) {
        // Abort existing controller with same key
        this.abort(key);
        
        const controller = new AbortController();
        this.controllers.set(key, controller);
        return controller;
    }
    
    /**
     * Aborts a specific controller.
     * @param {string} key - The key of the controller to abort.
     */
    abort(key) {
        const controller = this.controllers.get(key);
        if (controller) {
            controller.abort();
            this.controllers.delete(key);
        }
    }
    
    /**
     * Aborts all tracked controllers.
     */
    abortAll() {
        this.controllers.forEach(controller => controller.abort());
        this.controllers.clear();
    }
    
    /**
     * Gets the AbortSignal for a specific controller.
     * @param {string} key - The key of the controller.
     * @returns {AbortSignal|null} The signal or null if not found.
     */
    getSignal(key) {
        const controller = this.controllers.get(key);
        return controller ? controller.signal : null;
    }
}