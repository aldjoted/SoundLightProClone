/**
 * security.js
 * 
 * Security utilities and Content Security Policy implementation
 */

import { IS_PRODUCTION, SERVICES, API_BASE_URL, IS_LOCAL_HOST } from './config.js';

/**
 * Content Security Policy configuration
 */
export class CSPManager {
  static getCSPDirectives() {
    const directives = {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        "'unsafe-inline'", // Required for inline scripts, should be minimized in production
        'https://cdnjs.cloudflare.com',
        'https://cdn.jsdelivr.net',
        'https://www.googletagmanager.com',
        'https://www.google-analytics.com',
        'https://unpkg.com'
      ],
      'style-src': [
        "'self'",
        "'unsafe-inline'", // Required for CSS-in-JS and dynamic styles
        'https://fonts.googleapis.com',
        'https://cdnjs.cloudflare.com',
        'https://cdn.jsdelivr.net',
        'https://unpkg.com'
      ],
      'font-src': [
        "'self'",
        'https://fonts.gstatic.com',
        'https://cdnjs.cloudflare.com'
      ],
      'img-src': [
        "'self'",
        'data:',
        'blob:',
        'https://images.soundlightpro.com',
        'https://cdn.soundlightpro.com',
        'https://www.google-analytics.com',
        'https://www.googletagmanager.com'
      ],
      'connect-src': [
        "'self'",
        // Allow whichever API base URL is configured at build/runtime
        API_BASE_URL.replace(/\/$/, ''),
        'http://192.168.0.198:8000',
        'http://127.0.0.1:8000',
        'http://localhost:8000',
        'https://api.soundlightpro.com',
        'https://www.google-analytics.com',
        'https://sentry.io'
      ],
      'frame-src': [
        "'self'",
        'https://www.youtube.com',
        'https://www.youtube-nocookie.com'
      ],
      'media-src': [
        "'self'",
        'https://cdn.soundlightpro.com'
      ],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'upgrade-insecure-requests': [],
      'block-all-mixed-content': []
    };

    // Add report URI if configured
    if (IS_PRODUCTION && SERVICES.cspReportUri) {
      directives['report-uri'] = [SERVICES.cspReportUri];
    }

    return directives;
  }

  static generateCSPString() {
    const directives = this.getCSPDirectives();
    return Object.entries(directives)
      .map(([directive, sources]) => {
        if (sources.length === 0) {
          return directive;
        }
        return `${directive} ${sources.join(' ')}`;
      })
      .join('; ');
  }

  static applyCSP() {
    // In preview mode (served via vite preview, http on LAN), injecting CSP via meta
    // can block expected connections and triggers console warnings. Apply only when
    // explicitly in production AND not on a local network host.
    if (IS_PRODUCTION && !IS_LOCAL_HOST) {
      const cspString = this.generateCSPString();
      const meta = document.createElement('meta');
      meta.setAttribute('http-equiv', 'Content-Security-Policy');
      meta.setAttribute('content', cspString);
      document.head.appendChild(meta);
    }
  }
}

/**
 * Security Headers Manager
 */
export class SecurityHeaders {
  static applyClientSideHeaders() {
    // These would ideally be set by the server, but can be applied client-side as fallback
    const headers = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()'
    };

    Object.entries(headers).forEach(([name, value]) => {
      const meta = document.createElement('meta');
      meta.setAttribute('http-equiv', name);
      meta.setAttribute('content', value);
      document.head.appendChild(meta);
    });
  }
}

/**
 * Input Sanitization (Enhanced)
 * ✅ Improved: Multi-layer validation with better security
 */
export class InputSanitizer {
  static sanitizeHTML(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }

  /**
   * Enhanced HTML sanitization with optional allowed tags
   * @param {string} input - Input to sanitize
   * @param {Object} options - Sanitization options
   * @returns {string} Sanitized HTML
   */
  static sanitizeHTMLAdvanced(input, options = {}) {
    const allowedTags = options.allowedTags || [];
    const div = document.createElement('div');
    div.textContent = input;
    
    // If tags are allowed, use DOMParser
    if (allowedTags.length > 0) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(div.innerHTML, 'text/html');
      
      // Remove all disallowed tags
      const allElements = doc.body.querySelectorAll('*');
      allElements.forEach(el => {
        if (!allowedTags.includes(el.tagName.toLowerCase())) {
          el.replaceWith(...el.childNodes);
        }
        
        // Remove all event handler attributes
        Array.from(el.attributes).forEach(attr => {
          if (attr.name.startsWith('on')) {
            el.removeAttribute(attr.name);
          }
        });
      });
      
      return doc.body.innerHTML;
    }
    
