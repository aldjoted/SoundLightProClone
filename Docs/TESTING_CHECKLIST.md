# Testing Checklist - New E-Commerce Features

## Pre-Testing Setup

- [ ] Run migrations: `python manage.py migrate`
- [ ] Start backend server: `python manage.py runserver`
- [ ] Start frontend dev server: `npm run dev` (or open index.html)
- [ ] Create test user account
- [ ] Add sample products to database

---

## 1. Wishlist Functionality Testing

### Guest User (Not Logged In)

- [ ] **Add to Wishlist from Product Card**
  - Click heart icon on product
  - Verify heart fills in and button text changes to "In Wishlist"
  - Check localStorage has `wishlist` key with product ID

- [ ] **Navigate to Wishlist Page**
  - Go to `/wishlist.html`
  - Verify products display correctly
  - Check product image, name, price, stock status

- [ ] **Remove from Wishlist**
  - Click "Remove" button on wishlist item
  - Verify item disappears with fade animation
  - Check localStorage updated

- [ ] **Move to Cart**
  - Click "Move to Cart" button
  - Verify product added to cart
  - Verify product removed from wishlist
  - Check cart count badge updated

- [ ] **Empty Wishlist State**
  - Remove all items
  - Verify empty state displays with icon and message
  - Check "Continue Shopping" button works

### Authenticated User (Logged In)

- [ ] **Login with Test Account**
  - Go to `/login.html`
  - Login successfully
  - Check user menu shows username

- [ ] **Add to Wishlist**
  - Add product to wishlist
  - Verify API call to `/api/wishlist/` (check Network tab)
  - Verify success toast notification

- [ ] **View Wishlist**
  - Go to `/wishlist.html`
  - Verify products load from backend
  - Check product details are correct

- [ ] **Sync Test (Guest → Authenticated)**
  - Logout
  - Add 2-3 products to wishlist as guest
  - Login
  - Verify guest wishlist synced to backend
  - Check `/api/wishlist/sync/` endpoint called

- [ ] **Cross-Device Sync**
  - Add product to wishlist on device A
  - Login on device B (different browser/incognito)
  - Verify same wishlist appears

- [ ] **Wishlist Count Badge**
  - Verify badge shows correct count
  - Add/remove items and check badge updates
  - Check badge displays on all pages

### Edge Cases

- [ ] **Duplicate Prevention**
  - Add same product twice
  - Verify no duplicate in wishlist
  - Check appropriate message/behavior

- [ ] **Out of Stock Product**
  - Add out-of-stock product to wishlist
  - Verify "Out of Stock" label displays
  - Check "Add to Cart" button disabled

- [ ] **Deleted Product**
  - Add product to wishlist
  - Delete product from admin
  - Verify graceful error handling

---

## 2. Product Reviews Testing

### View Reviews (All Users)

- [ ] **Navigate to Product Detail Page**
  - Go to `/product.html?id=1`
  - Scroll to reviews section
  - Verify review section displays

- [ ] **Review Statistics**
  - Check average rating displays (large number)
  - Verify star rating display
  - Check review count ("based on X reviews")
  - Verify rating distribution bars show percentages

- [ ] **Review List**
  - Check reviews display as cards
  - Verify user avatar (initial letter)
  - Check user name, date, rating stars
  - Verify review title and comment display
  - Check "Verified Purchase" badge (if applicable)

- [ ] **Sort Reviews**
  - Select "Most Recent" - verify chronological order
  - Select "Highest Rated" - verify 5-star first
  - Select "Lowest Rated" - verify 1-star first
  - Select "Verified Purchases" - verify only verified

- [ ] **Empty Reviews State**
  - Find product with no reviews
  - Verify "No reviews yet" message
  - Check "Be the first to review" text

### Write Review (Authenticated Only)

- [ ] **Open Review Form**
  - Click "Write a Review" button
  - Verify form slides open
  - Check form hidden by default

