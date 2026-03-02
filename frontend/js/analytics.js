/**
 * analytics.js
 * 
 * Analytics and monitoring setup for production insights
 */

import { IS_PRODUCTION, SERVICES, FEATURES } from './config.js';
import { throttle } from './utils.js';

/**
 * Google Analytics 4 Manager
 */
export class GoogleAnalytics {
  static init() {
    if (!IS_PRODUCTION || !FEATURES.enableAnalytics || !SERVICES.googleAnalyticsId) {
      return;
    }

    // Load Google Analytics script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${SERVICES.googleAnalyticsId}`;
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;
    
    gtag('js', new Date());
    gtag('config', SERVICES.googleAnalyticsId, {
      send_page_view: true,
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });

    console.log('Google Analytics initialized');
  }

  static trackEvent(eventName, parameters = {}) {
    if (window.gtag && IS_PRODUCTION) {
      window.gtag('event', eventName, parameters);
    }
  }

  static trackPageView(pagePath, pageTitle) {
    if (window.gtag && IS_PRODUCTION) {
      window.gtag('config', SERVICES.googleAnalyticsId, {
        page_path: pagePath,
        page_title: pageTitle
      });
    }
  }

  static trackPurchase(transactionId, value, currency = 'USD', items = []) {
    if (window.gtag && IS_PRODUCTION) {
      window.gtag('event', 'purchase', {
        transaction_id: transactionId,
        value: value,
        currency: currency,
        items: items
      });
    }
  }

  static trackSearch(searchTerm, resultsCount) {
    this.trackEvent('search', {
      search_term: searchTerm,
      results_count: resultsCount
    });
  }

  static trackAddToCart(itemId, itemName, category, value) {
    this.trackEvent('add_to_cart', {
      currency: 'USD',
      value: value,
      items: [{
        item_id: itemId,
        item_name: itemName,
        item_category: category,
        quantity: 1,
        price: value
      }]
    });
  }
}

/**
 * Error Tracking with Sentry
 */
export class ErrorTracking {
  static init() {
    if (!IS_PRODUCTION || !FEATURES.enableErrorTracking || !SERVICES.sentryDsn) {
      return;
    }

    // Load Sentry script
    const script = document.createElement('script');
    script.src = 'https://browser.sentry-cdn.com/7.114.0/bundle.tracing.min.js';
    script.integrity = 'sha384-N4RN5jOr6Y4d2kB6a4UY8VYp5zQ1V7q8sCZKZjZrHhQHjHsHfAFdcvvjq9LbBbHj';
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      window.Sentry.init({
        dsn: SERVICES.sentryDsn,
        environment: IS_PRODUCTION ? 'production' : 'development',
        integrations: [
          new window.Sentry.BrowserTracing()
        ],
        tracesSampleRate: IS_PRODUCTION ? 0.1 : 1.0,
        beforeSend(event) {
          // Filter out non-critical errors
          if (event.exception) {
            const error = event.exception.values[0];
            if (error && error.type === 'ChunkLoadError') {
              return null; // Don't track chunk load errors
            }
          }
          return event;
        }
      });

      // Set user context
      const user = this.getCurrentUser();
      if (user) {
        window.Sentry.setUser({
          id: user.id,
          email: user.email
        });
      }

      console.log('Sentry error tracking initialized');
    };
    document.head.appendChild(script);
  }

  static getCurrentUser() {
    try {
      // Use stored user profile instead of JWT decoding for reliability and privacy
      const raw = sessionStorage.getItem('slp_user_profile');
      if (raw) {
        const profile = JSON.parse(raw);
        return profile ? { id: profile.id, email: profile.email } : null;
      }
    } catch (error) {
      // Ignore parsing errors
    }
    return null;
  }

  static captureError(error, context = {}) {
    if (window.Sentry && IS_PRODUCTION) {
      window.Sentry.captureException(error, {
        extra: context
      });
    } else {
      console.error('Error:', error, context);
    }
  }

  static captureMessage(message, level = 'info', context = {}) {
    if (window.Sentry && IS_PRODUCTION) {
      window.Sentry.captureMessage(message, level, {
        extra: context
      });
    } else {
      console.log(`[${level.toUpperCase()}] ${message}`, context);
    }
  }
}

