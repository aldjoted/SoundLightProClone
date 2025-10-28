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
        language_switch_to: "Switch to",
        
        // Wishlist
        wishlist_title: "My Wishlist",
        wishlist_subtitle: "Save your favorite items for later",
        add_to_wishlist: "Add to Wishlist",
        in_wishlist: "In Wishlist",
        remove_from_wishlist: "Remove from Wishlist",
        move_to_cart: "Move to Cart",
        empty_wishlist: "Your wishlist is empty",
        empty_wishlist_message: "Start adding products you love!",
        continue_shopping: "Continue Shopping",
        loading_wishlist: "Loading wishlist...",
        added_to_wishlist: "Added to wishlist",
        removed_from_wishlist: "Removed from wishlist",
        moved_to_cart: "Moved to cart",
        error_wishlist: "Wishlist error",
        error_removing_wishlist: "Error removing from wishlist",
        error_moving_to_cart: "Error moving to cart",
        error_loading_wishlist: "Error loading wishlist",
        
        // Reviews
        reviews_title: "Customer Reviews",
        write_review: "Write a Review",
        your_rating: "Your Rating",
        review_title: "Review Title",
        review_title_placeholder: "Summarize your experience",
        review_comment: "Your Review",
        review_comment_placeholder: "Share your thoughts about this product",
        submit_review: "Submit Review",
        sort_recent: "Most Recent",
        sort_highest: "Highest Rated",
        sort_lowest: "Lowest Rated",
        sort_verified: "Verified Purchases",
        verified_purchase: "Verified Purchase",
        no_reviews: "No reviews yet",
        be_first_review: "Be the first to review this product!",
        loading_reviews: "Loading reviews...",
        review_submitted: "Review submitted successfully!",
        review_submit_error: "Error submitting review",
        error_loading_reviews: "Error loading reviews",
        rating_required: "Please select a rating",
        title_required: "Please enter a title",
        comment_required: "Please enter your review",
        reviews_based_on: "based on",
        reviews_count: "reviews",
        
        // Related Products
        related_products: "You May Also Like",
        related_products_subtitle: "Similar products you might be interested in",
        loading_related_products: "Loading related products...",
        no_related_products: "No related products found",
        check_back_later: "Check back later for recommendations",
        error_loading_related: "Error loading related products",
        
        // Common
        retry: "Retry",

        // Index Page
        home_title: "SoundLightPro - Professional Audio and Lighting Equipment",
        skip_to_main_content: "Skip to main content",
        nav_contact: "Contact",
        hero_title_accent: "A New Perspective",
        hero_title_main: "in Sound & Light",
        hero_subtitle: "Discover our cutting-edge professional equipment",
        feature_shipping_title: "Fast Shipping",
        feature_shipping_text: "Free delivery on orders over $500",
        feature_warranty_title: "Warranty Protection",
        feature_warranty_text: "2-year warranty on all products",
        feature_support_title: "Expert Support",
        feature_support_text: "24/7 technical assistance",
        feature_returns_title: "Easy Returns",
        feature_returns_text: "30-day return policy",
        video_promo_title: "See Our Equipment in Action",
        video_promo_subtitle: "Professional setups for world-class events",
        training_cta_title: "Pro Training for DJs & Sound Techs",
        training_cta_text: "Hands-on workshops to master pro audio and lighting. Limited seats monthly.",
        training_cta_button: "View Training & Enroll",
        newsletter_title: "Stay Updated",
        newsletter_text: "Get the latest news about new products and exclusive offers",
        newsletter_subscribe: "Subscribe",
        footer_description: "Professional audio and lighting solutions for events, concerts, and venues worldwide.",
        footer_quick_links: "Quick Links",
        footer_customer_service: "Customer Service",
        footer_support_center: "Support Center",
        footer_shipping_info: "Shipping Info",
        footer_returns: "Returns",
        footer_warranty: "Warranty",
        footer_contact_info: "Contact Info",
        footer_copyright: "All rights reserved.",
        footer_privacy_policy: "Privacy Policy",
        footer_terms_of_service: "Terms of Service",
        footer_cookie_policy: "Cookie Policy",
        footer_company: "Company",
        footer_support: "Support",
        footer_legal: "Legal",
        footer_connect: "Connect With Us",
        footer_about: "About Us",
        footer_contact: "Contact",
        footer_services: "Services",
        footer_helpcenter: "Help Center",
        footer_shipping: "Shipping Info",
        footer_terms: "Terms of Service",
        footer_privacy: "Privacy Policy",
        footer_cookies: "Cookie Policy",
        chatbot_greeting_message: "Hi there! 👋<br>How can I help you today?",

        // 404 Page
        fourofour_title: "404 - Page Not Found | SoundLightPro",
        fourofour_page_not_found: "Page Not Found",
        fourofour_message: "Oops! The page you're looking for seems to have vanished into thin air. Don't worry though – our audio equipment is much more reliable than our URLs!",
        fourofour_back_to_home: "Back to Home",
        fourofour_go_back: "Go Back",
        fourofour_search_our_site: "Search Our Site",
        fourofour_search_our_site_message: "Try searching for what you were looking for:",
        fourofour_search_placeholder: "Search products, services...",
        fourofour_popular_pages: "Popular Pages",
        fourofour_audio_equipment: "Audio Equipment",
        fourofour_audio_equipment_desc: "Professional sound systems",
        fourofour_lighting_solutions: "Lighting Solutions",
        fourofour_lighting_solutions_desc: "Stage and event lighting",
        fourofour_our_services: "Our Services",
        fourofour_our_services_desc: "Installation, rental, and support",
        fourofour_support_center: "Support Center",
        fourofour_support_center_desc: "Get help and find FAQs",
        fourofour_contact_us: "Contact Us",
        fourofour_contact_us_desc: "Get in touch with our team",
        fourofour_need_help: "Need Help?",
        fourofour_need_help_message: "If you believe this is an error, please contact our support team:",
        fourofour_call_us: "Call Us",
        fourofour_email_support: "Email Support",

        // About Page
        about_us_title: "About Us - SoundLightPro",
        about_us_main_title: "About SoundLightPro",
        about_us_welcome: "Welcome to SoundLightPro, your premier destination for professional audio and lighting solutions.",
        about_us_mission: "Founded with a passion for pristine sound and brilliant light, we have been serving the events, concerts, and venue industry for over a decade. Our mission is to provide artists, engineers, and event organizers with the highest quality equipment that empowers them to create unforgettable experiences.",
        about_us_values: "We believe in innovation, reliability, and unparalleled customer support. Our team consists of industry veterans and technical experts who meticulously curate our product catalog, ensuring every item meets our rigorous standards for performance and durability.",
        about_us_trust: "From massive festival stages to intimate corporate events, SoundLightPro is the trusted partner for professionals worldwide. Thank you for choosing us to be a part of your creative journey.",
        our_team: "Our Team",
        ceo_name: "KOUMENE ALAIN",
        ceo_role: "CEO",
        tech_sales_manager_name: "ETUNDI ROLAND",
        tech_sales_manager_role: "TECHNICAL SALES MANAGER",
        key_figures_title: "SoundLightPro in Key Figures",
        key_figures_products: "Products",
        key_figures_experience: "Years of Experience",
        key_figures_clients: "Satisfied Clients",
        key_figures_collaborators: "Collaborators",

        // Cart Page
        cart_title: "Your Shopping Cart - SoundLightPro",
        cart_page_title: "Your Shopping Cart",
        loading_cart: "Loading cart...",
        checkout_title: "Checkout",
        shipping_information: "Shipping Information",
        first_name_label: "First Name",
        last_name_label: "Last Name",
        email_label: "Email Address",
        address_label: "Address",
        postal_code_label: "Postal Code",
        city_label: "City",
        payment_details: "Payment Details",
        credit_debit_card: "Credit or debit card",
        pay_now: "Pay Now",

        // Contact Page
        contact_title: "Contact Us - SoundLightPro",
        contact_page_title: "Contact Us",
        contact_address: "Address",
        contact_mobile: "Mobile",
        contact_email: "Email",
        contact_social: "Social",
        contact_hotline: "Hotline: +237 6 80 49 49 49",
        contact_form_title: "Drop Us a Line",
        contact_form_subtitle: "If you have any questions, please feel free to get in touch with us. We will reply to you as soon as possible. Thank you!",
        contact_your_name: "Your Name (required)",
        contact_your_email: "Your Email (required)",
        contact_subject: "Subject",
        contact_your_message: "Your Message",
        contact_send: "Send",
        contact_success_message: "Thank you for your message! We will get back to you soon.",

        // Services Page
        services_title: "Services - SoundLightPro",
        services_page_title: "Our Services",
        services_consultation_title: "Expert Consultation",
        services_consultation_text: "Not sure what you need? Our team of audio and lighting experts is here to help. We provide personalized consultations to help you select the perfect equipment for your specific needs, whether you're outfitting a new venue or upgrading your touring rig.",
        services_design_title: "System Design & Integration",
        services_design_text: "We offer comprehensive system design services for permanent installations. From concert halls and theaters to houses of worship and conference centers, we can design a fully integrated audio and lighting system that delivers exceptional performance and reliability.",
        services_support_title: "Technical Support & Repair",
        services_support_text: "Our commitment to you doesn't end after the sale. We provide lifetime technical support for all our products. Our certified technicians also offer repair and maintenance services to keep your gear in peak condition for years to come.",

        // Login Page
        login_title: "Login - SoundLightPro",
        login_page_title: "Login to Your Account",
        login_username: "Username",
        login_password: "Password",
        login_button: "Login",
        login_no_account: "Don't have an account?",
        login_register_here: "Register here",

        // Register Page
        register_title: "Register - SoundLightPro",
        register_page_title: "Create a New Account",
        register_username: "Username",
        register_email: "Email",
        register_first_name: "First Name",
        register_last_name: "Last Name",
        register_password: "Password",
        register_confirm_password: "Confirm Password",
        register_button: "Register",
        register_have_account: "Already have an account?",
        register_login_here: "Login here",

        // Wishlist Page
        wishlist_title: "My Wishlist",
        wishlist_subtitle: "Save your favorite items for later",
        wishlist_empty_title: "Your wishlist is empty",
        wishlist_empty_message: "Start adding products you love!",
        wishlist_browse_products: "Browse Products",
        wishlist_remove: "Remove from wishlist",
        wishlist_move_to_cart: "Move to Cart",
        wishlist_out_of_stock: "Out of Stock",
        wishlist_in_stock: "In Stock",

        // Product Page
        product_loading: "Loading product...",
        product_description: "Product Description",
        product_specifications: "Specifications",
        product_features: "Key Features",
        product_availability: "Availability",
        product_in_stock: "In Stock",
        product_out_of_stock: "Out of Stock",
        product_sku: "SKU",
        product_brand: "Brand",
        product_quantity: "Quantity",
        product_share: "Share",
        product_error_loading: "Error loading product details",

        // Search Results Page
        search_results_title: "Search Results",
        search_results_subtitle: "Looking for",
        search_results_found: "results found",
        search_results_no_results: "No results found",
        search_results_try_different: "Try different keywords",
        search_searching: "Searching...",
        search_showing_results: "Showing",
        search_of: "of",

        // Offline Page
        offline_title: "You're Offline",
        offline_message: "It looks like you've lost your internet connection. Don't worry - some features are still available!",
        offline_what_can_do: "What You Can Do Offline:",
        offline_browse_cached: "Browse cached products and pages you've visited",
        offline_add_cart: "Add items to your cart (will sync when online)",
        offline_view_cart: "View your existing cart contents",
        offline_access_content: "Access previously loaded content",
        offline_try_again: "Try Again",
        offline_available_pages: "Available Cached Pages:",
        offline_home: "Home",
        offline_shopping_cart: "Shopping Cart",
        offline_about: "About Us",
        offline_services: "Services",
        offline_contact: "Contact",
        offline_checking_connection: "Checking connection...",
        offline_connection_restored: "Connection restored! The page will reload automatically.",
        offline_still_offline: "Still offline. Will retry automatically when connection is restored.",
        offline_no_cached: "No cached pages available. Visit pages while online to access them offline later.",

        // Returns Page
        returns_title: "Returns Policy",
        returns_subtitle: "We want you to be completely satisfied with your purchase. Our 30-day return policy makes it easy.",
        returns_easy_returns: "30-Day Easy Returns",
        returns_easy_desc: "Return items within 30 days of delivery for a full refund or exchange",
        returns_conditions_title: "Return Conditions",
        returns_30day: "30-Day Window",
        returns_30day_desc: "Items must be returned within 30 days of the original delivery date.",
        returns_original: "Original Condition",
        returns_original_desc: "Products must be in original, unused condition with all packaging.",
        returns_proof: "Proof of Purchase",
        returns_proof_desc: "Original receipt or order confirmation is required.",
        returns_no_damage: "No Damage",
        returns_no_damage_desc: "Items must not show signs of misuse, damage, or normal wear.",
        returns_process_title: "How to Return an Item",
        returns_contact: "Contact Us",
        returns_package: "Package Your Item",
        returns_ship: "Ship the Return",

        // Shipping Page
        shipping_title: "Shipping Information",
        shipping_subtitle: "Fast, reliable delivery for all your professional audio and lighting equipment.",
        shipping_free: "Free Shipping on Orders Over $500",
        shipping_free_desc: "Enjoy complimentary delivery within Cameroon on qualifying orders",
        shipping_options_title: "Delivery Options",
        shipping_express: "Express Delivery",
        shipping_express_time: "Delivery Time: 1-2 business days",
        shipping_standard: "Standard Delivery",
        shipping_standard_time: "Delivery Time: 3-5 business days",
        shipping_pickup: "Store Pickup",
        shipping_pickup_time: "Pickup Time: Same day or next day",
        shipping_international: "International Shipping",
        shipping_international_time: "Delivery Time: 7-14 business days",
        shipping_rates_title: "Shipping Rates",

        // Warranty Page
        warranty_title: "Warranty Information",
        warranty_subtitle: "We stand behind our products with comprehensive warranty coverage and expert support.",
        warranty_comprehensive: "2-Year Comprehensive Warranty",
        warranty_comprehensive_desc: "All SoundLightPro products come with a 2-year manufacturer warranty covering parts and labor",
        warranty_coverage_title: "What's Covered",
        warranty_defects: "Manufacturing Defects",
        warranty_defects_desc: "Any defects in materials or workmanship under normal use are fully covered.",
        warranty_parts: "Parts & Labor",
        warranty_parts_desc: "Both replacement parts and labor costs are covered for warranty repairs.",
        warranty_shipping: "Free Shipping",
        warranty_shipping_desc: "We cover shipping costs both ways for warranty repairs within Cameroon.",
        warranty_replacement: "Replacement Units",
        warranty_support: "Technical Support",
        warranty_turnaround: "Quick Turnaround",

        // Support Center Page
        support_title: "Support Center",
        support_subtitle: "We're here to help! Find answers to common questions or get in touch with our support team.",
        support_phone: "Phone Support",
        support_phone_desc: "Call us for immediate assistance",
        support_email: "Email Support",
        support_email_desc: "Send us a detailed message",
        support_chat: "Live Chat",
        support_chat_desc: "Chat with our support team",
        support_visit: "Visit Us",
        support_visit_desc: "Come to our showroom",
        support_faq_title: "Frequently Asked Questions",
        support_orders: "Orders & Payment",
        support_how_order: "How do I place an order?",
        support_payment_methods: "What payment methods do you accept?",
        support_modify_order: "Can I modify or cancel my order?",
        support_start_chat: "Start Chat",
        support_get_directions: "Get Directions",

        // Cookie Policy Page
        cookie_title: "Cookie Policy",
        cookie_last_updated: "Last updated:",
        cookie_intro: "This Cookie Policy explains how SoundLightPro uses cookies and similar tracking technologies on our website to enhance your browsing experience.",
        cookie_what_are: "What Are Cookies?",
        cookie_definition: "Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you visit a website.",
        cookie_benefits: "Benefits of Cookies:",
        cookie_types_title: "Types of Cookies We Use",

        // Privacy Policy Page
        privacy_title: "Privacy Policy",
        privacy_last_updated: "Last updated:",
        privacy_intro: "SoundLightPro is committed to protecting your privacy and personal information. This policy explains how we collect, use, and safeguard your data.",
        privacy_summary: "Quick Summary",
        privacy_collect: "We collect information to process orders and improve our services",
        privacy_never_sell: "We never sell your personal information to third parties",
        privacy_security: "We use industry-standard security measures to protect your data",
        privacy_access: "You can request access to, correction of, or deletion of your personal data",
        privacy_cookies: "We use cookies to enhance your browsing experience",

        // Terms of Service Page
        terms_title: "Terms of Service",
        terms_last_updated: "Last updated:",
        terms_intro: "These terms and conditions govern your use of the SoundLightPro website and services. By using our website, you agree to these terms.",
        terms_agreement: "Agreement to Terms",
        terms_agreement_text: "By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement.",
        terms_key_points: "Key Points:",
        terms_use_website: "Use of Website",

        // Debug API Page
        debug_title: "Debug API Test",
        debug_description: "This utility page helps verify connectivity with the SoundLightPro API.",
        debug_success: "API Test Successful",
        debug_failed: "API Test Failed",
        debug_status: "Status:",
        debug_products_found: "Products found:",
        debug_error: "Error:",
        
        // Dashboard
        nav_dashboard: "Dashboard",
        dashboard_title: "My Dashboard",
        dashboard_subtitle: "Manage your account and orders",
        
        // Dashboard Navigation
        dashboard_nav_overview: "Overview",
        dashboard_nav_profile: "Profile",
        dashboard_nav_orders: "Orders",
        dashboard_nav_reviews: "Reviews",
        dashboard_nav_wishlist: "Wishlist",
        dashboard_nav_addresses: "Addresses",
        dashboard_nav_payment: "Payment Methods",
        dashboard_nav_security: "Security",
        dashboard_nav_logout: "Logout",
        
        // Overview Section
        dashboard_overview_title: "Account Overview",
        dashboard_overview_subtitle: "Your account summary and quick stats",
        dashboard_overview_totalorders: "Total Orders",
        dashboard_overview_reviews: "Reviews",
        dashboard_overview_wishlist: "Wishlist Items",
        dashboard_overview_addresses: "Addresses",
        dashboard_overview_recentorders: "Recent Orders",
        dashboard_overview_viewall: "View All Orders",
        dashboard_stats_orders: "Total Orders",
        dashboard_stats_pending: "Pending Orders",
        dashboard_stats_reviews: "Reviews Written",
        dashboard_stats_wishlist: "Wishlist Items",
        dashboard_welcome: "Welcome back",
        dashboard_member_since: "Member since",
        
        // Profile Section
        dashboard_profile_title: "Profile Information",
        dashboard_profile_subtitle: "Update your personal details",
        dashboard_profile_email: "Email",
        dashboard_profile_phone: "Phone Number",
        dashboard_profile_first_name: "First Name",
        dashboard_profile_last_name: "Last Name",
        dashboard_profile_save: "Save Changes",
        dashboard_profile_updated: "Profile updated successfully!",
        
        // Orders Section
        dashboard_orders_title: "Order History",
        dashboard_orders_subtitle: "View and track your orders",
        dashboard_orders_filter_all: "All Orders",
        dashboard_orders_filter_pending: "Pending",
        dashboard_orders_filter_processing: "Processing",
        dashboard_orders_filter_shipped: "Shipped",
        dashboard_orders_filter_delivered: "Delivered",
        dashboard_orders_filter_cancelled: "Cancelled",
        dashboard_orders_search: "Search orders...",
        dashboard_orders_number: "Order",
        dashboard_orders_date: "Order Date",
        dashboard_orders_status: "Status",
        dashboard_orders_total: "Total",
        dashboard_orders_items: "Items",
        dashboard_orders_more_items: "+%d more items",
        dashboard_orders_tracking: "Tracking",
        dashboard_orders_view_details: "View Details",
        dashboard_orders_cancel: "Cancel Order",
        dashboard_orders_reorder: "Reorder",
        dashboard_orders_empty: "No orders found",
        dashboard_orders_cancelled: "Order cancelled successfully",
        
        // Order Details Modal
        dashboard_order_details_title: "Order Details",
        dashboard_order_info: "Order Information",
        dashboard_order_shipping_info: "Shipping Information",
        dashboard_order_items_list: "Order Items",
        dashboard_order_shipping_address: "Shipping Address",
        dashboard_order_payment_method: "Payment Method",
        dashboard_order_subtotal: "Subtotal",
        dashboard_order_shipping: "Shipping",
        dashboard_order_tax: "Tax",
        dashboard_order_quantity: "Quantity",
        dashboard_order_price: "Price",
        
        // Reviews Section
        dashboard_reviews_title: "My Reviews",
        dashboard_reviews_subtitle: "Manage your product reviews",
        dashboard_reviews_product: "Product",
        dashboard_reviews_rating: "Rating",
        dashboard_reviews_date: "Review Date",
        dashboard_reviews_verified: "Verified Purchase",
        dashboard_reviews_edit: "Edit",
        dashboard_reviews_delete: "Delete",
        dashboard_reviews_empty: "You haven't written any reviews yet",
        dashboard_reviews_deleted: "Review deleted successfully",
        
        // Wishlist Section
        dashboard_wishlist_title: "My Wishlist",
        dashboard_wishlist_subtitle: "Your saved items",
        dashboard_wishlist_clear: "Clear Wishlist",
        dashboard_wishlist_empty: "Your wishlist is empty",
        dashboard_wishlist_removed: "Item removed from wishlist",
        dashboard_wishlist_add_to_cart: "Add to Cart",
        dashboard_wishlist_view_product: "View Product",
        
        // Addresses Section
        dashboard_addresses_title: "Shipping Addresses",
        dashboard_addresses_subtitle: "Manage your delivery addresses",
        dashboard_addresses_add: "Add New Address",
        dashboard_addresses_label: "Address Label",
        dashboard_addresses_street: "Street Address",
        dashboard_addresses_city: "City",
        dashboard_addresses_state: "State/Province",
        dashboard_addresses_postal: "Postal Code",
        dashboard_addresses_country: "Country",
        dashboard_addresses_phone: "Phone Number",
        dashboard_addresses_default: "Default Address",
        dashboard_addresses_set_default: "Set as Default",
        dashboard_addresses_edit: "Edit",
        dashboard_addresses_delete: "Delete",
        dashboard_addresses_save: "Save Address",
        dashboard_addresses_empty: "No addresses saved",
        dashboard_addresses_saved: "Address saved successfully",
        dashboard_addresses_deleted: "Address deleted successfully",
        
        // Address Modal
        dashboard_address_modal_title: "Add/Edit Address",
        dashboard_address_modal_add: "Add New Address",
        dashboard_address_modal_edit: "Edit Address",
        
        // Payment Methods Section
        dashboard_payment_title: "Payment Methods",
        dashboard_payment_subtitle: "Manage your saved payment methods",
        dashboard_payment_add: "Add Payment Method",
        dashboard_payment_card_number: "Card Number",
        dashboard_payment_card_holder: "Card Holder Name",
        dashboard_payment_expiry: "Expiry Date",
        dashboard_payment_cvv: "CVV",
        dashboard_payment_default: "Default Payment",
        dashboard_payment_set_default: "Set as Default",
        dashboard_payment_edit: "Edit",
        dashboard_payment_delete: "Delete",
        dashboard_payment_save: "Save Payment Method",
        dashboard_payment_empty: "No payment methods saved",
        dashboard_payment_saved: "Payment method saved successfully",
        dashboard_payment_deleted: "Payment method deleted successfully",
        dashboard_payment_expired: "Expired",
        dashboard_payment_expires: "Expires",
        
        // Security Section
        dashboard_security_title: "Security Settings",
        dashboard_security_subtitle: "Update your password and security preferences",
        dashboard_security_current_password: "Current Password",
        dashboard_security_new_password: "New Password",
        dashboard_security_confirm_password: "Confirm New Password",
        dashboard_security_update: "Update Password",
        dashboard_security_password_updated: "Password updated successfully!",
        dashboard_security_password_weak: "Password is too weak",
        dashboard_security_password_medium: "Password is okay",
        dashboard_security_password_strong: "Password is strong",
        dashboard_security_passwords_match: "Passwords match",
        dashboard_security_passwords_mismatch: "Passwords do not match",
        
        // Common Dashboard Actions
        dashboard_btn_save: "Save",
        dashboard_btn_cancel: "Cancel",
        dashboard_btn_delete: "Delete",
        dashboard_btn_edit: "Edit",
        dashboard_btn_add: "Add",
        dashboard_btn_close: "Close",
        dashboard_btn_confirm: "Confirm",
        
        // Status Messages
        dashboard_loading: "Loading...",
        dashboard_error: "An error occurred",
        dashboard_success: "Success!",
        dashboard_confirm_delete: "Are you sure you want to delete this?",
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
        language_switch_to: "Basculer vers",
        
        // Wishlist
        wishlist_title: "Ma Liste de Souhaits",
        wishlist_subtitle: "Enregistrez vos articles préférés pour plus tard",
        add_to_wishlist: "Ajouter à la Liste",
        in_wishlist: "Dans la Liste",
        remove_from_wishlist: "Retirer de la Liste",
        move_to_cart: "Déplacer au Panier",
        empty_wishlist: "Votre liste de souhaits est vide",
        empty_wishlist_message: "Commencez à ajouter des produits que vous aimez !",
        continue_shopping: "Continuer vos Achats",
        loading_wishlist: "Chargement de la liste...",
        added_to_wishlist: "Ajouté à la liste de souhaits",
        removed_from_wishlist: "Retiré de la liste de souhaits",
        moved_to_cart: "Déplacé au panier",
        error_wishlist: "Erreur de liste de souhaits",
        error_removing_wishlist: "Erreur lors de la suppression",
        error_moving_to_cart: "Erreur lors du déplacement",
        error_loading_wishlist: "Erreur de chargement de la liste",
        
        // Reviews
        reviews_title: "Avis Clients",
        write_review: "Écrire un Avis",
        your_rating: "Votre Note",
        review_title: "Titre de l'Avis",
        review_title_placeholder: "Résumez votre expérience",
        review_comment: "Votre Avis",
        review_comment_placeholder: "Partagez vos impressions sur ce produit",
        submit_review: "Soumettre l'Avis",
        sort_recent: "Plus Récents",
        sort_highest: "Mieux Notés",
        sort_lowest: "Moins Bien Notés",
        sort_verified: "Achats Vérifiés",
        verified_purchase: "Achat Vérifié",
        no_reviews: "Aucun avis pour le moment",
        be_first_review: "Soyez le premier à donner votre avis !",
        loading_reviews: "Chargement des avis...",
        review_submitted: "Avis soumis avec succès !",
        review_submit_error: "Erreur lors de l'envoi de l'avis",
        error_loading_reviews: "Erreur de chargement des avis",
        rating_required: "Veuillez sélectionner une note",
        title_required: "Veuillez entrer un titre",
        comment_required: "Veuillez entrer votre avis",
        reviews_based_on: "basé sur",
        reviews_count: "avis",
        
        // Related Products
        related_products: "Vous Aimerez Aussi",
        related_products_subtitle: "Produits similaires qui pourraient vous intéresser",
        loading_related_products: "Chargement des produits similaires...",
        no_related_products: "Aucun produit similaire trouvé",
        check_back_later: "Revenez plus tard pour des recommandations",
        error_loading_related: "Erreur de chargement des produits similaires",
        
        // Common
        retry: "Réessayer",

        // Index Page
        home_title: "SoundLightPro - Équipement Audio et Éclairage Professionnel",
        skip_to_main_content: "Passer au contenu principal",
        nav_contact: "Contact",
        hero_title_accent: "Une Nouvelle Perspective",
        hero_title_main: "en Son & Lumière",
        hero_subtitle: "Découvrez notre équipement professionnel de pointe",
        feature_shipping_title: "Livraison Rapide",
        feature_shipping_text: "Livraison gratuite pour les commandes de plus de 500 $",
        feature_warranty_title: "Protection Garantie",
        feature_warranty_text: "Garantie de 2 ans sur tous les produits",
        feature_support_title: "Support Expert",
        feature_support_text: "Assistance technique 24/7",
        feature_returns_title: "Retours Faciles",
        feature_returns_text: "Politique de retour de 30 jours",
        video_promo_title: "Voir Notre Équipement en Action",
        video_promo_subtitle: "Installations professionnelles pour des événements de classe mondiale",
        training_cta_title: "Formation Pro pour DJs & Techniciens du Son",
        training_cta_text: "Ateliers pratiques pour maîtriser l'audio et l'éclairage pro. Places limitées chaque mois.",
        training_cta_button: "Voir la Formation & S'inscrire",
        newsletter_title: "Restez Informé",
        newsletter_text: "Recevez les dernières nouvelles sur les nouveaux produits et les offres exclusives",
        newsletter_subscribe: "S'abonner",
        footer_description: "Solutions audio et d'éclairage professionnelles pour événements, concerts et salles du monde entier.",
        footer_quick_links: "Liens Rapides",
        footer_customer_service: "Service Client",
        footer_support_center: "Centre de Support",
        footer_shipping_info: "Infos Livraison",
        footer_returns: "Retours",
        footer_warranty: "Garantie",
        footer_contact_info: "Infos Contact",
        footer_copyright: "Tous droits réservés.",
        footer_privacy_policy: "Politique de Confidentialité",
        footer_terms_of_service: "Conditions d'Utilisation",
        footer_cookie_policy: "Politique de Cookies",
        footer_company: "Entreprise",
        footer_support: "Support",
        footer_legal: "Légal",
        footer_connect: "Connectez-vous",
        footer_about: "À Propos",
        footer_contact: "Contact",
        footer_services: "Services",
        footer_helpcenter: "Centre d'Aide",
        footer_shipping: "Infos Livraison",
        footer_terms: "Conditions d'Utilisation",
        footer_privacy: "Confidentialité",
        footer_cookies: "Cookies",
        chatbot_greeting_message: "Salut ! 👋<br>Comment puis-je vous aider aujourd'hui ?",

        // 404 Page
        fourofour_title: "404 - Page Introuvable | SoundLightPro",
        fourofour_page_not_found: "Page Introuvable",
        fourofour_message: "Oups ! La page que vous cherchez semble s'être volatilisée. Ne vous inquiétez pas, notre équipement audio est bien plus fiable que nos URL !",
        fourofour_back_to_home: "Retour à l'accueil",
        fourofour_go_back: "Retour",
        fourofour_search_our_site: "Rechercher sur Notre Site",
        fourofour_search_our_site_message: "Essayez de rechercher ce que vous cherchiez :",
        fourofour_search_placeholder: "Rechercher produits, services...",
        fourofour_popular_pages: "Pages Populaires",
        fourofour_audio_equipment: "Équipement Audio",
        fourofour_audio_equipment_desc: "Systèmes de sonorisation professionnels",
        fourofour_lighting_solutions: "Solutions d'Éclairage",
        fourofour_lighting_solutions_desc: "Éclairage de scène et d'événement",
        fourofour_our_services: "Nos Services",
        fourofour_our_services_desc: "Installation, location et support",
        fourofour_support_center: "Centre de Support",
        fourofour_support_center_desc: "Obtenez de l'aide et trouvez des FAQ",
        fourofour_contact_us: "Nous Contacter",
        fourofour_contact_us_desc: "Prenez contact avec notre équipe",
        fourofour_need_help: "Besoin d'Aide ?",
        fourofour_need_help_message: "Si vous pensez qu'il s'agit d'une erreur, veuillez contacter notre équipe de support :",
        fourofour_call_us: "Appelez-nous",
        fourofour_email_support: "Support par E-mail",

        // About Page
        about_us_title: "À Propos - SoundLightPro",
        about_us_main_title: "À Propos de SoundLightPro",
        about_us_welcome: "Bienvenue chez SoundLightPro, votre destination de choix pour les solutions audio et d'éclairage professionnelles.",
        about_us_mission: "Fondée avec une passion pour un son pur et une lumière éclatante, nous servons l'industrie des événements, des concerts et des salles depuis plus d'une décennie. Notre mission est de fournir aux artistes, ingénieurs et organisateurs d'événements l'équipement de la plus haute qualité qui leur permet de créer des expériences inoubliables.",
        about_us_values: "Nous croyons en l'innovation, la fiabilité et un support client inégalé. Notre équipe est composée de vétérans de l'industrie et d'experts techniques qui sélectionnent méticuleusement notre catalogue de produits, s'assurant que chaque article répond à nos normes rigoureuses de performance et de durabilité.",
        about_us_trust: "Des scènes de festivals massifs aux événements d'entreprise intimes, SoundLightPro est le partenaire de confiance des professionnels du monde entier. Merci de nous avoir choisis pour faire partie de votre parcours créatif.",
        our_team: "Notre Équipe",
        ceo_name: "KOUMENE ALAIN",
        ceo_role: "PDG",
        tech_sales_manager_name: "ETUNDI ROLAND",
        tech_sales_manager_role: "DIRECTEUR TECHNIQUE DES VENTES",
        key_figures_title: "SoundLightPro en Chiffres Clés",
        key_figures_products: "Produits",
        key_figures_experience: "Années d'Expérience",
        key_figures_clients: "Clients Satisfaits",
        key_figures_collaborators: "Collaborateurs",

        // Cart Page
        cart_title: "Votre Panier - SoundLightPro",
        cart_page_title: "Votre Panier",
        loading_cart: "Chargement du panier...",
        checkout_title: "Passer Commande",
        shipping_information: "Informations de Livraison",
        first_name_label: "Prénom",
        last_name_label: "Nom",
        email_label: "Adresse E-mail",
        address_label: "Adresse",
        postal_code_label: "Code Postal",
        city_label: "Ville",
        payment_details: "Détails de Paiement",
        credit_debit_card: "Carte de crédit ou de débit",
        pay_now: "Payer Maintenant",

        // Contact Page
        contact_title: "Nous Contacter - SoundLightPro",
        contact_page_title: "Nous Contacter",
        contact_address: "Adresse",
        contact_mobile: "Mobile",
        contact_email: "E-mail",
        contact_social: "Réseaux Sociaux",
        contact_hotline: "Ligne directe: +237 6 80 49 49 49",
        contact_form_title: "Envoyez-nous un Message",
        contact_form_subtitle: "Si vous avez des questions, n'hésitez pas à nous contacter. Nous vous répondrons dans les plus brefs délais. Merci !",
        contact_your_name: "Votre Nom (requis)",
        contact_your_email: "Votre E-mail (requis)",
        contact_subject: "Sujet",
        contact_your_message: "Votre Message",
        contact_send: "Envoyer",
        contact_success_message: "Merci pour votre message ! Nous vous répondrons bientôt.",

        // Services Page
        services_title: "Services - SoundLightPro",
        services_page_title: "Nos Services",
        services_consultation_title: "Consultation d'Experts",
        services_consultation_text: "Vous ne savez pas ce dont vous avez besoin ? Notre équipe d'experts en audio et éclairage est là pour vous aider. Nous offrons des consultations personnalisées pour vous aider à sélectionner l'équipement parfait pour vos besoins spécifiques, que vous équipiez une nouvelle salle ou amélioriez votre installation de tournée.",
        services_design_title: "Conception et Intégration de Systèmes",
        services_design_text: "Nous offrons des services complets de conception de systèmes pour les installations permanentes. Des salles de concert et théâtres aux lieux de culte et centres de conférence, nous pouvons concevoir un système audio et d'éclairage entièrement intégré qui offre des performances et une fiabilité exceptionnelles.",
        services_support_title: "Support Technique et Réparation",
        services_support_text: "Notre engagement envers vous ne s'arrête pas après la vente. Nous fournissons un support technique à vie pour tous nos produits. Nos techniciens certifiés offrent également des services de réparation et de maintenance pour maintenir votre équipement en parfait état pendant des années.",

        // Login Page
        login_title: "Connexion - SoundLightPro",
        login_page_title: "Connectez-vous à Votre Compte",
        login_username: "Nom d'utilisateur",
        login_password: "Mot de passe",
        login_button: "Se connecter",
        login_no_account: "Vous n'avez pas de compte ?",
        login_register_here: "Inscrivez-vous ici",

        // Register Page
        register_title: "Inscription - SoundLightPro",
        register_page_title: "Créer un Nouveau Compte",
        register_username: "Nom d'utilisateur",
        register_email: "E-mail",
        register_first_name: "Prénom",
        register_last_name: "Nom",
        register_password: "Mot de passe",
        register_confirm_password: "Confirmer le mot de passe",
        register_button: "S'inscrire",
        register_have_account: "Vous avez déjà un compte ?",
        register_login_here: "Connectez-vous ici",

        // Wishlist Page
        wishlist_title: "Ma Liste de Souhaits",
        wishlist_subtitle: "Enregistrez vos articles préférés pour plus tard",
        wishlist_empty_title: "Votre liste de souhaits est vide",
        wishlist_empty_message: "Commencez à ajouter des produits que vous aimez !",
        wishlist_browse_products: "Parcourir les Produits",
        wishlist_remove: "Retirer de la liste de souhaits",
        wishlist_move_to_cart: "Déplacer vers le Panier",
        wishlist_out_of_stock: "Rupture de Stock",
        wishlist_in_stock: "En Stock",

        // Product Page
        product_loading: "Chargement du produit...",
        product_description: "Description du Produit",
        product_specifications: "Spécifications",
        product_features: "Caractéristiques Principales",
        product_availability: "Disponibilité",
        product_in_stock: "En Stock",
        product_out_of_stock: "Rupture de Stock",
        product_sku: "SKU",
        product_brand: "Marque",
        product_quantity: "Quantité",
        product_share: "Partager",
        product_error_loading: "Erreur lors du chargement des détails du produit",

        // Search Results Page
        search_results_title: "Résultats de Recherche",
        search_results_subtitle: "Recherche de",
        search_results_found: "résultats trouvés",
        search_results_no_results: "Aucun résultat trouvé",
        search_results_try_different: "Essayez des mots-clés différents",
        search_searching: "Recherche en cours...",
        search_showing_results: "Affichage de",
        search_of: "sur",

        // Offline Page
        offline_title: "Vous êtes Hors Ligne",
        offline_message: "Il semble que vous ayez perdu votre connexion Internet. Ne vous inquiétez pas - certaines fonctionnalités sont toujours disponibles !",
        offline_what_can_do: "Ce Que Vous Pouvez Faire Hors Ligne :",
        offline_browse_cached: "Parcourir les produits et pages en cache que vous avez visités",
        offline_add_cart: "Ajouter des articles à votre panier (se synchronisera en ligne)",
        offline_view_cart: "Voir le contenu de votre panier existant",
        offline_access_content: "Accéder au contenu précédemment chargé",
        offline_try_again: "Réessayer",
        offline_available_pages: "Pages en Cache Disponibles :",
        offline_home: "Accueil",
        offline_shopping_cart: "Panier",
        offline_about: "À Propos",
        offline_services: "Services",
        offline_contact: "Contact",
        offline_checking_connection: "Vérification de la connexion...",
        offline_connection_restored: "Connexion rétablie ! La page se rechargera automatiquement.",
        offline_still_offline: "Toujours hors ligne. Réessayera automatiquement lorsque la connexion sera rétablie.",
        offline_no_cached: "Aucune page en cache disponible. Visitez des pages en ligne pour y accéder hors ligne plus tard.",

        // Returns Page
        returns_title: "Politique de Retours",
        returns_subtitle: "Nous voulons que vous soyez complètement satisfait de votre achat. Notre politique de retour de 30 jours le rend facile.",
        returns_easy_returns: "Retours Faciles sous 30 Jours",
        returns_easy_desc: "Retournez les articles dans les 30 jours suivant la livraison pour un remboursement complet ou un échange",
        returns_conditions_title: "Conditions de Retour",
        returns_30day: "Fenêtre de 30 Jours",
        returns_30day_desc: "Les articles doivent être retournés dans les 30 jours suivant la date de livraison initiale.",
        returns_original: "État Original",
        returns_original_desc: "Les produits doivent être dans leur état d'origine, non utilisés, avec tous les emballages.",
        returns_proof: "Preuve d'Achat",
        returns_proof_desc: "Le reçu original ou la confirmation de commande est requis.",
        returns_no_damage: "Sans Dommage",
        returns_no_damage_desc: "Les articles ne doivent présenter aucun signe de mauvaise utilisation, de dommage ou d'usure normale.",
        returns_process_title: "Comment Retourner un Article",
        returns_contact: "Nous Contacter",
        returns_package: "Emballer Votre Article",
        returns_ship: "Expédier le Retour",

        // Shipping Page
        shipping_title: "Informations de Livraison",
        shipping_subtitle: "Livraison rapide et fiable pour tous vos équipements audio et d'éclairage professionnels.",
        shipping_free: "Livraison Gratuite pour Commandes de Plus de 500 $",
        shipping_free_desc: "Profitez de la livraison gratuite au Cameroun pour les commandes admissibles",
        shipping_options_title: "Options de Livraison",
        shipping_express: "Livraison Express",
        shipping_express_time: "Délai de Livraison : 1-2 jours ouvrables",
        shipping_standard: "Livraison Standard",
        shipping_standard_time: "Délai de Livraison : 3-5 jours ouvrables",
        shipping_pickup: "Retrait en Magasin",
        shipping_pickup_time: "Délai de Retrait : Le jour même ou le lendemain",
        shipping_international: "Livraison Internationale",
        shipping_international_time: "Délai de Livraison : 7-14 jours ouvrables",
        shipping_rates_title: "Tarifs de Livraison",

        // Warranty Page
        warranty_title: "Informations de Garantie",
        warranty_subtitle: "Nous soutenons nos produits avec une couverture de garantie complète et un support expert.",
        warranty_comprehensive: "Garantie Complète de 2 Ans",
        warranty_comprehensive_desc: "Tous les produits SoundLightPro sont accompagnés d'une garantie fabricant de 2 ans couvrant les pièces et la main-d'œuvre",
        warranty_coverage_title: "Ce Qui Est Couvert",
        warranty_defects: "Défauts de Fabrication",
        warranty_defects_desc: "Tous les défauts de matériaux ou de fabrication en utilisation normale sont entièrement couverts.",
        warranty_parts: "Pièces et Main-d'œuvre",
        warranty_parts_desc: "Les pièces de rechange et les coûts de main-d'œuvre sont couverts pour les réparations sous garantie.",
        warranty_shipping: "Livraison Gratuite",
        warranty_shipping_desc: "Nous couvrons les frais d'expédition dans les deux sens pour les réparations sous garantie au Cameroun.",
        warranty_replacement: "Unités de Remplacement",
        warranty_support: "Support Technique",
        warranty_turnaround: "Délai Rapide",

        // Support Center Page
        support_title: "Centre de Support",
        support_subtitle: "Nous sommes là pour vous aider ! Trouvez des réponses aux questions courantes ou contactez notre équipe de support.",
        support_phone: "Support Téléphonique",
        support_phone_desc: "Appelez-nous pour une assistance immédiate",
        support_email: "Support par E-mail",
        support_email_desc: "Envoyez-nous un message détaillé",
        support_chat: "Chat en Direct",
        support_chat_desc: "Discutez avec notre équipe de support",
        support_visit: "Visitez-Nous",
        support_visit_desc: "Venez dans notre salle d'exposition",
        support_faq_title: "Questions Fréquemment Posées",
        support_orders: "Commandes et Paiement",
        support_how_order: "Comment passer une commande ?",
        support_payment_methods: "Quels modes de paiement acceptez-vous ?",
        support_modify_order: "Puis-je modifier ou annuler ma commande ?",
        support_start_chat: "Démarrer le Chat",
        support_get_directions: "Obtenir l'Itinéraire",

        // Cookie Policy Page
        cookie_title: "Politique de Cookies",
        cookie_last_updated: "Dernière mise à jour :",
        cookie_intro: "Cette Politique de Cookies explique comment SoundLightPro utilise les cookies et technologies de suivi similaires sur notre site web pour améliorer votre expérience de navigation.",
        cookie_what_are: "Que Sont les Cookies ?",
        cookie_definition: "Les cookies sont de petits fichiers texte stockés sur votre appareil (ordinateur, tablette ou mobile) lorsque vous visitez un site web.",
        cookie_benefits: "Avantages des Cookies :",
        cookie_types_title: "Types de Cookies Que Nous Utilisons",

        // Privacy Policy Page
        privacy_title: "Politique de Confidentialité",
        privacy_last_updated: "Dernière mise à jour :",
        privacy_intro: "SoundLightPro s'engage à protéger votre vie privée et vos informations personnelles. Cette politique explique comment nous collectons, utilisons et protégeons vos données.",
        privacy_summary: "Résumé Rapide",
        privacy_collect: "Nous collectons des informations pour traiter les commandes et améliorer nos services",
        privacy_never_sell: "Nous ne vendons jamais vos informations personnelles à des tiers",
        privacy_security: "Nous utilisons des mesures de sécurité standard de l'industrie pour protéger vos données",
        privacy_access: "Vous pouvez demander l'accès, la correction ou la suppression de vos données personnelles",
        privacy_cookies: "Nous utilisons des cookies pour améliorer votre expérience de navigation",

        // Terms of Service Page
        terms_title: "Conditions de Service",
        terms_last_updated: "Dernière mise à jour :",
        terms_intro: "Ces termes et conditions régissent votre utilisation du site web et des services SoundLightPro. En utilisant notre site web, vous acceptez ces conditions.",
        terms_agreement: "Accord aux Conditions",
        terms_agreement_text: "En accédant et en utilisant ce site web, vous acceptez et convenez d'être lié par les termes et dispositions de cet accord.",
        terms_key_points: "Points Clés :",
        terms_use_website: "Utilisation du Site Web",

        // Debug API Page
        debug_title: "Test de Débogage API",
        debug_description: "Cette page utilitaire aide à vérifier la connectivité avec l'API SoundLightPro.",
        debug_success: "Test API Réussi",
        debug_failed: "Test API Échoué",
        debug_status: "Statut :",
        debug_products_found: "Produits trouvés :",
        debug_error: "Erreur :",
        
        // Dashboard
        nav_dashboard: "Tableau de Bord",
        dashboard_title: "Mon Tableau de Bord",
        dashboard_subtitle: "Gérer votre compte et vos commandes",
        
        // Dashboard Navigation
        dashboard_nav_overview: "Aperçu",
        dashboard_nav_profile: "Profil",
        dashboard_nav_orders: "Commandes",
        dashboard_nav_reviews: "Avis",
        dashboard_nav_wishlist: "Liste de Souhaits",
        dashboard_nav_addresses: "Adresses",
        dashboard_nav_payment: "Modes de Paiement",
        dashboard_nav_security: "Sécurité",
        dashboard_nav_logout: "Déconnexion",
        
        // Overview Section
        dashboard_overview_title: "Aperçu du Compte",
        dashboard_overview_subtitle: "Résumé de votre compte et statistiques rapides",
        dashboard_overview_totalorders: "Commandes Totales",
        dashboard_overview_reviews: "Avis",
        dashboard_overview_wishlist: "Articles en Liste",
        dashboard_overview_addresses: "Adresses",
        dashboard_overview_recentorders: "Commandes Récentes",
        dashboard_overview_viewall: "Voir Toutes les Commandes",
        dashboard_stats_orders: "Commandes Totales",
        dashboard_stats_pending: "Commandes en Attente",
        dashboard_stats_reviews: "Avis Rédigés",
        dashboard_stats_wishlist: "Articles en Liste de Souhaits",
        dashboard_welcome: "Bienvenue",
        dashboard_member_since: "Membre depuis",
        
        // Profile Section
        dashboard_profile_title: "Informations du Profil",
        dashboard_profile_subtitle: "Mettre à jour vos informations personnelles",
        dashboard_profile_email: "E-mail",
        dashboard_profile_phone: "Numéro de Téléphone",
        dashboard_profile_first_name: "Prénom",
        dashboard_profile_last_name: "Nom",
        dashboard_profile_save: "Enregistrer les Modifications",
        dashboard_profile_updated: "Profil mis à jour avec succès !",
        
        // Orders Section
        dashboard_orders_title: "Historique des Commandes",
        dashboard_orders_subtitle: "Voir et suivre vos commandes",
        dashboard_orders_filter_all: "Toutes les Commandes",
        dashboard_orders_filter_pending: "En Attente",
        dashboard_orders_filter_processing: "En Traitement",
        dashboard_orders_filter_shipped: "Expédié",
        dashboard_orders_filter_delivered: "Livré",
        dashboard_orders_filter_cancelled: "Annulé",
        dashboard_orders_search: "Rechercher des commandes...",
        dashboard_orders_number: "Commande",
        dashboard_orders_date: "Date de Commande",
        dashboard_orders_status: "Statut",
        dashboard_orders_total: "Total",
        dashboard_orders_items: "Articles",
        dashboard_orders_more_items: "+%d articles de plus",
        dashboard_orders_tracking: "Suivi",
        dashboard_orders_view_details: "Voir les Détails",
        dashboard_orders_cancel: "Annuler la Commande",
        dashboard_orders_reorder: "Recommander",
        dashboard_orders_empty: "Aucune commande trouvée",
        dashboard_orders_cancelled: "Commande annulée avec succès",
        
        // Order Details Modal
        dashboard_order_details_title: "Détails de la Commande",
        dashboard_order_info: "Informations de Commande",
        dashboard_order_shipping_info: "Informations d'Expédition",
        dashboard_order_items_list: "Articles de la Commande",
        dashboard_order_shipping_address: "Adresse de Livraison",
        dashboard_order_payment_method: "Mode de Paiement",
        dashboard_order_subtotal: "Sous-total",
        dashboard_order_shipping: "Livraison",
        dashboard_order_tax: "Taxe",
        dashboard_order_quantity: "Quantité",
        dashboard_order_price: "Prix",
        
        // Reviews Section
        dashboard_reviews_title: "Mes Avis",
        dashboard_reviews_subtitle: "Gérer vos avis de produits",
        dashboard_reviews_product: "Produit",
        dashboard_reviews_rating: "Note",
        dashboard_reviews_date: "Date de l'Avis",
        dashboard_reviews_verified: "Achat Vérifié",
        dashboard_reviews_edit: "Modifier",
        dashboard_reviews_delete: "Supprimer",
        dashboard_reviews_empty: "Vous n'avez pas encore écrit d'avis",
        dashboard_reviews_deleted: "Avis supprimé avec succès",
        
        // Wishlist Section
        dashboard_wishlist_title: "Ma Liste de Souhaits",
        dashboard_wishlist_subtitle: "Vos articles enregistrés",
        dashboard_wishlist_clear: "Vider la Liste de Souhaits",
        dashboard_wishlist_empty: "Votre liste de souhaits est vide",
        dashboard_wishlist_removed: "Article retiré de la liste de souhaits",
        dashboard_wishlist_add_to_cart: "Ajouter au Panier",
        dashboard_wishlist_view_product: "Voir le Produit",
        
        // Addresses Section
        dashboard_addresses_title: "Adresses de Livraison",
        dashboard_addresses_subtitle: "Gérer vos adresses de livraison",
        dashboard_addresses_add: "Ajouter une Nouvelle Adresse",
        dashboard_addresses_label: "Libellé de l'Adresse",
        dashboard_addresses_street: "Adresse",
        dashboard_addresses_city: "Ville",
        dashboard_addresses_state: "État/Province",
        dashboard_addresses_postal: "Code Postal",
        dashboard_addresses_country: "Pays",
        dashboard_addresses_phone: "Numéro de Téléphone",
        dashboard_addresses_default: "Adresse par Défaut",
        dashboard_addresses_set_default: "Définir par Défaut",
        dashboard_addresses_edit: "Modifier",
        dashboard_addresses_delete: "Supprimer",
        dashboard_addresses_save: "Enregistrer l'Adresse",
        dashboard_addresses_empty: "Aucune adresse enregistrée",
        dashboard_addresses_saved: "Adresse enregistrée avec succès",
        dashboard_addresses_deleted: "Adresse supprimée avec succès",
        
        // Address Modal
        dashboard_address_modal_title: "Ajouter/Modifier l'Adresse",
        dashboard_address_modal_add: "Ajouter une Nouvelle Adresse",
        dashboard_address_modal_edit: "Modifier l'Adresse",
        
        // Payment Methods Section
        dashboard_payment_title: "Modes de Paiement",
        dashboard_payment_subtitle: "Gérer vos modes de paiement enregistrés",
        dashboard_payment_add: "Ajouter un Mode de Paiement",
        dashboard_payment_card_number: "Numéro de Carte",
        dashboard_payment_card_holder: "Nom du Titulaire",
        dashboard_payment_expiry: "Date d'Expiration",
        dashboard_payment_cvv: "CVV",
        dashboard_payment_default: "Paiement par Défaut",
        dashboard_payment_set_default: "Définir par Défaut",
        dashboard_payment_edit: "Modifier",
        dashboard_payment_delete: "Supprimer",
        dashboard_payment_save: "Enregistrer le Mode de Paiement",
        dashboard_payment_empty: "Aucun mode de paiement enregistré",
        dashboard_payment_saved: "Mode de paiement enregistré avec succès",
        dashboard_payment_deleted: "Mode de paiement supprimé avec succès",
        dashboard_payment_expired: "Expiré",
        dashboard_payment_expires: "Expire",
        
        // Security Section
        dashboard_security_title: "Paramètres de Sécurité",
        dashboard_security_subtitle: "Mettre à jour votre mot de passe et vos préférences de sécurité",
        dashboard_security_current_password: "Mot de Passe Actuel",
        dashboard_security_new_password: "Nouveau Mot de Passe",
        dashboard_security_confirm_password: "Confirmer le Nouveau Mot de Passe",
        dashboard_security_update: "Mettre à Jour le Mot de Passe",
        dashboard_security_password_updated: "Mot de passe mis à jour avec succès !",
        dashboard_security_password_weak: "Le mot de passe est trop faible",
        dashboard_security_password_medium: "Le mot de passe est correct",
        dashboard_security_password_strong: "Le mot de passe est fort",
        dashboard_security_passwords_match: "Les mots de passe correspondent",
        dashboard_security_passwords_mismatch: "Les mots de passe ne correspondent pas",
        
        // Common Dashboard Actions
        dashboard_btn_save: "Enregistrer",
        dashboard_btn_cancel: "Annuler",
        dashboard_btn_delete: "Supprimer",
        dashboard_btn_edit: "Modifier",
        dashboard_btn_add: "Ajouter",
        dashboard_btn_close: "Fermer",
        dashboard_btn_confirm: "Confirmer",
        
        // Status Messages
        dashboard_loading: "Chargement...",
        dashboard_error: "Une erreur s'est produite",
        dashboard_success: "Succès !",
        dashboard_confirm_delete: "Êtes-vous sûr de vouloir supprimer ceci ?",
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
        // Normalize key: convert dot notation to underscore and lowercase
        // e.g., "Nav.Home" -> "nav_home", "Dashboard.Title" -> "dashboard_title"
        const normalizedKey = key
            .replace(/\./g, '_')
            .toLowerCase();
        
        let translation = translations[this.currentLanguage]?.[normalizedKey] || translations.en[normalizedKey];
        if (!translation) {
            // Try original key as fallback
            translation = translations[this.currentLanguage]?.[key] || translations.en[key];
        }
        if (!translation) {
            // Humanize the key: replace underscores/dots with spaces and capitalize
            const humanized = key.replace(/[_.]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
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