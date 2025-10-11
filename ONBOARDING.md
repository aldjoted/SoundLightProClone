# Onboarding Checklist for New Contributors

Welcome to SoundLightPro Clone! This checklist will get you up and running quickly.

## ⏱️ Expected Time: 30-45 minutes

---

## Phase 1: Initial Setup (10 minutes)

### ✅ System Requirements

- [ ] **Python 3.13+** installed ([python.org](https://python.org))
- [ ] **PostgreSQL 12+** installed ([postgresql.org](https://postgresql.org))
- [ ] **Redis** installed ([redis.io](https://redis.io))
- [ ] **Node.js 18+** and npm installed ([nodejs.org](https://nodejs.org))
- [ ] **Git** installed and configured
- [ ] **Code editor** (VS Code recommended)

### ✅ Account Setup

- [ ] GitHub account created
- [ ] Fork the repository: [github.com/aldjoted/SoundLightProClone](https://github.com/aldjoted/SoundLightProClone)
- [ ] Stripe account (test mode): [dashboard.stripe.com](https://dashboard.stripe.com)
- [ ] Google AI Studio account: [aistudio.google.com](https://aistudio.google.com)

### ✅ Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/SoundLightProClone.git
cd SoundLightProClone
```

---

## Phase 2: Backend Setup (15 minutes)

### ✅ Database Setup

1. **Start PostgreSQL** service

2. **Create database and user:**
```sql
-- Open psql or pgAdmin and run:
CREATE DATABASE soundlightpro_db;
CREATE USER myuser WITH PASSWORD 'mypassword';
GRANT ALL PRIVILEGES ON DATABASE soundlightpro_db TO myuser;
ALTER DATABASE soundlightpro_db OWNER TO myuser;
```

3. **Verify connection:**
```bash
psql -U myuser -d soundlightpro_db
# Should connect successfully, then \q to exit
```

### ✅ Python Environment

1. **Navigate to backend:**
```bash
cd backend
```

2. **Create virtual environment:**
```bash
python -m venv venv
```

3. **Activate virtual environment:**
```bash
# Windows PowerShell
venv\Scripts\activate

# Windows CMD
venv\Scripts\activate.bat

# macOS/Linux
source venv/bin/activate
```

4. **Install dependencies:**
```bash
pip install -r requirements.txt
```

### ✅ Environment Configuration

1. **Create `.env` file** in `backend/` directory:

```env
# Django Settings
DJANGO_SECRET_KEY='django-insecure-dev-key-change-in-production-12345'
DEBUG=True

# Database Configuration
DB_NAME=soundlightpro_db
DB_USER=myuser
DB_PASSWORD=mypassword
DB_HOST=localhost
DB_PORT=5432

# Google Gemini AI (get from https://aistudio.google.com/apikey)
GEMINI_API_KEY=your_gemini_api_key_here

# Stripe API Keys (get from https://dashboard.stripe.com/test/apikeys)
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here

# Optional: Redis (if using caching)
REDIS_URL=redis://localhost:6379/0
```

2. **Get your API keys:**
   - **Gemini:** Visit [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
   - **Stripe:** Visit [dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys)

### ✅ Database Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### ✅ Create Admin User

```bash
python manage.py createsuperuser
# Username: admin
# Email: admin@example.com
# Password: (your choice, remember it!)
```

### ✅ Build Search Index

```bash
python manage.py build_product_index
```

### ✅ Start Backend Server

```bash
python manage.py runserver
```

**Verify:** Open [http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/) - should see Django admin login

---

## Phase 3: Frontend Setup (10 minutes)

### ✅ Install Dependencies

1. **Open new terminal** (keep backend running)

2. **Navigate to frontend:**
```bash
cd frontend
```

3. **Install packages:**
```bash
npm install
```

### ✅ Configuration Check

1. **Open `frontend/js/config.js`**

2. **Verify API URL:**
```javascript
export const API_BASE_URL = (() => {
  try {
    const h = typeof window !== 'undefined' ? window.location.hostname : '';
    if (h && isLanHost(h)) {
      return `http://${h}:8000/api/v1`;
    }
  } catch {}
  let api = runtime.API_BASE_URL;
  if (!api) api = import.meta?.env?.VITE_API_BASE_URL;
  if (!api) api = 'http://127.0.0.1:8000/api/v1';
  return api;
})();
```

3. **Check Stripe key** (should match your `.env`):
```javascript
export const STRIPE_PUBLISHABLE_KEY =
  runtime.STRIPE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
  'pk_test_51SGlxnL3Yer4f974pQeRKB0AmIroFjZ4UPnvxGsHtm3bV5A6FOwP7Xbc6ZI8BiQO6FLW8cjNA9df3uHP5jrj19mC00XKUkds1P';
```

### ✅ Start Frontend Server

```bash
npm run dev
```

**Verify:** Open [http://localhost:5173/](http://localhost:5173/) - should see homepage with products

---

## Phase 4: Verification (5 minutes)

### ✅ Basic Functionality Tests

- [ ] **Homepage loads** with product grid
- [ ] **Search works** - type in search bar, see suggestions
- [ ] **Product detail** - click a product, see details page
- [ ] **Add to cart** - add product, see cart icon update
- [ ] **View cart** - click cart, see added items
- [ ] **Chatbot** - click chat icon, send message, get response
- [ ] **Login** - register/login with test account
- [ ] **Admin panel** - visit `/admin/` with superuser credentials

### ✅ Check for Common Issues

**Backend not starting?**
```bash
# Check PostgreSQL is running
# Windows: Services → PostgreSQL
# Linux: systemctl status postgresql

# Verify .env file exists in backend/
# Check database credentials
```

**Frontend can't connect?**
```bash
# Verify backend is running on port 8000
# Check config.js API_BASE_URL
# Look for CORS errors in browser console
```

**Search index missing?**
```bash
cd backend
python manage.py build_product_index
```

---

## Phase 5: Development Tools (Optional, 5 minutes)

### ✅ VS Code Extensions (Recommended)

- [ ] **Python** (ms-python.python)
- [ ] **ESLint** (dbaeumer.vscode-eslint)
- [ ] **Prettier** (esbenp.prettier-vscode)
- [ ] **Django** (batisteo.vscode-django)
- [ ] **REST Client** (humao.rest-client)

### ✅ Git Configuration

```bash
# Set your identity
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Set up remote
git remote add upstream https://github.com/aldjoted/SoundLightProClone.git
```

### ✅ Enable Auto-formatting

**VS Code settings.json:**
```json
{
    "editor.formatOnSave": true,
    "python.linting.enabled": true,
    "python.linting.pylintEnabled": true,
    "[javascript]": {
        "editor.defaultFormatter": "esbenp.prettier-vscode"
    }
}
```

---

## 🎯 Next Steps

### Familiarize Yourself

- [ ] Read [README.md](README.md) - Full project overview
- [ ] Review [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [ ] Check [Docs/ARCHITECTURE.md](Docs/ARCHITECTURE.md) - Technical details
- [ ] Browse [Docs/TODO_FUTURE_IMPROVEMENTS.md](Docs/TODO_FUTURE_IMPROVEMENTS.md) - Future plans

### Start Contributing

1. **Pick an issue** from [GitHub Issues](https://github.com/aldjoted/SoundLightProClone/issues)
   - Look for `good first issue` label
   - Comment to claim it

2. **Create a branch:**
```bash
git checkout -b feature/your-feature-name
```

3. **Make changes, commit, push:**
```bash
git add .
git commit -m "feat: description of changes"
git push origin feature/your-feature-name
```

4. **Open Pull Request** on GitHub

---

## 📚 Essential Documentation

| Document | Purpose | Time |
|----------|---------|------|
| [README.md](README.md) | Project overview | 10 min |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute | 15 min |
| [Docs/QUICK_START.md](Docs/QUICK_START.md) | Recent improvements | 5 min |
| [Docs/ARCHITECTURE.md](Docs/ARCHITECTURE.md) | Technical deep dive | 30 min |
| [Docs/TESTING_GUIDE.md](Docs/TESTING_GUIDE.md) | Testing procedures | 20 min |

---

## 🆘 Troubleshooting

### Python Virtual Environment Issues

**Error: `venv\Scripts\activate` not recognized**
```bash
# Use full path
python -m venv venv
.\venv\Scripts\Activate.ps1

# Or enable script execution (PowerShell as Admin)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Database Connection Issues

**Error: `FATAL: password authentication failed`**
```sql
-- Reset password in psql
ALTER USER myuser WITH PASSWORD 'mypassword';

-- Update .env file to match
```

### Port Already in Use

**Backend (8000) or Frontend (5173) port busy:**
```bash
# Windows: Find and kill process
netstat -ano | findstr :8000
taskkill /PID <process_id> /F

# Or use different port
python manage.py runserver 8001
npm run dev -- --port 5174
```

### Module Not Found Errors

```bash
# Backend: Reinstall dependencies
pip install --upgrade -r requirements.txt

# Frontend: Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## ✅ Checklist Complete!

You're ready to contribute! 🎉

**Quick Reference:**

```bash
# Daily workflow
cd backend
venv\Scripts\activate
python manage.py runserver

# New terminal
cd frontend
npm run dev

# Creating feature
git checkout -b feature/your-feature
# Make changes
git add .
git commit -m "feat: your changes"
git push origin feature/your-feature
```

**Need help?** 
- Create a [GitHub Issue](https://github.com/aldjoted/SoundLightProClone/issues)
- Check existing documentation
- Ask in discussions

Welcome aboard! 🚀
