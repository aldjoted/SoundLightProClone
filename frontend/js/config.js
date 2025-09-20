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

// Environment detection
const MODE = String((import.meta && import.meta.env && import.meta.env.MODE) || '');
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
      return `http://${h}:8000/api/v1`;
    }
  } catch {}
  let api = runtime.API_BASE_URL;
  if (!api) api = import.meta?.env?.VITE_API_BASE_URL;
  if (!api) api = 'http://127.0.0.1:8000/api/v1';
  return api;
})();

// Site origin
export const SITE_URL = (() => {
  let url = runtime.SITE_URL;
  if (!url) url = import.meta?.env?.VITE_SITE_URL;
  if (!url) url = (typeof window !== 'undefined' && window.location) ? window.location.origin : 'http://localhost:3000';
  return url;
})();

// Feature flags
export const FEATURES = {
  enableVoiceSearch: parseBool(runtime.enableVoiceSearch, parseBool(import.meta?.env?.VITE_ENABLE_VOICE_SEARCH, true)),
  enableAnalytics: parseBool(runtime.enableAnalytics, parseBool(import.meta?.env?.VITE_ENABLE_ANALYTICS, false)),
  enableErrorTracking: parseBool(runtime.enableErrorTracking, parseBool(import.meta?.env?.VITE_ENABLE_ERROR_TRACKING, false)),
};

// Third-party service configuration
export const SERVICES = {
  googleAnalyticsId: runtime.googleAnalyticsId || import.meta?.env?.VITE_GOOGLE_ANALYTICS_ID,
  sentryDsn: runtime.sentryDsn || import.meta?.env?.VITE_SENTRY_DSN,
  cspReportUri: runtime.cspReportUri || import.meta?.env?.VITE_CSP_REPORT_URI,
};

// CDN config
export const CDN = {
  baseUrl: runtime.cdnUrl || import.meta?.env?.VITE_CDN_URL,
  imagesUrl: runtime.imagesUrl || import.meta?.env?.VITE_IMAGES_CDN,
};

// Disable Service Worker on local preview by default to avoid stale caches
export const DISABLE_SW = (() => {
  const envVal = import.meta?.env?.VITE_DISABLE_SW;
  if (typeof runtime.disableSW === 'boolean') return runtime.disableSW;
  if (envVal !== undefined) return String(envVal).toLowerCase() === 'true';
  return IS_LOCAL_HOST;
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
