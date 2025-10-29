# PWA Meta Tags Update Script
# This file contains the PWA meta tags snippet to add to all HTML pages

## Meta Tags to Add
Add these tags to the <head> section of each HTML page, right after the <title> tag:

```html
<!-- PWA Configuration -->
<meta name="theme-color" content="#6366f1">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="SoundLightPro">
<link rel="manifest" href="/manifest.json">
<link rel="apple-touch-icon" href="/images/logo/logoslp.jpg">
<link rel="icon" type="image/jpeg" href="/images/logo/logoslp.jpg">
```

## Pages That Need Updates

### ✅ Already Updated
- index.html
- cart.html
- product.html
- offline.html (self-contained, doesn't need these)

### ⏳ Needs Update
- about.html
- contact.html
- services.html
- login.html
- register.html
- search-results.html
- 404.html
- cookie-policy.html
- privacy-policy.html
- terms-of-service.html
- shipping-info.html
- returns.html
- warranty.html
- support-center.html
- debug-api.html (optional)

## How to Update

### Method 1: Manual (Recommended)
1. Open each HTML file
2. Locate the `<title>` tag
3. Add the PWA meta tags block immediately after it
4. Save the file
5. Check off the page from the list above

### Method 2: Find & Replace (Advanced)
Use your editor's find & replace with regex:

**Find:**
```
(<title>.*?</title>\s*)(\s*<!-- Security Headers -->)
```

**Replace:**
```
$1
    
    <!-- PWA Configuration -->
    <meta name="theme-color" content="#6366f1">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="SoundLightPro">
    <link rel="manifest" href="/manifest.json">
    <link rel="apple-touch-icon" href="/images/logo/logoslp.jpg">
    <link rel="icon" type="image/jpeg" href="/images/logo/logoslp.jpg">
    
$2
```

**Note:** Test on one file first before applying to all!

### Method 3: VS Code Multi-File Edit
1. Open VS Code
2. Use Ctrl+Shift+H (Find in Files)
3. Enable regex mode
4. Find pattern: `(<title>.*?</title>)`
5. Check files to modify
6. Replace with the pattern above
7. Review changes before saving

## Verification

After updating each file, verify:
1. Page loads without errors
2. Console shows no warnings
3. Manifest link works (check DevTools → Application → Manifest)
4. Theme color applied (check mobile browser UI)

## Batch Testing Command

After updating all files, test them:

```bash
# Check if manifest link exists in all HTML files
grep -l "manifest.json" *.html

# Check if theme-color exists
grep -l "theme-color" *.html

# Count files with PWA meta tags
grep -c "apple-mobile-web-app" *.html
```

## Icon Update Reminder

After adding meta tags to all pages, remember to:
1. Create proper PWA icons (PNG format):
   - icon-192.png (192x192)
   - icon-512.png (512x512)
   - icon-180.png (180x180 for iOS)

2. Update manifest.json:
   ```json
   "icons": [
       {
           "src": "/images/icons/icon-192.png",
           "sizes": "192x192",
           "type": "image/png",
           "purpose": "any maskable"
       },
       {
           "src": "/images/icons/icon-512.png",
           "sizes": "512x512",
           "type": "image/png",
           "purpose": "any maskable"
       }
   ]
   ```

3. Update HTML files to reference new icons:
   ```html
   <link rel="apple-touch-icon" href="/images/icons/icon-180.png">
   <link rel="icon" type="image/png" href="/images/icons/icon-192.png">
   ```

## Common Pitfalls

1. **Wrong placement:** Make sure tags are inside <head>, not <body>
2. **Missing closing tags:** Verify all tags are properly closed
3. **Incorrect paths:** Manifest and icon paths must be correct
4. **Duplicate tags:** Don't add if page already has theme-color
5. **Cache issues:** Hard refresh (Ctrl+Shift+R) to see changes

## Testing After Update

For each updated page:
1. Open in Chrome
2. Right-click → Inspect
3. Go to Application tab
4. Check Manifest section
5. Verify all fields populated correctly

## Quick Status Check

Use this checklist to track progress:

```
[ ] about.html
[ ] contact.html
[ ] services.html
[ ] login.html
[ ] register.html
[ ] search-results.html
[ ] 404.html
[ ] cookie-policy.html
[ ] privacy-policy.html
[ ] terms-of-service.html
[ ] shipping-info.html
[ ] returns.html
[ ] warranty.html
[ ] support-center.html
[ ] debug-api.html
```

## Estimated Time

- Per file: 2-3 minutes (manual)
- Total time: 30-45 minutes for all files
- With find/replace: 10-15 minutes + testing

## When Complete

After updating all files:
1. Run Lighthouse audit on 3-5 different pages
2. Test install prompt on each page
3. Verify offline fallback works
4. Check console for errors
5. Test on mobile device

## Need Help?

If you encounter issues:
1. Check `/Docs/PWA_IMPLEMENTATION.md` for troubleshooting
2. Verify file syntax with HTML validator
3. Check browser console for errors
4. Compare with already-updated files (index.html, cart.html)

---

Last Updated: 2025-10-13
