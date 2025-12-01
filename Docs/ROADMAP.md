# Cahier des Charges - Projet SoundLightPro

**Date : 1er décembre 2025**

---

## 1. Objectif du Document

Le présent document sert de cahier des charges et de feuille de route évolutive pour le site e-commerce SoundLightPro. Il détaille les fonctionnalités déjà implémentées, les exigences des fonctionnalités à développer, et les améliorations techniques nécessaires pour assurer la performance, la sécurité et la scalabilité de la plateforme.

---

## 2. Périmètre Fonctionnel Actuel (Fonctionnalités Implémentées)

Cette section décrit les fonctionnalités actuellement en production et validées.

### 2.1. Sécurité et Authentification

#### Migration de la Sécurité des Tokens (P0.1) ✅
* Migration des tokens de rafraîchissement (refresh tokens) du localStorage vers des cookies httpOnly pour atténuer les vulnérabilités XSS.
* Le backend gère la configuration et la suppression sécurisées des cookies (via `LogoutView`).
* Les tokens d'accès sont stockés en mémoire et en sessionStorage (par onglet).

#### Authentification à Deux Facteurs (2FA) par Email ✅
* Vérification par code à 6 chiffres envoyé par email à chaque connexion.
* Expiration du code après 10 minutes.
* Protection contre les attaques par force brute avec verrouillage du compte (5 tentatives échouées → verrouillage de 15 minutes).
* Fonctionnalité de renvoi de code avec limitation de débit (3/minute).

#### Réinitialisation de Mot de Passe ✅
* Système complet de réinitialisation de mot de passe par email.
* Tokens à usage unique avec expiration (1 heure).
* Protection contre l'énumération d'emails (réponse identique que l'email existe ou non).
* Invalidation de tous les tokens de session après changement de mot de passe.

#### En-têtes de Sécurité et CSP ✅
* Content Security Policy (CSP) avec génération de nonces pour les scripts inline.
* Headers de sécurité complets : HSTS, X-Frame-Options, Permissions-Policy, COOP/CORP.
* Protection CSRF et XSS renforcée.

#### Limitation de Débit (Rate Limiting) ✅
* Protection des endpoints d'authentification contre les attaques par force brute.
* Limites configurables par IP (login: 5/min, inscription: 3/h, refresh: 10/min).

#### Vérification CAPTCHA ✅
* Support hCaptcha (recommandé, conforme RGPD) et reCAPTCHA v2/v3.
* Vérification obligatoire pour l'inscription.
* Mode développement permettant de désactiver la vérification.

### 2.2. Gestion des Commandes et Paiements

#### Système de Gestion des Commandes (P0.3) ✅
* Suivi complet du cycle de vie des commandes avec statuts (en attente, en attente de paiement, en traitement, expédiée, livrée, annulée, remboursée).
* Historique des commandes disponible pour le client dans son tableau de bord.
* Possibilité pour le client d'annuler une commande "en attente" ou "en traitement" depuis son tableau de bord.

#### Processus de Paiement Stripe ✅
* Processus de paiement complet implémenté sur la page panier (`cart.html`).
* Intégration avec Stripe pour le traitement des paiements (service `OrderView`).
* Architecture transactionnelle en deux phases : réservation du stock → paiement → confirmation.
* Gestion des erreurs Stripe détaillée (carte refusée, limite de débit, etc.).

#### Notifications de Disponibilité Stock (P1.2) ✅
* Modèle `StockNotificationRequest` pour les demandes de notification.
* Signaux Django (`pre_save`, `post_save`) sur le modèle `Product` pour détecter les réassorts.
* Envoi automatique d'emails lors du réassort.
* API endpoint (`/api/products/<id>/notify/`) pour les inscriptions.

### 2.3. Tableau de Bord Client

#### Tableau de Bord Client Complet (P1.4) ✅
* Un tableau de bord (`dashboard.html`) sécurisé et complet est implémenté.
* **Gestion de profil :** L'utilisateur peut mettre à jour ses informations personnelles (nom, téléphone, biographie, préférences de langue, notifications).
* **Sécurité :** L'utilisateur peut changer son mot de passe avec validation.
* **Historique des commandes :** Suivi détaillé des commandes avec filtres et recherche.
* **Gestion des avis :** L'utilisateur peut voir, éditer et supprimer ses propres avis.
* **Intégration de la liste de favoris :** Gestion complète de la liste de favoris.
* **Gestion des adresses :** Ajout, édition et suppression de plusieurs adresses de livraison avec validation.
* **Gestion des méthodes de paiement :** Ajout, suppression et définition par défaut des méthodes de paiement (intégration Stripe).

### 2.4. Catalogue Produits

#### Section des Marques Partenaires (P1.5) ✅
* Galerie de logos des marques implémentée sur la page d'accueil (`index.html`).
* Le backend supporte le listing des marques avec descriptions et images (`Brand` model, `BrandList` view).
* Les produits peuvent être filtrés par marque.

#### Galerie d'Images Améliorée (P2.4) ✅
* Le backend supporte plusieurs images par produit (via le modèle `ProductImage`).
* Support des vidéos produits (fichiers uploadés et URLs YouTube) via le modèle `ProductVideo`.
* Support des pièces jointes (manuels, fiches techniques) via le modèle `ProductAttachment`.

#### Système d'Avis Produits ✅
* Système complet d'avis implémenté.
* Les utilisateurs peuvent créer, lire et filtrer les avis sur la page produit (`product.html`).
* Le backend supporte les statistiques d'avis (note moyenne, nombre d'avis, distribution des notes).
* Logique pour le statut "Achat Vérifié" incluse.
* Pagination des avis.

