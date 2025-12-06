/**
 * performance.js
 * 
 * Performance optimization utilities
 */

import { IS_PRODUCTION, DISABLE_SW, IS_LOCAL_HOST } from './config.js';

/**
 * Lazy loading utility for images
 */
export class LazyLoader {
  constructor() {
    this.imageObserver = null;
    this.init();
  }

  init() {
    if ('IntersectionObserver' in window) {
      this.imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            this.loadImage(img);
            observer.unobserve(img);
          }
        });
      }, {
        rootMargin: '50px 0px',
        threshold: 0.01
      });

      this.observeImages();
    } else {
      // Fallback for browsers without IntersectionObserver
      this.loadAllImages();
    }
  }

  observeImages() {
    const lazyImages = document.querySelectorAll('img[data-src], img[loading="lazy"]');
    lazyImages.forEach(img => {
      this.imageObserver.observe(img);
    });
  }

  loadImage(img) {
    if (img.dataset.src) {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    }

    if (img.dataset.srcset) {
      img.srcset = img.dataset.srcset;
      img.removeAttribute('data-srcset');
    }

    img.classList.add('loaded');
  }

  loadAllImages() {
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => this.loadImage(img));
  }

  // Method to observe new images added dynamically
  observeNewImages(container) {
    if (!this.imageObserver) return;

    const newImages = container.querySelectorAll('img[data-src]');
    newImages.forEach(img => {
      this.imageObserver.observe(img);
    });
  }
}

/**
 * Resource hints utility
 */
export class ResourceHints {
  static preloadCriticalResources() {
    const criticalResources = [
      '/css/main.css',
      '/js/main.js',
      '/images/logo/logoslp.jpg'
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = this.getResourceType(resource);
      link.href = resource;
      document.head.appendChild(link);
    });
  }

  static getResourceType(url) {
    if (url.endsWith('.css')) return 'style';
    if (url.endsWith('.js')) return 'script';
    if (url.match(/\.(jpg|jpeg|png|webp|avif)$/)) return 'image';
    if (url.endsWith('.woff2')) return 'font';
    return 'fetch';
  }

  static prefetchNextPage(url) {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  }

  static preconnectToOrigins() {
    const origins = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://cdnjs.cloudflare.com',
      'https://cdn.jsdelivr.net'
    ];

    origins.forEach(origin => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = origin;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }
}

/**
 * Performance monitoring utility (Enhanced)
 * ✅ Improved: Comprehensive monitoring with aggregation and thresholds
 */
export class PerformanceMonitor {
  constructor() {
    this.metrics = {
      pageLoads: [],
      apiCalls: [],
      userInteractions: [],
      errors: [],
      connectivity: [] // Track online/offline events
    };
    this.thresholds = {
      lcp: 2500,      // Good < 2.5s (Largest Contentful Paint)
      fid: 100,       // Good < 100ms (First Input Delay)
      cls: 0.1,       // Good < 0.1 (Cumulative Layout Shift)
      apiCall: 1000   // Good < 1s
    };
    this.init();
  }

  init() {
    if (IS_PRODUCTION && 'PerformanceObserver' in window) {
      this.observeWebVitals();
      this.observeResources();
    }

    // Initialize connectivity monitoring
    this.initConnectivityMonitoring();
  }

  /**
   * Records a metric with category-based storage
   * @param {string} category - Metric category
   * @param {Object} data - Metric data
   */
  recordMetric(category, data) {
    if (!this.metrics[category]) {
      this.metrics[category] = [];
    }

    const metric = {
      ...data,
      timestamp: Date.now(),
      url: window.location.pathname
    };

    this.metrics[category].push(metric);

    // Check thresholds
    this.checkThresholds(category, metric);

    // Limit storage size (keep last 100, then trim to 50)
    if (this.metrics[category].length > 100) {
      this.metrics[category] = this.metrics[category].slice(-50);
    }
  }

