# Cahier des Charges - Projet SoundLightPro

**Date : 13 novembre 2025**

---

## 1. Objectif du Document

Le présent document sert de cahier des charges et de feuille de route évolutive pour le site e-commerce SoundLightPro. Il détaille les fonctionnalités déjà implémentées, les exigences des fonctionnalités à développer, et les améliorations techniques nécessaires pour assurer la performance, la sécurité et la scalabilité de la plateforme.

---

## 2. Périmètre Fonctionnel Actuel (Fonctionnalités Implémentées)

Cette section décrit les fonctionnalités actuellement en production et validées.

#### Migration de la Sécurité des Tokens (P0.1)
* Migration des tokens de rafraîchissement (refresh tokens) du localStorage vers des cookies httpOnly pour atténuer les vulnérabilités XSS.
* Le backend gère la configuration et la suppression sécurisées des cookies (via `LogoutView`).

#### Système de Gestion des Commandes (P0.3)
* Suivi complet du cycle de vie des commandes avec statuts (en attente, en traitement, expédiée, etc.).
* Historique des commandes disponible pour le client dans son tableau de bord.
* Possibilité pour le client d'annuler une commande "en attente" ou "en traitement" depuis son tableau de bord.

#### Tableau de Bord Client Complet (P1.4)
* Un tableau de bord (`dashboard.html`) sécurisé et complet est implémenté.
* **Gestion de profil :** L'utilisateur peut mettre à jour ses informations personnelles (nom, téléphone, biographie, préférences).
* **Sécurité :** L'utilisateur peut changer son mot de passe.
* **Historique des commandes :** Suivi détaillé des commandes implémenté.
* **Gestion des avis :** L'utilisateur peut voir, éditer et supprimer ses propres avis.
* **Intégration de la liste de favoris :** Gestion complète de la liste de favoris.
* **Gestion des adresses :** Ajout, édition et suppression de plusieurs adresses de livraison.
* **Gestion des méthodes de paiement :** Ajout, suppression et définition par défaut des méthodes de paiement (intégration Stripe).

#### Section des Marques Partenaires (P1.5)
* Galerie de logos des marques implémentée sur la page d'accueil (`index.html`).
* Le backend supporte le listing des marques avec descriptions et images (`Brand` model, `BrandList` view).
* Les produits peuvent être filtrés par marque.

#### Chatbot IA (P2.1)
* Implémentation d'un chatbot via l'API Gemini (remplaçant le "Live Chat" initial).
* Le chatbot est disponible sur toutes les pages et utilise le RAG (recherche vectorielle) pour fournir des réponses contextuelles sur les produits.

#### Galerie d'Images Améliorée (P2.4)
* Le backend supporte plusieurs images par produit (via le modèle `ProductImage`), le champ d'image unique a été supprimé du modèle `Product`.

#### Système d'Avis Produits
* Un système complet d'avis est implémenté.
* Les utilisateurs peuvent créer, lire et filtrer les avis sur la page produit (`product.html`).
* Le backend supporte les statistiques d'avis (note moyenne, nombre d'avis).
* La logique pour le statut "Achat Vérifié" est incluse.

#### Système de Liste de Favoris (Wishlist)
* Une fonctionnalité complète de liste de favoris est implémentée.
* Les utilisateurs peuvent ajouter/supprimer des articles. Les listes "invité" sont synchronisées après connexion (`WishlistView`, `WishlistSyncView`).

#### Produits Recommandés (Standard & Sémantique)
* Une section de produits recommandés est implémentée sur la page produit (`product.html`).
* Le backend supporte deux modes : standard (basé sur catégorie/prix) et sémantique (recherche vectorielle IA).

#### Processus de Paiement Stripe
* Un processus de paiement complet est implémenté sur la page panier (`cart.html`).
* Intégration avec Stripe pour le traitement des paiements (service `OrderView`).

#### Consolidation de la Documentation (TD.3)
* La documentation redondante a été nettoyée et consolidée.

---

## 3. Évolutions et Nouvelles Fonctionnalités (Feuille de Route)

Cette section détaille les exigences pour les prochaines versions de la plateforme, priorisées par impact.

### 3.1. Priorité 0 (Critique - Prochaine Version)

#### P0.2 - Tests Automatisés
* **Exigence :** Mettre en place une suite de tests robuste pour garantir la non-régression et la fiabilité.
* **Backend :** Tests unitaires pour les services et modèles (Django test suite).
* **Backend :** Tests d'intégration pour les API critiques (Commandes, Auth, Avis).
* **Frontend :** Tests E2E (Vitest + Playwright).
* **DevOps :** Intégration dans le pipeline CI/CD (GitHub Actions).
* **Effort estimé :** 5-7 jours.

### 3.2. Priorité 1 (Haute Valeur - Ce Trimestre)

#### P1.1 - Comparateur de Produits
* **Exigence :** Permettre aux utilisateurs de comparer les spécifications de plusieurs produits côte à côte.
* **Frontend :** Interface pour comparer jusqu'à 4 produits simultanément, avec mise en surbrillance des différences.
* **Backend :** Nouveau point d'API pour récupérer et formater les données de comparaison pour plusieurs ID de produits.
* **Effort estimé :** 4-6 jours.

#### P1.2 - Notifications de Disponibilité Stock
* **Exigence :** Alerter les utilisateurs lorsqu'un produit en rupture de stock est à nouveau disponible.
* **Backend :** Créer un modèle pour les demandes de notification (Utilisateur, Produit, email).
* **Backend :** Implémenter une file d'attente de notifications (ex: Celery ou Django-Q).
* **Backend :** Déclencher des emails automatiques lors du réassort (via signal `post_save` sur le modèle `Product`).
* **Frontend :** Bouton "Prévenez-moi" sur les produits hors stock.
* **Effort estimé :** 3-5 jours.

