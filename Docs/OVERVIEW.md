# Project Overview

## Problem Statement

Professional audio and lighting dealers need an e-commerce platform with technical product discovery, AI-assisted customer support, and integrated payment processing.

## Solution

Full-stack e-commerce application combining Django REST backend with vanilla JavaScript frontend. Implements semantic search via FAISS vector embeddings and AI chatbot using Google Gemini with retrieval-augmented generation.

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Backend | Python 3.13, Django 5, Django REST Framework, PostgreSQL, Redis |
| Search | FAISS, Sentence Transformers, vector embeddings |
| AI | Google Gemini 1.5 (chatbot, product recommendations) |
| Frontend | Vanilla JavaScript (ES6+), HTML5, CSS, Vite |
| Payments | Stripe API |
| Auth | JWT with automatic refresh |

## Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ HTTPS/REST
┌──────▼──────────────────┐
│  Vanilla JS Frontend    │
│  (Static Assets)        │
└──────┬──────────────────┘
       │ /api/v1/*
┌──────▼──────────────────┐
│  Django REST API        │
│  - JWT Auth             │
│  - Business Logic       │
└──┬────────────┬─────────┘
   │            │
   │            └──────────┐
   │                       │
┌──▼──────┐    ┌──────────▼─────────┐
│PostgreSQL│    │ FAISS Index        │
│  (Data)  │    │ Google Gemini API  │
└──────────┘    └────────────────────┘
```

## Core Features

**Search & Discovery**
- Semantic product search using vector embeddings
- Category-based filtering with MPTT hierarchy
- Related product recommendations

**AI Integration**
- Chatbot with context-aware responses
- Product recommendation engine
- Retrieval-augmented generation for accuracy

**E-commerce**
- Shopping cart with cross-tab synchronization
- Stripe checkout integration
- Order management
- User authentication (JWT)

**Performance**
- Smart caching (stale-while-revalidate)
- Adaptive search debouncing (150-400ms)
- Lazy image loading
- Service worker for offline support

## Key Metrics

- **API Endpoints:** 15+
- **Frontend Modules:** 12 JavaScript files
- **Database Models:** 8+
- **Lines of Code:** ~15,000

## Development Status

Currently in active development. Core e-commerce, search, and AI features functional. Testing and deployment workflows in progress.

## Getting Started

See `ONBOARDING.md` for setup instructions or `README.md` for quick start commands.
