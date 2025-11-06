import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';
import { createHtmlPlugin } from 'vite-plugin-html';
import copy from 'rollup-plugin-copy';

export default defineConfig({
  root: '.',
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      input: {
        main: 'index.html',
        about: 'about.html',
        cart: 'cart.html',
        contact: 'contact.html',
        login: 'login.html',
        product: 'product.html',
        register: 'register.html',
        'search-results': 'search-results.html',
        services: 'services.html',
        'cookie-policy': 'cookie-policy.html',
        'privacy-policy': 'privacy-policy.html',
        'terms-of-service': 'terms-of-service.html',
        returns: 'returns.html',
        'shipping-info': 'shipping-info.html',
        'support-center': 'support-center.html',
        warranty: 'warranty.html',
        404: '404.html'
      },
      output: {
        manualChunks: {
          // ✅ IMPROVED: Better code splitting for optimal bundle sizes
          // Core utilities (small, frequently used)
          utils: ['./js/utils.js'],
          
          // API and state management (critical, shared)
          api: ['./js/apiService.js'],
          
          // UI rendering (large, page-specific)
          ui: ['./js/ui.js'],
          
          // Authentication (security-critical, separate bundle)
          auth: ['./js/auth.js', './js/validators.js'],
          
          // Cart functionality (frequently accessed)
          cart: ['./js/cart.js'],
          
          // Internationalization (shared across all pages)
          i18n: ['./js/i18n.js', './js/language-switcher.js'],
          
          // Security and performance (critical infrastructure)
          core: ['./js/security.js', './js/performance.js'],
          
          // PWA features (optional, can be lazy loaded)
          pwa: ['./js/offline-indicator.js', './js/sync-manager.js', './js/install-prompt.js'],
          
          // Analytics (non-critical, separate bundle)
          analytics: ['./js/analytics.js']
        }
      }
    },
    chunkSizeWarningLimit: 600, // ✅ IMPROVED: More aggressive warning threshold to catch large bundles
  },
  plugins: [
    legacy({
      targets: ['> 1%', 'last 2 versions', 'not dead'],
    }),
    createHtmlPlugin({
      minify: true,
    }),
    // Copy static images into dist to ensure availability in preview
    copy({
      targets: [
        { src: 'images/**/*', dest: 'dist/images' }
      ],
      hook: 'writeBundle'
    })
  ],
  server: {
    host: true,
    port: 3000,
    open: true,
    cors: true,
  },
  preview: {
    host: true,
    port: 8080,
  },
  css: {
    devSourcemap: false,
    postcss: {
      plugins: [
        {
          postcssPlugin: 'internal:charset-removal',
          AtRule: {
            charset: (atRule) => {
              if (atRule.name === 'charset') {
                atRule.remove();
              }
            }
          }
        }
      ]
    }
  }
});