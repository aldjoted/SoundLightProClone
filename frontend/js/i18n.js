/**
 * i18n.js
 * 
 * Internationalization (i18n) system for SoundLightPro
 * Supports French and English with automatic language detection and switching
 */

/**
 * Translation dictionary containing all text content
 */
const translations = {
    en: {
        // Navigation
        nav_home: "Home",
        nav_products: "Products",
        nav_about: "About Us",
        nav_services: "Services",
        nav_contact: "Contact",
        nav_login: "Login",
        nav_register: "Register",
        nav_logout: "Logout",
        nav_cart: "Cart",
        
        // Search
        search_placeholder: "Search products...",
        search_no_results: "No products found.",
        search_try_again: "Search failed. Try again.",
        
        // Product actions
        btn_add_to_cart: "Add to Cart",
        btn_quick_view: "Quick View",
        btn_view_details: "View Details",
        btn_buy_now: "Buy Now",
        btn_remove: "Remove",
        btn_update: "Update",
        btn_send: "Send",
        
        // Cart
        cart_empty: "Your cart is empty.",
        cart_total: "Total",
        cart_subtotal: "Subtotal",
        cart_item_added: "added to cart!",
        cart_item_removed: "removed from cart",
        cart_updated: "Cart updated",
        cart_summary: "Order summary",
        cart_taxes_note: "Taxes and shipping calculated at checkout.",
        cart_checkout: "Proceed to checkout",
        cart_empty_title: "Your cart is empty",
        cart_empty_sub: "Looks like you haven't added anything yet.",
        cart_continue_shopping: "Continue shopping",
        
        // Product details
        product_category: "Category",
        product_brand: "Brand",
        product_price: "Price",
        product_stock: "In Stock",
        product_out_of_stock: "Out of Stock",
        product_quantity: "Quantity",
        product_description: "Description",
        product_no_description: "No description available.",
        
        // Home page sections
        home_hero_title: "A New Perspective",
        home_hero_subtitle: "in Sound & Light",
        home_hero_description: "Discover our cutting-edge professional equipment",
        home_products_title: "Our Products",
        home_video_title: "See Our Equipment in Action",
        home_video_subtitle: "Professional setups for world-class events",
        home_training_title: "Pro Training for DJs & Sound Techs",
        home_training_description: "Hands-on workshops to master pro audio and lighting. Limited seats monthly.",
        home_training_btn: "View Training & Enroll",
        home_newsletter_title: "Stay Updated",
        home_newsletter_subtitle: "Get the latest news about new products and exclusive offers",
        home_newsletter_placeholder: "Enter your email",
        home_newsletter_btn: "Subscribe",
        
        // Features
        feature_shipping: "Fast Shipping",
        feature_shipping_desc: "Free delivery on orders over $500",
        feature_warranty: "Warranty Protection",
        feature_warranty_desc: "2-year warranty on all products",
        feature_support: "Expert Support",
        feature_support_desc: "24/7 technical assistance",
        feature_returns: "Easy Returns",
        feature_returns_desc: "30-day return policy",
        
        // Footer
        footer_company_desc: "Professional audio and lighting solutions for events, concerts, and venues worldwide.",
        footer_quick_links: "Quick Links",
        footer_customer_service: "Customer Service",
        footer_contact_info: "Contact Info",
        footer_support_center: "Support Center",
        footer_shipping_info: "Shipping Info",
        footer_returns: "Returns",
        footer_warranty: "Warranty",
        footer_all_rights: "All rights reserved.",
        footer_privacy_policy: "Privacy Policy",
        footer_terms_of_service: "Terms of Service",
        footer_cookie_policy: "Cookie Policy",
        
        // Contact page
        contact_title: "Contact Us",
        contact_address: "Address",
        contact_mobile: "Phone",
        contact_email: "Email",
        contact_social: "Social",
        contact_drop_line: "Drop Us a Line",
        contact_name: "Your Name",
        contact_email_field: "Your Email",
        contact_subject: "Subject",
        contact_message: "Your Message",
        contact_send: "Send",
        
        // Forms
        form_email: "Email",
        form_password: "Password",
        form_confirm_password: "Confirm Password",
        form_first_name: "First Name",
        form_last_name: "Last Name",
        form_username: "Username",
        form_submit: "Submit",
        form_cancel: "Cancel",
        form_save: "Save",
        
        // Messages
        msg_login_success: "Login successful!",
        msg_login_failed: "Login failed. Please check your credentials.",
        msg_logout_success: "You have been logged out.",
        msg_register_success: "Registration successful!",
        msg_register_failed: "Registration failed",
        msg_password_mismatch: "Passwords do not match.",
        msg_loading: "Loading...",
        msg_loading_products: "Loading products...",
        msg_error: "An error occurred",
        
        // General
        general_close: "Close",
        general_open: "Open",
        general_yes: "Yes",
        general_no: "No",
        general_ok: "OK",
        general_cancel: "Cancel",
        general_continue: "Continue",
        general_back: "Back",
        general_next: "Next",
        general_previous: "Previous",
        general_all: "All",
        
        // Units and formatting
        currency_symbol: "$",
        units_available: "units available",
        units_left: "left in stock",
        
        // Time
        time_just_now: "Just now",
        time_minutes_ago: "minutes ago",
        time_hours_ago: "hours ago",
        time_days_ago: "days ago",
        
        // Chatbot
        chatbot_title: "Chat Support",
        chatbot_placeholder: "Type your message here...",
        chatbot_send: "Send",
        chatbot_greeting: "Hi there! 👋<br>How can I help you today?",
        
        // Language switcher
        language_english: "English",
        language_french: "Français",
        language_switch_to: "Switch to"
    },
    
    fr: {
        // Navigation
        nav_home: "Accueil",
        nav_products: "Produits",
        nav_about: "À Propos",
        nav_services: "Services",
        nav_contact: "Contact",
        nav_login: "Connexion",
        nav_register: "S'inscrire",
        nav_logout: "Déconnexion",
        nav_cart: "Panier",
        
        // Search
        search_placeholder: "Rechercher des produits...",
        search_no_results: "Aucun produit trouvé.",
        search_try_again: "Recherche échouée. Réessayez.",
        
        // Product actions
        btn_add_to_cart: "Ajouter au Panier",
        btn_quick_view: "Aperçu Rapide",
        btn_view_details: "Voir les Détails",
        btn_buy_now: "Acheter Maintenant",
        btn_remove: "Supprimer",
        btn_update: "Mettre à Jour",
        btn_send: "Envoyer",
        
        // Cart
        cart_empty: "Votre panier est vide.",
        cart_total: "Total",
        cart_subtotal: "Sous-total",
        cart_item_added: "ajouté au panier !",
        cart_item_removed: "retiré du panier",
        cart_updated: "Panier mis à jour",
        cart_summary: "Récapitulatif de commande",
        cart_taxes_note: "Taxes et frais de livraison calculés lors du paiement.",
        cart_checkout: "Passer au paiement",
        cart_empty_title: "Votre panier est vide",
        cart_empty_sub: "On dirait que vous n'avez encore rien ajouté.",
        cart_continue_shopping: "Continuer vos achats",
        
        // Product details
        product_category: "Catégorie",
        product_brand: "Marque",
        product_price: "Prix",
        product_stock: "En Stock",
        product_out_of_stock: "Rupture de Stock",
        product_quantity: "Quantité",
        product_description: "Description",
        product_no_description: "Aucune description disponible.",
        
        // Home page sections
        home_hero_title: "Une Nouvelle Perspective",
        home_hero_subtitle: "en Son & Lumière",
        home_hero_description: "Découvrez notre équipement professionnel de pointe",
        home_products_title: "Nos Produits",
        home_video_title: "Voir Notre Équipement en Action",
        home_video_subtitle: "Installations professionnelles pour des événements de classe mondiale",
        home_training_title: "Formation Pro pour DJs & Techniciens Son",
        home_training_description: "Ateliers pratiques pour maîtriser l'audio et l'éclairage pro. Places limitées chaque mois.",
        home_training_btn: "Voir les Formations & S'inscrire",
        home_newsletter_title: "Restez Informé",
        home_newsletter_subtitle: "Recevez les dernières nouvelles sur les nouveaux produits et offres exclusives",
        home_newsletter_placeholder: "Entrez votre e-mail",
        home_newsletter_btn: "S'abonner",
        
        // Features
        feature_shipping: "Livraison Rapide",
        feature_shipping_desc: "Livraison gratuite pour les commandes de plus de 500$",
        feature_warranty: "Protection Garantie",
        feature_warranty_desc: "Garantie de 2 ans sur tous les produits",
        feature_support: "Support Expert",
        feature_support_desc: "Assistance technique 24/7",
        feature_returns: "Retours Faciles",
        feature_returns_desc: "Politique de retour de 30 jours",
        
        // Footer
        footer_company_desc: "Solutions audio et éclairage professionnelles pour événements, concerts et lieux dans le monde entier.",
        footer_quick_links: "Liens Rapides",
        footer_customer_service: "Service Client",
        footer_contact_info: "Informations de Contact",
        footer_support_center: "Centre de Support",
        footer_shipping_info: "Infos Livraison",
        footer_returns: "Retours",
        footer_warranty: "Garantie",
        footer_all_rights: "Tous droits réservés.",
        footer_privacy_policy: "Politique de Confidentialité",
        footer_terms_of_service: "Conditions d'Utilisation",
        footer_cookie_policy: "Politique des Cookies",
        
        // Contact page
        contact_title: "Contactez-Nous",
        contact_address: "Adresse",
        contact_mobile: "Téléphone",
        contact_email: "E-mail",
        contact_social: "Réseaux Sociaux",
        contact_drop_line: "Laissez-Nous un Message",
        contact_name: "Votre Nom",
        contact_email_field: "Votre E-mail",
        contact_subject: "Sujet",
        contact_message: "Votre Message",
        contact_send: "Envoyer",
        
        // Forms
        form_email: "E-mail",
        form_password: "Mot de Passe",
        form_confirm_password: "Confirmer le Mot de Passe",
        form_first_name: "Prénom",
        form_last_name: "Nom",
        form_username: "Nom d'Utilisateur",
        form_submit: "Envoyer",
        form_cancel: "Annuler",
        form_save: "Sauvegarder",
        
        // Messages
        msg_login_success: "Connexion réussie !",
        msg_login_failed: "Connexion échouée. Vérifiez vos identifiants.",
        msg_logout_success: "Vous avez été déconnecté.",
        msg_register_success: "Inscription réussie !",
        msg_register_failed: "Inscription échouée",
        msg_password_mismatch: "Les mots de passe ne correspondent pas.",
        msg_loading: "Chargement...",
        msg_loading_products: "Chargement des produits...",
        msg_error: "Une erreur s'est produite",
        
        // General
        general_close: "Fermer",
        general_open: "Ouvrir",
        general_yes: "Oui",
        general_no: "Non",
        general_ok: "OK",
        general_cancel: "Annuler",
        general_continue: "Continuer",
        general_back: "Retour",
        general_next: "Suivant",
        general_previous: "Précédent",
        general_all: "Tous",
        
        // Units and formatting
        currency_symbol: "$",
        units_available: "unités disponibles",
        units_left: "restant en stock",
        
        // Time
        time_just_now: "À l'instant",
        time_minutes_ago: "il y a quelques minutes",
        time_hours_ago: "il y a quelques heures",
        time_days_ago: "il y a quelques jours",
        
        // Chatbot
        chatbot_title: "Support Client",
        chatbot_placeholder: "Tapez votre message ici...",
        chatbot_send: "Envoyer",
        chatbot_greeting: "Bonjour ! 👋<br>Comment puis-je vous aider aujourd'hui ?",
        
        // Language switcher
        language_english: "English",
        language_french: "Français",
        language_switch_to: "Basculer vers"
    }
};

