# API Documentation

**Base URL:** `http://localhost:8000/api`

**Authentication:** JWT bearer token in `Authorization` header

```
Authorization: Bearer <access_token>
```

**Token Endpoints:**
- Issue: `POST /api/token/`
- Refresh: `POST /api/token/refresh/`

## Wishlist

### List wishlist items
- **Method / Path:** `GET /api/wishlist/`
- **Auth:** Required
- **Description:** Returns the signed-in user’s wishlist, lazily creating the list on first use.

**Sample response**
```json
{
  "id": 1,
  "items": [
    {
      "id": 5,
      "product": {
        "id": 10,
        "name": "Shure SM58 Microphone",
        "price": "99.00",
        "image": "/media/products/sm58.jpg",
        "stock_quantity": 15,
        "brand": "Shure",
        "category": "Audio"
      },
      "added_at": "2025-10-14T10:00:00Z"
    }
  ]
}
```

**Status codes**
- `200 OK` — wishlist returned (empty list if nothing saved)
- `401 Unauthorized`
- `404 Not Found` — wishlist has not been initialized

### Add a product
- **Method / Path:** `POST /api/wishlist/`
- **Auth:** Required
- **Body:**
  ```json
  { "product_id": 10 }
  ```
- **Notes:** Creating an item implicitly creates the wishlist if needed.

**Responses**
- `201 Created` with the new wishlist item payload
- `400 Bad Request` when the product is missing or already present
- `401 Unauthorized`
- `404 Not Found` if the product does not exist

### Remove an item
- **Method / Path:** `DELETE /api/wishlist/`
- **Auth:** Required
- **Body:**
  ```json
  { "item_id": 5 }
  ```

**Responses**
- `200 OK` with `{ "message": "Item removed" }`
- `400 Bad Request` when the payload is invalid
- `401 Unauthorized`
- `404 Not Found` when the item is not part of the user’s wishlist

### Sync guest wishlist
- **Method / Path:** `POST /api/wishlist/sync/`
- **Auth:** Required
- **Body:**
  ```json
  {
    "items": [
      { "product_id": 10 },
      { "product_id": 15 }
    ]
  }
  ```

**Responses**
- `200 OK` with counts for added, duplicate, and error entries
- `400 Bad Request` for malformed payloads
- `401 Unauthorized`

## Product Reviews

### List reviews
- **Method / Path:** `GET /api/products/{product_id}/reviews/`
- **Auth:** Not required
- **Query params:** `sort=recent|rating_high|rating_low|verified`

Returns an array of review objects. Empty array when no reviews exist. `404` when the product is missing.

### Create a review
- **Method / Path:** `POST /api/products/{product_id}/reviews/`
- **Auth:** Required
- **Body:**
  ```json
  {
    "rating": 5,
    "title": "Excellent microphone",
    "comment": "Very clear sound and reliable build."
  }
  ```
- **Validation:** rating is 1–5, title ≤ 200 chars, comment ≤ 2000 chars. A user may submit only one review per product.

**Responses**
- `201 Created` with the persisted review
- `400 Bad Request` for validation failures or duplicate reviews
- `401 Unauthorized`
- `404 Not Found` when the product id is invalid

Duplicate example:
```json
{ "non_field_errors": ["You have already reviewed this product."] }
```

### Review statistics
- **Method / Path:** `GET /api/products/{product_id}/reviews/stats/`
- **Auth:** Not required
- **Description:** Aggregates average rating, total reviews, and counts per rating bucket.

`average_rating` is `null` and `total_reviews` is `0` when no reviews exist. `404` if the product id is invalid.

## Related Products

- **Method / Path:** `GET /api/products/{product_id}/related/`
- **Auth:** Not required
- **Query params:** `limit` (default 6, maximum 12)
- **Logic:** Matches by category, constrains price within ±30 %, excludes the source product, and orders by relevance score.

Returns up to `limit` related products or an empty array. `404` when the product id is invalid.

## Error Model

- Generic errors:
  ```json
  { "detail": "Message" }
  ```
- Validation errors:
  ```json
  { "field": ["Message"] }
  ```

Common statuses:
- `400 Bad Request`
- `401 Unauthorized`
- `403 Forbidden`
- `404 Not Found`
- `500 Internal Server Error`

## Pagination and Rate Limiting

Current endpoints return full collections. For large datasets, adopt DRF pagination with `count`, `next`, `previous`, and `results`. Rate limiting is not yet enforced; recommended ceilings are 5 review submissions per user per hour and 100 wishlist operations per user per hour.

## CORS

Local development allows requests from:
- `http://localhost:3000`
- `http://localhost:5173`
- `http://127.0.0.1:5500`

Update `CORS_ALLOWED_ORIGINS` in `project/settings.py` for additional hosts.

## Example JavaScript Usage

```javascript
async function addToWishlist(productId) {
  const token = localStorage.getItem('accessToken');
  const response = await fetch('http://localhost:8000/api/wishlist/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ product_id: productId })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Unable to add to wishlist');
  }
  return response.json();
}
```

For additional examples see `frontend/js/apiService.js`.

## Testing with Postman

1. Configure variables:
   - `base_url = http://localhost:8000`
   - `access_token` from `/api/token/`
2. Create requests using environment variables, e.g. `POST {{base_url}}/api/wishlist/` with the `Authorization: Bearer {{access_token}}` header.

## Versioning

Current: `/api/` (implicit v1). Future releases will use explicit `/api/v1/` namespace.

Planned features: review editing, wishlist sharing, pagination, rate limiting. See `ROADMAP.md`.

**Version:** 1.1 | **Updated:** November 12, 2025
