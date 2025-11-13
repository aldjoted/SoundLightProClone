# Guide de Déploiement : SoundLightProClone

Ce guide explique comment déployer l'application SoundLightProClone, qui se compose d'un backend Django et d'un frontend JavaScript statique.

## 1\. Déploiement du Backend (Django)

Le backend est une API Django qui nécessite un environnement Python, une base de données PostgreSQL et un cache Redis, comme indiqué dans les fichiers `requirements.txt` et `settings.py`.

### Services Cloud Recommandés

  * **Hyperscalers (Gamme complète) :**
      * AWS (Elastic Beanstalk, EC2)
      * Google Cloud (App Engine, Compute Engine)
      * Microsoft Azure (App Service, VMs)
  * **PaaS (Plus simple, maintenance réduite) :**
      * Render (fortement recommandé pour cette architecture)
      * Heroku
  * **IaaS / VPS (Contrôle et coût) :**
      * DigitalOcean (Droplets)
      * Linode (Akamai)
      * OVHcloud ou Scaleway (Alternatives européennes)
  * **Services Managés (Nécessaires) :**
      * **Base de données (PostgreSQL) :** AWS RDS, Google Cloud SQL, Azure Database, DigitalOcean Managed Databases, etc.
      * **Cache (Redis) :** AWS ElastiCache, Google Memorystore, Azure Cache, DigitalOcean Managed Redis, etc.

### Étapes de Déploiement (Exemple avec VM - EC2, Compute Engine, DigitalOcean Droplet)

1.  **Provisionner les Services :**

      * Créez une VM (ex: Ubuntu 22.04).
      * Créez une base de données **PostgreSQL** managée.
      * Créez une instance **Redis** managée.

2.  **Configuration du Serveur :**

      * Installez Python 3.13, `venv`, et `nginx`.
      * Clonez le projet : `git clone https://github.com/aldjoted/SoundLightProClone.git`.
      * Configurez le `venv` et installez les dépendances :
        ```bash
        cd backend
        python -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
        ```

3.  **Configuration de l'Environnement (Fichier `.env`) :**

      * Configurez les variables d'environnement comme spécifié dans `project/settings.py`.
      * `DJANGO_SECRET_KEY` : (Générez une nouvelle clé).
      * `DEBUG=False` : **Obligatoire** en production.
      * `ALLOWED_HOSTS` : Le domaine de votre API (ex: `api.votresite.com`).
      * `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` : Identifiants de votre base de données PostgreSQL.
      * `CORS_ALLOWED_ORIGINS` : L'URL de votre frontend (ex: `https://www.votresite.com`).
      * `STRIPE_SECRET_KEY` et `GEMINI_API_KEY` (requis par le projet).
      * `EMAIL_BACKEND`, `EMAIL_HOST_USER`, etc. (pour les emails de production).

4.  **Préparation de l'Application :**

      * Appliquez les migrations : `python manage.py migrate`.
      * Générez l'index FAISS (requis pour la recherche IA) :
        ```bash
        python manage.py build_product_index
        ```
      * Collectez les fichiers statiques (pour l'admin Django) : `python manage.py collectstatic`.

5.  **Serveur d'Application (Gunicorn) :**

      * Le projet inclut `gunicorn`. Exécutez-le en production via un service `systemd` pour la robustesse.
      * Fichier de service (`/etc/systemd/system/gunicorn.service` - Exemple) :
        ```ini
        [Unit]
        Description=gunicorn daemon
        After=network.target

        [Service]
        User=votre_utilisateur
        Group=www-data
        WorkingDirectory=/chemin/vers/backend
        ExecStart=/chemin/vers/backend/venv/bin/gunicorn --workers 3 --bind unix:/run/gunicorn.sock project.wsgi:application

        [Install]
        WantedBy=multi-user.target
        ```

6.  **Reverse Proxy (Nginx) :**

      * Configurez Nginx pour transférer les requêtes à Gunicorn et servir les fichiers médias/statiques.
      * Fichier de configuration (`/etc/nginx/sites-available/votresite` - Exemple) :
        ```nginx
        server {
            listen 80;
            listen 443 ssl;
            server_name api.votresite.com;

            # Config SSL (ex: Let's Encrypt)
            # ssl_certificate /etc/letsencrypt/live/api.votresite.com/fullchain.pem;
            # ssl_certificate_key /etc/letsencrypt/live/api.votresite.com/privkey.pem;

            location = /favicon.ico { access_log off; log_not_found off; }
            
            location /static/ {
                root /chemin/vers/backend;
            }

            location /media/ {
                root /chemin/vers/backend;
            }

            location / {
                include proxy_params;
                proxy_pass http://unix:/run/gunicorn.sock;
            }
        }
        ```

-----

## 2\. Déploiement du Frontend (Vite)

Le frontend est un site statique (HTML, CSS, JS) construit avec Vite.

### Services Cloud Recommandés

  * **Plateformes Statiques (Plus simple) :**
      * Netlify
      * Vercel
      * Render (Static Sites)
      * DigitalOcean App Platform
      * GitHub Pages
      * Azure Static Web Apps
  * **Stockage + CDN (Approche manuelle) :**
      * **AWS :** S3 + CloudFront
      * **Google Cloud :** Cloud Storage + Cloud CDN
      * **Microsoft Azure :** Blob Storage + Azure CDN

### Étapes de Déploiement (Exemple avec S3 + CloudFront)

1.  **Configuration de l'API :**

      * Assurez-vous que votre code frontend (probablement dans `js/apiService.js` ou un fichier de configuration) **pointe vers l'URL de votre API de production** (ex: `https://api.votresite.com`). Le `README.md` indique que les API sont sous `/api/v1/`.

2.  **Build de l'Application :**

      * Depuis le dossier `frontend/` :
        ```bash
        npm install
        npm run build
        ```
      * Vite génère un dossier `dist/` contenant tous les fichiers statiques optimisés.

3.  **Hébergement (S3) :**

      * Créez un bucket S3.
      * Activez "l'hébergement de site web statique".
      * Téléchargez **tout le contenu** du dossier `dist/` dans le bucket.

4.  **Distribution (CloudFront) :**

      * Créez une distribution CloudFront.
      * Configurez l'origine pour pointer vers votre bucket S3.
      * Configurez un certificat SSL (via AWS Certificate Manager) et attachez-le à votre distribution pour utiliser un domaine personnalisé (ex: `www.votresite.com`).

-----

## Résumé de la Configuration

  * **Backend (API)** : `api.votresite.com`

      * Hébergé sur un PaaS (Render, Heroku) ou une VM (EC2, Droplet, etc.) avec Nginx + Gunicorn.
      * Connecté à une base de données PostgreSQL managée.
      * Connecté à un cache Redis managé.
      * `CORS_ALLOWED_ORIGINS` doit être `https://www.votresite.com`.

  * **Frontend (Site)** : `www.votresite.com`

      * Fichiers statiques (buildés via `npm run build`).
      * Hébergés sur une plateforme statique (Netlify, Vercel, Render) ou un service type S3 + CDN.
      * Le code JS doit appeler `https://api.votresite.com`.