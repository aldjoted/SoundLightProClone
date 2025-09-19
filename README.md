# SoundLightPro Clone

## Overview

SoundLightPro Clone is a cutting-edge e-commerce platform designed for professional audio and lighting equipment. This project showcases advanced web technologies including AI-powered search, intelligent chatbot assistance, and vector-based product recommendations. Built with a modern, decoupled architecture, it features a robust Django REST API backend with AI integration and a responsive, modular Vanilla JavaScript frontend.

The platform demonstrates enterprise-level features including semantic search capabilities using FAISS vector indexing, Google Gemini AI-powered customer support, real-time search suggestions, and sophisticated caching strategies. This separation of concerns and modern tech stack ensures scalability, maintainability, and exceptional user experience.

## Core Features

- **AI-Powered Semantic Search:** Advanced vector-based product search using FAISS indexing and Sentence Transformers for intelligent product discovery
- **Intelligent Chatbot Assistant:** Google Gemini AI-powered customer support with RAG (Retrieval-Augmented Generation) for context-aware product recommendations
- **Real-Time Search Suggestions:** Debounced live search with intelligent auto-suggestions and keyboard navigation
- **Advanced Product Catalog:** Dynamic product grid with category filtering, brand organization, and multi-image support
- **Secure User Authentication:** JWT-based authentication system with automatic token refresh and protected routes
- **Persistent Shopping Cart:** LocalStorage-based cart system with real-time updates and checkout integration
- **Stripe Payment Integration:** Secure multi-step checkout process with real-time payment processing
- **Responsive Design:** Mobile-first design with touch-friendly interfaces and accessibility features
- **Performance Optimization:** Caching strategies, lazy loading, and optimized API calls for enhanced user experience
- **Admin Dashboard:** Comprehensive backend admin panel for product, category, and order management

## Tech Stack

### Backend

- **Python 3.13+** - Modern Python runtime
- **Django 5.2.5** - High-level Python web framework
- **Django REST Framework 3.16+** - Powerful toolkit for building Web APIs
- **PostgreSQL** - Advanced open-source relational database
- **Redis** - In-memory data structure store for caching
- **JWT Authentication** - Token-based authentication using `djangorestframework-simplejwt`
- **Stripe API** - Secure payment processing integration
- **Google Gemini AI** - Advanced language model for chatbot functionality
- **FAISS** - Facebook AI Similarity Search for vector operations
- **Sentence Transformers** - State-of-the-art text embeddings
- **CORS Headers** - Cross-Origin Resource Sharing support

### Frontend

- **HTML5** - Modern semantic markup
- **CSS3** - Advanced styling with Flexbox/Grid layouts and CSS custom properties
- **Vanilla JavaScript (ES6+)** - Modern JavaScript with modular architecture
- **Fetch API** - Native browser API for HTTP requests
- **Web Components** - Reusable custom elements
- **Swiper.js** - Modern touch slider
- **AOS (Animate On Scroll)** - Scroll-triggered animations
- **Stripe.js** - Client-side payment processing
- **Progressive Web App** - Service worker and offline capabilities

## Getting Started

Follow these instructions to set up and run the project locally for development.

### Prerequisites

You must have the following software installed on your machine:

- Python 3.13+ and `pip`
- PostgreSQL 12+
- Redis server (for caching)
- A code editor like Visual Studio Code with the **Live Server** extension is recommended for running the frontend

---

### Backend Setup

1. **Clone the Repository**

   ```bash
   git clone https://github.com/aldjoted/SoundLightProClone.git
   cd SoundLightProClone/backend
   ```

2. **Create and Activate a Python Virtual Environment**

   ```bash
   # Create the virtual environment
   python -m venv venv

   # Activate on Windows
   venv\Scripts\activate

   # Activate on macOS/Linux
   source venv/bin/activate
   ```

3. **Install Dependencies**

   ```bash
   pip install -r requirements.txt
   ```

4. **Set Up PostgreSQL Database**

   - Open `psql` or your preferred PostgreSQL client.
   - Create a new database and a user for the application.

     ```sql
     CREATE DATABASE soundlightpro_db;
     CREATE USER myuser WITH PASSWORD 'mypassword';
     GRANT ALL PRIVILEGES ON DATABASE soundlightpro_db TO myuser;
     ```

