# Cahier des Charges - Projet SoundLightPro

**Date : 6 décembre 2025**

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
* **[NEW]** Rate limiting côté client intégré dans `apiService.js` (60 req/min par endpoint).

#### Vérification CAPTCHA ✅
* Support hCaptcha (recommandé, conforme RGPD) et reCAPTCHA v2/v3.
* Vérification obligatoire pour l'inscription.
* Mode développement permettant de désactiver la vérification.

#### Rotation des Credentials (P0.CRITICAL-2) ✅
* Rotation complète des clés API (Stripe, Gemini, etc.).
* Sécurisation de la configuration `.env` et vérification des exclusions git.
* Audit du code pour détecter les secrets hardcodés (aucun trouvé).

#### Classes de Sécurité Frontend ✅
* **[NEW]** `InputSanitizer` : Validation et sanitization des entrées utilisateur (emails, URLs, recherche).
* **[NEW]** `RateLimiter` : Limitation de débit côté client intégrée à `apiService.js`.
* **[NEW]** `CSPNonceManager` : Gestion des nonces CSP pour les scripts dynamiques.
* **[NEW]** Intégration de la validation avancée dans `validators.js`.

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

#### Gestion des Échecs de Paiement (P0.CRITICAL-1) ✅
* Mécanisme de rollback transactionnel implémenté.
* En cas d'échec de paiement Stripe (Phase 2), le stock est automatiquement restauré et la commande annulée.
* Logs détaillés pour le suivi des incidents de paiement.

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
  * **[FIXED]** Fonction `renderAddresses()` implémentée avec affichage complet des détails d'adresse.
* **Gestion des méthodes de paiement :** Ajout, suppression et définition par défaut des méthodes de paiement (intégration Stripe).
  * **[FIXED]** Fonction `renderPaymentMethods()` implémentée avec affichage des icônes de marque de carte.

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
* **[FIXED]** Bug de variable `body` non définie dans `renderReviews()` corrigé.

#### Système de Liste de Favoris (Wishlist) ✅
* Fonctionnalité complète de liste de favoris implémentée.
* Les utilisateurs peuvent ajouter/supprimer des articles.
* Les listes "invité" sont synchronisées après connexion (`WishlistView`, `WishlistSyncView`).

#### Produits Recommandés (Standard & Sémantique) ✅
* Section de produits recommandés implémentée sur la page produit (`product.html`).
* Le backend supporte deux modes :
  * Standard : basé sur catégorie et fourchette de prix (±30%).
  * Sémantique : recherche vectorielle IA via FAISS.

#### Importation de Produits en Masse (P1.6) ✅
* Support de l'importation Excel/CSV via `django-import-export`.
* Gestion des images multiples via URLs dans l'import.
* Action d'administration pour ré-indexer dans FAISS.

#### Téléchargements et Pièces Jointes (P2.6) ✅
* Section "Downloads & Manuals" sur la page produit.
* Support des fichiers PDF, manuels, etc.

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

#### Recherche Avancée avec Analytics ✅
* **[NEW]** Suivi des recherches via `GoogleAnalytics.trackSearch()`.
* Debouncing adaptatif pour une meilleure UX.
* Autocomplétion avec navigation clavier accessible (ARIA).

### 2.6. Internationalisation

#### Support Multilingue ✅
* Traductions français/anglais pour les catégories, marques et produits.
* Détection de la langue via l'en-tête `Accept-Language`.
* Fichiers de traduction Django (`.po`/`.mo`) pour l'interface admin.
* **[NEW]** Système i18n frontend complet avec 500+ clés de traduction.

### 2.7. PWA et Hors-Ligne

#### Service Worker ✅
* Stratégies de cache intelligentes (Network First pour API, Cache First pour assets).
* Page hors-ligne de secours.
* Background Sync pour les paniers.
* Nettoyage des caches à la déconnexion pour la sécurité.

#### Indicateur Hors-Ligne ✅
* **[NEW]** Composant `OfflineIndicator` avec détection de connectivité.
* Bannière non-intrusive avec tentative de reconnexion automatique.

#### Invite d'Installation PWA ✅
* **[NEW]** Composant `InstallPrompt` pour l'installation PWA.
* Détection du support navigateur et statut d'installation.

### 2.8. Analytics et Monitoring

#### Suivi Analytics Frontend ✅
* **[NEW]** Classe `GoogleAnalytics` avec méthodes de suivi :
  * `trackPageView()` - Suivi des pages vues
  * `trackSearch()` - Suivi des recherches (maintenant intégré)
  * `trackAddToCart()` - Suivi des ajouts au panier (maintenant intégré)
  * `trackPurchase()` - Suivi des achats
* **[NEW]** `CustomEventTracker` pour événements personnalisés.
* **[NEW]** `PerformanceTracker` pour Core Web Vitals (LCP, FID, CLS).

#### Suivi des Erreurs ✅
* **[NEW]** Classe `ErrorTracking` intégrée à `ErrorBoundary`.
* Support Sentry pour la capture d'erreurs en production.
* Logs locaux pour le débogage.

### 2.9. Documentation et Qualité

#### Documentation API (OpenAPI/Swagger) ✅
* Génération automatique de la documentation via `drf-spectacular`.
* Interface Swagger UI pour tester les endpoints.