/**
 * Custom Event Tracking
 */
export class CustomEventTracker {
  constructor() {
    this.events = [];
    this.sessionStart = Date.now();
    this.init();
  }

  init() {
    // Track session duration
    window.addEventListener('beforeunload', () => {
      const sessionDuration = Date.now() - this.sessionStart;
      GoogleAnalytics.trackEvent('session_duration', {
        value: Math.round(sessionDuration / 1000) // in seconds
      });
    });

    // Track scroll depth
    this.trackScrollDepth();
    
    // Track click events
    this.trackClicks();
  }

  trackScrollDepth() {
    let maxScroll = 0;
    const milestones = [25, 50, 75, 90];
    const tracked = new Set();

    window.addEventListener('scroll', throttle(() => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );

      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;
        
        milestones.forEach(milestone => {
          if (scrollPercent >= milestone && !tracked.has(milestone)) {
            tracked.add(milestone);
            GoogleAnalytics.trackEvent('scroll_depth', {
              value: milestone,
              page_location: window.location.pathname
            });
          }
        });
      }
    }, 250));
  }

  trackClicks() {
    document.addEventListener('click', (event) => {
      const target = event.target.closest('a, button');
      if (!target) return;

      const eventData = {
        element_type: target.tagName.toLowerCase(),
        page_location: window.location.pathname
      };

      if (target.tagName === 'A') {
        eventData.link_url = target.href;
        eventData.link_text = target.textContent.trim().substring(0, 100);
      } else if (target.tagName === 'BUTTON') {
        eventData.button_text = target.textContent.trim().substring(0, 100);
        eventData.button_class = target.className;
      }

      GoogleAnalytics.trackEvent('click', eventData);
    });
  }

  trackCustomEvent(eventName, data = {}) {
    const event = {
      name: eventName,
      timestamp: Date.now(),
      data: data,
      page: window.location.pathname,
      userAgent: navigator.userAgent
    };

    this.events.push(event);
    GoogleAnalytics.trackEvent(eventName, data);

    // Store events locally for analysis
    if (this.events.length > 100) {
      this.events = this.events.slice(-50); // Keep last 50 events
    }
  }

  getEvents() {
    return this.events;
  }
}

/**
 * Performance Tracking
 */
export class PerformanceTracker {
  static trackWebVitals() {
    if (!IS_PRODUCTION) return;

    // Track Core Web Vitals
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        GoogleAnalytics.trackEvent('web_vitals', {
          metric_name: 'LCP',
          metric_value: Math.round(lastEntry.startTime),
          page_location: window.location.pathname
        });
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      new PerformanceObserver((entryList) => {
        const firstInput = entryList.getEntries()[0];
        if (firstInput) {
          GoogleAnalytics.trackEvent('web_vitals', {
            metric_name: 'FID',
            metric_value: Math.round(firstInput.processingStart - firstInput.startTime),
            page_location: window.location.pathname
          });
        }
      }).observe({ entryTypes: ['first-input'] });
    }

    // Track page load time
    window.addEventListener('load', () => {
      setTimeout(() => {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        GoogleAnalytics.trackEvent('page_timing', {
          metric_name: 'page_load_time',
          metric_value: Math.round(loadTime),
          page_location: window.location.pathname
        });
      }, 0);
    });
  }
}

/**
 * Initialize all analytics and monitoring
 */
export const initAnalytics = () => {
  // Initialize Google Analytics
  GoogleAnalytics.init();
  
  // Initialize error tracking
  ErrorTracking.init();
  
  // Initialize custom event tracking
  window.customEventTracker = new CustomEventTracker();
  
  // Initialize performance tracking
  PerformanceTracker.trackWebVitals();
  
  console.log('Analytics and monitoring initialized');
};

export default {
  GoogleAnalytics,
  ErrorTracking,
  CustomEventTracker,
  PerformanceTracker,
  initAnalytics
};