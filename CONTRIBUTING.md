# Contributing to SoundLightPro Clone

Thank you for your interest in contributing! This guide will help you get started.

## 🚀 Quick Start for Contributors

1. **Read the [ONBOARDING.md](ONBOARDING.md)** - Essential setup checklist
2. **Review [README.md](README.md)** - Project overview and architecture
3. **Check [Docs/QUICK_START.md](Docs/QUICK_START.md)** - Get running in 5 minutes

## 📋 Prerequisites

- **Backend:** Python 3.13+, PostgreSQL 12+, Redis
- **Frontend:** Node.js 18+, npm
- **Tools:** Git, VS Code (recommended)

## 🔧 Development Setup

### 1. Fork & Clone

```bash
git clone https://github.com/YOUR_USERNAME/SoundLightProClone.git
cd SoundLightProClone
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

Create `.env` file (see [ONBOARDING.md](ONBOARDING.md) for template):
```env
DJANGO_SECRET_KEY=your-secret-key
DEBUG=True
DB_NAME=soundlightpro_db
DB_USER=myuser
DB_PASSWORD=mypassword
GEMINI_API_KEY=your-key
STRIPE_SECRET_KEY=sk_test_...
```

Run migrations and build search index:
```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py build_product_index
python manage.py runserver
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## 🌿 Branch Workflow

### Branch Naming Convention

- `feature/` - New features (`feature/add-wishlist`)
- `fix/` - Bug fixes (`fix/cart-calculation`)
- `docs/` - Documentation (`docs/update-readme`)
- `refactor/` - Code improvements (`refactor/api-service`)
- `test/` - Adding tests (`test/cart-integration`)

### Creating a Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

## 💻 Coding Standards

### Python (Backend)

- **Style:** Follow [PEP 8](https://pep8.org/)
- **Type Hints:** Use type hints for functions
- **Docstrings:** Use Google-style docstrings
- **Imports:** Group by stdlib, third-party, local

**Example:**
```python
from typing import List, Optional

def get_products(category_id: Optional[int] = None) -> List[Product]:
    """
    Retrieve products, optionally filtered by category.
    
    Args:
        category_id: Optional category ID to filter by.
        
    Returns:
        List of Product instances.
    """
    if category_id:
        return Product.objects.filter(category_id=category_id)
    return Product.objects.all()
```

### JavaScript (Frontend)

- **Style:** ES6+ modules, async/await
- **Functions:** Use descriptive names
- **Comments:** JSDoc for exported functions
- **Security:** Use `createElement()`, avoid `innerHTML`

**Example:**
```javascript
/**
 * Fetch products with optional filtering.
 * @param {Object} filters - Search filters
 * @param {string} [filters.category] - Category slug
 * @param {string} [filters.search] - Search query
 * @returns {Promise<Array>} Array of products
 */
export async function getProducts(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await apiFetch(`/products/?${params}`);
    return response.results || response;
}
```

### CSS

- **BEM Naming:** Use Block Element Modifier convention
- **Variables:** Use CSS custom properties
- **Mobile First:** Start with mobile, enhance for desktop

## 📝 Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting (no code change)
- `refactor:` Code restructuring
- `test:` Adding tests
- `chore:` Maintenance tasks

### Examples

```bash
feat(cart): add product quantity validation

- Add min/max quantity checks
- Display error messages for invalid quantities
- Update cart UI to show limits

Closes #123
```

```bash
fix(auth): resolve token refresh race condition

The token refresh was being called multiple times
simultaneously, causing authentication failures.
Now uses single-flight pattern.

Fixes #456
```

## 🧪 Testing

### Backend Tests

```bash
cd backend
python manage.py test api
```

### Frontend Testing (Manual)

See [Docs/TESTING_GUIDE.md](Docs/TESTING_GUIDE.md) for comprehensive testing procedures.

**Quick Smoke Test:**
1. Homepage loads with products
2. Search functionality works
3. Add to cart and view cart
4. Login/logout flow
5. Chatbot responds

## 🔍 Code Review Process

### Before Submitting PR

- [ ] Code follows style guidelines
- [ ] Commit messages follow convention
- [ ] Self-review completed
- [ ] Tests pass (if applicable)
- [ ] Documentation updated
- [ ] No console errors/warnings

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring

## Testing
Describe testing performed

## Screenshots (if UI changes)
Include relevant screenshots

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
```

## 🐛 Reporting Issues

### Bug Report Template

```markdown
**Description**
Clear description of the bug

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What should happen

**Screenshots**
If applicable

**Environment**
- OS: [e.g., Windows 11]
- Browser: [e.g., Chrome 120]
- Python: [e.g., 3.13]
```

### Feature Request Template

```markdown
**Problem**
What problem does this solve?

**Proposed Solution**
Your suggested implementation

**Alternatives Considered**
Other solutions you've thought about

**Additional Context**
Any other information
```

## 📚 Important Files to Know

### Backend
- `api/models.py` - Database models
- `api/views.py` - API endpoints
- `api/serializers.py` - Data serialization
- `api/services.py` - Business logic
- `project/settings.py` - Django configuration

### Frontend
- `js/main.js` - Application orchestrator
- `js/apiService.js` - API communication
- `js/cart.js` - Shopping cart logic
- `js/auth.js` - Authentication
- `js/config.js` - Configuration

## 🎯 Areas for Contribution

### High Priority
- [ ] Add unit tests for backend
- [ ] Implement E2E tests with Playwright
- [ ] Improve accessibility (ARIA labels)
- [ ] Add product reviews feature
- [ ] Implement wishlist functionality

### Medium Priority
- [ ] Add product comparison feature
- [ ] Enhance admin dashboard
- [ ] Add email notifications
- [ ] Implement order tracking
- [ ] Add multi-language support

### Good First Issues
- [ ] Fix typos in documentation
- [ ] Add missing JSDoc comments
- [ ] Improve error messages
- [ ] Add loading skeletons
- [ ] Enhance mobile UI

## 🔒 Security

- **Never commit:** API keys, passwords, secrets
- **Use `.env` files** for sensitive data
- **Sanitize inputs:** Always validate user input
- **Report vulnerabilities:** Email security@example.com (private)

## 💬 Communication

- **GitHub Issues:** Bug reports, feature requests
- **Pull Requests:** Code discussions
- **Discussions:** General questions and ideas

## 📖 Additional Resources

- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [MDN Web Docs](https://developer.mozilla.org/)
- [Docs/ARCHITECTURE.md](Docs/ARCHITECTURE.md) - Technical architecture
- [Docs/TODO_FUTURE_IMPROVEMENTS.md](Docs/TODO_FUTURE_IMPROVEMENTS.md) - Roadmap

## 🎉 Recognition

Contributors will be:
- Listed in [CONTRIBUTORS.md](CONTRIBUTORS.md)
- Recognized in release notes
- Given credit in documentation

## ❓ Questions?

- Create a GitHub Discussion
- Check existing issues
- Review documentation

Thank you for contributing to SoundLightPro Clone! 🚀
