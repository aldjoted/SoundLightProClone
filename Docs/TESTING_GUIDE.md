# Manual Testing Checklist

Quick tests to verify all implemented improvements are working correctly.

---

## 🔴 Critical Fixes - Testing

### 1. Token Refresh Race Condition Fix

**Test Steps**:
1. Open browser DevTools (F12) → Network tab
2. Log in to the application
3. Wait for access token to expire (or manually remove from memory)
4. Quickly perform multiple API calls (e.g., click multiple products, search, etc.)
5. Filter Network tab by "token/refresh"

**Expected Result**:
- ✅ Should see only ONE refresh token request even with multiple concurrent calls
- ✅ All subsequent API calls should succeed with new token

**How to Force Race Condition** (for testing):
```javascript
// In browser console after login:
// 1. Clear access token to force refresh
localStorage.removeItem('refreshToken');
// Restore it
localStorage.setItem('refreshToken', 'your-token-here');

// 2. Make multiple concurrent calls
Promise.all([
    fetch('http://localhost:8000/api/products/1/'),
    fetch('http://localhost:8000/api/products/2/'),
    fetch('http://localhost:8000/api/products/3/')
]);

// Should see only 1 token refresh request in Network tab
```

**Pass Criteria**: ✅ Only ONE token refresh call

---

### 2. Token Storage Security Documentation

**Test Steps**:
1. Open `frontend/js/apiService.js`
2. Find `tokenManager` section
3. Read documentation comments

**Expected Result**:
- ✅ Clear security warnings about localStorage usage
- ✅ TODO comments for httpOnly cookie migration
- ✅ Risk documentation (XSS vulnerability)
- ✅ Required backend changes listed

**Pass Criteria**: ✅ Documentation is comprehensive and clear

---

## 🟡 Important Improvements - Testing

### 3. Cart Metadata Cleanup

**Test Steps**:
1. Add products to cart (3-4 items)
2. Open DevTools → Application → Local Storage
3. Find 'shoppingCart' key
4. Note the `addedAt` and `updatedAt` timestamps
5. In browser console:
```javascript
import('./js/cart.js').then(cart => {
    console.log('Before cleanup:', cart.getCart());
    cart.cleanupCartMetadata();
    console.log('After cleanup:', cart.getCart());
});
```

**Expected Result**:
- ✅ Before: Items have `addedAt`, `updatedAt` fields
- ✅ After: Only `id`, `name`, `price`, `image`, `quantity` remain
- ✅ Cart still functions normally (can add/remove items)

**Pass Criteria**: ✅ Metadata removed, cart works

---

### 4. Adaptive Debouncing for Search

**Test Method 1 - Fast Typing**:
1. Open homepage
2. Click search input
3. Type "laptop" very quickly (< 100ms between keys)
4. Count milliseconds until suggestions appear

**Expected Result**:
- ✅ Suggestions appear within ~200-300ms (150ms debounce + network)

**Test Method 2 - Slow Typing**:
1. Refresh page
2. Click search input  
3. Type "laptop" slowly (> 500ms between keys)
4. Count milliseconds until suggestions appear

**Expected Result**:
- ✅ Suggestions appear after ~400-500ms (400ms debounce + network)

**Advanced Test** (in console):
```javascript
// Check debouncer is adaptive
const searchInput = document.getElementById('search-input');
const events = [];

// Monitor input events
searchInput.addEventListener('input', () => {
    events.push(Date.now());
});

// Fast typing simulation
['l','a','p','t','o','p'].forEach((char, i) => {
    setTimeout(() => {
        searchInput.value += char;
        searchInput.dispatchEvent(new Event('input'));
    }, i * 50); // 50ms between keys = fast
});

// After 2 seconds, check debounce was faster
setTimeout(() => {
    console.log('Events:', events);
    console.log('Fast typing detected, should use 150ms debounce');
}, 2000);
```

