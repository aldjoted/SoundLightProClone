/**
 * captcha.js
 * 
 * CAPTCHA integration module supporting multiple providers:
 * - hCaptcha (privacy-focused, GDPR compliant)
 * - reCAPTCHA v2 (checkbox)
 * - reCAPTCHA v3 (invisible, score-based)
 * 
 * Usage:
 *   import { CaptchaManager } from './captcha.js';
 *   
 *   // Initialize on page load
 *   await CaptchaManager.init();
 *   
 *   // Render widget in a container
 *   CaptchaManager.render('captcha-container');
 *   
 *   // Get token for form submission
 *   const token = await CaptchaManager.getToken();
 */

import { API_BASE_URL } from './config.js';

/**
 * CAPTCHA configuration cache
 */
let captchaConfig = null;
let isInitialized = false;
let widgetId = null;

/**
 * Provider-specific script URLs
 */
const SCRIPT_URLS = {
  hcaptcha: 'https://js.hcaptcha.com/1/api.js?render=explicit',
  recaptcha_v2: 'https://www.google.com/recaptcha/api.js?render=explicit',
  recaptcha_v3: null, // URL constructed with site key
};

/**
 * Load external script dynamically
 * @param {string} src - Script source URL
 * @param {Object} options - Script options
 * @returns {Promise<void>}
 */
function loadScript(src, options = {}) {
  return new Promise((resolve, reject) => {
    // Check if script already loaded
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;

    if (options.onload) {
      script.onload = () => {
        options.onload();
        resolve();
      };
    } else {
      script.onload = resolve;
    }

    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));

    document.head.appendChild(script);
  });
}

/**
 * Fetch CAPTCHA configuration from backend
 * @returns {Promise<Object>} Configuration object
 */
