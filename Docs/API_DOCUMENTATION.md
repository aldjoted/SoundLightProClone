# New Features API Documentation

## Base URL
```
http://localhost:8000/api
```

## Authentication
Most endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <access_token>
```

---

## Wishlist Endpoints

### 1. Get User Wishlist
**Endpoint:** `GET /api/wishlist/`

**Authentication:** Required

**Description:** Retrieves the authenticated user's wishlist with all items.

**Response:**
```json
{
  "id": 1,
  "user": 2,
  "created_at": "2025-10-14T10:00:00Z",
  "updated_at": "2025-10-14T12:30:00Z",
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

**Status Codes:**
- `200 OK` - Success
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - User has no wishlist yet

---

### 2. Add Product to Wishlist
**Endpoint:** `POST /api/wishlist/`

**Authentication:** Required

**Description:** Adds a product to the user's wishlist. Creates wishlist if it doesn't exist.

**Request Body:**
```json
{
  "product_id": 10
}
```

**Response:**
```json
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
```

**Status Codes:**
- `201 Created` - Product added successfully
- `400 Bad Request` - Invalid product_id or already in wishlist
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Product doesn't exist

---

### 3. Remove from Wishlist
**Endpoint:** `DELETE /api/wishlist/`

**Authentication:** Required

**Description:** Removes a specific item from the wishlist.

**Request Body:**
```json
{
  "item_id": 5
}
```

**Response:**
```json
{
  "message": "Item removed from wishlist"
}
```

**Status Codes:**
- `200 OK` - Item removed successfully
- `400 Bad Request` - Invalid item_id
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Item not found in user's wishlist

---

### 4. Sync Guest Wishlist
**Endpoint:** `POST /api/wishlist/sync/`

**Authentication:** Required

**Description:** Syncs a guest user's wishlist (from localStorage) to the backend after login.

**Request Body:**
```json
{
  "items": [
    {"product_id": 10},
    {"product_id": 15},
    {"product_id": 20}
  ]
}
```

**Response:**
```json
{
  "added": 3,
  "duplicates": 0,
  "errors": []
}
```

**Status Codes:**
- `200 OK` - Sync completed
- `400 Bad Request` - Invalid request format
- `401 Unauthorized` - Not authenticated

---

## Product Review Endpoints

### 5. List Product Reviews
**Endpoint:** `GET /api/products/{product_id}/reviews/`

**Authentication:** Not required

**Description:** Retrieves all reviews for a specific product with optional sorting.

**Query Parameters:**
- `sort` (optional): `recent` | `rating_high` | `rating_low` | `verified`

**Example:**
```
GET /api/products/10/reviews/?sort=rating_high
```

**Response:**
```json
[
  {
    "id": 25,
    "product": 10,
    "user": "john_doe",
    "rating": 5,
    "title": "Excellent microphone!",
    "comment": "Best mic I've ever used. Crystal clear sound.",
    "is_verified_purchase": true,
    "created_at": "2025-10-10T14:30:00Z",
    "updated_at": "2025-10-10T14:30:00Z"
  },
  {
    "id": 24,
    "product": 10,
    "user": "jane_smith",
    "rating": 4,
    "title": "Great quality",
    "comment": "Very solid build quality. Highly recommend.",
    "is_verified_purchase": false,
    "created_at": "2025-10-08T09:15:00Z",
    "updated_at": "2025-10-08T09:15:00Z"
  }
]
```

**Status Codes:**
- `200 OK` - Success (empty array if no reviews)
- `404 Not Found` - Product doesn't exist

---

### 6. Create Product Review
**Endpoint:** `POST /api/products/{product_id}/reviews/`

**Authentication:** Required

**Description:** Creates a new review for a product. Users can only review each product once.

**Request Body:**
```json
{
  "rating": 5,
  "title": "Excellent microphone!",
  "comment": "Best mic I've ever used. Crystal clear sound quality and very durable build."
}
```

**Validation:**
- `rating`: Required, integer 1-5
- `title`: Required, max 200 characters
- `comment`: Required, max 2000 characters

**Response:**
```json
{
  "id": 25,
  "product": 10,
  "user": "john_doe",
  "rating": 5,
  "title": "Excellent microphone!",
  "comment": "Best mic I've ever used. Crystal clear sound quality and very durable build.",
  "is_verified_purchase": true,
  "created_at": "2025-10-10T14:30:00Z",
  "updated_at": "2025-10-10T14:30:00Z"
}
```

**Status Codes:**
- `201 Created` - Review created successfully
- `400 Bad Request` - Validation error or duplicate review
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Product doesn't exist

**Error Example (Duplicate):**
```json
{
  "non_field_errors": ["You have already reviewed this product."]
}
```

---

### 7. Get Product Review Statistics
**Endpoint:** `GET /api/products/{product_id}/reviews/stats/`

**Authentication:** Not required

**Description:** Retrieves aggregate statistics for a product's reviews.

**Response:**
```json
{
  "average_rating": 4.5,
  "total_reviews": 12,
  "rating_distribution": {
    "5": 6,
    "4": 4,
    "3": 1,
    "2": 1,
    "1": 0
  }
}
```

**Status Codes:**
- `200 OK` - Success
- `404 Not Found` - Product doesn't exist

**Notes:**
- `average_rating` is null if no reviews
- `total_reviews` is 0 if no reviews
- `rating_distribution` shows count for each rating (1-5)

---

## Related Products Endpoint

### 8. Get Related Products
**Endpoint:** `GET /api/products/{product_id}/related/`

**Authentication:** Not required

**Description:** Retrieves related products based on category, price range, and tags.

**Query Parameters:**
- `limit` (optional): Number of products to return (default: 6, max: 12)

**Example:**
```
GET /api/products/10/related/?limit=4
```

**Response:**
```json
[
  {
    "id": 11,
    "name": "Shure SM57 Microphone",
    "slug": "shure-sm57-microphone",
    "price": "89.00",
    "image": "/media/products/sm57.jpg",
    "stock_quantity": 20,
    "brand": {
      "id": 2,
      "name": "Shure"
    },
    "category": {
      "id": 5,
      "name": "Audio",
      "slug": "audio"
    },
    "average_rating": 4.8,
    "review_count": 45
  },
  {
    "id": 12,
    "name": "Audio-Technica AT2020",
    "slug": "audio-technica-at2020",
    "price": "99.00",
    "image": "/media/products/at2020.jpg",
    "stock_quantity": 15,
    "brand": {
      "id": 3,
      "name": "Audio-Technica"
    },
    "category": {
      "id": 5,
      "name": "Audio",
      "slug": "audio"
    },
    "average_rating": 4.6,
    "review_count": 32
  }
]
```

**Status Codes:**
- `200 OK` - Success (empty array if no related products)
- `404 Not Found` - Product doesn't exist

**Algorithm:**
1. Filter by same category
2. Filter by price range (±30% of product price)
3. Exclude current product
4. Order by relevance score
5. Limit to specified number

---

## Error Responses

### Standard Error Format
All error responses follow this format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

Or for validation errors:

```json
{
  "field_name": ["Error message for this field"],
  "another_field": ["Another error message"]
}
```

### Common Error Codes

**400 Bad Request**
```json
{
  "product_id": ["This field is required."]
}
```

**401 Unauthorized**
```json
{
  "detail": "Authentication credentials were not provided."
}
```

**403 Forbidden**
```json
{
  "detail": "You do not have permission to perform this action."
}
```

**404 Not Found**
```json
{
  "detail": "Not found."
}
```

**500 Internal Server Error**
```json
{
  "detail": "An error occurred. Please try again later."
}
```

---

## Rate Limiting

**Not implemented yet.** Consider adding rate limiting for:
- Review submissions: 5 per hour per user
- Wishlist operations: 100 per hour per user
- API calls: 1000 per hour per IP

---

## Pagination

Currently, all endpoints return full result sets. For production with large datasets, implement pagination:

**Recommended:**
```json
{
  "count": 120,
  "next": "http://api.example.com/reviews/?page=2",
  "previous": null,
  "results": [...]
}
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 20, max: 100)

---

## CORS Configuration

Backend is configured to accept requests from:
- `http://localhost:3000` (Vite dev server)
- `http://localhost:5173` (Vite alternative port)
- `http://127.0.0.1:5500` (Live Server)

**Production:** Update `CORS_ALLOWED_ORIGINS` in settings.py

---

## Example Usage (JavaScript)

### Add to Wishlist
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
    throw new Error(error.detail || 'Failed to add to wishlist');
  }
  
  return await response.json();
}
```

### Submit Review
```javascript
async function submitReview(productId, reviewData) {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch(
    `http://localhost:8000/api/products/${productId}/reviews/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(reviewData)
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to submit review');
  }
  
  return await response.json();
}
```

### Get Related Products
```javascript
async function getRelatedProducts(productId, limit = 6) {
  const response = await fetch(
    `http://localhost:8000/api/products/${productId}/related/?limit=${limit}`
  );
  
  if (!response.ok) {
    throw new Error('Failed to load related products');
  }
  
  return await response.json();
}
```

---

## Testing with Postman

### 1. Setup Environment
Create environment with variables:
- `base_url`: `http://localhost:8000`
- `access_token`: (obtain from login)

