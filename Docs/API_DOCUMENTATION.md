# API Documentation

**Base URL:** `http://localhost:8000/api`

**Authentication Model:** Access tokens are supplied via the `Authorization: Bearer <access_token>` header. Refresh tokens are rotated and stored in an httpOnly cookie named `refreshToken` scoped to `/api/`. Endpoints inherit `IsAuthenticated` unless explicitly marked as public.

**Standard Headers**
- `Authorization: Bearer <access_token>` (omit on anonymous endpoints)
- `Content-Type: application/json`
- `Accept-Language: en` or `fr` (optional; affects localized fields on products, categories, and brands)

**Rate Limiting**
- `POST /api/token/`: 5 requests/minute/IP
- `POST /api/verify-login/`: 5 requests/minute/IP
- `POST /api/token/refresh/`: 10 requests/minute/IP
- `POST /api/register/`: 3 requests/hour/IP
- `POST /api/chatbot/`: 10 requests/hour/IP

`429 Too Many Requests`:
```json
{
  "error": "Too many requests",
  "detail": "You have exceeded the rate limit. Please try again later.",
  "retry_after": "60"
}
```

**CORS Origins:** `http://localhost:3000`, `http://localhost:5500`, `http://127.0.0.1:5500` (credentials allowed).

**Pagination**
- Views use DRF page-number pagination with `PAGE_SIZE = 20` unless `pagination_class = None`.
- Product reviews use a custom paginator with default `page_size = 10` and optional `?page_size=` up to 50.
- Paginated responses follow:
```json
{
  "count": 57,
  "next": "http://localhost:8000/api/resource/?page=2",
  "previous": null,
  "results": [ ... ]
}
```

**Error Responses**
- Serializer validation failures are returned directly (e.g., `{ "field": ["Message"] }`, `{ "non_field_errors": ["Message"] }`).
- Unhandled exceptions use the global handler (`{ "error": "Message", "status_code": <code> }` or `{ "errors": { ... }, "status_code": <code> }`).
- Business logic branches may return `{ "detail": "Message" }`.

---

## Authentication & User Endpoints

### `POST /api/token/` — Start login (rate limited)
- **Auth:** Not required
- **Description:** Validates username/email and password. Sends a 6-digit verification code by email; does not issue tokens.
- **Request body**
```json
{
  "identifier": "jane@example.com",
  "password": "CorrectHorseBatteryStaple!"
}
```
`identifier` may also be supplied as `username` or `email` keys.

- **Success 200**
```json
{
  "detail": "Verification code sent to your email.",
  "email": "jane@example.com",
  "requires_verification": true
}
```
- **Errors**
  - `400`: Missing credentials → `{"detail": "Username or email and password are required."}`
  - `401`: Invalid credentials → `{"detail": "Invalid credentials."}`
  - `429`: Rate limit exceeded (see above)

### `POST /api/verify-login/` — Complete login
- **Auth:** Not required
- **Description:** Verifies the email + code and returns a JWT access token. Sets/rotates the `refreshToken` cookie.
- **Request body**
```json
{
  "email": "jane@example.com",
  "code": "123456"
}
```
- **Success 200**
```json
{
  "access": "<access_token>",
  "user": {
    "id": 7,
    "username": "jane",
    "email": "jane@example.com",
    "first_name": "Jane",
    "last_name": "Doe"
  }
}
```
The response sets `refreshToken` (httpOnly, 7 days, `SameSite=Strict`, path `/api/`).

- **Errors**
  - `400`: Missing email or code → `{"detail": "Email and verification code are required."}`
  - `401`: Invalid or expired code → `{"detail": "Invalid verification code."}` or `{"detail": "Verification code has expired. Please login again."}`
  - `429`: Rate limit exceeded

### `POST /api/token/refresh/` — Refresh access token
- **Auth:** Requires `refreshToken` cookie
- **Request body:** Empty
- **Success 200**
```json
{ "access": "<new_access_token>" }
```
- **Errors**
  - `401`: Missing/invalid cookie → `{"error": "Refresh token not found in cookies", "status_code": 401}`
  - `401`: Expired/invalid token → `{"error": "Token is invalid or expired", "status_code": 401}`
  - `429`: Rate limit exceeded

### `POST /api/logout/`
- **Auth:** Optional
- **Description:** Blacklists the refresh token (if present) and clears the cookie.
- **Success 200**
```json
{ "detail": "Successfully logged out" }
```