- [ ] **Interactive Star Rating**
  - Hover over stars - verify hover effect
  - Click 3rd star - verify 1-3 stars selected
  - Verify selected state persists
  - Test keyboard navigation (Tab + Space)

- [ ] **Fill Review Form**
  - Enter rating (required)
  - Enter title (required)
  - Enter comment (required, min 10 chars)
  - Check character counter updates

- [ ] **Form Validation**
  - Submit without rating - verify error
  - Submit without title - verify error
  - Submit without comment - verify error
  - Submit with <10 char comment - verify error

- [ ] **Submit Review**
  - Fill all fields correctly
  - Click "Submit Review"
  - Verify success toast
  - Check form closes
  - Verify new review appears in list
  - Check stats updated (average, distribution)

- [ ] **Cancel Review**
  - Open form
  - Click "Cancel" button
  - Verify form closes without submitting

### Authenticated User Restrictions

- [ ] **One Review Per User**
  - Submit review for product
  - Try to submit another review
  - Verify duplicate prevention (backend error)

- [ ] **Guest User**
  - Logout
  - Try to click "Write a Review"
  - Verify login prompt or redirect

### Edge Cases

- [ ] **Long Reviews**
  - Submit review with 500+ characters
  - Verify displays correctly (no overflow)
  - Check responsive layout

- [ ] **Special Characters**
  - Use émojis, accents (é, ñ, ü)
  - Verify displays correctly
  - Check no XSS vulnerabilities

---

## 3. Related Products Testing

### Product Detail Page

- [ ] **Navigate to Product**
  - Go to `/product.html?id=1`
  - Scroll to "You May Also Like" section
  - Verify section displays

- [ ] **Related Products Display**
  - Check 4-6 products display
  - Verify responsive grid (adjust browser width)
  - Check product images load
  - Verify product names, prices, ratings

- [ ] **Product Cards**
  - Hover over card - verify lift effect
  - Check "Quick View" badge appears on hover
  - Verify star ratings display correctly
  - Check stock status labels

- [ ] **Product Actions**
  - Click "Add to Cart" button
  - Verify product added to cart
  - Check success toast
  - Verify cart count updates

- [ ] **Wishlist from Related Products**
  - Click wishlist heart icon
  - Verify product added to wishlist
  - Check wishlist count updates

- [ ] **Navigate to Related Product**
  - Click product card
  - Verify navigates to correct product detail page
  - Check URL has correct product ID

### Algorithm Testing

- [ ] **Same Category Products**
  - View product in category "Audio"
  - Check related products are also "Audio"

- [ ] **Price Range Products**
  - View $100 product
  - Check related products within ±30% price ($70-$130)

- [ ] **Exclude Current Product**
  - Verify current product not in related list

### Edge Cases

- [ ] **No Related Products**
  - View product with unique category
  - Verify "No related products" message
  - Check empty state displays

- [ ] **Single Related Product**
  - Verify grid adjusts (no empty space)
  - Check responsive layout

- [ ] **Out of Stock Related Product**
  - Verify "Out of Stock" label
  - Check "Add to Cart" disabled

---

## 4. Routing & Navigation Testing

### Page Navigation

- [ ] **Wishlist Page**
  - Navigate to `/wishlist.html`
  - Verify page loads correctly
  - Check breadcrumb navigation
  - Verify back to home works

- [ ] **Product Detail with Reviews**
  - Navigate to `/product.html?id=1`
  - Scroll to reviews section
  - Verify section loads
  - Check no JavaScript errors (Console)

- [ ] **Direct URL Access**
  - Paste `/wishlist.html` in address bar
  - Verify page loads (no redirect)
  - Check authenticated user sees backend data

### Browser Navigation

- [ ] **Back Button**
  - Navigate: Home → Product → Wishlist
  - Click back button
  - Verify returns to product page
  - Click back again - verify returns to home

- [ ] **Forward Button**
  - After going back, click forward
  - Verify navigates forward correctly

- [ ] **Refresh Page**
  - On wishlist page, refresh (F5)
  - Verify data persists
  - Check no errors