### 2. Get Access Token
```
POST {{base_url}}/api/token/
Body: {
  "username": "testuser",
  "password": "testpass123"
}
```

Save `access` token to environment.

### 3. Test Wishlist
```
POST {{base_url}}/api/wishlist/
Headers: Authorization: Bearer {{access_token}}
Body: { "product_id": 1 }
```

### 4. Test Reviews
```
POST {{base_url}}/api/products/1/reviews/
Headers: Authorization: Bearer {{access_token}}
Body: {
  "rating": 5,
  "title": "Test Review",
  "comment": "This is a test review from Postman."
}
```

---

## API Versioning

**Current Version:** v1 (implicit in URLs)

**Future:** Consider versioning:
```
/api/v1/wishlist/
/api/v2/wishlist/
```

This allows backward compatibility when making breaking changes.

---

## Changelog

### Version 1.0.0 (October 14, 2025)
- ✅ Added wishlist endpoints (GET, POST, DELETE, sync)
- ✅ Added product review endpoints (list, create, stats)
- ✅ Added related products endpoint
- ✅ JWT authentication integration
- ✅ Duplicate review prevention
- ✅ Verified purchase detection

### Future Enhancements
- [ ] Review update/delete endpoints
- [ ] Review helpful votes (thumbs up/down)
- [ ] Review images upload
- [ ] Wishlist sharing via public URL
- [ ] Advanced filtering for reviews
- [ ] Pagination for large result sets
- [ ] Rate limiting
- [ ] API versioning
- [ ] GraphQL alternative

---

**Document Version:** 1.0
**Last Updated:** October 14, 2025
**Contact:** See CONTRIBUTING.md for questions