### `POST /api/register/` — Create account
- **Auth:** Not required
- **Description:** Creates a user. Enforces username rules, unique email, and password strength.
- **Request body**
```json
{
  "username": "jane_d",
  "password": "StrongPass123!",
  "password2": "StrongPass123!",
  "email": "jane@example.com",
  "first_name": "Jane",
  "last_name": "Doe"
}
```
- **Success 201**
```json
{
  "username": "jane_d",
  "email": "jane@example.com",
  "first_name": "Jane",
  "last_name": "Doe"
}
```
- **Errors**
  - `400`: Validation issues (reserved username, duplicate email, password mismatch)
  - `429`: Rate limit exceeded

### `GET /api/user/` — Current user
- **Auth:** Required
- **Success 200**
```json
{
  "id": 7,
  "username": "jane_d",
  "email": "jane@example.com",
  "first_name": "Jane",
  "last_name": "Doe"
}
```

---

## Product Catalog

### `GET /api/products/`
- **Auth:** Not required
- **Description:** Lists available products with optional search and filtering.
- **Query parameters**
  - `search`: full-text search in `name` and `description`
  - `brand`: brand slug
  - `category`: category slug (includes descendants)
  - `page`: page number
- **Success 200**
```json
{
  "count": 57,
  "next": "http://localhost:8000/api/products/?page=2",
  "previous": null,
  "results": [
    {
      "id": 10,
      "category": "Microphones",
      "brand": {
        "name": "Shure",
        "slug": "shure",
        "image": "http://localhost:8000/media/brands/shure.png",
        "description": "Legendary audio engineering..."
      },
      "name": "Shure SM58 Microphone",
      "description": "Vocal microphone for live performances.",
      "price": "99.00",
      "images": [
        {
          "image": "http://localhost:8000/media/products/sm58.jpg",
          "alt_text": "Shure SM58"
        }
      ],
      "stock": 15,
      "available": true,
      "avg_rating": 4.8,
      "review_count": 23
    }
  ]
}
```

### `GET /api/products/<id>/`
- **Auth:** Not required
- **Description:** Retrieves a single available product. Raises 404 if unavailable.
- **Success 200:** Same shape as an item in `results`.

### Product object schema
- `id` (int)
- `category` (string — localized name)
- `brand` (object with `name`, `slug`, `image`, `description`)
- `name`, `description` (localized)
- `price` (string decimal)
- `images` (array of `{ "image": absolute URL, "alt_text": string }`)
- `stock` (int)
- `available` (bool)
- `avg_rating` (float or `null`)
- `review_count` (int)

### `GET /api/categories/`
- **Auth:** Not required
- **Description:** Returns categories with nested children. `name` respects `Accept-Language`.
- **Success 200**
```json
[
  {
    "id": 1,
    "name": "Pro Audio",
    "slug": "pro-audio",
    "parent": null,
    "children": [
      {
        "id": 2,
        "name": "Microphones",
        "slug": "microphones",
        "parent": 1,
        "children": []
      }
    ]
  }
]
```

### `GET /api/brands/`
- **Auth:** Not required
- **Description:** Lists brands that have at least one available product.
- **Success 200**
```json
[
  {
    "id": 3,
    "name": "Shure",
    "slug": "shure",
    "logo": "http://localhost:8000/media/brands/shure.png"
  }
]
```

---

## Orders

### `GET /api/orders/`
- **Auth:** Required
- **Description:** Returns the authenticated user's orders (newest first).
- **Success 200**
```json
[
  {
    "id": 41,
    "user": {
      "id": 7,
      "username": "jane_d",
      "email": "jane@example.com",
      "first_name": "Jane",
      "last_name": "Doe"
    },
    "first_name": "Jane",
    "last_name": "Doe",
    "email": "jane@example.com",
    "address": "1451 Republic Blvd",
    "postal_code": "75001",
    "city": "Douala",
    "created_at": "2025-02-12T10:15:11Z",
    "paid": true,
    "stripe_id": "ch_3Pabc123",
    "total_paid": "199.00",
    "items": [
      {
        "product": {
          "id": 10,
          "category": "Microphones",
          "brand": {
            "name": "Shure",
            "slug": "shure",
            "image": "http://localhost:8000/media/brands/shure.png",
            "description": "Legendary audio engineering..."
          },
          "name": "Shure SM58 Microphone",
          "description": "Vocal microphone for live performances.",
          "price": "99.00",
          "images": [
            {
              "image": "http://localhost:8000/media/products/sm58.jpg",
              "alt_text": "Shure SM58"
            }
          ],
          "stock": 15,
          "available": true,
          "avg_rating": 4.8,
          "review_count": 23
        },
        "price": "99.50",
        "quantity": 2
      }
    ]
  }
]
```