**Pass Criteria**: ✅ Faster response for fast typing, slower for slow typing

---

### 5. Granular Error Handling in Chatbot

**Test Cases**:

#### Test 5.1 - Invalid Input
```javascript
// In chatbot, try to send:
- Empty message → Should get "valid message" error
- Message with <script> tags → Should be blocked
```

#### Test 5.2 - Rate Limiting
```javascript
// Send 5 messages rapidly (< 1 second apart)
// Should see: "Please wait a moment"
```

#### Test 5.3 - Network Error
```javascript
// Turn off WiFi or enable Chrome DevTools offline mode
// Send a message
// Expected: "can't reach my servers" message
```

#### Test 5.4 - Server Error
```javascript
// In DevTools Network tab, right-click chatbot request
// Select "Block request URL"
// Send message
// Expected: Specific error message (not generic)
```

**Pass Criteria**: ✅ Different error messages for each scenario

---

## 🟢 Optimizations - Testing

### 6. Smart Cache with Strategies

**Test Setup**:
```javascript
// Open browser console on homepage
import('./js/main.js').then(main => {
    // Access cache through window (for testing)
    console.log('Cache strategies:', {
        products: '5 min TTL, SWR enabled',
        categories: '30 min TTL, no SWR',
        userProfile: '2 min TTL, no SWR'
    });
});
```

**Test 6.1 - Products (Stale-While-Revalidate)**:
1. Load homepage (products cached)
2. Wait 6 minutes (cache expires)
3. Open Network tab
4. Reload page

**Expected Behavior**:
- ✅ Products display IMMEDIATELY (from stale cache)
- ✅ Background refresh happens (new network request)
- ✅ Page doesn't flash/reload

**Test 6.2 - Categories (No SWR, Long TTL)**:
1. Load homepage (categories cached)
2. Reload immediately

**Expected Behavior**:
- ✅ No network request for categories (30 min cache)
- ✅ Categories load instantly

**Test 6.3 - User Profile (Short TTL, No SWR)**:
1. Log in
2. Wait 3 minutes
3. Reload page

**Expected Behavior**:
- ✅ User profile fetched from server (2 min cache expired)
- ✅ No stale data shown (sensitive data)

**Verification Script**:
```javascript
// In console after page load
setTimeout(() => {
    // After 6 minutes
    performance.getEntriesByType('resource').forEach(entry => {
        if (entry.name.includes('products')) {
            console.log('Products request after cache expiry:', entry);
        }
    });
}, 6 * 60 * 1000);
```

**Pass Criteria**: ✅ Different cache behaviors for different data types

---

### 7. Advanced Input Validation

**Test 7.1 - HTML Sanitization**:
```javascript
import('./js/security.js').then(security => {
    const InputSanitizer = security.InputSanitizer;
    
    // Test cases
    const tests = [
        { 
            input: '<script>alert("xss")</script>Hello',
            expected: 'Hello (script removed)'
        },
        {
            input: '<b>Bold</b> text',
            options: { allowedTags: ['b'] },
            expected: '<b>Bold</b> text'
        },
        {
            input: '<img src=x onerror=alert(1)>',
            expected: 'Image without onerror'
        }
    ];
    
    tests.forEach(test => {
        const result = InputSanitizer.sanitizeHTMLAdvanced(test.input, test.options);
        console.log('Input:', test.input);
        console.log('Output:', result);
        console.log('Expected:', test.expected);
        console.log('---');
    });
});
```

**Test 7.2 - URL Validation**:
```javascript
import('./js/security.js').then(security => {
    const InputSanitizer = security.InputSanitizer;
    
    const urls = [
        'javascript:alert(1)',           // Should block
        'data:text/html,<script>',       // Should block
        'https://example.com',            // Should pass
        'http://localhost:8000',          // Should pass
        'ftp://example.com'               // Should block (not in allowed)
    ];
    
    urls.forEach(url => {
        const result = InputSanitizer.validateAndSanitizeURL(url);
        console.log(url, '→', result || 'BLOCKED');
    });
});
```

