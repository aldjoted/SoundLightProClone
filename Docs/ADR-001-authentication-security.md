# ADR-001: Authentication Security Architecture

**Status:** Adopted

## Context

We require a highly secure method for managing user authentication in our full-stack application, which consists of a Django backend and a vanilla JavaScript frontend. The primary threats to mitigate are Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF).

## Decision

We implement a token-based authentication model using HttpOnly cookies for refresh tokens and `sessionStorage` for access tokens. This pattern aligns with current industry best practices.

### Backend: Secure Refresh Token Cookie (`settings.py`)

- **Refresh tokens (`refreshToken`):** Long-lived tokens (for example, 7 days) used solely to obtain new access tokens.
- **Storage:** Issued by the backend as secure, HttpOnly cookies.
- **Key configuration:**
  - `AUTH_COOKIE_HTTP_ONLY = True`: Prevents JavaScript from accessing the cookie, neutralizing XSS attacks that attempt to steal it.
  - `AUTH_COOKIE_SECURE = True` (production): Ensures cookies are only sent over HTTPS.
  - `AUTH_COOKIE_SAMESITE = "Strict"`: Provides built-in CSRF protection by blocking the browser from sending the cookie with cross-origin requests.
  - `BLACKLIST_AFTER_ROTATION = True`: Invalidates refresh tokens immediately after they are used, preventing reuse if compromised.

### Frontend: In-Memory Access Token (`apiService.js`)

- **Access tokens:** Short-lived (for example, 15 minutes) and used to authenticate API requests.
- **Storage:** Held in JavaScript memory and mirrored to `sessionStorage`, which is cleared when the tab closes, reducing exposure time.
- **Mechanism:**
  - `apiFetch` sends `credentials: 'include'` on all requests so the browser automatically attaches the HttpOnly `refreshToken` cookie when calling `/api/token/refresh/`.
  - The `tokenManager` in `apiService.js` manages only the short-lived access token and never interacts with the refresh token.
  - When an API request returns `401 Unauthorized`, `apiService` calls the refresh endpoint. The browser includes the cookie automatically, the backend validates it, and a new access token is issued.

## Consequences

- **High security:** Defends against XSS (JavaScript cannot steal the HttpOnly refresh token) and CSRF (the `SameSite=Strict` cookie is not sent by other sites).
- **Strict maintenance:**
  - Do **not** change `AUTH_COOKIE_HTTP_ONLY` to `False`.
  - Do **not** store the refresh token in `localStorage` or `sessionStorage` on the frontend.
  - Do **not** remove `credentials: 'include'` from `apiFetch` in `apiService.js`.