### `POST /api/orders/`
- **Auth:** Required
- **Description:** Creates an order, reserves inventory, charges Stripe, and returns the order.
- **Request body**
```json
{
  "items": [
    { "id": 10, "quantity": 2 },
    { "id": 15, "quantity": 1 }
  ],
  "shipping_info": {
    "first_name": "Jane",
    "last_name": "Doe",
    "email": "jane@example.com",
    "address": "1451 Republic Blvd",
    "postal_code": "75001",
    "city": "Douala"
  },
  "stripe_token": "tok_visa"
}
```
- **Success 201:** Same schema as `GET /api/orders/` (with updated totals).
- **Errors**
  - `400`: Empty cart, invalid quantities, insufficient stock, Stripe failures → `{ "error": "...", "status_code": 400 }`
  - `500`: Unexpected errors → `{ "error": "An unexpected error occurred. Please try again later.", "status_code": 500 }`

---

## Wishlist

### `GET /api/wishlist/`
- **Auth:** Required
- **Description:** Returns the user's wishlist; created automatically if missing.
- **Success 200**
```json
{
  "id": 5,
  "user": 7,
  "items": [
    {
      "id": 12,
      "product": {
        "id": 10,
        "category": "Microphones",
        "brand": {
          "name": "Shure",
          "slug": "shure",
          "image": "http://localhost:8000/media/brands/shure.png",
          "description": "Legendary audio engineering..."
        },
        "name": "Shure SM58 Microphone",
        "description": "Vocal microphone for live performances.",
        "price": "99.00",
        "images": [
          {
            "image": "http://localhost:8000/media/products/sm58.jpg",
            "alt_text": "Shure SM58"
          }
        ],
        "stock": 15,
        "available": true,
        "avg_rating": 4.8,
        "review_count": 23
      },
      "added_at": "2025-10-14T10:00:00Z"
    }
  ],
  "item_count": 1,
  "created_at": "2025-10-14T09:55:00Z",
  "updated_at": "2025-10-14T10:00:00Z"
}
```

### `POST /api/wishlist/`
- **Auth:** Required
- **Description:** Adds a product to the wishlist.
- **Request body**
```json
{ "product_id": 10 }
```
- **Success 201**
```json
{
  "id": 12,
  "product": {
    "id": 10,
    "category": "Microphones",
    "brand": {
      "name": "Shure",
      "slug": "shure",
      "image": "http://localhost:8000/media/brands/shure.png",
      "description": "Legendary audio engineering..."
    },
    "name": "Shure SM58 Microphone",
    "description": "Vocal microphone for live performances.",
    "price": "99.00",
    "images": [
      {
        "image": "http://localhost:8000/media/products/sm58.jpg",
        "alt_text": "Shure SM58"
      }
    ],
    "stock": 15,
    "available": true,
    "avg_rating": 4.8,
    "review_count": 23
  },
  "added_at": "2025-10-14T10:00:00Z"
}
```
- **Errors**
  - `400`: Duplicate entry → `{"detail": "Product is already in your wishlist."}`
  - `400`: Invalid product ID → `{"product_id": ["Product not found or not available."]}`
  - `404`: Product not available → `{"detail": "Product not found or not available."}`

### `DELETE /api/wishlist/`
- **Auth:** Required
- **Description:** Removes a product from the wishlist.
- **Request body**
```json
{ "product_id": 10 }
```
- **Success 200**
```json
{ "detail": "Product removed from wishlist." }
```
- **Errors**
  - `400`: Missing `product_id`
  - `404`: Wishlist missing or product not present

### `POST /api/wishlist/sync/`
- **Auth:** Required
- **Description:** Merges guest product IDs into the user's wishlist (ignores duplicates and unavailable items).
- **Request body**
```json
{ "product_ids": [10, 15, 18] }
```
- **Success 200**
```json
{
  "detail": "2 items synced to your wishlist.",
  "wishlist": {
    "id": 5,
    "user": 7,
    "items": [ ... ],
    "item_count": 4,
    "created_at": "2025-10-14T09:55:00Z",
    "updated_at": "2025-10-14T10:05:00Z"
  }
}
```
- **Errors**
  - `400`: Invalid payload type → `{"detail": "product_ids must be an array."}`

---

## Product Reviews

### `GET /api/products/<product_id>/reviews/`
- **Auth:** Optional
- **Description:** Returns approved reviews with pagination.
- **Query parameters**
  - `sort`: `recent` (default), `highest`, `verified`
  - `page`: page number
  - `page_size`: optional, max 50