  /**
   * Checks if metrics exceed defined thresholds
   * @param {string} category - Metric category
   * @param {Object} metric - Metric data
   */
  checkThresholds(category, metric) {
    let threshold;
    let value;

    switch (category) {
      case 'pageLoads':
        threshold = this.thresholds.lcp;
        value = metric.lcp;
        break;
      case 'apiCalls':
        threshold = this.thresholds.apiCall;
        value = metric.duration;
        break;
      default:
        return;
    }

    if (value > threshold) {
      console.warn(`Performance threshold exceeded for ${category}:`, {
        value,
        threshold,
        metric
      });

      // Send to analytics if in production
      if (IS_PRODUCTION && window.gtag) {
        window.gtag('event', 'performance_issue', {
          category,
          value: Math.round(value),
          threshold
        });
      }
    }
  }

  /**
   * Generates a performance report with statistics
   * @returns {Object} Performance report
   */
  getReport() {
    const report = {};

    Object.entries(this.metrics).forEach(([category, metrics]) => {
      if (metrics.length === 0) return;

      const values = metrics.map(m => m.value || m.duration || 0);
      report[category] = {
        count: metrics.length,
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        p95: this.calculatePercentile(values, 95)
      };
    });

    return report;
  }

  /**
   * Calculates percentile value
   * @param {Array<number>} values - Array of values
   * @param {number} percentile - Percentile to calculate (0-100)
   * @returns {number} Percentile value
   */
  calculatePercentile(values, percentile) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * Exports all metrics for external analysis
   * @returns {Object} Complete metrics export
   */
  exportMetrics() {
    return {
      report: this.getReport(),
      raw: this.metrics,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      thresholds: this.thresholds
    };
  }

  observeWebVitals() {
    // Largest Contentful Paint
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.recordMetric('pageLoads', { lcp: lastEntry.startTime });
      this.reportMetric('lcp', lastEntry.startTime);
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay
    new PerformanceObserver((entryList) => {
      const firstInput = entryList.getEntries()[0];
      if (firstInput) {
        const fid = firstInput.processingStart - firstInput.startTime;
        this.recordMetric('userInteractions', { fid });
        this.reportMetric('fid', fid);
      }
    }).observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift
    let clsValue = 0;
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      this.recordMetric('pageLoads', { cls: clsValue });
      this.reportMetric('cls', clsValue);
    }).observe({ entryTypes: ['layout-shift'] });
  }

  observeResources() {
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.duration > 1000) { // Resources taking more than 1s
          console.warn(`Slow resource: ${entry.name} took ${entry.duration}ms`);
          this.recordMetric('apiCalls', {
            name: entry.name,
            duration: entry.duration,
            type: entry.initiatorType
          });
        }
      }
    }).observe({ entryTypes: ['resource'] });
  }

  reportMetric(name, value) {
    // Send to analytics service
    if (window.gtag) {
      window.gtag('event', name, {
        event_category: 'Web Vitals',
        value: Math.round(value),
        non_interaction: true,
      });
    }
  }

  getMetrics() {
    return this.metrics;
  }

  /**
   * Initialize connectivity monitoring
   * Tracks online/offline events for PWA performance analysis
   */
  initConnectivityMonitoring() {
    // Track initial state
    this.recordMetric('connectivity', {
      event: 'init',
      online: navigator.onLine,
      timestamp: Date.now()
    });

    // Listen for online event
    window.addEventListener('online', () => {
      const metric = {
        event: 'online',
        timestamp: Date.now()
      };

      this.recordMetric('connectivity', metric);

      // Send to analytics
      if (window.gtag) {
        window.gtag('event', 'connection_restored', {
          event_category: 'Connectivity',
          event_label: 'online',
          non_interaction: true
        });
      }

      console.log('[Performance] Connection restored');
    });

    // Listen for offline event
    window.addEventListener('offline', () => {
      const metric = {
        event: 'offline',
        timestamp: Date.now()
      };

      this.recordMetric('connectivity', metric);

      // Send to analytics
      if (window.gtag) {
        window.gtag('event', 'connection_lost', {
          event_category: 'Connectivity',
          event_label: 'offline',
          non_interaction: true
        });
      }

      console.log('[Performance] Connection lost');
    });

    // Monitor connection quality (if Network Information API is available)
    if ('connection' in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

      if (connection) {
        // Track initial connection type
        this.recordMetric('connectivity', {
          event: 'connection_type',
          type: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData
        });

        // Listen for connection changes
        connection.addEventListener('change', () => {
          this.recordMetric('connectivity', {
            event: 'connection_change',
            type: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt,
            saveData: connection.saveData,
            timestamp: Date.now()
          });

          console.log('[Performance] Connection changed:', connection.effectiveType);
        });
      }
    }
  }

  /**
   * Get connectivity statistics
   * @returns {Object} Connectivity stats
   */
  getConnectivityStats() {
    const events = this.metrics.connectivity || [];

    if (events.length === 0) {
      return {
        online: navigator.onLine,
        totalEvents: 0,
        offlineCount: 0,
        onlineCount: 0
      };
    }

    const offlineEvents = events.filter(e => e.event === 'offline');
    const onlineEvents = events.filter(e => e.event === 'online');

    return {
      online: navigator.onLine,
      totalEvents: events.length,
      offlineCount: offlineEvents.length,
      onlineCount: onlineEvents.length,
      lastOffline: offlineEvents.length > 0 ? offlineEvents[offlineEvents.length - 1].timestamp : null,
      lastOnline: onlineEvents.length > 0 ? onlineEvents[onlineEvents.length - 1].timestamp : null
    };
  }
}

