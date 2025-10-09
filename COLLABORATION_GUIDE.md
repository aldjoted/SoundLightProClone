# 🤝 Quick Collaboration Guide

**TL;DR:** Everything you need to start collaborating in 5 minutes.

---

## 🚀 I Want To...

### ...Get Started (First Time)
1. Read **[ONBOARDING.md](ONBOARDING.md)** ← Step-by-step setup (30 min)
2. Read **[CONTRIBUTING.md](CONTRIBUTING.md)** ← How to contribute (15 min)
3. Run the project locally
4. Pick a `good first issue` from GitHub

### ...Submit a Change
```bash
# 1. Create branch
git checkout -b feature/my-feature

# 2. Make changes, test locally
# Backend: http://127.0.0.1:8000
# Frontend: http://localhost:5173

# 3. Commit with convention
git commit -m "feat: add feature description"

# 4. Push and create PR
git push origin feature/my-feature
```

### ...Report a Bug
1. Check [existing issues](https://github.com/aldjoted/SoundLightProClone/issues)
2. Create new issue with:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots (if UI issue)

### ...Request a Feature
1. Check [TODO_FUTURE_IMPROVEMENTS.md](Docs/TODO_FUTURE_IMPROVEMENTS.md)
2. Create issue labeled `enhancement`
3. Describe: Problem → Solution → Alternatives

---

## ⚡ Quick Commands

### Backend
```bash
cd backend
venv\Scripts\activate              # Activate virtual env
python manage.py runserver         # Start server
python manage.py migrate           # Run migrations
python manage.py build_product_index  # Rebuild search
```

### Frontend
```bash
cd frontend
npm run dev         # Development server
npm run build       # Production build
npm run preview     # Preview build
```

### Git Workflow
```bash
git checkout main                  # Switch to main
git pull upstream main             # Get latest
git checkout -b feature/name       # New branch
git add .                          # Stage changes
git commit -m "type: message"      # Commit
git push origin feature/name       # Push branch
```

---

## 📁 Project Structure (Simplified)

```
SoundLightProClone/
├── backend/               # Django REST API
│   ├── api/              # Main app
│   │   ├── models.py     # Database models
│   │   ├── views.py      # API endpoints
│   │   ├── serializers.py
│   │   └── services.py   # Business logic
│   ├── project/          # Settings
│   │   ├── settings.py   # Configuration ⚙️
│   │   └── urls.py
│   ├── .env              # Secrets (DO NOT COMMIT!)
│   └── requirements.txt  # Python deps
│
├── frontend/             # Vanilla JS app
│   ├── js/
│   │   ├── main.js       # App orchestrator
│   │   ├── apiService.js # API calls
│   │   ├── cart.js       # Cart logic
│   │   ├── auth.js       # Authentication
│   │   └── config.js     # Configuration ⚙️
│   ├── css/
│   ├── *.html            # Pages
│   └── package.json      # Node deps
│
├── Docs/                 # Documentation 📚
│   ├── QUICK_START.md
│   ├── ARCHITECTURE.md
│   └── TESTING_GUIDE.md
│
├── ONBOARDING.md         # Setup checklist ✅
├── CONTRIBUTING.md       # Contribution guide 🤝
└── README.md             # Project overview 📖
```

---

## 🎯 Commit Convention

```
type(scope): subject

body

footer
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code restructure
- `test:` Tests
- `chore:` Maintenance

**Examples:**
```bash
feat(cart): add quantity validation
fix(auth): resolve token refresh race condition
docs(readme): update installation steps
```

---

## 🐛 Common Issues & Fixes

### Backend won't start
```bash
# Check PostgreSQL is running
# Verify .env file exists
# Check database credentials

# Reset if needed
python manage.py migrate
python manage.py createsuperuser
```

### Frontend can't connect
```bash
# Verify backend is running (port 8000)
# Check js/config.js API_BASE_URL
# Look for CORS errors in console
```

### Port already in use
```bash
# Find process
netstat -ano | findstr :8000

# Kill process (Windows)
taskkill /PID <pid> /F

# Or use different port
python manage.py runserver 8001
```

### Database errors
```sql
-- In psql
DROP DATABASE soundlightpro_db;
CREATE DATABASE soundlightpro_db;
GRANT ALL PRIVILEGES ON DATABASE soundlightpro_db TO myuser;
```
```bash
# Then run migrations again
python manage.py migrate
```

---

## 📋 Pull Request Checklist

Before submitting:
- [ ] Code follows style guidelines
- [ ] Tested locally (works!)
- [ ] Commit messages follow convention
- [ ] No console errors
- [ ] Documentation updated (if needed)
- [ ] No sensitive data (API keys, passwords)

---

## 🎨 Code Style

### Python
```python
# Use type hints
def get_product(product_id: int) -> Product:
    """Get product by ID."""
    return Product.objects.get(id=product_id)

# Follow PEP 8
# Use descriptive names
# Add docstrings
```

### JavaScript
```javascript
// Use async/await
async function getProducts() {
    const response = await apiFetch('/products/');
    return response.results;
}

// JSDoc for exports
/**
 * Fetch products from API
 * @returns {Promise<Array>} Products
 */
export async function fetchProducts() {
    // ...
}

// Avoid innerHTML, use createElement()
```

### CSS
```css
/* BEM naming */
.product-card {}
.product-card__title {}
.product-card__title--highlighted {}

/* CSS variables */
:root {
    --primary-color: #007bff;
    --spacing-md: 1rem;
}
```

---

## 📞 Getting Help

| Issue | Solution |
|-------|----------|
| Setup problems | Read [ONBOARDING.md](ONBOARDING.md) |
| How to contribute | Read [CONTRIBUTING.md](CONTRIBUTING.md) |
| Architecture questions | Read [Docs/ARCHITECTURE.md](Docs/ARCHITECTURE.md) |
| Bug found | Create GitHub Issue |
| Feature idea | Create GitHub Issue |
| General question | GitHub Discussions |

---

## 🔐 Security

**DO NOT commit:**
- API keys (Gemini, Stripe)
- Database passwords
- Secret keys
- `.env` files

**DO commit:**
- `.env.example` (template only)
- Documentation
- Code changes

**Found a vulnerability?**
- Report privately (don't create public issue)
- Include steps to reproduce
- Suggest fix if possible

---

## 🎉 Recognition

Contributors get:
- Listed in CONTRIBUTORS.md
- Credit in release notes
- GitHub profile contributions
- Our gratitude! 🙏

---

## 📚 Essential Docs

| Doc | When to Read | Time |
|-----|--------------|------|
| [ONBOARDING.md](ONBOARDING.md) | First time setup | 30 min |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Before first PR | 15 min |
| [README.md](README.md) | Project overview | 10 min |
| [Docs/QUICK_START.md](Docs/QUICK_START.md) | Recent improvements | 5 min |
| [Docs/TESTING_GUIDE.md](Docs/TESTING_GUIDE.md) | Before testing | 20 min |

---

## 🚦 Status

- ✅ **Production Ready:** Core features stable
- 🟡 **In Progress:** Testing, documentation
- 🔴 **Not Started:** See TODO_FUTURE_IMPROVEMENTS.md

---

**Questions?** Create a GitHub Discussion or Issue!

**Ready to start?** → [ONBOARDING.md](ONBOARDING.md)

---

Last Updated: October 9, 2025