async function fetchConfig() {
  if (captchaConfig) {
    return captchaConfig;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/captcha-config/`, {
      credentials: 'include',
    });

    if (!response.ok) {
      console.warn('[CAPTCHA] Failed to fetch config, CAPTCHA disabled');
      captchaConfig = { enabled: false };
      return captchaConfig;
    }

    captchaConfig = await response.json();
    return captchaConfig;
  } catch (error) {
    console.error('[CAPTCHA] Error fetching config:', error);
    captchaConfig = { enabled: false };
    return captchaConfig;
  }
}

/**
 * CAPTCHA Manager - Main interface for CAPTCHA operations
 */
export const CaptchaManager = {
  /**
   * Initialize CAPTCHA by loading the appropriate provider script
   * @returns {Promise<boolean>} True if CAPTCHA is enabled and loaded
   */
  async init() {
    if (isInitialized) {
      return captchaConfig?.enabled || false;
    }

    const config = await fetchConfig();

    if (!config.enabled) {
      console.log('[CAPTCHA] Not enabled, skipping initialization');
      isInitialized = true;
      return false;
    }

    try {
      switch (config.provider) {
        case 'hcaptcha':
          await loadScript(SCRIPT_URLS.hcaptcha);
          break;

        case 'recaptcha_v2':
          await loadScript(SCRIPT_URLS.recaptcha_v2);
          break;

        case 'recaptcha_v3':
          const v3Url = `https://www.google.com/recaptcha/api.js?render=${config.site_key}`;
          await loadScript(v3Url);
          break;

        default:
          console.warn(`[CAPTCHA] Unknown provider: ${config.provider}`);
          return false;
      }

      isInitialized = true;
      console.log(`[CAPTCHA] Initialized with provider: ${config.provider}`);
      return true;
    } catch (error) {
      console.error('[CAPTCHA] Failed to load provider script:', error);
      return false;
    }
  },

  /**
   * Check if CAPTCHA is enabled
   * @returns {boolean}
   */
  isEnabled() {
    return captchaConfig?.enabled || false;
  },

  /**
   * Get the current provider name
   * @returns {string|null}
   */
  getProvider() {
    return captchaConfig?.provider || null;
  },

  /**
   * Render CAPTCHA widget in a container element
   * Only needed for hCaptcha and reCAPTCHA v2 (v3 is invisible)
   * @param {string|HTMLElement} container - Container element or ID
   * @param {Object} options - Render options
   * @returns {number|null} Widget ID or null if not applicable
   */
  render(container, options = {}) {
    if (!captchaConfig?.enabled) {
      return null;
    }

    const containerEl = typeof container === 'string'
      ? document.getElementById(container)
      : container;

    if (!containerEl) {
      console.error('[CAPTCHA] Container not found:', container);
      return null;
    }

    // Clear any existing widget
    containerEl.innerHTML = '';

    const { site_key, provider } = captchaConfig;

    switch (provider) {
      case 'hcaptcha':
        if (typeof hcaptcha !== 'undefined') {
          widgetId = hcaptcha.render(containerEl, {
            sitekey: site_key,
            theme: options.theme || 'light',
            size: options.size || 'normal',
            callback: options.callback,
            'expired-callback': options.expiredCallback,
            'error-callback': options.errorCallback,
          });
          return widgetId;
        }
        break;

      case 'recaptcha_v2':
        if (typeof grecaptcha !== 'undefined') {
          widgetId = grecaptcha.render(containerEl, {
            sitekey: site_key,
            theme: options.theme || 'light',
            size: options.size || 'normal',
            callback: options.callback,
            'expired-callback': options.expiredCallback,
            'error-callback': options.errorCallback,
          });
          return widgetId;
        }
        break;

      case 'recaptcha_v3':
        // v3 is invisible, no widget to render
        // Show a badge notice instead
        // v3 is invisible, no widget to render
        // Show a badge notice instead
        containerEl.innerHTML = '';
        const noticeDiv = document.createElement('div');
        noticeDiv.className = 'recaptcha-v3-notice';
        const small = document.createElement('small');
        small.textContent = 'Protected by reCAPTCHA';
        noticeDiv.appendChild(small);
        containerEl.appendChild(noticeDiv);
        return null;
    }

    return null;
  },

  /**
   * Get CAPTCHA response token
   * For v2/hCaptcha: returns the widget response
   * For v3: executes with action and returns token
   * @param {string} action - Action name for v3 (e.g., 'register', 'login')
   * @returns {Promise<string>} Token string
   */
  async getToken(action = 'submit') {
    if (!captchaConfig?.enabled) {
      return '';
    }

    const { provider, site_key } = captchaConfig;

    switch (provider) {
      case 'hcaptcha':
        if (typeof hcaptcha !== 'undefined') {
          const response = hcaptcha.getResponse(widgetId);
          if (!response) {
            throw new Error('Please complete the CAPTCHA verification');
          }
          return response;
        }
        break;

      case 'recaptcha_v2':
        if (typeof grecaptcha !== 'undefined') {
          const response = grecaptcha.getResponse(widgetId);
          if (!response) {
            throw new Error('Please complete the CAPTCHA verification');
          }
          return response;
        }
        break;

      case 'recaptcha_v3':
        if (typeof grecaptcha !== 'undefined') {
          return new Promise((resolve, reject) => {
            grecaptcha.ready(() => {
              grecaptcha.execute(site_key, { action })
                .then(resolve)
                .catch(reject);
            });
          });
        }
        break;
    }

    return '';
  },

  /**
   * Reset the CAPTCHA widget
   */
  reset() {
    if (!captchaConfig?.enabled || widgetId === null) {
      return;
    }

    const { provider } = captchaConfig;

    switch (provider) {
      case 'hcaptcha':
        if (typeof hcaptcha !== 'undefined') {
          hcaptcha.reset(widgetId);
        }
        break;

      case 'recaptcha_v2':
        if (typeof grecaptcha !== 'undefined') {
          grecaptcha.reset(widgetId);
        }
        break;

      // v3 doesn't need reset
    }
  },

  /**
   * Create DOM element for CAPTCHA container
   * @returns {HTMLElement} Container element
   */
  createContainerElement() {
    const div = document.createElement('div');
    div.id = 'captcha-container';
    div.className = 'captcha-container';
    div.setAttribute('aria-label', 'CAPTCHA verification');
    return div;
  },
};

export default CaptchaManager;