5. **Configure Environment Variables**

   - In the `backend/` directory, create a file named `.env`.
   - Copy the contents of `.env.example` (if provided) or use the template below and fill in your credentials.

     ```env
     # Django Secret Key (generate one for production)
     DJANGO_SECRET_KEY='django-insecure-your-development-secret-key'
     DEBUG=True

     # Database Credentials
     DB_NAME=soundlightpro_db
     DB_USER=myuser
     DB_PASSWORD=mypassword
     DB_HOST=localhost
     DB_PORT=5432

     # Stripe API Keys (from your Stripe Dashboard)
     STRIPE_PUBLISHABLE_KEY=pk_test_...
     STRIPE_SECRET_KEY=sk_test_...

     # Google Gemini AI API Key (from Google AI Studio)
     GEMINI_API_KEY=your_gemini_api_key_here
     ```

6. **Run Database Migrations**

   This will create all the necessary tables in your database.

   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

7. **Create an Administrator Account**

   This account is used to log in to the Django admin panel to manage products.

   ```bash
   python manage.py createsuperuser
   ```

8. **Build Product Search Index**

   Generate vector embeddings and build the FAISS index for intelligent search.

   ```bash
   python manage.py build_product_index
   ```

9. **Run the Backend Server**

   ```bash
   python manage.py runserver
   ```

   The API will now be running at `http://127.0.0.1:8000/`. Leave this terminal open.

---

### Frontend Setup

1. **Configure Frontend**

   - Open `frontend/js/config.js`.
   - Ensure the `API_BASE_URL` points to your running backend (`http://127.0.0.1:8000/api/v1`).
   - The frontend automatically detects configuration from the backend.

2. **Run the Frontend Server**

   The frontend consists of static files and does not require a complex build process.

   - Open the `frontend/` directory in Visual Studio Code.
   - Right-click on the `index.html` file.
   - Select **"Open with Live Server"**.

   Your browser will open the website, typically at `http://127.0.0.1:5500/`. You can now interact with the application.

---

## Project Structure

```
SoundLightProClone/
├── backend/                    # Django REST API
│   ├── api/                   # Main application
│   │   ├── management/        # Custom management commands
│   │   │   └── commands/
│   │   │       └── build_product_index.py
│   │   ├── models.py          # Database models
│   │   ├── views.py           # API endpoints
│   │   ├── serializers.py     # Data serialization
│   │   ├── embeddings.py      # Vector embeddings
│   │   ├── vector_search.py   # FAISS search implementation
│   │   └── urls.py            # URL routing
│   ├── project/               # Django project settings
│   │   ├── settings.py        # Configuration
│   │   └── urls.py            # Main URL routing
│   ├── media/                 # User uploaded files
│   ├── requirements.txt       # Python dependencies
│   ├── .env                   # Environment variables
│   ├── product_embeddings.npy # Generated embeddings
│   └── product_faiss.index    # FAISS search index
├── frontend/                  # Vanilla JavaScript application
│   ├── js/                    # JavaScript modules
│   │   ├── apiService.js      # API communication
│   │   ├── main.js            # Application orchestrator
│   │   ├── cart.js            # Shopping cart logic
│   │   ├── auth.js            # Authentication
│   │   ├── ui.js              # UI rendering
│   │   ├── chatbot.js         # AI chatbot interface
│   │   ├── advanced-search.js # Search functionality
│   │   ├── mobile-nav.js      # Mobile navigation
│   │   └── config.js          # Configuration
│   ├── css/                   # Stylesheets
│   │   ├── main.css           # Main styles
│   │   ├── base/              # Base styles
│   │   ├── components/        # Component styles
│   │   ├── layouts/           # Layout styles
│   │   └── utilities/         # Utility classes
│   ├── images/                # Static images
│   └── *.html                 # HTML pages
└── README.md                  # Project documentation
```

---

## Management Commands

The project includes several custom management commands for maintaining the application:

### Build Product Index

Generate vector embeddings and build the FAISS index for semantic search:

```bash
python manage.py build_product_index
```

