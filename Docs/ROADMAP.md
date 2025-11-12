# Product Roadmap

Planned features and improvements prioritized by impact and effort.

## Priority 0 (Critical - Next Release)

**P0.1 - Token Security Migration**
- Migrate refresh tokens from localStorage to httpOnly cookies
- Eliminates XSS vulnerability
- Backend: Cookie handling, CORS updates
- Frontend: Remove localStorage token logic
- Effort: 2-3 days

**P0.2 - Automated Testing**
- Unit tests for backend (Django test suite)
- Integration tests for API endpoints
- Frontend tests (Vitest + Playwright)
- CI/CD pipeline integration
- Effort: 5-7 days

**P0.3 - Order Management System**
- Order tracking and status updates
- Order history for customers
- Admin order management interface
- Email notifications
- Effort: 7-10 days

## Priority 1 (High Value - This Quarter)

**P1.1 - Product Comparison**
- Side-by-side specification comparison
- Up to 4 products simultaneously
- Spec highlighting (differences emphasized)
- Integration with SmartCache
- Effort: 4-6 days

**P1.2 - Stock Availability Notifications**
- Email alerts for out-of-stock products
- Notification queue system
- Automatic email triggers on restock
- User preference management
- Effort: 3-5 days

**P1.3 - Advanced Filtering**
- Multi-select filters (brand, category, price range)
- Specification-based filters (power, channels, weight)
- Filter persistence in URL params
- Real-time result count updates
- Effort: 5-7 days

**P1.4 - Customer Dashboard Enhancement**
- Order history with detailed tracking
- Review management (edit/delete)
- Wishlist integration
- Shipping address management
- Payment method management
- Effort: Currently 70% complete, 2-3 days remaining

**P1.5 - Brand Partnership Section**
- Brand logo gallery on homepage
- Dedicated brand pages
- Products filtered by brand
- Brand descriptions and history
- SEO optimization for brand pages
- Effort: 3-5 days

## Priority 2 (Medium Value - Next Quarter)

**P2.1 - Live Chat Support**
- Real-time customer support (WebSockets)
- Fallback to chatbot when offline
- Chat history persistence
- Admin chat interface
- Effort: 7-10 days

**P2.2 - Cart Abandonment Recovery**
- Email reminders for abandoned carts
- Timestamp tracking
- Automated email campaigns
- Analytics dashboard
- Effort: 4-6 days

**P2.3 - Product Quick View**
- Modal overlay on product grid
- Add to cart without page navigation
- Image gallery preview
- Reuses existing modal system
- Effort: 2-3 days

**P2.4 - Image Gallery Enhancement**
- Multiple product images per item
- Zoom functionality
- 360° product views (optional)
- Lightbox navigation
- Effort: 3-4 days

**P2.5 - Search Autocomplete Enhancement**
- Product suggestions in dropdown
- Category and brand suggestions
- Recent search history
- ML-based ranking
- Effort: 4-6 days

## Priority 3 (Nice to Have - Future)

**P3.1 - Multi-Currency Support**
- Currency conversion API integration
- Price display in local currency
- Localization for Cameroon (XAF) and international
- Exchange rate updates
- Effort: 7-10 days

**P3.2 - Analytics Dashboard**
- Purchase history visualization
- Spending reports
- Favorite categories
- Customer insights
- Effort: 5-7 days

**P3.3 - Loyalty Program**
- Points system for purchases
- Rewards tracking
- Referral program
- Tier-based benefits
- Effort: 10-14 days

**P3.4 - Mobile App (PWA Enhancement)**
- Offline cart synchronization
- Push notifications
- App-like experience
- Install prompts
- Effort: 7-10 days

**P3.5 - Real-time Inventory Sync**
- WebSocket updates for stock changes
- Live stock indicators
- Automatic cart validation
- Low stock warnings
- Effort: 5-7 days

## Technical Debt

**TD.1 - Frontend Refactoring**
- Migrate remaining `innerHTML` to `createElement()`
- Module lazy loading implementation
- Code splitting optimization
- Effort: 3-5 days

**TD.2 - API Versioning**
- Explicit `/api/v1/` namespace
- Versioning strategy documentation
- Deprecation policy
- Effort: 2-3 days

**TD.3 - Documentation Consolidation**
- Remove redundant documentation
- Update outdated sections
- Ensure consistency across files
- Effort: 1-2 days (completed in this update)

**TD.4 - Performance Monitoring**
- Sentry integration for error tracking
- Performance metrics collection
- External metrics collector
- Dashboard for monitoring
- Effort: 3-4 days

## Deferred Features

Features evaluated but postponed due to complexity or unclear ROI:

- WebAssembly for heavy computations
- GraphQL migration
- Blockchain-based payments
- AR product visualization
- Voice search integration

## Version Targets

**v2.0.0** - P0 items complete  
**v2.1.0** - P1 items complete  
**v2.2.0** - P2 items complete  
**v3.0.0** - Major architecture updates, P3 items

## Contributing to Roadmap

Suggest features via GitHub Issues with label `enhancement`. Include:
- Problem statement
- Proposed solution
- Estimated user impact
- Technical complexity assessment

Last Updated: November 12, 2025
