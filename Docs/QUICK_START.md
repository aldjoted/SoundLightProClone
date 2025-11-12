# Quick Start: Validation Scenarios

Test scenarios for JavaScript enhancements in v1.1.0.

**Prerequisites:**
- Backend: `http://127.0.0.1:8000`
- Frontend: Local dev server (Vite/Live Server)
- Browser DevTools open

## Priority Scenarios

### 1. Adaptive Search
1. Open the homepage search box.
2. Type a query quickly; results should appear in roughly 150 ms.
3. Clear the field, then type the same query slowly; debounce stretches closer to 400 ms and reduces network traffic.
4. Confirm only one API request is created per input burst.

### 2. Smart Cache
1. Load the product grid and wait for the initial API response.
2. Leave the tab idle for at least five minutes.
3. Reload the page; cached data should render immediately while a background refresh updates the content.
4. In the Network panel, verify the follow-up request occurs after render.

### 3. Resilient Chatbot Errors
1. Open the chatbot panel and disable the network connection.
2. Send a message; the UI should return a network-specific error.
3. Restore connectivity and send repeated messages rapidly; throttling should prevent duplicate calls and display the “please wait” warning.

### 4. Cart Metadata Cleanup
1. Add several products to the cart and inspect localStorage for metadata entries.
2. Trigger checkout or explicitly call `cleanupCartMetadata()` from the console.
3. Validate that redundant timestamps are removed while cart contents remain intact.

## Metrics at a Glance

| Indicator | Target | Notes |
|-----------|--------|-------|
| Initial load time | ≤ 2.0 s | Cached product grid renders before refresh completes |
| Fast search debounce | ≈ 150 ms | Applies when typing speed exceeds 3 chars/s |
| Slow search debounce | ≈ 400 ms | Applies when typing speed is lower |
| Token refresh requests | 1 per expiry event | Single-flight promise prevents races |

## Troubleshooting

- If search results lag, check DevTools console for debounce diagnostics and ensure the input event listener is active.
- If cached data does not load instantly, confirm `SmartCache` strategies are registered in `frontend/js/main.js` and that localStorage is writable.
- If chatbot responses stay generic, verify `GEMINI_API_KEY` in `.env` and inspect `apiService.js` for HTTP errors.
- If cart cleanup fails, make sure `cleanupCartMetadata` is invoked after the cart module loads and that storage quota is not exceeded.

## Related Documentation

- Technical details: `JAVASCRIPT_IMPROVEMENTS.md`
- Extended testing: `TESTING_GUIDE.md`
- Feature roadmap: `ROADMAP.md`
- Release history: `CHANGELOG.md`

**Version:** 1.1.0 | **Updated:** November 12, 2025