This command:
- Processes all available products
- Generates text embeddings using Sentence Transformers
- Builds a FAISS index for fast similarity search
- Saves embeddings and index to disk for quick loading

Run this command after adding new products or when setting up the application for the first time.

## API Endpoints

The core API endpoints are namespaced under `/api/v1/`.

| Method | URL Path                | Description                                        | Auth Required |
|--------|-------------------------|----------------------------------------------------|---------------|
| `GET`    | `/products/`            | Get a list of all available products. Can be filtered with `?search=query`. | No            |
| `GET`    | `/products/<int:pk>/`   | Get the details of a single product by its ID.     | No            |
| `GET`    | `/categories/`          | Get a list of all product categories.              | No            |
| `POST`   | `/register/`            | Create a new user account.                         | No            |
| `POST`   | `/token/`               | Log in a user by providing username/password to get JWTs. | No      |
| `POST`   | `/token/refresh/`       | Get a new access token using a refresh token.      | No            |
| `GET`    | `/user/`                | Get the profile of the currently authenticated user. | Yes           |
| `POST`   | `/orders/create/`       | Create a new order and process the payment.        | Yes           |
| `POST`   | `/chatbot/`             | Send messages to the AI chatbot for assistance.    | No            |

---

## Features in Detail

### AI-Powered Search
- **Vector Search**: Uses Sentence Transformers to generate semantic embeddings
- **FAISS Indexing**: Facebook AI Similarity Search for fast, scalable vector operations
- **Real-time Suggestions**: Debounced search with intelligent auto-completion
- **Context-Aware Results**: Search understands product relationships and categories

### Intelligent Chatbot
- **Google Gemini Integration**: Powered by advanced language models
- **RAG Implementation**: Retrieval-Augmented Generation with product context
- **Natural Language Processing**: Understands complex queries and provides relevant responses
- **Product Recommendations**: Context-aware suggestions based on user queries

### Performance Optimizations
- **Caching Strategy**: Redis-based caching for frequent database queries
- **Lazy Loading**: Images and content loaded on demand
- **API Optimization**: Efficient serializers and database queries
- **Client-Side Caching**: Local storage for frequently accessed data

---

## Troubleshooting

### Common Issues

**Backend fails to start:**
- Ensure PostgreSQL is running and accessible
- Verify database credentials in `.env` file
- Check that all Python dependencies are installed
- Ensure Redis server is running (if caching is enabled)

**Vector search not working:**
- Run `python manage.py build_product_index` to generate embeddings
- Ensure `sentence-transformers` and `faiss-cpu` are installed
- Check that products exist in the database

**Chatbot not responding:**
- Verify `GEMINI_API_KEY` is set in `.env` file
- Check Google AI Studio for API quota and billing
- Ensure network connectivity to Google AI services

**Frontend can't connect to backend:**
- Verify `API_BASE_URL` in `frontend/js/config.js`
- Check CORS settings in Django settings
- Ensure backend server is running on correct port

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow PEP 8 for Python code
- Use ESLint for JavaScript code quality
- Write tests for new features
- Update documentation for API changes
- Ensure responsive design for new UI components

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Deployment

### Production Considerations

**Backend:**
- Set `DEBUG=False` in production
- Use environment variables for all sensitive data
- Configure PostgreSQL with proper security settings
- Set up Redis for production caching
- Use Gunicorn or uWSGI for production server
- Configure static file serving (WhiteNoise or CDN)

**Frontend:**
- Minify CSS and JavaScript files
- Optimize images and implement CDN
- Enable gzip compression
- Configure proper cache headers
- Implement service worker for offline functionality

**Security:**
- Enable HTTPS for all communications
- Configure proper CORS settings
- Implement rate limiting for API endpoints
- Use secure session cookies
- Regular security updates for all dependencies

---

## Support

For support and questions:
- Create an issue on GitHub
- Check existing documentation
- Review troubleshooting section above

---

## Acknowledgments

- Built with Django and Django REST Framework
- Vector search powered by FAISS and Sentence Transformers
- AI functionality provided by Google Gemini
- Payment processing by Stripe
- UI components inspired by modern e-commerce best practices