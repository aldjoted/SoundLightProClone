# Contributing Guidelines

Coding standards, workflow, and pull request requirements.

**Prerequisites:**
- Complete setup: `Docs/SETUP.md`
- Project overview: `README.md`
- Testing guide: `Docs/TESTING_GUIDE.md` (if extending tests)

## Environment Requirements

- Backend: Python 3.13+, PostgreSQL 12+, Redis
- Frontend: Node.js 18+, npm
- Tooling: Git, a code editor (VS Code recommended)

## Local Setup

```bash
git clone https://github.com/YOUR_USERNAME/SoundLightProClone.git
cd SoundLightProClone

# Backend
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt

# Configure environment
cp .env.example .env  # create the file if needed
# Update database, Stripe, and Gemini credentials

python manage.py migrate
python manage.py createsuperuser
python manage.py build_product_index
python manage.py runserver

# Frontend
cd ../frontend
npm install
npm run dev
```

## Branch Workflow

- Base all work on `main` and keep the branch up to date with `git pull origin main`.
- Use descriptive branch names such as `feature/wishlist-sharing`, `fix/search-throttle`, `docs/api-refresh`, or `test/cart-flow`.
- Ensure each pull request targets a single logical change.

## Coding Standards

### Python
- Follow PEP 8 and use type hints on public functions.
- Group imports as standard library, third-party, project.
- Prefer descriptive docstrings that state purpose and side effects.

### JavaScript
- Use ES modules and async/await for asynchronous flows.
- Keep DOM manipulation within the helpers in `ui.js`; avoid raw `innerHTML`.
- Document exported functions with JSDoc summaries and parameter types.

### CSS
- Follow the existing BEM naming scheme and reuse CSS custom properties.
- Target mobile-first layouts, enhancing for wider breakpoints.

## Commit Messages

Adopt [Conventional Commits](https://www.conventionalcommits.org/) to ease changelog generation, e.g. `feat(cart): add quantity validation` or `fix(auth): prevent duplicate refresh`. Use additional context in the body for non-trivial changes and link issues where applicable.

## Testing Expectations

- Run `python manage.py test api` for backend changes that touch models, serializers, or views.
- Execute relevant frontend flows manually or add automated coverage if available. Document manual verification steps in the pull request.
- Avoid merging code with failing lint, type checks, or unit tests.

## Pull Request Checklist

- [ ] Code builds locally without warnings.
- [ ] Tests relevant to the change pass; new tests are added when necessary.
- [ ] Documentation is updated (README, docs, inline comments) when behavior changes.
- [ ] Self-review is complete; logs and debug statements are removed.
- [ ] Screenshots or recordings accompany user-facing updates.

## Reporting Issues

When opening a bug report, include:
- Clear summary and expected behavior.
- Reproduction steps with URLs, payloads, and credentials where applicable.
- Environment details: OS, browser, Python version, Node.js version.

Feature requests should explain the problem, describe the proposed solution, and call out alternatives considered.

## Security

- Never commit secrets or production data. Use `.env` and deployment configuration to manage credentials.
- Validate and sanitize all external input; follow the patterns in `security.js` and server-side validators.
- Report vulnerabilities privately to the maintainers (see `SECURITY.md`).

## Where to Contribute

- **High priority:** automated testing, accessibility fixes, wishlist/review enhancements.
- **Medium priority:** admin dashboard improvements, notification workflows, analytics instrumentation.
- **Good first issues:** documentation cleanup, UI copy consistency, missing JSDoc coverage.

## Communication

- Bugs and features: GitHub Issues
- Questions and discussions: GitHub Discussions
- Review requests: Mention maintainers in PR comments
