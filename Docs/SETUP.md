# Setup Guide

Complete environment configuration for local development.

## Prerequisites

**Required Software**
- Python 3.13+
- PostgreSQL 12+
- Redis
- Node.js 18+
- Git

**Required Accounts**
- Stripe (test mode): [dashboard.stripe.com](https://dashboard.stripe.com)
- Google AI Studio: [aistudio.google.com](https://aistudio.google.com)

## Database Setup

### PostgreSQL Configuration

```sql
-- Create database and user
CREATE DATABASE soundlightpro_db;
CREATE USER myuser WITH PASSWORD 'mypassword';
GRANT ALL PRIVILEGES ON DATABASE soundlightpro_db TO myuser;
ALTER DATABASE soundlightpro_db OWNER TO myuser;
```

### Verify Connection

```bash
psql -U myuser -d soundlightpro_db
```

## Backend Setup

### Install Dependencies

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### Environment Configuration

Create `backend/.env`:

```env
# Django
DJANGO_SECRET_KEY='django-insecure-dev-key-change-in-production-12345'
DEBUG=True

# Database
DB_NAME=soundlightpro_db
DB_USER=myuser
DB_PASSWORD=mypassword
DB_HOST=localhost
DB_PORT=5432

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here

# Redis (optional)
REDIS_URL=redis://localhost:6379/0
```

### API Keys

**Google Gemini:** [aistudio.google.com/apikey](https://aistudio.google.com/apikey)  
**Stripe:** [dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys)

### Database Migrations

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py build_product_index
```

### Start Backend Server

```bash
python manage.py runserver
```

Verify: [http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/)

## Frontend Setup

### Install Dependencies

```bash
cd frontend
npm install
```

### Configuration

Verify `frontend/js/config.js`:

```javascript
export const API_BASE_URL = (() => {
  // Auto-detects or defaults to http://127.0.0.1:8000/api/v1
  let api = runtime.API_BASE_URL;
  if (!api) api = import.meta?.env?.VITE_API_BASE_URL;
  if (!api) api = 'http://127.0.0.1:8000/api/v1';
  return api;
})();
```

Update `STRIPE_PUBLISHABLE_KEY` if using different test account.

### Start Frontend Server

```bash
npm run dev
```

Verify: [http://localhost:5173/](http://localhost:5173/)

## Verification

### Basic Functionality

1. Homepage loads with product grid
2. Search returns results
3. Product detail page displays
4. Add to cart updates icon count
5. Cart page shows items
6. Chatbot responds to messages
7. Login/register flow works
8. Admin panel accessible at `/admin/`

### Common Issues

**Backend won't start**
```bash
# Check PostgreSQL service running
# Windows: Services → PostgreSQL
# Linux: systemctl status postgresql

# Verify .env file exists in backend/
# Check database credentials match
```

**Frontend can't connect**
```bash
# Verify backend running on port 8000
# Check browser console for CORS errors
# Verify config.js API_BASE_URL
```

**Search index missing**
```bash
cd backend
python manage.py build_product_index
```

**Port conflicts**
```bash
# Windows: Find process
netstat -ano | findstr :8000
taskkill /PID <process_id> /F

# Or use different port
python manage.py runserver 8001
npm run dev -- --port 5174
```

**Module not found**
```bash
# Backend
pip install --upgrade -r requirements.txt

# Frontend
rm -rf node_modules package-lock.json
npm install
```

## Development Workflow

### Daily Startup

```bash
# Terminal 1: Backend
cd backend
venv\Scripts\activate
python manage.py runserver

# Terminal 2: Frontend
cd frontend
npm run dev
```

### Git Configuration

```bash
git config user.name "Your Name"
git config user.email "your.email@example.com"
git remote add upstream https://github.com/aldjoted/SoundLightProClone.git
```

### Branch Workflow

```bash
git checkout main
git pull upstream main
git checkout -b feature/your-feature-name
# Make changes
git add .
git commit -m "feat: description"
git push origin feature/your-feature-name
```

## Next Steps

- Review `CONTRIBUTING.md` for coding standards
- Browse `Docs/ARCHITECTURE.md` for technical details
- Check `Docs/API_DOCUMENTATION.md` for endpoint specifications
- See `README.md` for management commands