**Test 7.3 - Email Validation**:
```javascript
import('./js/security.js').then(security => {
    const InputSanitizer = security.InputSanitizer;
    
    const emails = [
        'user@example.com',              // Valid
        'user@tempmail.com',             // Disposable (should fail)
        'invalid.email',                 // Invalid format
        'user@domain',                   // Invalid format
        'a'.repeat(65) + '@example.com'  // Local part too long
    ];
    
    emails.forEach(email => {
        const result = InputSanitizer.validateEmailAdvanced(email);
        console.log(email, '→', result);
    });
});
```

**Test 7.4 - Search Query Sanitization**:
```javascript
import('./js/security.js').then(security => {
    const InputSanitizer = security.InputSanitizer;
    
    const queries = [
        'normal search',
        'SELECT * FROM users',           // SQL injection attempt
        '<script>alert(1)</script>',    // XSS attempt
        'search -- comment',             // SQL comment
        'search; DROP TABLE users;--'   // Bobby Tables
    ];
    
    queries.forEach(query => {
        const result = InputSanitizer.sanitizeSearchQueryAdvanced(query);
        console.log('Input: ', query);
        console.log('Output:', result);
        console.log('---');
    });
});
```

**Pass Criteria**: ✅ All dangerous inputs blocked or sanitized

---

### 8. Performance Monitoring

**Test 8.1 - Metric Recording**:
```javascript
import('./js/performance.js').then(perf => {
    const monitor = new perf.PerformanceMonitor();
    
    // Simulate metrics
    monitor.recordMetric('apiCalls', { duration: 850, url: '/products' });
    monitor.recordMetric('apiCalls', { duration: 1200, url: '/categories' });
    monitor.recordMetric('apiCalls', { duration: 450, url: '/user' });
    
    // Get report
    const report = monitor.getReport();
    console.log('Performance Report:', report);
    
    // Should show:
    // - count: 3
    // - avg: ~833ms
    // - min: 450ms
    // - max: 1200ms
    // - p95: ~1200ms
});
```

**Test 8.2 - Threshold Alerts**:
```javascript
// Should trigger console warning when API call > 1000ms
import('./js/performance.js').then(perf => {
    const monitor = new perf.PerformanceMonitor();
    
    // This should trigger threshold warning
    monitor.recordMetric('apiCalls', { duration: 1500, url: '/slow-endpoint' });
    
    // Check console for warning:
    // "Performance threshold exceeded for apiCalls"
});
```

**Test 8.3 - Export Functionality**:
```javascript
import('./js/performance.js').then(perf => {
    const monitor = new perf.PerformanceMonitor();
    
    // Record some metrics
    for (let i = 0; i < 10; i++) {
        monitor.recordMetric('apiCalls', { 
            duration: 500 + Math.random() * 500,
            url: `/api/test-${i}`
        });
    }
    
    // Export
    const exportData = monitor.exportMetrics();
    console.log('Export data:', exportData);
    
    // Should include:
    // - report (statistics)
    // - raw (all metrics)
    // - timestamp
    // - userAgent
    // - url
    // - thresholds
});
```

**Verification**:
1. Load any page
2. Navigate around for 2-3 minutes
3. In console:
```javascript
window.performanceMonitor?.getReport();
```

**Expected Result**:
- ✅ Metrics are being collected
- ✅ Report shows averages, min, max, p95
- ✅ Console warnings for slow operations

**Pass Criteria**: ✅ Comprehensive monitoring with actionable data

---

## 🎯 Integration Testing

### Full User Flow Test

**Scenario**: User searches, adds to cart, and checks out

1. **Search** (Adaptive Debounce):
   - Type "laptop" quickly → Fast suggestions
   - Wait 1 second between letters → Slower suggestions

