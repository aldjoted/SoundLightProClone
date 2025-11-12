# 📇 Quick Reference Card - SoundLightPro Clone

**Print this or bookmark for quick access!**

---

## ⚡ Essential Commands

### Backend
```bash
cd backend
venv\Scripts\activate              # Activate virtual environment
python manage.py runserver         # Start server (port 8000)
python manage.py migrate           # Run database migrations
python manage.py createsuperuser   # Create admin user
python manage.py build_product_index  # Rebuild search index
```

### Frontend
```bash
cd frontend
npm install                        # Install dependencies
npm run dev                        # Start dev server (port 5173)
npm run build                      # Build for production
npm run preview                    # Preview production build
```

### Git
```bash
git checkout main                  # Switch to main branch
git pull upstream main             # Get latest changes
git checkout -b feature/name       # Create feature branch
git add .                          # Stage all changes
git commit -m "type: message"      # Commit with convention
git push origin feature/name       # Push to your fork
```

---

## 🌐 Important URLs

| Service | URL |
|---------|-----|
| Backend API | http://127.0.0.1:8000 |
| Admin Panel | http://127.0.0.1:8000/admin/ |
| Frontend Dev | http://localhost:5173 |
| API Docs | http://127.0.0.1:8000/api/v1/ |

---

## 📁 Key Files

### Backend
```
backend/
├── project/settings.py ........ Configuration
├── api/models.py .............. Database models
├── api/views.py ............... API endpoints
├── api/services.py ............ Business logic
└── .env ....................... Your secrets
```

### Frontend
```
frontend/
├── js/main.js ................. App orchestrator
├── js/apiService.js ........... API calls
├── js/config.js ............... Configuration
├── js/cart.js ................. Cart logic
└── js/auth.js ................. Authentication
```

---

## 💻 Commit Convention

```
type(scope): subject

Examples:
feat(cart): add quantity validation
fix(auth): resolve token refresh race
docs(readme): update installation steps
style(css): improve mobile layout
refactor(api): optimize product query
test(cart): add unit tests
chore(deps): update dependencies
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

---

## 🐛 Troubleshooting

### Backend Won't Start
```bash
# Check PostgreSQL is running
# Verify .env file exists
# Check database credentials

# Reset database
python manage.py flush
python manage.py migrate
```

### Frontend Can't Connect
```bash
# Verify backend is running (port 8000)
# Check js/config.js API_BASE_URL
# Look for CORS errors in console
```

### Port Already in Use
```bash
# Windows: Find process
netstat -ano | findstr :8000

# Kill process
taskkill /PID <pid> /F

# Or use different port
python manage.py runserver 8001
```

### Module Not Found
```bash
# Backend
pip install -r requirements.txt

# Frontend
rm -rf node_modules
npm install
```

---

## 🎯 File Structure

```
SoundLightProClone/
├── backend/          # Django REST API
│   ├── api/         # Main app
│   ├── project/     # Settings
│   └── .env         # Secrets
├── frontend/        # Vanilla JS
│   ├── js/          # JavaScript modules
│   ├── css/         # Styles
│   └── *.html       # Pages
├── Docs/            # Documentation
├── ONBOARDING.md    # Setup guide
├── CONTRIBUTING.md  # Contribution guide
└── README.md        # Project overview
```

---

## 📚 Documentation Quick Links

| Need | Read |
|------|------|
| Quick overview | PROJECT_SUMMARY.md |
| Setup guide | ONBOARDING.md |
| How to contribute | CONTRIBUTING.md |
| Quick reference | COLLABORATION_GUIDE.md |
| Visual navigation | COLLABORATION_ROADMAP.md |
| Technical details | Docs/ARCHITECTURE.md |
| Recent changes | Docs/QUICK_START.md |

---

## 🔑 Environment Variables (.env)

```env
# Django
DJANGO_SECRET_KEY='your-secret-key'
DEBUG=True

# Database
DB_NAME=soundlightpro_db
DB_USER=myuser
DB_PASSWORD=mypassword
DB_HOST=localhost
DB_PORT=5432

# APIs
GEMINI_API_KEY=your_gemini_api_key
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_key
```

---

## 🎨 Code Style

### Python
- Follow PEP 8
- Use type hints
- Add docstrings
- Import order: stdlib, third-party, local

### JavaScript
- ES6+ modules
- async/await (no callbacks)
- JSDoc comments
- Use createElement() (not innerHTML)

### CSS
- BEM naming convention
- Mobile-first
- CSS custom properties
- Semantic class names

---

## 🚀 Daily Workflow

```bash
# Morning: Update & Start
git checkout main
git pull upstream main
cd backend && venv\Scripts\activate
python manage.py runserver

# New Terminal
cd frontend
npm run dev

# During Day: Work & Test
git checkout -b feature/my-feature
# ... make changes ...
git add .
git commit -m "feat: description"

# End of Day: Push
git push origin feature/my-feature

# When Done: PR
# Create Pull Request on GitHub
```

---

## 📞 Getting Help

| Issue | Solution |
|-------|----------|
| Setup problem | ONBOARDING.md → Troubleshooting |
| Code question | ARCHITECTURE.md |
| How to contribute | CONTRIBUTING.md |
| Bug found | Create GitHub Issue |
| Feature idea | Create GitHub Issue |
| General question | GitHub Discussions |

---

## ✅ Pre-PR Checklist

Before submitting Pull Request:
- [ ] Code follows style guidelines
- [ ] Tested locally (works!)
- [ ] Commits follow convention
- [ ] No console errors
- [ ] Documentation updated
- [ ] No secrets committed

---

## 🔒 Security Reminders

**NEVER commit:**
- API keys
- Passwords
- Secret keys
- `.env` files

**ALWAYS:**
- Use `.env` for secrets
- Validate all inputs
- Sanitize outputs
- Check `.gitignore`

---

## 🎯 Contribution Areas

- 🎨 **Frontend:** UI/UX, JavaScript, CSS
- 🔧 **Backend:** API, Database, AI integration
- 📚 **Docs:** Guides, tutorials, comments
- 🧪 **Testing:** Unit, integration, E2E tests
- 🐛 **Bugs:** Find and fix issues
- ✨ **Features:** Implement new functionality

---

## 📊 Project Stats

- **Language:** Python 3.13, JavaScript ES6+
- **Framework:** Django 5.2, Vanilla JS
- **Database:** PostgreSQL
- **AI:** Google Gemini, FAISS
- **Lines of Code:** 15,000+
- **API Endpoints:** 15+
- **Documentation:** 15+ files

---

## 🌟 Recognition

Contributors are listed in:
- CONTRIBUTORS.md
- Release notes
- GitHub contributors page

---

**Questions?** Check [COLLABORATION_GUIDE.md](COLLABORATION_GUIDE.md)

**Ready to contribute?** Follow [ONBOARDING.md](ONBOARDING.md)

---

**Version:** 1.0 | **Updated:** October 9, 2025

**Keep this card handy while developing!** 📌