- **Success 200**
```json
{
  "count": 12,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 77,
      "product": 10,
      "user": {
        "id": 7,
        "username": "jane_d",
        "email": "jane@example.com",
        "first_name": "Jane",
        "last_name": "Doe"
      },
      "user_name": "Jane Doe",
      "rating": 5,
      "title": "Excellent microphone",
      "comment": "Very clear sound and reliable build.",
      "is_verified_purchase": true,
      "is_approved": true,
      "created_at": "2025-10-14T10:00:00Z",
      "updated_at": "2025-10-14T10:00:00Z"
    }
  ]
}
```

### `POST /api/products/<product_id>/reviews/`
- **Auth:** Required
- **Description:** Creates a review; each user can review a product once.
- **Request body**
```json
{
  "rating": 5,
  "title": "Excellent microphone",
  "comment": "Very clear sound and reliable build."
}
```
- **Success 201:** Returns the created review (same fields as above).
- **Errors**
  - `400`: Rating outside 1–5, comment shorter than 10 characters, or duplicate review → `{"non_field_errors": ["You have already reviewed this product. You can only review a product once."]}`
  - `404`: Product not found/available → `{"detail": "Product not found."}`

### `GET /api/products/<product_id>/reviews/stats/`
- **Auth:** Optional
- **Description:** Returns aggregated stats for approved reviews.
- **Success 200**
```json
{
  "average_rating": 4.7,
  "review_count": 12,
  "rating_distribution": {
    "5": 8,
    "4": 3,
    "3": 1,
    "2": 0,
    "1": 0
  }
}
```
When no reviews exist, `average_rating` is `0` and `review_count` is `0`.

---

## Related Products

### `GET /api/products/<product_id>/related/`
- **Auth:** Optional
- **Description:** Returns related products, blending manually curated relations and heuristic matches.
- **Query parameters**
  - `limit`: optional, default 6, maximum 12
- **Success 200:** Array of product objects (see product schema).

---

## Chatbot

### `POST /api/chatbot/`
- **Auth:** Optional
- **Rate limit:** 10 requests/hour/IP
- **Description:** Sends a customer message to the Gemini-powered assistant. Performs product retrieval to enrich responses.
- **Request body**
```json
{ "message": "What wireless microphones do you recommend?" }
```
- **Success 200**
```json
{ "reply": "For wireless vocals, consider the Sennheiser EW 100 G4..." }
```
- **Errors**
  - `400`: Empty message → `{"error": "Message cannot be empty.", "status_code": 400}`
  - `429`: Rate limit exceeded
  - `503`: Chatbot misconfigured or upstream failure → `{"error": "Chatbot is not configured correctly.", "status_code": 503}` or `{"error": "Sorry, I'm having trouble connecting right now. Please try again later.", "status_code": 503}`

---

## Dashboard (Authenticated Tools)

### Profile

#### `GET /api/dashboard/profile/`
- Returns (or creates) the user's profile.
- **Success 200**
```json
{
  "username": "jane_d",
  "email": "jane@example.com",
  "first_name": "Jane",
  "last_name": "Doe",
  "phone": "+237680494949",
  "date_of_birth": "1992-06-01",
  "bio": "Event engineer",
  "avatar": "http://localhost:8000/media/avatars/jane.png",
  "preferred_language": "en",
  "email_notifications": true,
  "newsletter_subscription": false,
  "created_at": "2024-01-01T09:00:00Z",
  "updated_at": "2025-10-14T10:00:00Z"
}
```

#### `PUT /api/dashboard/profile/` and `PATCH /api/dashboard/profile/`
- Update profile fields (`PUT` = full, `PATCH` = partial). `first_name`/`last_name` update the related `User`.
- **Request body (PATCH example)**
```json
{
  "first_name": "Jane",
  "last_name": "Doe",
  "bio": "Audio specialist",
  "preferred_language": "fr"
}
```
- **Success 200:** Updated profile payload.

#### `POST /api/dashboard/profile/password/`
- Changes the user's password.
- **Request body**
```json
{
  "old_password": "CurrentPass1!",
  "new_password": "NewStrongPass2@",
  "confirm_password": "NewStrongPass2@"
}
```
- **Success 200** → `{ "detail": "Password updated successfully." }`

### Shipping Addresses

#### `GET /api/dashboard/addresses/`
- Lists all shipping addresses for the user (newest default first).

#### `POST /api/dashboard/addresses/`
- Creates an address. If no default exists, this address becomes default automatically.
- **Request body**
```json
{
  "label": "Home",
  "first_name": "Jane",
  "last_name": "Doe",
  "company": "",
  "address_line1": "1451 Republic Blvd",
  "address_line2": "",
  "city": "Douala",
  "state": "",
  "postal_code": "75001",
  "country": "Cameroon",
  "phone": "+237680494949",
  "is_default": true
}
```
- **Success 201:** Address payload.