#### Système de Liste de Favoris (Wishlist) ✅
* Fonctionnalité complète de liste de favoris implémentée.
* Les utilisateurs peuvent ajouter/supprimer des articles.
* Les listes "invité" sont synchronisées après connexion (`WishlistView`, `WishlistSyncView`).

#### Produits Recommandés (Standard & Sémantique) ✅
* Section de produits recommandés implémentée sur la page produit (`product.html`).
* Le backend supporte deux modes :
  * Standard : basé sur catégorie et fourchette de prix (±30%).
  * Sémantique : recherche vectorielle IA via FAISS.

### 2.5. IA et Recherche

#### Chatbot IA (P2.1) ✅
* Implémentation d'un chatbot via l'API Gemini (modèle gemini-2.5-flash).
* Le chatbot est disponible sur toutes les pages et utilise le RAG (recherche vectorielle) pour fournir des réponses contextuelles sur les produits.
* Prompt système sécurisé avec protection contre les injections.
* Limitation de débit (10 requêtes/heure par IP).

#### Recherche Vectorielle (FAISS) ✅
* Index vectoriel pour la recherche sémantique des produits.
* Intégration avec sentence-transformers pour les embeddings.
* Utilisé par le chatbot et les produits recommandés.

### 2.6. Internationalisation

#### Support Multilingue ✅
* Traductions français/anglais pour les catégories, marques et produits.
* Détection de la langue via l'en-tête `Accept-Language`.
* Fichiers de traduction Django (`.po`/`.mo`) pour l'interface admin.

### 2.7. PWA et Hors-Ligne

#### Service Worker ✅
* Stratégies de cache intelligentes (Network First pour API, Cache First pour assets).
* Page hors-ligne de secours.
* Background Sync pour les paniers.
* Nettoyage des caches à la déconnexion pour la sécurité.

### 2.8. Documentation et Qualité

#### Documentation API (OpenAPI/Swagger) ✅
* Génération automatique de la documentation via `drf-spectacular`.
* Interface Swagger UI pour tester les endpoints.

#### Consolidation de la Documentation (TD.3) ✅
* La documentation redondante a été nettoyée et consolidée.

---

## 3. Problèmes Critiques Identifiés (Action Immédiate Requise)

### 🔴 P0.CRITICAL-1 - Restauration du Stock en Cas d'Échec de Paiement
* **Problème :** Dans `services.py`, le stock est décrémenté en Phase 1 mais **n'est jamais restauré** si le paiement Stripe échoue en Phase 2.
* **Impact :** Perte permanente de stock dans la base de données.
* **Solution :** Implémenter un mécanisme de rollback du stock en cas d'échec de paiement.
* **Effort estimé :** 1-2 heures.

### 🔴 P0.CRITICAL-2 - Rotation des Credentials Exposés
* **Problème :** Le fichier `.env` contient des credentials réels (clé API Gmail, Stripe, Gemini, hCaptcha).
* **Impact :** Risque de compromission si le fichier est exposé (git, logs, etc.).
* **Solution :** Effectuer une rotation immédiate de tous les secrets.
* **Effort estimé :** 1-2 heures.