    return div.innerHTML;
  }

  /**
   * Validates and sanitizes URLs with protocol checking
   * @param {string} url - URL to validate
   * @param {Array<string>} allowedProtocols - Allowed protocols
   * @returns {string|null} Sanitized URL or null if invalid
   */
  static validateAndSanitizeURL(url, allowedProtocols = ['http:', 'https:']) {
    try {
      const urlObj = new URL(url);
      
      // Check protocol
      if (!allowedProtocols.includes(urlObj.protocol)) {
        throw new Error('Protocol not allowed');
      }
      
      // Block dangerous URLs
      const dangerousPatterns = [
        /^javascript:/i,
        /^data:/i,
        /^vbscript:/i,
        /^file:/i
      ];
      
      if (dangerousPatterns.some(pattern => pattern.test(url))) {
        throw new Error('Dangerous URL pattern detected');
      }
      
      return urlObj.toString();
    } catch {
      return null;
    }
  }

  /**
   * Validates email with RFC 5322 compliance and disposable domain blocking
   * @param {string} email - Email to validate
   * @returns {Object} Validation result with valid flag and reason
   */
  static validateEmailAdvanced(email) {
    // RFC 5322 compliant regex (simplified)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(email)) {
      return { valid: false, reason: 'Invalid format' };
    }
    
    // Additional checks
    const [localPart, domain] = email.split('@');
    
    if (localPart.length > 64 || domain.length > 255) {
      return { valid: false, reason: 'Parts too long' };
    }
    
    // Block known disposable email domains
    const disposableDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com', 'mailinator.com'];
    if (disposableDomains.includes(domain.toLowerCase())) {
      return { valid: false, reason: 'Disposable email not allowed' };
    }
    
    return { valid: true };
  }

  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validateURL(url) {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Sanitizes search queries with SQL injection prevention
   * @param {string} query - Search query to sanitize
   * @param {Object} options - Sanitization options
   * @returns {string} Sanitized query
   */
  static sanitizeSearchQueryAdvanced(query, options = {}) {
    const maxLength = options.maxLength || 200;
    
    // Limit length
    let sanitized = query.slice(0, maxLength);
    
    // Remove dangerous characters
    sanitized = sanitized.replace(/[<>'"&\\/]/g, '');
    
    // Remove SQL injection attempts
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
      /(--|;|\/\*|\*\/)/g
    ];
    
    sqlPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
    
    return sanitized.trim();
  }

  static sanitizeSearchQuery(query) {
    // Remove potentially dangerous characters
    return query.replace(/[<>'"&]/g, '').trim();
  }
}

/**
 * CSRF Protection
 */
export class CSRFProtection {
  static getToken() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  }

  static addTokenToRequest(options = {}) {
    const token = this.getToken();
    if (token) {
      options.headers = {
        ...options.headers,
        'X-CSRF-Token': token
      };
    }
    return options;
  }
}

/**
 * Rate Limiting
 */
export class RateLimiter {
  constructor() {
    this.requests = new Map();
  }

  checkLimit(key, maxRequests = 100, windowMs = 60000) {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }

    const keyRequests = this.requests.get(key);
    
    // Remove old requests outside the window
    const validRequests = keyRequests.filter(timestamp => timestamp > windowStart);
    this.requests.set(key, validRequests);

    if (validRequests.length >= maxRequests) {
      return false; // Rate limit exceeded
    }

    // Add current request
    validRequests.push(now);
    return true;
  }
}

/**
 * Initialize security measures
 */
export const initSecurity = () => {
  // Apply Content Security Policy
  CSPManager.applyCSP();
  
  // Apply security headers
  SecurityHeaders.applyClientSideHeaders();
  
  // Set up global error handler for security events
  window.addEventListener('securitypolicyviolation', (event) => {
    console.warn('CSP Violation:', {
      violatedDirective: event.violatedDirective,
      blockedURI: event.blockedURI,
      documentURI: event.documentURI,
      lineNumber: event.lineNumber
    });

    // Report to monitoring service
    if (SERVICES.sentryDsn && window.Sentry) {
      window.Sentry.captureMessage('CSP Violation', {
        level: 'warning',
        extra: {
          violatedDirective: event.violatedDirective,
          blockedURI: event.blockedURI
        }
      });
    }
  });
};

export default {
  CSPManager,
  SecurityHeaders,
  InputSanitizer,
  CSRFProtection,
  RateLimiter,
  initSecurity
};