#### `GET /api/dashboard/addresses/<address_id>/`
- Retrieves a single address; returns `{"detail": "Address not found."}` with 404 if missing.

#### `PUT/PATCH /api/dashboard/addresses/<address_id>/`
- Updates the address. Cannot clear the final default address (returns 400).

#### `DELETE /api/dashboard/addresses/<address_id>/`
- Deletes the address. Prevents deletion when it is the only saved address.
- **Success 200** → `{ "detail": "Address deleted successfully." }`

### Payment Methods

#### `GET /api/dashboard/payment-methods/`
- Lists saved payment methods with computed `display_name` and `is_expired`.

#### `POST /api/dashboard/payment-methods/`
- Attaches a Stripe payment method to the user.
- **Request body**
```json
{
  "stripe_payment_method_id": "pm_1Pabc123",
  "is_default": true
}
```
- **Success 201:** Returns the new payment method.
- **Errors:** Stripe failures → `{"detail": "Stripe error: ..."}` (400); unexpected errors → `{"detail": "Error creating payment method: ..."}` (500)

#### `GET /api/dashboard/payment-methods/<pm_id>/`
- Retrieves a payment method; 404 if not found.

#### `PATCH /api/dashboard/payment-methods/<pm_id>/`
- Updates `is_default`. Setting to true clears previous defaults.

#### `DELETE /api/dashboard/payment-methods/<pm_id>/`
- Detaches the method from Stripe and deletes it locally. If the deleted method was default, another method (if present) becomes default.

### Orders (Dashboard)

#### `GET /api/dashboard/orders/`
- Returns enriched order summaries.
- **Query parameters**
  - `status`: `all` (default) or any of `pending`, `pending_payment`, `processing`, `shipped`, `delivered`, `cancelled`, `refunded`
  - `date_from`, `date_to`: `YYYY-MM-DD`
  - `search`: matches order ID, tracking number, or product name
- **Success 200**
```json
[
  {
    "id": 41,
    "first_name": "Jane",
    "last_name": "Doe",
    "email": "jane@example.com",
    "address": "1451 Republic Blvd",
    "postal_code": "75001",
    "city": "Douala",
    "status": "processing",
    "status_display": "Processing",
    "status_class": "status-processing",
    "paid": true,
    "total_paid": "199.00",
    "tracking_number": "SLP-123456",
    "shipping_method": "Standard",
    "estimated_delivery": "2025-02-15",
    "notes": "",
    "created_at": "2025-02-12T10:15:11Z",
    "updated_at": "2025-02-12T10:20:00Z",
    "items": [
      {
        "product_id": 10,
        "product_name": "Shure SM58 Microphone",
        "product_image": "http://localhost:8000/media/products/sm58.jpg",
        "price": "99.50",
        "quantity": 2
      }
    ],
    "item_count": 2,
    "can_cancel": true
  }
]
```

#### `GET /api/dashboard/orders/<order_id>/`
- Returns a single order summary (same fields as list entry).

#### `PATCH /api/dashboard/orders/<order_id>/`
- Allows cancellation while status is `pending`, `pending_payment`, or `processing`.
- **Request body**
```json
{ "action": "cancel" }
```
- **Errors**
  - `400`: `{ "detail": "Order cannot be cancelled at this stage." }`
  - `404`: `{ "detail": "Order not found." }`

### Reviews (Dashboard)

#### `GET /api/dashboard/reviews/`
- Lists all reviews authored by the user (no pagination).

#### `GET /api/dashboard/reviews/<review_id>/`
- Retrieves a single review.

#### `PUT /api/dashboard/reviews/<review_id>/` & `PATCH /api/dashboard/reviews/<review_id>/`
- Updates `rating`, `title`, and/or `comment`.
- **Request body (PATCH example)**
```json
{ "rating": 4, "comment": "Still excellent, but battery life dropped." }
```
- **Errors:** Validation responses mirror `POST /api/products/<product_id>/reviews/`.

#### `DELETE /api/dashboard/reviews/<review_id>/`
- Deletes the review.
- **Success 200** → `{ "detail": "Review deleted successfully." }`

---

## Versioning & Roadmap

- **Current namespace:** `/api/` (implicit v1)
- **Planned:** Move to `/api/v1/`, add review editing on public endpoints, wishlist sharing, and per-user rate limits (see `ROADMAP.md`).
- **Version:** 1.2 · **Updated:** November 12, 2025
