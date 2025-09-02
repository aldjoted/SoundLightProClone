# SoundLightPro Clone

## Overview

SoundLightPro Clone is a fully functional e-commerce website built to replicate the core features of an online store for professional audio and lighting equipment. This project demonstrates a modern, decoupled web architecture where a powerful Django REST API serves as the backend, and a lightweight, dependency-free Vanilla JavaScript application serves as the frontend. This separation of concerns allows for a scalable and maintainable codebase.

## Core Features

-   **Product Catalog & Search:** Browse a grid of available products and perform real-time searches against the product database.
-   **User Authentication:** Secure user registration, login, and logout functionality using JSON Web Tokens (JWT).
-   **Client-Side Shopping Cart:** A fully interactive shopping cart that allows users to add, update quantities, and remove items.
-   **LocalStorage Cart Persistence:** The shopping cart state is saved in the browser's LocalStorage, so it persists across page reloads and browser sessions.
-   **Secure Checkout:** A multi-step checkout process with shipping information and secure payment integration using Stripe.js.

## Tech Stack

#### Backend

-   **Python 3.x**
-   **Django**
-   **Django REST Framework** for building the API
-   **PostgreSQL** for the database
-   **djangorestframework-simplejwt** for JWT authentication

#### Frontend

-   **HTML5**
-   **CSS3** (Flexbox/Grid for responsive layouts)
-   **Vanilla JavaScript (ES6+)** with a modular structure
-   **Fetch API** for all communication with the backend

## Getting Started

Follow these instructions to set up and run the project locally for development.

### Prerequisites

You must have the following software installed on your machine:
-   Python 3.x and `pip`
-   PostgreSQL
-   A code editor like Visual Studio Code with the **Live Server** extension is recommended for running the frontend.

---

### Backend Setup

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/your-username/soundlightpro_clone.git
    cd soundlightpro_clone/backend
    ```

2.  **Create and Activate a Python Virtual Environment**
    ```bash
    # Create the virtual environment
    python -m venv venv

    # Activate on Windows
    venv\Scripts\activate

    # Activate on macOS/Linux
    source venv/bin/activate
    ```

3.  **Install Dependencies**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Set Up PostgreSQL Database**
    -   Open `psql` or your preferred PostgreSQL client.
    -   Create a new database and a user for the application.
        ```sql
        CREATE DATABASE soundlightpro_db;
        CREATE USER myuser WITH PASSWORD 'mypassword';
        GRANT ALL PRIVILEGES ON DATABASE soundlightpro_db TO myuser;
        ```

5.  **Configure Environment Variables**
    -   In the `backend/` directory, create a file named `.env`.
    -   Copy the contents of `.env.example` (if provided) or use the template below and fill in your credentials.
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
        ```

6.  **Run Database Migrations**
    This will create all the necessary tables in your database.
    ```bash
    python manage.py makemigrations
    python manage.py migrate
    ```

7.  **Create an Administrator Account**
    This account is used to log in to the Django admin panel to manage products.
    ```bash
    python manage.py createsuperuser
    ```

8.  **Run the Backend Server**
    ```bash
    python manage.py runserver
    ```
    The API will now be running at `http://127.0.0.1:8000/`. Leave this terminal open.

---

### Frontend Setup

1.  **Configure Frontend**
    -   Open `frontend/js/main.js`.
    -   Update the `STRIPE_PUBLISHABLE_KEY` variable with your publishable key from your `.env` file.
    -   Ensure the `API_BASE_URL` in `frontend/js/apiService.js` points to your running backend (`http://127.0.0.1:8000/api/v1`).

2.  **Run the Frontend Server**
    The frontend consists of static files and does not require a complex build process.
    -   Open the `frontend/` directory in Visual Studio Code.
    -   Right-click on the `index.html` file.
    -   Select **"Open with Live Server"**.

    Your browser will open the website, typically at `http://127.0.0.1:5500/`. You can now interact with the application.

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