/**
 * I18n class for managing internationalization
 */
class I18n {
    constructor() {
        this.currentLanguage = this.detectLanguage();
        this.listeners = new Set();
        this.init();
    }
    
    /**
     * Detect user's preferred language
     */
    detectLanguage() {
        // Check localStorage first
        const saved = localStorage.getItem('preferred_language');
        if (saved && translations[saved]) {
            return saved;
        }
        
        // Check browser language
        const browserLang = navigator.language.split('-')[0];
        if (translations[browserLang]) {
            return browserLang;
        }
        
        // Default to English
        return 'en';
    }
    
    /**
     * Initialize the i18n system
     */
    init() {
        this.updateHtmlLang();
        this.translatePage();
        this.setupLanguageSwitcher();
    }
    
    /**
     * Get translated text for a key
     */
    t(key, params = {}) {
        let translation = translations[this.currentLanguage]?.[key] || translations.en[key];
        if (!translation) {
            // Humanize the key: replace underscores with spaces and capitalize first letter
            const humanized = key.replace(/_/g, ' ').replace(/\b\w/g, (m, idx) => m.toUpperCase());
            translation = humanized;
        }
        // Simple parameter replacement
        return String(translation).replace(/\{(\w+)\}/g, (match, param) => {
            return params[param] || match;
        });
    }
    