### 🔴 P0.CRITICAL-3 - Mot de Passe Base de Données Faible
* **Problème :** `DB_PASSWORD=2003` (4 chiffres seulement).
* **Impact :** Vulnérable aux attaques par force brute.
* **Solution :** Générer un mot de passe complexe (32+ caractères).
* **Effort estimé :** 30 minutes.

---

## 4. Évolutions et Nouvelles Fonctionnalités (Feuille de Route)

Cette section détaille les exigences pour les prochaines versions de la plateforme, priorisées par impact.

### 4.1. Priorité 0 (Critique - Prochaine Version)

#### P0.2 - Tests Automatisés
* **Exigence :** Mettre en place une suite de tests robuste pour garantir la non-régression et la fiabilité.
* **Backend :** Tests unitaires pour les services et modèles (Django test suite).
* **Backend :** Tests d'intégration pour les API critiques (Commandes, Auth, Avis).
* **Frontend :** Tests E2E (Vitest + Playwright).
* **DevOps :** Intégration dans le pipeline CI/CD (GitHub Actions).
* **Effort estimé :** 5-7 jours.

#### P0.4 - Migration vers Redis pour le Cache
* **Exigence :** Remplacer le cache en mémoire locale par Redis pour supporter les déploiements multi-processus.
* **Impact :** La limitation de débit actuelle (`LocMemCache`) est par processus, pas globale.
* **Solution :** Configurer `django-redis` pour le cache par défaut.
* **Effort estimé :** 1-2 jours.

#### P0.5 - Option "Se Souvenir de l'Appareil" pour la 2FA
* **Exigence :** Réduire la friction de connexion pour les utilisateurs de confiance.
* **Solution :** Stocker un token "appareil de confiance" en cookie httpOnly (durée : 30 jours).
* **Solution :** Permettre aux utilisateurs de voir/révoquer leurs appareils de confiance.
* **Effort estimé :** 2-3 jours.

### 4.2. Priorité 1 (Haute Valeur - Ce Trimestre)

#### P1.1 - Comparateur de Produits
* **Exigence :** Permettre aux utilisateurs de comparer les spécifications de plusieurs produits côte à côte.
* **Frontend :** Interface pour comparer jusqu'à 4 produits simultanément, avec mise en surbrillance des différences.
* **Backend :** Nouveau point d'API pour récupérer et formater les données de comparaison pour plusieurs ID de produits.
* **Prérequis :** P1.7 (Spécifications Dynamiques).
* **Effort estimé :** 4-6 jours.

#### P1.3 - Filtrage Avancé
* **Statut :** Filtrage basique (par marque ou catégorie unique) implémenté.
* **Exigence :** Améliorer la découverte de produits via des filtres multi-sélections.
* **Backend :** Implémenter une logique de filtrage avancée (ex: `django-filter`).
* **Frontend :** Filtres multi-sélections (marque, catégorie, gamme de prix).
* **Frontend :** Filtres basés sur les spécifications (puissance, poids, etc.) – voir P1.7.
* **Frontend :** Persistance des filtres dans les paramètres de l'URL.
* **Effort estimé :** 4-6 jours.