---

## 3. Fonctionnalités en Développement

*Section vide - toutes les fonctionnalités prioritaires ont été implémentées.*

---

## 4. Fonctionnalités Planifiées

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

---

## 5. Exigences Non-Fonctionnelles et Dette Technique

Tâches de fond nécessaires pour maintenir la qualité et la performance du code.

#### TD.1 - Refactorisation Frontend ✅ PARTIELLEMENT COMPLÉTÉ
* ✅ **Complété :** Migration des fonctions critiques vers `createElement()` (dashboard, cart, ui).
* ✅ **Complété :** Code splitting implémenté via Vite (68 modules).
* ⚠️ **En cours :** Quelques usages de `innerHTML` restants dans des cas non-critiques.
* **Effort restant :** 1-2 jours.

#### TD.2 - Versionnement de l'API
* **Tâche :** Mettre en place un namespace explicite `/api/v1/` pour tous les points d'API.
* **Tâche :** Documenter la stratégie de versionnement et la politique de dépréciation.
* **Effort estimé :** 2-3 jours.

#### TD.3 - Consolidation de la Documentation ✅
* Documentation complète disponible dans le dossier `Docs/`.
* Index, Quick Start, Architecture, API Documentation, et plus.
* **Statut :** Complété.

#### TD.4 - Suivi des Performances ✅ COMPLÉTÉ
* ✅ **Complété :** `ErrorTracking` avec support Sentry intégré.
* ✅ **Complété :** `PerformanceMonitor` pour les métriques Web Vitals.
* ✅ **Complété :** `PerformanceTracker` dans analytics.js.
* **Statut :** Complété.

#### TD.5 - Standardisation des Réponses d'Erreur
* **Tâche :** Unifier le format des réponses d'erreur API (actuellement mix de `{'error': ...}` et `{'detail': ...}`).
* **Effort estimé :** 1-2 jours.

#### TD.6 - Suppression de 'unsafe-inline' pour les Styles
* **Tâche :** Migrer les styles inline vers des feuilles de style externes ou utiliser des nonces.
* **Impact :** Améliorer la posture de sécurité CSP.
* **Effort estimé :** 2-3 jours.

#### TD.7 - Nettoyage du Code Mort ✅ COMPLÉTÉ
* ✅ **Complété :** Audit complet du code frontend (6 décembre 2025).
* ✅ **Complété :** Fonctions manquantes implémentées (`renderAddresses`, `renderPaymentMethods`).
* ✅ **Complété :** Bug de variable non définie corrigé dans `renderReviews`.
* ✅ **Complété :** Intégration des fonctions analytics précédemment inutilisées.
* ✅ **Complété :** Intégration des classes de sécurité (`RateLimiter`, `InputSanitizer`).
* **Statut :** Complété.

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

* **v1.5.0** ✅ - Correction des problèmes critiques (P0.CRITICAL-*).
* **v2.0.0** ✅ - Finalisation des items P0.
* **v2.1.0** ✅ - Finalisation des items P1.
* **v2.2.0** ✅ - Finalisation des items P2.
* **v2.2.1** ✅ - Correction des bugs frontend et intégration des fonctions inutilisées (6 décembre 2025).
* **v3.0.0** - Mises à jour majeures d'architecture, items P3.

---

## 8. Évaluation Technique Actuelle

### Points Forts
* ✅ Architecture de sécurité solide (tokens httpOnly, 2FA, rate limiting client & serveur)
* ✅ Gestion transactionnelle des commandes avec `select_for_update()`
* ✅ Système de cache avec annotations pour éviter les requêtes N+1
* ✅ Documentation API automatisée (OpenAPI/Swagger)
* ✅ PWA avec stratégies de cache intelligentes
* ✅ Analytics et monitoring frontend complets
* ✅ Code frontend audité et nettoyé (0 fonction manquante, 0 bug critique)
* ✅ Validation d'entrée multi-couche (frontend + backend)

### Points d'Amélioration
* ✅ Stock restauré en cas d'échec de paiement (Fixed in v1.5.0)
* ✅ Fonctions dashboard manquantes implémentées (Fixed in v2.2.1)
* ✅ Analytics intégrés aux actions utilisateur (Fixed in v2.2.1)
* ⚠️ Cache en mémoire locale inadapté au multi-processus
* ⚠️ Panier uniquement côté client (pas de synchronisation serveur)
* ⚠️ 2FA obligatoire à chaque connexion (friction élevée)
* ⚠️ Styles inline autorisés dans CSP

### Note Globale : **B+**
Une implémentation solide avec de bonnes bases de sécurité. Les bugs critiques frontend ont été corrigés et les fonctionnalités inutilisées ont été intégrées. L'absence de persistance serveur du panier et le 2FA obligatoire restent des points d'amélioration pour la prochaine version.

---

## 9. Historique des Modifications

| Date | Version | Modifications |
|------|---------|---------------|
| 2 décembre 2025 | v2.2.0 | Document initial |
| 6 décembre 2025 | v2.2.1 | Audit frontend, correction des bugs critiques, intégration des fonctions inutilisées |

---

## 10. Contribuer à ce document

Pour suggérer des fonctionnalités, ouvrez une Issue GitHub avec le label `enhancement`.