/**
 * Service Worker registration
 */
export class ServiceWorkerManager {
  static async register() {
    // Do not register on local/LAN hosts to avoid cache issues while previewing
    if ('serviceWorker' in navigator && IS_PRODUCTION && !DISABLE_SW && !IS_LOCAL_HOST) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content available, prompt user to refresh
              this.showUpdatePrompt();
            }
          });
        });

        console.log('Service Worker registered successfully');
        return registration;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  // For local preview or when DISABLE_SW is true, proactively unregister
  static async unregisterIfNeeded() {
    if (!('serviceWorker' in navigator)) return;
    if (!IS_PRODUCTION || DISABLE_SW || IS_LOCAL_HOST) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          await reg.unregister();
        }
        // Also clear caches to avoid stale assets
        if (window.caches) {
          const keys = await caches.keys();
          for (const k of keys) await caches.delete(k);
        }
        console.info('Service workers unregistered and caches cleared for local preview.');
      } catch (e) {
        console.warn('Failed to unregister service workers:', e);
      }
    }
  }

  /**
   * Show update prompt to user
   */
  static showUpdatePrompt() {
    const updateBanner = document.createElement('div');
    updateBanner.className = 'update-banner';
    updateBanner.setAttribute('role', 'alert');

    const message = document.createElement('span');
    message.textContent = 'A new version is available!';

    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = 'Refresh';
    refreshBtn.className = 'btn btn--primary btn--sm';
    refreshBtn.addEventListener('click', () => {
      window.location.reload();
    });

    updateBanner.appendChild(message);
    updateBanner.appendChild(refreshBtn);
    document.body.appendChild(updateBanner);
  }
}

/**
 * Initialize all performance optimizations
 */
export function initPerformanceOptimizations() {
  // Initialize lazy loading
  new LazyLoader();

  // Set up resource hints
  ResourceHints.preconnectToOrigins();

  // Initialize performance monitoring
  if (IS_PRODUCTION) {
    new PerformanceMonitor();
  }

  // Register service worker
  // Ensure we don't keep stale SW when previewing on LAN
  ServiceWorkerManager.unregisterIfNeeded();
  ServiceWorkerManager.register();
}

export default {
  LazyLoader,
  ResourceHints,
  PerformanceMonitor,
  ServiceWorkerManager,
  initPerformanceOptimizations
};