#### P1.6 - Amélioration de l'Importation Admin
* **Exigence :** Faciliter l'importation en masse de produits, y compris leurs images multiples.
* **Backend :** Personnaliser l'intégration `django-import-export` pour le modèle `Product`.
* **Backend :** Ajouter le support pour l'importation d'images multiples (via une colonne `image_urls` séparées par des virgules dans le fichier d'import).
* **Backend :** Surcharger les méthodes d'import pour parser la colonne d'images, les télécharger (ou les trouver) et créer les objets `ProductImage` associés.
* **Effort estimé :** 4-6 jours.

#### P1.7 - Modèle de Spécifications Dynamiques
* **Exigence :** Permettre de stocker des fiches techniques flexibles pour alimenter le comparateur et le filtrage.
* **Backend :** Créer un nouveau modèle (`ProductSpecification`) ou ajouter un `JSONField` au modèle `Product` pour stocker des paires clé-valeur arbitraires (ex: "Puissance": "500W", "Poids": "15kg").
* **Backend :** Mettre à jour l'interface admin pour éditer ces spécifications.
* **Note :** Cette tâche est un prérequis pour P1.1 (Comparateur) et P1.3 (Filtres avancés).
* **Effort estimé :** 3-5 jours.

#### P1.8 - Persistance du Panier Côté Serveur
* **Exigence :** Synchroniser le panier entre appareils et éviter la perte de données.
* **Problème actuel :** Le panier est stocké uniquement en localStorage (spécifique à l'appareil).
* **Backend :** Créer un modèle `Cart` et `CartItem` liés à l'utilisateur.
* **Backend :** API endpoints pour synchroniser le panier.
* **Frontend :** Fusionner le panier local avec le panier serveur après connexion.
* **Effort estimé :** 4-6 jours.

### 4.3. Priorité 2 (Valeur Moyenne - Prochain Trimestre)

#### P2.2 - Récupération de Paniers Abandonnés
* **Exigence :** Mettre en place un système pour relancer les utilisateurs ayant abandonné leur panier.
* **Backend :** Logique pour tracker les paniers "abandonnés" (ex: paniers de > 3h avec articles).
* **Backend :** Campagnes d'email automatisées (ex: rappel après 24h).
* **Frontend :** Tableau de bord analytique pour suivre le taux de récupération.
* **Prérequis :** P1.8 (Persistance du Panier Côté Serveur).
* **Effort estimé :** 4-6 jours.

#### P2.3 - Aperçu Rapide Produit
* **Exigence :** Permettre aux utilisateurs d'ajouter au panier depuis la liste de produits sans changer de page.
* **Backend :** Assurer l'optimisation du point d'API de détail produit (`/api/products/<id>/`) pour un chargement rapide.
* **Frontend :** Modale d'aperçu rapide sur la grille de produits.
* **Effort estimé :** 2-3 jours.

#### P2.5 - Amélioration de l'Autocomplétion de Recherche
* **Exigence :** Fournir des suggestions de recherche pertinentes en temps réel.
* **Backend :** Créer un nouveau point d'API léger pour les suggestions (`/api/search/suggest/`).
* **Frontend :** Suggestions de produits, catégories et marques dans le menu déroulant de recherche.
* **Frontend :** Historique des recherches récentes.
* **Effort estimé :** 4-6 jours.

#### P2.6 - Exposition des Pièces Jointes sur le Frontend
* **Exigence :** Permettre aux utilisateurs de télécharger des manuels et fiches techniques.
* **Statut :** Le modèle `ProductAttachment` et le serializer existent déjà.
* **Frontend :** Afficher une section "Téléchargements" sur la page de détail produit.
* **Effort estimé :** 1-2 jours.

#### P2.7 - Mise à jour de l'Index Vectoriel en Temps Réel
* **Exigence :** Assurer que la recherche IA (chatbot) dispose toujours des données produits à jour.
* **Backend :** La commande `build_product_index` est actuellement manuelle.
* **Backend :** Implémenter des signaux Django (`post_save`, `post_delete`) sur le modèle `Product` pour mettre à jour automatiquement (ajout, ré-indexation, suppression) l'index vectoriel FAISS, soit en temps réel, soit via une tâche en file d'attente.
* **Effort estimé :** 3-4 jours.

### 4.4. Priorité 3 (Faible Priorité - Futur)

#### P3.1 - Support Multi-Devises
* **Exigence :** Afficher les prix dans la devise locale de l'utilisateur (XAF, EUR, USD).
* **Backend :** Intégration d'une API de taux de change (ex: BCE).
* **Backend :** Stocker les prix dans une devise de base (ex: EUR) et convertir à la volée.
* **Effort estimé :** 7-10 jours.

#### P3.2 - Tableau de Bord Analytique Admin
* **Exigence :** Fournir des outils de visualisation des données de vente.
* **Backend :** Nouveaux points d'API pour agréger les données de ventes, tendances clients, et produits phares.
* **Frontend :** Interface de visualisation (pour l'admin).
* **Effort estimé :** 5-7 jours.

#### P3.3 - Programme de Fidélité
* **Exigence :** Mettre en place un système de points et récompenses.
* **Backend :** Modèles pour le système de points, récompenses, et parrainage.
* **Frontend :** Interface client pour voir et échanger les points.
* **Effort estimé :** 10-14 jours.

#### P3.4 - Améliorations PWA (Application Mobile)
* **Exigence :** Améliorer l'expérience PWA pour se rapprocher d'une application native.
* **Backend :** Points d'API pour la synchronisation du panier hors-ligne.
* **Backend :** Intégration des notifications Push Web (ex: `django-web-push`).
* **Effort estimé :** 7-10 jours.

#### P3.5 - Synchronisation d'Inventaire en Temps Réel
* **Exigence :** Afficher des niveaux de stock précis et éviter les ventes hors stock.
* **Backend :** Mises à jour du stock via WebSockets (Django Channels).
* **Frontend :** Indicateurs de stock en direct (ex: "Plus que 3 articles !").
* **Frontend :** Validation automatique du panier.
* **Effort estimé :** 5-7 jours.

#### P3.6 - Chatbot Configurable par l'Admin
* **Exigence :** Permettre à un administrateur de modifier le "prompt système" du chatbot IA sans déploiement.
* **Backend :** Le prompt est actuellement codé en dur dans `ChatbotView`.
* **Backend :** Créer un modèle `SiteConfiguration` pour stocker le prompt système en base de données.
* **Backend :** Mettre à jour `ChatbotView` pour qu'il récupère le prompt depuis ce modèle.
* **Effort estimé :** 2-3 jours.

---

## 5. Exigences Non-Fonctionnelles et Dette Technique

Tâches de fond nécessaires pour maintenir la qualité et la performance du code.

#### TD.1 - Refactorisation Frontend
* **Tâche :** Migrer l'utilisation restante de `innerHTML` vers `createElement()` pour améliorer la sécurité et la performance.
* **Tâche :** Implémenter le "lazy loading" des modules JS et le "code splitting".
* **Effort estimé :** 3-5 jours.

#### TD.2 - Versionnement de l'API
* **Tâche :** Mettre en place un namespace explicite `/api/v1/` pour tous les points d'API.
* **Tâche :** Documenter la stratégie de versionnement et la politique de dépréciation.
* **Effort estimé :** 2-3 jours.

#### TD.4 - Suivi des Performances
* **Tâche :** Intégrer un service de suivi d'erreurs (ex: Sentry).
* **Tâche :** Collecter des métriques de performance (ex: `django-silk` en dev, New Relic/Datadog en production).
* **Effort estimé :** 3-4 jours.

#### TD.5 - Standardisation des Réponses d'Erreur
* **Tâche :** Unifier le format des réponses d'erreur API (actuellement mix de `{'error': ...}` et `{'detail': ...}`).
* **Effort estimé :** 1-2 jours.

#### TD.6 - Suppression de 'unsafe-inline' pour les Styles
* **Tâche :** Migrer les styles inline vers des feuilles de style externes ou utiliser des nonces.
* **Impact :** Améliorer la posture de sécurité CSP.
* **Effort estimé :** 2-3 jours.

---

## 6. Fonctionnalités Reportées

Fonctionnalités évaluées mais reportées en raison d'une complexité élevée ou d'un ROI incertain :

* WebAssembly pour calculs lourds
* Migration vers GraphQL
* Paiements via Blockchain
* Visualisation de produits en Réalité Augmentée (AR)
* Recherche vocale

---

## 7. Jalons de Version

* **v1.5.0** - Correction des problèmes critiques (P0.CRITICAL-*).
* **v2.0.0** - Finalisation des items P0.
* **v2.1.0** - Finalisation des items P1.
* **v2.2.0** - Finalisation des items P2.
* **v3.0.0** - Mises à jour majeures d'architecture, items P3.

---

## 8. Évaluation Technique Actuelle

### Points Forts
* ✅ Architecture de sécurité solide (tokens httpOnly, 2FA, rate limiting)
* ✅ Gestion transactionnelle des commandes avec `select_for_update()`
* ✅ Système de cache avec annotations pour éviter les requêtes N+1
* ✅ Documentation API automatisée (OpenAPI/Swagger)
* ✅ PWA avec stratégies de cache intelligentes

### Points d'Amélioration
* ⚠️ Stock non restauré en cas d'échec de paiement
* ⚠️ Cache en mémoire locale inadapté au multi-processus
* ⚠️ Panier uniquement côté client (pas de synchronisation)
* ⚠️ 2FA obligatoire à chaque connexion (friction élevée)
* ⚠️ Styles inline autorisés dans CSP

### Note Globale : **B-**
Une implémentation solide avec de bonnes bases de sécurité, mais le bug de consistance du stock et l'absence de persistance du panier empêchent une note de passage pour la production.

---

## 9. Contribuer à ce document

Pour suggérer des fonctionnalités, ouvrez une Issue GitHub avec le label `enhancement`.