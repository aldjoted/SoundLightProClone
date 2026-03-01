/**
 * config.js
 * Centralized runtime configuration for the frontend
 */

// Runtime overrides injected by server (optional)
const runtime = (typeof window !== 'undefined' && window.__APP_CONFIG__) || {};

// Helper: boolean parsing with default
function parseBool(val, fallback) {
  if (val === undefined || val === null) return fallback;
  if (typeof val === 'string') return val.toLowerCase() === 'true';
  return Boolean(val);
}

// Helper: safe access to import.meta.env
function getEnv(name) {
  try {
    return (import.meta && import.meta.env && import.meta.env[name]) || undefined;
  } catch (e) {
    return undefined;
  }
}

// Environment detection
const MODE = String(getEnv('MODE') || '');
export const IS_PRODUCTION = MODE.startsWith('prod');
export const IS_DEVELOPMENT = MODE.startsWith('dev');

// LAN host detection (localhost, 127.0.0.1, 192.168.x.x, 10.x.x.x, 172.16-31.x.x)
function isLanHost(hostname) {
  const h = String(hostname || '');
  if (!h) return false;
  if (h === 'localhost' || h === '127.0.0.1' || h.startsWith('192.168.') || h.startsWith('10.')) return true;
  if (h.startsWith('172.')) {
    const parts = h.split('.');
    const second = parseInt(parts[1] || '0', 10);
    return !Number.isNaN(second) && second >= 16 && second <= 31;
  }
  return false;
}

export const IS_LOCAL_HOST = (() => {
  try {
    const h = typeof window !== 'undefined' ? window.location.hostname : '';
    return isLanHost(h);
  } catch {
    return false;
  }
})();

// API base URL
export const API_BASE_URL = (() => {
  try {
    const h = typeof window !== 'undefined' ? window.location.hostname : '';
    if (h && isLanHost(h)) {
      return `http://${h}:8000/api`;
    }
  } catch {}
  let api = runtime.API_BASE_URL;
  if (!api) api = getEnv('VITE_API_BASE_URL');
  if (!api) api = 'http://127.0.0.1:8000/api';
  return api;
})();

// Site origin
export const SITE_URL = (() => {
  let url = runtime.SITE_URL;
  if (!url) url = getEnv('VITE_SITE_URL');
  if (!url) url = (typeof window !== 'undefined' && window.location) ? window.location.origin : 'http://localhost:3000';
  return url;
})();

// Feature flags
export const FEATURES = {
  enableVoiceSearch: parseBool(runtime.enableVoiceSearch, parseBool(getEnv('VITE_ENABLE_VOICE_SEARCH'), true)),
  enableAnalytics: parseBool(runtime.enableAnalytics, parseBool(getEnv('VITE_ENABLE_ANALYTICS'), false)),
  enableErrorTracking: parseBool(runtime.enableErrorTracking, parseBool(getEnv('VITE_ENABLE_ERROR_TRACKING'), false)),
};

// Third-party service configuration
export const SERVICES = {
  googleAnalyticsId: runtime.googleAnalyticsId || getEnv('VITE_GOOGLE_ANALYTICS_ID'),
  sentryDsn: runtime.sentryDsn || getEnv('VITE_SENTRY_DSN'),
  cspReportUri: runtime.cspReportUri || getEnv('VITE_CSP_REPORT_URI'),
};

// CDN config
export const CDN = {
  baseUrl: runtime.cdnUrl || getEnv('VITE_CDN_URL'),
  imagesUrl: runtime.imagesUrl || getEnv('VITE_IMAGES_CDN'),
};

// Disable Service Worker on local preview by default to avoid stale caches
export const DISABLE_SW = (() => {
  const envVal = getEnv('VITE_DISABLE_SW');
  if (typeof runtime.disableSW === 'boolean') return runtime.disableSW;
  if (envVal !== undefined) return String(envVal).toLowerCase() === 'true';
  return IS_LOCAL_HOST;
})();

// Stripe key -- SECURITY: No hardcoded fallback; must be configured via env or runtime
export const STRIPE_PUBLISHABLE_KEY = (() => {
  const key = runtime.STRIPE_PUBLISHABLE_KEY || getEnv('VITE_STRIPE_PUBLISHABLE_KEY') || '';
  if (!key) {
    console.error('[config] STRIPE_PUBLISHABLE_KEY is not configured. Payment features will be unavailable.');
  }
  return key;
})();

export default {
  API_BASE_URL,
  SITE_URL,
  FEATURES,
  SERVICES,
  CDN,
  IS_PRODUCTION,
  IS_DEVELOPMENT,
  IS_LOCAL_HOST,
  DISABLE_SW,
};
