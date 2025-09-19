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
        
        // Cart
        cart_empty: "Your cart is empty.",
        cart_total: "Total",
        cart_subtotal: "Subtotal",
        cart_item_added: "added to cart!",
        cart_item_removed: "removed from cart",
        cart_updated: "Cart updated",
        
        // Product details
        product_category: "Category",
        product_brand: "Brand",
        product_price: "Price",
        product_stock: "In Stock",
        product_out_of_stock: "Out of Stock",
        product_quantity: "Quantity",
        product_description: "Description",
        product_no_description: "No description available.",
        
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
        chatbot_title: "Customer Support",
        chatbot_placeholder: "Type your message...",
        chatbot_send: "Send",
        chatbot_greeting: "Hello! How can I help you today?",
        
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
        
        // Cart
        cart_empty: "Votre panier est vide.",
        cart_total: "Total",
        cart_subtotal: "Sous-total",
        cart_item_added: "ajouté au panier !",
        cart_item_removed: "retiré du panier",
        cart_updated: "Panier mis à jour",
        
        // Product details
        product_category: "Catégorie",
        product_brand: "Marque",
        product_price: "Prix",
        product_stock: "En Stock",
        product_out_of_stock: "Rupture de Stock",
        product_quantity: "Quantité",
        product_description: "Description",
        product_no_description: "Aucune description disponible.",
        
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
        chatbot_placeholder: "Tapez votre message...",
        chatbot_send: "Envoyer",
        chatbot_greeting: "Bonjour ! Comment puis-je vous aider aujourd'hui ?",
        
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
        const translation = translations[this.currentLanguage]?.[key] || translations.en[key] || key;
        
        // Simple parameter replacement
        return translation.replace(/\{(\w+)\}/g, (match, param) => {
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