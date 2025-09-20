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
 * Performance monitoring utility
 */
export class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.init();
  }

  init() {
    if (IS_PRODUCTION && 'PerformanceObserver' in window) {
      this.observeWebVitals();
      this.observeResources();
    }
  }

  observeWebVitals() {
    // Largest Contentful Paint
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.metrics.lcp = lastEntry.startTime;
      this.reportMetric('lcp', lastEntry.startTime);
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay
    new PerformanceObserver((entryList) => {
      const firstInput = entryList.getEntries()[0];
      if (firstInput) {
        this.metrics.fid = firstInput.processingStart - firstInput.startTime;
        this.reportMetric('fid', this.metrics.fid);
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
      this.metrics.cls = clsValue;
      this.reportMetric('cls', clsValue);
    }).observe({ entryTypes: ['layout-shift'] });
  }

  observeResources() {
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.duration > 1000) { // Resources taking more than 1s
          console.warn(`Slow resource: ${entry.name} took ${entry.duration}ms`);
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

  static showUpdatePrompt() {
    const updateBanner = document.createElement('div');
    updateBanner.className = 'update-banner';
    updateBanner.innerHTML = `
      <div class="update-content">
        <span>A new version is available!</span>
        <button onclick="location.reload()">Update</button>
        <button onclick="this.parentElement.parentElement.remove()">Dismiss</button>
      </div>
    `;
    document.body.appendChild(updateBanner);
  }
}

// Initialize performance optimizations
export const initPerformanceOptimizations = () => {
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
};

export default {
  LazyLoader,
  ResourceHints,
  PerformanceMonitor,
  ServiceWorkerManager,
  initPerformanceOptimizations
};