    /**
     * Switch to a different language
     */
    setLanguage(lang) {
        if (!translations[lang]) {
            console.warn(`Language ${lang} not supported`);
            return;
        }
        
        this.currentLanguage = lang;
        localStorage.setItem('preferred_language', lang);
        this.updateHtmlLang();
        this.translatePage();
        this.notifyListeners();
    }
    
    /**
     * Get current language
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }
    
    /**
     * Get available languages
     */
    getAvailableLanguages() {
        return Object.keys(translations);
    }
    
    /**
     * Update HTML lang attribute
     */
    updateHtmlLang() {
        document.documentElement.lang = this.currentLanguage;
    }
    
    /**
     * Translate all elements with data-i18n attribute
     */
    translatePage() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        });
        
        // Translate elements with data-i18n-title (for tooltips)
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });
    }
    
    /**
     * Setup language switcher functionality
     */
    setupLanguageSwitcher() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-lang-switch]')) {
                const lang = e.target.getAttribute('data-lang-switch');
                this.setLanguage(lang);
            }
        });
    }
    
    /**
     * Add listener for language changes
     */
    addListener(callback) {
        this.listeners.add(callback);
    }
    
    /**
     * Remove listener
     */
    removeListener(callback) {
        this.listeners.delete(callback);
    }
    
    /**
     * Notify all listeners of language change
     */
    notifyListeners() {
        this.listeners.forEach(callback => {
            try {
                callback(this.currentLanguage);
            } catch (error) {
                console.error('Error in i18n listener:', error);
            }
        });
    }
    
    /**
     * Format currency
     */
    formatCurrency(amount) {
        const symbol = this.t('currency_symbol');
        const formatted = parseFloat(amount).toFixed(2);
        return `${symbol}${formatted}`;
    }
    
    /**
     * Format number with locale
     */
    formatNumber(number) {
        return new Intl.NumberFormat(this.currentLanguage === 'fr' ? 'fr-FR' : 'en-US').format(number);
    }
    
    /**
     * Format date with locale
     */
    formatDate(date) {
        return new Intl.DateTimeFormat(this.currentLanguage === 'fr' ? 'fr-FR' : 'en-US').format(new Date(date));
    }
}

// Create global instance
const i18n = new I18n();

// Export for use in modules
export default i18n;

// Also make available globally for compatibility
if (typeof window !== 'undefined') {
    window.i18n = i18n;
}