#### P1.3 - Filtrage Avancé
* **Statut :** Filtrage basique (par marque ou catégorie unique) implémenté.
* **Exigence :** Améliorer la découverte de produits via des filtres multi-sélections.
* **Backend :** Implémenter une logique de filtrage avancée (ex: `django-filter`).
* **Frontend :** Filtres multi-sélections (marque, catégorie, gamme de prix).
* **Frontend :** Filtres basés sur les spécifications (puissance, poids, etc.) – voir P1.7.
* **Frontend :** Persistance des filtres dans les paramètres de l'URL.
* **Effort estimé :** 4-6 jours.

#### P1.6 - [NOUVEAU] Amélioration de l'Importation Admin
* **Exigence :** Faciliter l'importation en masse de produits, y compris leurs images multiples.
* **Backend :** Personnaliser l'intégration `django-import-export` pour le modèle `Product`.
* **Backend :** Ajouter le support pour l'importation d'images multiples (via une colonne `image_urls` séparées par des virgules dans le fichier d'import).
* **Backend :** Surcharger les méthodes d'import pour parser la colonne d'images, les télécharger (ou les trouver) et créer les objets `ProductImage` associés.
* **Effort estimé :** 4-6 jours.

#### P1.7 - [NOUVEAU] Modèle de Spécifications Dynamiques
* **Exigence :** Permettre de stocker des fiches techniques flexibles pour alimenter le comparateur et le filtrage.
* **Backend :** Créer un nouveau modèle (`ProductSpecification`) ou ajouter un `JSONField` au modèle `Product` pour stocker des paires clé-valeur arbitraires (ex: "Puissance": "500W", "Poids": "15kg").
* **Backend :** Mettre à jour l'interface admin pour éditer ces spécifications.
* **Note :** Cette tâche est un prérequis pour P1.1 (Comparateur) et P1.3 (Filtres avancés).
* **Effort estimé :** 3-5 jours.

### 3.3. Priorité 2 (Valeur Moyenne - Prochain Trimestre)

#### P2.2 - Récupération de Paniers Abandonnés
* **Exigence :** Mettre en place un système pour relancer les utilisateurs ayant abandonné leur panier.
* **Backend :** Logique pour tracker les paniers "abandonnés" (ex: paniers de > 3h avec articles).
* **Backend :** Campagnes d'email automatisées (ex: rappel après 24h).
* **Frontend :** Tableau de bord analytique pour suivre le taux de récupération.
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

#### P2.6 - [NOUVEAU] Exposition des Pièces Jointes
* **Exigence :** Permettre aux utilisateurs de télécharger des manuels et fiches techniques.
* **Backend :** Le modèle `ProductAttachment` existe déjà.
* **Backend :** Créer `ProductAttachmentSerializer` et l'inclure dans la réponse de l'API (`/api/products/<id>/`).
* **Backend :** Mettre à jour l'admin `Product` pour permettre l'upload "inline" de pièces jointes.
* **Frontend :** Afficher une section "Téléchargements" sur la page de détail produit.
* **Effort estimé :** 2-3 jours.

#### P2.7 - [NOUVEAU] Mise à jour de l'Index Vectoriel en Temps Réel
* **Exigence :** Assurer que la recherche IA (chatbot) dispose toujours des données produits à jour.
* **Backend :** La commande `build_product_index` est actuellement manuelle.
* **Backend :** Implémenter des signaux Django (`post_save`, `post_delete`) sur le modèle `Product` pour mettre à jour automatiquement (ajout, ré-indexation, suppression) l'index vectoriel FAISS, soit en temps réel, soit via une tâche en file d'attente.
* **Effort estimé :** 3-4 jours.

### 3.4. Priorité 3 (Faible Priorité - Futur)

#### P3.1 - Support Multi-Devises
* **Exigence :** Afficher les prix dans la devise locale de l'utilisateur (XAF, EUR, USD).
* **Backend :** Intégration d'une API de taux de change (ex: BCE).
* **Backend :** Stocker les prix dans une devise de base (ex: EUR) et convertir à la volée.
* **Effort estimé :** 7-10 jours.

#### P3.2 - Tableau de Bord Analytique
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

#### P3.6 - [NOUVEAU] Chatbot Configurable par l'Admin
* **Exigence :** Permettre à un administrateur de modifier le "prompt système" du chatbot IA sans déploiement.
* **Backend :** Le prompt est actuellement codé en dur dans `ChatbotView`.
* **Backend :** Créer un modèle `SiteConfiguration` pour stocker le prompt système en base de données.
* **Backend :** Mettre à jour `ChatbotView` pour qu'il récupère le prompt depuis ce modèle.
* **Effort estimé :** 2-3 jours.

---

## 4. Exigences Non-Fonctionnelles et Dette Technique

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

---

## 5. Fonctionnalités Reportées

Fonctionnalités évaluées mais reportées en raison d'une complexité élevée ou d'un ROI incertain :

* WebAssembly pour calculs lourds
* Migration vers GraphQL
* Paiements via Blockchain
* Visualisation de produits en Réalité Augmentée (AR)
* Recherche vocale

---

## 6. Jalons de Version

* **v2.0.0** - Finalisation des items P0.
* **v2.1.0** - Finalisation des items P1.
* **v2.2.0** - Finalisation des items P2.
* **v3.0.0** - Mises à jour majeures d'architecture, items P3.

---

## 7. Contribuer à ce document

Pour suggérer des fonctionnalités, ouvrez une Issue GitHub avec le label `enhancement`.