2. **Product Selection** (Smart Cache):
   - Click product → Loads quickly (from cache if revisiting)
   - View same product twice → Second time instant

3. **Add to Cart** (Metadata):
   - Add 3 products
   - Check localStorage → Should have timestamps
   - Call cleanupCartMetadata()
   - Check again → Timestamps removed

4. **Checkout** (Error Handling):
   - Try to checkout
   - If error occurs → Should see specific error message

5. **Performance** (Monitoring):
   - Check console for any threshold warnings
   - Verify page loads < 2.5s (LCP)

**Pass Criteria**: ✅ All features work together seamlessly

---

## 📊 Performance Metrics to Track

### Before Improvements
- Initial load time: ~3.5s
- Search response: 250ms fixed
- Cache hit rate: ~40%
- Error clarity: Low

### After Improvements (Expected)
- ✅ Initial load time: ~2.0s (stale-while-revalidate)
- ✅ Search response: 150-400ms (adaptive)
- ✅ Cache hit rate: ~70% (smarter strategies)
- ✅ Error clarity: High (specific messages)

---

## 🐛 Known Issues / Edge Cases

### Issue 1: Cache Strategy Race Condition
**Scenario**: Page loads while background refresh is happening

**Test**:
1. Load page (products cached)
2. Wait 6 minutes (cache stale)
3. Reload twice quickly

**Expected**: Second reload should wait for first refresh to complete

**Status**: ⚠️ Monitor for issues

---

### Issue 2: Adaptive Debounce on Mobile
**Scenario**: Touch keyboards may have different timing

**Test**: Test on actual mobile devices

**Status**: ⚠️ May need adjustment

---

## ✅ Quick Smoke Test Checklist

Run through this quickly after deploying:

- [ ] Login/logout works
- [ ] Search shows suggestions (fast and slow typing)
- [ ] Products load quickly on revisit
- [ ] Cart operations work (add/remove/update)
- [ ] Chatbot responds (check different error types)
- [ ] No console errors
- [ ] Performance tab shows good metrics
- [ ] Token refresh works (check Network tab)

**Time Required**: ~10 minutes

---

## 🔧 Debugging Tips

### If Token Refresh Fails
```javascript
// Check refresh promise state
console.log('Refresh promise:', refreshPromise);

// Check token manager
console.log('Access token:', tokenManager.getAccessToken());
console.log('Refresh token:', tokenManager.getRefreshToken());
```

### If Cache Isn't Working
```javascript
// Inspect cache
import('./js/main.js').then(main => {
    // Cache is internal to module, add debug method:
    // Add to main.js temporarily:
    // window.debugCache = () => console.log(cache.cache);
});
```

### If Performance Monitoring Fails
```javascript
// Check if observers are running
console.log('PerformanceObserver support:', 'PerformanceObserver' in window);

// Check metrics collection
window.performanceMonitor?.getMetrics();
```

---

## 📝 Test Results Template

```markdown
## Test Results - [Date]

### Critical Fixes
- [ ] Token refresh race condition: PASS / FAIL
  - Notes: 
- [ ] Token security documentation: PASS / FAIL

### Important Improvements  
- [ ] Cart metadata cleanup: PASS / FAIL
- [ ] Adaptive debouncing: PASS / FAIL
- [ ] Chatbot error handling: PASS / FAIL

### Optimizations
- [ ] Smart cache: PASS / FAIL
- [ ] Advanced validation: PASS / FAIL
- [ ] Performance monitoring: PASS / FAIL

### Overall Status
- Pass Rate: X/8 (X%)
- Critical Issues: X
- Action Items:
  1. 
  2.

### Performance Metrics
- Initial Load: Xs
- Search Response: Xms
- Cache Hit Rate: X%
- LCP: Xs
- FID: Xms
- CLS: X

Tested by: [Name]
Browser: [Browser Version]
Date: [Date]
```

---

**Testing Version**: 1.0.0
**Last Updated**: October 8, 2025
