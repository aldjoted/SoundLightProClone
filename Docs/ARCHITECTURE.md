# Frontend Architecture

Browser-side architecture for the JavaScript layer. Modules communicate with Django REST API via `/api/v1/` endpoints.

## High-Level Structure

```
Browser
├─ UI Layer (ui.js, page modules)
├─ Middleware (SmartCache, AdaptiveDebouncer, PerformanceMonitor)
├─ API Layer (apiService.js, token manager)
└─ Storage Layer (cart state, localStorage tokens)

Backend
└─ Django REST API under /api/v1/
```

**Recent Changes (v1.1.0)**
- DOM rendering: `createElement` helpers replace `innerHTML`
- Token refresh: Single-flight promise prevents race conditions
- Caching: Per-entity strategies with stale-while-revalidate
- Cart: Metadata cleanup reduces localStorage usage

## Data Flows

### Search
1. User input enters `AdaptiveDebouncer`.
2. Typing speed controls the wait time (150 ms for fast input, 400 ms for slow input).
3. Debounced requests call `apiFetch` with cancellation support.
4. Results hydrate UI components through `ui.js`.

### Caching
1. `SmartCache` checks for a cache entry by key.
2. Strategy determines response: products use stale-while-revalidate, categories use a long-lived cache, sensitive data avoids SWR.
3. Stale responses render immediately while refresh requests update the cache asynchronously.

### Token Refresh
1. `apiFetch` retries requests that return HTTP 401.
2. A shared promise ensures only one refresh request is in flight.
3. After refresh completion, pending requests continue with the new access token.

## Module Responsibilities

- `main.js` — bootstraps the application, wires cache strategies, and routes page initialization.
- `apiService.js` — central HTTP client, token lifecycle management, error classification, retry logic.
- `cart.js` — cart CRUD, cross-tab synchronization, metadata cleanup utility.
- `advanced-search.js` — adaptive debouncing, keyboard navigation, accessibility hooks.
- `chatbot.js` — chatbot UI integration, response classification, user messaging.
- `security.js` — sanitation utilities, URL validation, email validation helpers.
- `performance.js` — Web Vitals monitoring, threshold checks, export utilities.
- `ui.js` — safe DOM construction and shared component renderers.

## Security Layers

1. Input validation checks length, type, and format before processing.
2. Sanitization utilities ensure only safe markup and protocols reach the DOM.
3. Rendering uses `createElement` and `textContent` to avoid injection risks.
4. The API layer filters sensitive error messages and normalizes responses.
5. Server-side validation in Django enforces the final guardrail.

## Performance Considerations

- Cache strategies favor quick first paint while keeping data fresh in the background.
- Adaptive debouncing balances perceived speed with backend load.
- AbortController support prevents unnecessary network traffic.
- PerformanceMonitor records key metrics (LCP, FID, CLS) and highlights regressions.
- Cart metadata cleanup keeps localStorage usage manageable across sessions.

## Patterns Used

- **Singleton:** instances of SmartCache, tokenManager, PerformanceMonitor.
- **Strategy:** cache policies per resource type.
- **Observer:** state manager broadcasts cart changes across tabs.
- **Factory:** DOM helper functions encapsulate element creation.
- **Decorator:** retry and debounce wrappers augment core functions without rewriting logic.

## Planned Improvements

- Migrate localStorage tokens to httpOnly cookies
- Implement automated testing (Vitest, Playwright)
- External performance metrics collection

See `ROADMAP.md` for complete feature planning.

**Version:** 1.1.0 | **Updated:** November 12, 2025