---

## 5. Responsive Design Testing

### Mobile (320px - 767px)

- [ ] **Wishlist Page**
  - Resize browser to 375px width
  - Verify single column layout
  - Check images scale correctly
  - Verify buttons stack vertically
  - Check touch targets ≥44px

- [ ] **Product Reviews**
  - Verify review cards stack
  - Check star rating input usable
  - Verify form fields full width
  - Check submit button accessible

- [ ] **Related Products**
  - Verify 2-column grid on mobile
  - Check product cards fit screen
  - Verify no horizontal scroll

### Tablet (768px - 1023px)

- [ ] **Wishlist Page**
  - Verify 2-column layout option
  - Check spacing looks good

- [ ] **Reviews**
  - Verify review form layout
  - Check stats display correctly

- [ ] **Related Products**
  - Verify 2-3 column grid

### Desktop (1024px+)

- [ ] **Wishlist Page**
  - Verify single column list layout
  - Check images aligned left
  - Verify actions aligned right

- [ ] **Reviews**
  - Verify 2-column stats layout
  - Check form full width or centered

- [ ] **Related Products**
  - Verify 3-4 column grid
  - Check max-width container

---

## 6. Internationalization (i18n) Testing

### Language Switching

- [ ] **English to French**
  - Click language switcher
  - Select "Français"
  - Verify page reloads
  - Check all text translated

- [ ] **French to English**
  - Switch back to English
  - Verify all text returns to English

### Feature Text Translation

- [ ] **Wishlist**
  - Verify "My Wishlist" → "Ma Liste de Souhaits"
  - Check "Add to Wishlist" → "Ajouter à la Liste"
  - Verify "Empty wishlist" → "Votre liste de souhaits est vide"

- [ ] **Reviews**
  - Verify "Write a Review" → "Écrire un Avis"
  - Check "Your Rating" → "Votre Note"
  - Verify "Verified Purchase" → "Achat Vérifié"

- [ ] **Related Products**
  - Verify "You May Also Like" → "Vous Aimerez Aussi"

---

## 7. Performance Testing

### Load Times

- [ ] **Wishlist Page**
  - Clear cache, reload page
  - Check load time <2 seconds
  - Verify no layout shift (CLS)

- [ ] **Product Detail with Reviews**
  - Load product page
  - Check reviews load within 1 second
  - Verify related products lazy load

### Network Throttling

- [ ] **Slow 3G**
  - Enable slow 3G in DevTools
  - Navigate pages
  - Verify loading indicators display
  - Check no errors

- [ ] **Offline Mode**
  - Enable offline mode
  - Try to add to wishlist
  - Verify queued for later (guest)
  - Check offline indicator displays

---

## 8. Accessibility (a11y) Testing

### Keyboard Navigation

- [ ] **Tab Order**
  - Tab through wishlist page
  - Verify logical order
  - Check focus visible

- [ ] **Star Rating Input**
  - Tab to star rating
  - Use arrow keys or Space to select
  - Verify screen reader announces rating

- [ ] **Form Fields**
  - Tab through review form
  - Verify all fields accessible
  - Check submit with Enter key

### Screen Reader (NVDA/JAWS/VoiceOver)

- [ ] **Wishlist Button**
  - Verify announces "Add to Wishlist" or "In Wishlist"
  - Check state change announced

- [ ] **Review Form**
  - Verify labels read correctly
  - Check error messages announced
  - Verify success confirmation

- [ ] **Related Products**
  - Check product names announced
  - Verify prices announced
  - Check button labels clear

### Color Contrast

- [ ] **WCAG AA Compliance**
  - Use WebAIM Contrast Checker
  - Verify text contrast ≥4.5:1
  - Check button contrast ≥3:1

---

## 9. Security Testing

### Authentication

- [ ] **Unauthorized Review Submission**
  - Logout
  - Try to POST to `/api/products/1/reviews/`
  - Verify 401 Unauthorized error

