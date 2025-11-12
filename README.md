# SoundLightProClone

E-commerce platform for professional audio and lighting equipment with AI-powered search and chatbot support.

## Tech Stack

**Backend:** Python 3.13, Django 5, Django REST Framework, PostgreSQL, Redis, Stripe, Google Gemini, FAISS  
**Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS, Vite, Service Worker

## Quick Start

```bash
# Clone repository
git clone https://github.com/aldjoted/SoundLightProClone.git
cd SoundLightProClone

# Backend setup
cd backend
python -m venv venv
venv\Scripts\activate  # Windows: venv\Scripts\activate | Unix: source venv/bin/activate
pip install -r requirements.txt

# Configure .env file with DB credentials, STRIPE_SECRET_KEY, GEMINI_API_KEY
python manage.py migrate
python manage.py createsuperuser
python manage.py build_product_index
python manage.py runserver

# Frontend setup (new terminal)
cd frontend
npm install
npm run dev
```

## Core Features

- Semantic product search using FAISS vector embeddings
- AI chatbot with retrieval-augmented generation (Google Gemini)
- JWT authentication with automatic token refresh
- Stripe payment integration
- Smart caching with stale-while-revalidate strategy
- Adaptive search debouncing based on typing speed
- Cross-tab cart synchronization

## Architecture

```
Browser → Vanilla JS Frontend → Django REST API → PostgreSQL
                                      ↓
                            FAISS Index + Google Gemini
```

API endpoints under `/api/v1/`. Frontend consumes REST API with JWT bearer tokens.

## Management Commands

```bash
python manage.py build_product_index  # Rebuild FAISS embeddings after product changes
python manage.py populate_categories  # Load category hierarchy from JSON
```

Additional commands: `backend/api/management/commands/`

## Documentation

- **Setup:** `Docs/SETUP.md` — Environment configuration and troubleshooting
- **Overview:** `Docs/OVERVIEW.md` — Project architecture and tech stack details
- **API:** `Docs/API_DOCUMENTATION.md` — Endpoint specifications and examples
- **Frontend:** `Docs/ARCHITECTURE.md` — JavaScript module structure and patterns
- **Testing:** `Docs/QUICK_START.md` — Validation scenarios for recent changes
- **Contributing:** `Docs/CONTRIBUTING.md` — Coding standards and PR workflow
- **Roadmap:** `Docs/ROADMAP.md` — Planned features and priorities

## Contributing

Review `Docs/CONTRIBUTING.md` for coding standards and branch workflow. Use conventional commits (`feat:`, `fix:`, `docs:`).

## License

MIT License