- [ ] **Wishlist Access**
  - Logout
  - Try to GET `/api/wishlist/`
  - Verify 401 or guest data only

### Input Validation

- [ ] **XSS Prevention**
  - Submit review with `<script>alert('XSS')</script>`
  - Verify script tags escaped
  - Check no alert popup

- [ ] **SQL Injection**
  - Try product ID: `1 OR 1=1`
  - Verify proper error handling
  - Check no database exposure

- [ ] **CSRF Protection**
  - Check CSRF tokens present
  - Verify Django CSRF middleware active

---

## 10. Error Handling Testing

### API Errors

- [ ] **Network Failure**
  - Disconnect internet
  - Try to add to wishlist
  - Verify user-friendly error message
  - Check offline queue (guest users)

- [ ] **404 Not Found**
  - Try to load product with ID 99999
  - Verify "Product not found" message
  - Check no blank page

- [ ] **500 Server Error**
  - Simulate backend crash
  - Verify error boundary catches
  - Check fallback UI displays

### Form Errors

- [ ] **Validation Errors**
  - Submit empty form
  - Verify inline error messages
  - Check fields highlighted red

- [ ] **Backend Validation**
  - Submit invalid data to API
  - Verify backend errors displayed
  - Check user understands issue

---

## 11. Browser Compatibility

### Desktop Browsers

- [ ] **Chrome** (latest)
  - Test all features
  - Check no console errors

- [ ] **Firefox** (latest)
  - Test all features
  - Verify CSS Grid support

- [ ] **Safari** (latest)
  - Test all features
  - Check webkit prefixes work

- [ ] **Edge** (latest)
  - Test all features
  - Verify Chromium compatibility

### Mobile Browsers

- [ ] **Chrome Mobile**
  - Test on Android device
  - Verify touch interactions

- [ ] **Safari iOS**
  - Test on iPhone
  - Check swipe gestures

---

## 12. Database Testing

### Data Integrity

- [ ] **Wishlist Constraints**
  - Try to add duplicate product
  - Verify unique constraint enforced

- [ ] **Review Constraints**
  - Try to submit 2 reviews for same product
  - Verify unique constraint enforced

- [ ] **Orphaned Records**
  - Delete user with wishlist
  - Verify cascade delete works
  - Check no orphaned wishlist items

### Performance

- [ ] **Large Datasets**
  - Create 100+ wishlist items
  - Verify load time acceptable
  - Check pagination considered

- [ ] **Concurrent Users**
  - Simulate 10+ users adding to wishlist
  - Verify no race conditions
  - Check database locks handled

---

## Test Summary

**Total Test Cases:** 150+

**Categories:**
- Wishlist: 25 tests
- Reviews: 30 tests
- Related Products: 15 tests
- Routing: 10 tests
- Responsive: 15 tests
- i18n: 10 tests
- Performance: 8 tests
- Accessibility: 15 tests
- Security: 10 tests
- Error Handling: 8 tests
- Browser Compat: 8 tests
- Database: 8 tests

**Recommended Tools:**
- Chrome DevTools (Network, Console, Performance)
- React DevTools (if applicable)
- WAVE Accessibility Tool
- Lighthouse (Performance, Accessibility, SEO)
- Postman (API testing)
- Jest (Unit tests)
- Playwright (E2E tests)

---

## Bug Report Template

```markdown
**Bug Title:** [Short description]

**Priority:** High / Medium / Low

**Steps to Reproduce:**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Screenshots:**
[Attach if applicable]

**Environment:**
- Browser: Chrome 118.0
- OS: Windows 11
- Device: Desktop
- User: Authenticated / Guest

**Console Errors:**
```
[Paste any console errors]
```

**Additional Notes:**
[Any other relevant information]
```

---

**Testing Status:** ⏳ Pending

**Next Steps:**
1. Complete manual testing checklist
2. Fix identified bugs
3. Run automated tests (if available)
4. Perform load testing
5. Get stakeholder approval
6. Deploy to production

---

**Document Version:** 1.0
**Last Updated:** October 14, 2025
