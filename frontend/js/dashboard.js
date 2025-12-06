/**
 * dashboard.js
 * 
 * Customer Account Dashboard Module
 * Manages all dashboard functionality including:
 * - Profile management
 * - Order history and tracking
 * - Reviews management
 * - Wishlist integration
 * - Shipping addresses CRUD
 * - Payment methods CRUD
 * - Security settings
 */

import * as apiService from './apiService.js';
import { getWishlistData, isInWishlist, removeFromWishlist, moveToCart, initWishlist } from './wishlist.js';
import { showToast } from './ui.js';
import { initRegisterPageValidation } from './auth.js';
import i18n from './i18n.js';

const ACCESS_TOKEN_STORAGE_KEY = 'slp_access_token';

// Dashboard state
const dashboardState = {
    currentSection: 'overview',
    profile: null,
    orders: [],
    reviews: [],
    addresses: [],
    paymentMethods: [],
    stats: {
        ordersCount: 0,
        reviewsCount: 0,
        wishlistCount: 0,
        addressesCount: 0
    }
};

/**
 * Initialize dashboard
 */
export async function initDashboard() {
    // Initialize i18n first
    i18n.translatePage();

    // Ensure there is a valid session (will attempt cookie-based refresh)
    const accessToken = await apiService.ensureAccessToken();
    if (!accessToken) {
        window.location.href = 'login.html?redirect=dashboard.html';
        return;
    }

    try {
        // Show loading state
        showLoading(true);

        // Load user profile
        await loadUserProfile();

        // Initialize wishlist for authenticated user
        try {
            const userWishlist = await apiService.getWishlist();
            await initWishlist(true, userWishlist);
        } catch (wishlistError) {
            console.warn('Failed to load wishlist, using guest mode:', wishlistError);
            await initWishlist(false, null);
        }

        // Initialize navigation
        initNavigation();

        // Initialize modals
        initModals();

        // Load initial section (from hash or default to overview)
        const hash = window.location.hash.substring(1) || 'overview';
        await switchSection(hash);

        // Set up hash change listener
        window.addEventListener('hashchange', handleHashChange);

        // Initialize logout button
        document.getElementById('logout-btn')?.addEventListener('click', handleLogout);

        showLoading(false);
    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
            try {
                sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
            } catch (storageError) {
                console.warn('Failed to clear session token during dashboard auth failure:', storageError);
            }
            localStorage.removeItem('refreshToken');
            window.location.href = 'login.html?redirect=dashboard.html';
        } else {
            showToast('Failed to load dashboard. Please refresh the page.', 'error');
        }
    }
}

/**
 * Load user profile
 */
async function loadUserProfile() {
    try {
        dashboardState.profile = await apiService.getDashboardProfile();
        updateUserGreeting();
    } catch (error) {
        console.error('Failed to load profile:', error);
        throw error;
    }
}

/**
 * Update user greeting in overview
 */
function updateUserGreeting() {
    const profile = dashboardState.profile;
    if (profile) {
        const firstName = profile.first_name || profile.username;
        const greetingElement = document.querySelector('.section-title');
        if (greetingElement && dashboardState.currentSection === 'overview') {
            greetingElement.textContent = `Welcome Back, ${firstName}!`;
        }
    }
}

/**
 * Initialize navigation
 */
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-section]');
    navItems.forEach(item => {
        item.addEventListener('click', async (e) => {
            e.preventDefault();
            const section = item.getAttribute('data-section');
            window.location.hash = section;
        });
    });

    // Sidebar toggle for mobile
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebarClose = document.getElementById('sidebar-close');
    const sidebar = document.getElementById('dashboard-sidebar');

    sidebarToggle?.addEventListener('click', () => {
        sidebar?.classList.toggle('active');
    });

    sidebarClose?.addEventListener('click', () => {
        sidebar?.classList.remove('active');
    });

    // Close sidebar when clicking on a link (mobile)
    if (window.innerWidth <= 768) {
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                sidebar?.classList.remove('active');
            });
        });
    }
}

/**
 * Handle hash change
 */
async function handleHashChange() {
    const hash = window.location.hash.substring(1) || 'overview';
    await switchSection(hash);
}

/**
 * Switch dashboard section
 */
async function switchSection(sectionName) {
    // Update state
    dashboardState.currentSection = sectionName;

    // Hide all sections
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
    });

    // Show target section
    const targetSection = document.getElementById(`section-${sectionName}`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeNav = document.querySelector(`.nav-item[data-section="${sectionName}"]`);
    if (activeNav) {
        activeNav.classList.add('active');
    }

    // Load section data
    await loadSectionData(sectionName);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Load data for specific section
 */
async function loadSectionData(sectionName) {
    try {
        switch (sectionName) {
            case 'overview':
                await loadOverview();
                break;
            case 'profile':
                await loadProfileSection();
                break;
            case 'orders':
                await loadOrders();
                break;
            case 'reviews':
                await loadReviews();
                break;
            case 'wishlist':
                await loadWishlist();
                break;
            case 'addresses':
                await loadAddresses();
                break;
            case 'payment-methods':
                await loadPaymentMethods();
                break;
            case 'security':
                initSecuritySection();
                break;
        }
    } catch (error) {
        console.error(`Failed to load ${sectionName}:`, error);
        showToast(`Failed to load ${sectionName}. Please try again.`, 'error');
    }
}

// ==================== OVERVIEW SECTION ====================

/**
 * Load overview section
 */
async function loadOverview() {
    try {
        // Load stats
        const [orders, reviews, wishlist, addresses] = await Promise.all([
            apiService.getDashboardOrders(),
            apiService.getUserReviews(),
            Promise.resolve(getWishlistData()),
            apiService.getShippingAddresses()
        ]);

        dashboardState.orders = orders;
        dashboardState.reviews = reviews;
        dashboardState.addresses = addresses;

        // Update stats
        dashboardState.stats = {
            ordersCount: orders.length,
            reviewsCount: reviews.length,
            wishlistCount: Array.isArray(wishlist) ? wishlist.length : wishlist.items?.length || 0,
            addressesCount: addresses.length
        };

        // Update UI
        document.getElementById('stat-orders').textContent = dashboardState.stats.ordersCount;
        document.getElementById('stat-reviews').textContent = dashboardState.stats.reviewsCount;
        document.getElementById('stat-wishlist').textContent = dashboardState.stats.wishlistCount;
        document.getElementById('stat-addresses').textContent = dashboardState.stats.addressesCount;

        // Update badges
        document.getElementById('orders-badge').textContent = dashboardState.stats.ordersCount;
        document.getElementById('wishlist-badge').textContent = dashboardState.stats.wishlistCount;

        // Show recent orders (last 5)
        const recentOrders = orders.slice(0, 5);
        renderRecentOrders(recentOrders);

        updateUserGreeting();
    } catch (error) {
        console.error('Failed to load overview:', error);
    }
}

/**
 * Render recent orders in overview
 */
function renderRecentOrders(orders) {
    const container = document.getElementById('recent-orders-list');
    if (!container) return;

    container.innerHTML = ''; // Clear container

    if (orders.length === 0) {
        const p = document.createElement('p');
        p.className = 'empty-state';
        p.textContent = 'No orders yet. Start shopping!';
        container.appendChild(p);
        return;
    }

    orders.forEach(order => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'order-item-summary';

        const infoDiv = document.createElement('div');
        infoDiv.className = 'order-info';

        const h4 = document.createElement('h4');
        h4.textContent = `Order #${order.id}`;

        const dateSpan = document.createElement('span');
        dateSpan.className = 'order-date';
        dateSpan.textContent = formatDate(order.created_at);

        infoDiv.appendChild(h4);
        infoDiv.appendChild(dateSpan);

        const statusDiv = document.createElement('div');
        statusDiv.className = 'order-status';

        const statusBadge = document.createElement('span');
        statusBadge.className = `status-badge ${order.status_class}`;
        statusBadge.textContent = order.status_display;

        statusDiv.appendChild(statusBadge);

        const amountDiv = document.createElement('div');
        amountDiv.className = 'order-amount';

        const strong = document.createElement('strong');
        strong.textContent = `$${order.total_paid}`;

        amountDiv.appendChild(strong);

        itemDiv.appendChild(infoDiv);
        itemDiv.appendChild(statusDiv);
        itemDiv.appendChild(amountDiv);

        container.appendChild(itemDiv);
    });
}

// ==================== PROFILE SECTION ====================

/**
 * Load profile section
 */
async function loadProfileSection() {
    const form = document.getElementById('profile-form');
    if (!form || !dashboardState.profile) return;

    // Populate form
    const profile = dashboardState.profile;
    form.querySelector('#first_name').value = profile.first_name || '';
    form.querySelector('#last_name').value = profile.last_name || '';
    form.querySelector('#email').value = profile.email || '';
    form.querySelector('#phone').value = profile.phone || '';
    form.querySelector('#date_of_birth').value = profile.date_of_birth || '';
    form.querySelector('#preferred_language').value = profile.preferred_language || 'en';
    form.querySelector('#bio').value = profile.bio || '';
    form.querySelector('#email_notifications').checked = profile.email_notifications || false;
    form.querySelector('#newsletter_subscription').checked = profile.newsletter_subscription || false;

    // Set up form submit handler
    form.onsubmit = async (e) => {
        e.preventDefault();
        await handleProfileUpdate(form);
    };

    // Cancel button
    document.getElementById('cancel-profile-btn')?.addEventListener('click', () => {
        loadProfileSection(); // Reset form
    });
}

/**
 * Handle profile update
 */
async function handleProfileUpdate(form) {
    try {
        const formData = new FormData(form);
        const data = {
            first_name: formData.get('first_name'),
            last_name: formData.get('last_name'),
            phone: formData.get('phone'),
            date_of_birth: formData.get('date_of_birth') || null,
            bio: formData.get('bio'),
            preferred_language: formData.get('preferred_language'),
            email_notifications: form.querySelector('#email_notifications').checked,
            newsletter_subscription: form.querySelector('#newsletter_subscription').checked
        };

        const updatedProfile = await apiService.updateUserProfile(data);
        dashboardState.profile = updatedProfile;
        showToast('Profile updated successfully!', 'success');
    } catch (error) {
        console.error('Failed to update profile:', error);
        showToast('Failed to update profile. Please try again.', 'error');
    }
}

// ==================== ORDERS SECTION ====================

/**
 * Load orders section
 */
async function loadOrders(filters = {}) {
    try {
        const orders = await apiService.getDashboardOrders(filters);
        dashboardState.orders = orders;
        renderOrders(orders);

        // Set up filters
        setupOrderFilters();
    } catch (error) {
        console.error('Failed to load orders:', error);
        showToast('Failed to load orders.', 'error');
    }
}

/**
 * Setup order filters
 */
function setupOrderFilters() {
    const statusFilter = document.getElementById('order-status-filter');
    const searchInput = document.getElementById('order-search');

    let filterTimeout;

    const applyFilters = () => {
        const filters = {
            status: statusFilter?.value || 'all',
            search: searchInput?.value || ''
        };
        loadOrders(filters);
    };

    statusFilter?.addEventListener('change', applyFilters);

    searchInput?.addEventListener('input', () => {
        clearTimeout(filterTimeout);
        filterTimeout = setTimeout(applyFilters, 500);
    });
}

/**
 * Render orders
 */
function renderOrders(orders) {
    const container = document.getElementById('orders-container');
    if (!container) return;

    container.innerHTML = ''; // Clear container

    if (orders.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';

        const icon = document.createElement('i');
        icon.className = 'fas fa-box';

        const p = document.createElement('p');
        p.textContent = 'No orders found.';

        emptyState.appendChild(icon);
        emptyState.appendChild(p);
        container.appendChild(emptyState);
        return;
    }

    orders.forEach(order => {
        const card = document.createElement('div');
        card.className = 'order-card';
        card.dataset.orderId = order.id;

        // Header
        const header = document.createElement('div');
        header.className = 'order-header';

        const numberDiv = document.createElement('div');
        numberDiv.className = 'order-number';

        const h3 = document.createElement('h3');
        h3.textContent = `Order #${order.id}`;

        const dateSpan = document.createElement('span');
        dateSpan.className = 'order-date';
        dateSpan.textContent = formatDate(order.created_at);

        numberDiv.appendChild(h3);
        numberDiv.appendChild(dateSpan);

        const statusBadge = document.createElement('span');
        statusBadge.className = `status-badge ${order.status_class}`;
        statusBadge.textContent = order.status_display;

        header.appendChild(numberDiv);
        header.appendChild(statusBadge);

        // Body
        const body = document.createElement('div');
        body.className = 'order-body';

        const itemsDiv = document.createElement('div');
        itemsDiv.className = 'order-items';

        order.items.slice(0, 2).forEach(item => {
            const itemMini = document.createElement('div');
            itemMini.className = 'order-item-mini';

            if (item.product_image) {
                const img = document.createElement('img');
                img.src = item.product_image;
                img.alt = item.product_name;
                itemMini.appendChild(img);
            } else {
                const noImage = document.createElement('div');
                noImage.className = 'no-image';
                itemMini.appendChild(noImage);
            }

            const span = document.createElement('span');
            span.textContent = `${item.product_name} (x${item.quantity})`;
            itemMini.appendChild(span);

            itemsDiv.appendChild(itemMini);
        });

        if (order.items.length > 2) {
            const moreItems = document.createElement('span');
            moreItems.className = 'more-items';
            moreItems.textContent = `+${order.items.length - 2} more`;
            itemsDiv.appendChild(moreItems);
        }

        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'order-summary';

        const totalDiv = document.createElement('div');
        totalDiv.className = 'order-total';

        const totalLabel = document.createElement('span');
        totalLabel.textContent = 'Total:';

        const totalValue = document.createElement('strong');
        totalValue.textContent = `$${order.total_paid}`;

        totalDiv.appendChild(totalLabel);
        totalDiv.appendChild(totalValue);
        summaryDiv.appendChild(totalDiv);

        if (order.tracking_number) {
            const trackingDiv = document.createElement('div');
            trackingDiv.className = 'tracking-info';

            const truckIcon = document.createElement('i');
            truckIcon.className = 'fas fa-truck';

            const trackingSpan = document.createElement('span');
            trackingSpan.textContent = `Tracking: ${order.tracking_number}`;

            trackingDiv.appendChild(truckIcon);
            trackingDiv.appendChild(trackingSpan);
            summaryDiv.appendChild(trackingDiv);
        }

        body.appendChild(itemsDiv);
        body.appendChild(summaryDiv);

        // Actions
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'order-actions';

        const viewBtn = document.createElement('button');
        viewBtn.className = 'btn btn-secondary btn-sm';
        viewBtn.textContent = 'View Details';
        viewBtn.addEventListener('click', () => viewOrderDetails(order.id));
        actionsDiv.appendChild(viewBtn);

        if (order.can_cancel) {
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn btn-danger btn-sm';
            cancelBtn.textContent = 'Cancel Order';
            cancelBtn.addEventListener('click', () => cancelOrder(order.id));
            actionsDiv.appendChild(cancelBtn);
        }

        card.appendChild(header);
        card.appendChild(body);
        card.appendChild(actionsDiv);

        container.appendChild(card);
    });
}

/**
 * View order details
 */
export async function viewOrderDetails(orderId) {
    try {
        const order = await apiService.getOrderDetails(orderId);
        const modal = document.getElementById('order-details-modal');
        const content = document.getElementById('order-details-content');

        if (!modal || !content) return;

        content.innerHTML = ''; // Clear content

        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'order-details';

        // Order Info Section
        const infoSection = document.createElement('div');
        infoSection.className = 'order-info-section';

        const h3Info = document.createElement('h3');
        h3Info.textContent = 'Order Information';
        infoSection.appendChild(h3Info);

        const infoGrid = document.createElement('div');
        infoGrid.className = 'info-grid';

        const createInfoItem = (label, value, isStrong = false, badgeClass = null) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'info-item';

            const labelEl = document.createElement('label');
            labelEl.textContent = label;

            let valueEl;
            if (isStrong) {
                valueEl = document.createElement('strong');
                valueEl.textContent = value;
            } else if (badgeClass) {
                valueEl = document.createElement('span');
                valueEl.className = `status-badge ${badgeClass}`;
                valueEl.textContent = value;
            } else {
                valueEl = document.createElement('span');
                valueEl.textContent = value;
            }

            itemDiv.appendChild(labelEl);
            itemDiv.appendChild(valueEl);
            return itemDiv;
        };

        infoGrid.appendChild(createInfoItem('Order Number:', `#${order.id}`));
        infoGrid.appendChild(createInfoItem('Date:', formatDate(order.created_at)));
        infoGrid.appendChild(createInfoItem('Status:', order.status_display, false, order.status_class));
        infoGrid.appendChild(createInfoItem('Total:', `$${order.total_paid}`, true));

        if (order.tracking_number) {
            infoGrid.appendChild(createInfoItem('Tracking Number:', order.tracking_number));
        }

        infoSection.appendChild(infoGrid);
        detailsDiv.appendChild(infoSection);

        // Order Items Section
        const itemsSection = document.createElement('div');
        itemsSection.className = 'order-items-section';

        const h3Items = document.createElement('h3');
        h3Items.textContent = 'Order Items';
        itemsSection.appendChild(h3Items);

        order.items.forEach(item => {
            const itemDetail = document.createElement('div');
            itemDetail.className = 'order-item-detail';

            if (item.product_image) {
                const img = document.createElement('img');
                img.src = item.product_image;
                img.alt = item.product_name;
                itemDetail.appendChild(img);
            } else {
                const noImage = document.createElement('div');
                noImage.className = 'no-image';
                itemDetail.appendChild(noImage);
            }

            const itemInfo = document.createElement('div');
            itemInfo.className = 'item-info';

            const h4 = document.createElement('h4');
            h4.textContent = item.product_name;

            const pQty = document.createElement('p');
            pQty.textContent = `Quantity: ${item.quantity}`;

            const pPrice = document.createElement('p');
            pPrice.className = 'item-price';
            pPrice.textContent = `$${item.price} each`;

            itemInfo.appendChild(h4);
            itemInfo.appendChild(pQty);
            itemInfo.appendChild(pPrice);

            const itemTotal = document.createElement('div');
            itemTotal.className = 'item-total';

            const strongTotal = document.createElement('strong');
            strongTotal.textContent = `$${(item.price * item.quantity).toFixed(2)}`;

            itemTotal.appendChild(strongTotal);

            itemDetail.appendChild(itemInfo);
            itemDetail.appendChild(itemTotal);

            itemsSection.appendChild(itemDetail);
        });

        detailsDiv.appendChild(itemsSection);

        // Shipping Info Section
        const shippingSection = document.createElement('div');
        shippingSection.className = 'shipping-info-section';

        const h3Shipping = document.createElement('h3');
        h3Shipping.textContent = 'Shipping Information';
        shippingSection.appendChild(h3Shipping);

        const pName = document.createElement('p');
        pName.textContent = `${order.first_name} ${order.last_name}`;

        const pAddress = document.createElement('p');
        pAddress.textContent = order.address;

        const pCity = document.createElement('p');
        pCity.textContent = `${order.city}, ${order.postal_code}`;

        const pEmail = document.createElement('p');
        pEmail.textContent = order.email;

        shippingSection.appendChild(pName);
        shippingSection.appendChild(pAddress);
        shippingSection.appendChild(pCity);
        shippingSection.appendChild(pEmail);

        detailsDiv.appendChild(shippingSection);

        content.appendChild(detailsDiv);

        openModal('order-details-modal');
    } catch (error) {
        console.error('Failed to load order details:', error);
        showToast('Failed to load order details.', 'error');
    }
}

/**
 * Cancel order
 */
export async function cancelOrder(orderId) {
    if (!confirm('Are you sure you want to cancel this order?')) return;

    try {
        await apiService.cancelOrder(orderId);
        showToast('Order cancelled successfully.', 'success');
        await loadOrders(); // Reload orders
    } catch (error) {
        console.error('Failed to cancel order:', error);
        showToast('Failed to cancel order.', 'error');
    }
}

// ==================== REVIEWS SECTION ====================

/**
 * Load reviews section
 */
async function loadReviews() {
    try {
        const reviews = await apiService.getUserReviews();
        dashboardState.reviews = reviews;
        renderReviews(reviews);
    } catch (error) {
        console.error('Failed to load reviews:', error);
        showToast('Failed to load reviews.', 'error');
    }
}

/**
 * Render reviews
 */
function renderReviews(reviews) {
    const container = document.getElementById('reviews-container');
    if (!container) return;

    container.innerHTML = ''; // Clear container

    if (reviews.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';

        const icon = document.createElement('i');
        icon.className = 'fas fa-star';

        const p = document.createElement('p');
        p.textContent = "You haven't written any reviews yet.";

        emptyState.appendChild(icon);
        emptyState.appendChild(p);
        container.appendChild(emptyState);
        return;
    }

    reviews.forEach(review => {
        const card = document.createElement('div');
        card.className = 'review-card';

        // Header
        const header = document.createElement('div');
        header.className = 'review-header';

        const productInfo = document.createElement('div');
        productInfo.className = 'product-info';

        const h4 = document.createElement('h4');
        h4.textContent = review.product?.name || 'Product';

        const dateSpan = document.createElement('span');
        dateSpan.className = 'review-date';
        dateSpan.textContent = formatDate(review.created_at);

        productInfo.appendChild(h4);
        productInfo.appendChild(dateSpan);

        const starsDiv = createStarsElement(review.rating);

        header.appendChild(productInfo);
        header.appendChild(starsDiv);

        // Body
        const body = document.createElement('div');
        body.className = 'review-body';

        if (review.title) {
            const h5 = document.createElement('h5');
            h5.textContent = review.title;
            body.appendChild(h5);
        }

        const pComment = document.createElement('p');
        pComment.textContent = review.comment;
        body.appendChild(pComment);

        if (review.is_verified_purchase) {
            const verifiedBadge = document.createElement('span');
            verifiedBadge.className = 'verified-badge';

            const checkIcon = document.createElement('i');
            checkIcon.className = 'fas fa-check-circle';

            verifiedBadge.appendChild(checkIcon);
            verifiedBadge.appendChild(document.createTextNode(' Verified Purchase'));
            body.appendChild(verifiedBadge);
        }

        // Actions
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'review-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-secondary btn-sm';

        const editIcon = document.createElement('i');
        editIcon.className = 'fas fa-edit';
        editBtn.appendChild(editIcon);
        editBtn.appendChild(document.createTextNode(' Edit'));

        editBtn.addEventListener('click', () => editReview(review.id));

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger btn-sm';

        const deleteIcon = document.createElement('i');
        deleteIcon.className = 'fas fa-trash';
        deleteBtn.appendChild(deleteIcon);
        deleteBtn.appendChild(document.createTextNode(' Delete'));

        deleteBtn.addEventListener('click', () => deleteReview(review.id));

        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);

        card.appendChild(header);
        card.appendChild(body);
        card.appendChild(actionsDiv);

        container.appendChild(card);
    });
}

/**
 * Edit review
 * Opens a modal to edit an existing review
 * @param {number} reviewId - The ID of the review to edit
 */
export async function editReview(reviewId) {
    try {
        // Find the review in the current state
        const review = dashboardState.reviews.find(r => r.id === reviewId);
        if (!review) {
            showToast('Review not found.', 'error');
            return;
        }

        // Create modal if it doesn't exist
        let modal = document.getElementById('edit-review-modal');
        if (!modal) {
            modal = createEditReviewModal();
            document.body.appendChild(modal);
        }

        // Populate form with review data
        const form = document.getElementById('edit-review-form');
        if (form) {
            form.querySelector('#edit_review_id').value = review.id;
            form.querySelector('#edit_review_rating').value = review.rating;
            form.querySelector('#edit_review_title').value = review.title || '';
            form.querySelector('#edit_review_comment').value = review.comment;

            // Update star display
            updateStarRating(review.rating);
        }

        // Open the modal
        openModal('edit-review-modal');
    } catch (error) {
        console.error('Failed to open edit review modal:', error);
        showToast('Failed to open review editor.', 'error');
    }
}

/**
 * Create edit review modal
 * @returns {HTMLElement} The modal element
 */
function createEditReviewModal() {
    const modal = document.createElement('div');
    modal.id = 'edit-review-modal';
    modal.className = 'modal';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => closeModal('edit-review-modal');

    const h3 = document.createElement('h3');
    h3.textContent = 'Edit Review';

    const form = document.createElement('form');
    form.id = 'edit-review-form';
    form.className = 'review-form';

    // Hidden review ID field
    const reviewIdInput = document.createElement('input');
    reviewIdInput.type = 'hidden';
    reviewIdInput.id = 'edit_review_id';
    reviewIdInput.name = 'review_id';

    // Rating field
    const ratingGroup = document.createElement('div');
    ratingGroup.className = 'form-group';
    const ratingLabel = document.createElement('label');
    ratingLabel.textContent = 'Rating';
    const ratingStars = createStarInput();
    ratingGroup.appendChild(ratingLabel);
    ratingGroup.appendChild(ratingStars);

    // Title field
    const titleGroup = document.createElement('div');
    titleGroup.className = 'form-group';
    const titleLabel = document.createElement('label');
    titleLabel.textContent = 'Review Title';
    titleLabel.setAttribute('for', 'edit_review_title');
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.id = 'edit_review_title';
    titleInput.name = 'title';
    titleInput.placeholder = 'Summarize your experience';
    titleGroup.appendChild(titleLabel);
    titleGroup.appendChild(titleInput);

    // Comment field
    const commentGroup = document.createElement('div');
    commentGroup.className = 'form-group';
    const commentLabel = document.createElement('label');
    commentLabel.textContent = 'Your Review';
    commentLabel.setAttribute('for', 'edit_review_comment');
    const commentTextarea = document.createElement('textarea');
    commentTextarea.id = 'edit_review_comment';
    commentTextarea.name = 'comment';
    commentTextarea.rows = 5;
    commentTextarea.required = true;
    commentTextarea.placeholder = 'Share your thoughts about this product...';
    commentGroup.appendChild(commentLabel);
    commentGroup.appendChild(commentTextarea);

    // Submit button
    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'btn btn-primary';
    submitBtn.textContent = 'Update Review';

    // Cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => closeModal('edit-review-modal');

    const btnGroup = document.createElement('div');
    btnGroup.className = 'button-group';
    btnGroup.appendChild(submitBtn);
    btnGroup.appendChild(cancelBtn);

    // Assemble form
    form.appendChild(reviewIdInput);
    form.appendChild(ratingGroup);
    form.appendChild(titleGroup);
    form.appendChild(commentGroup);
    form.appendChild(btnGroup);

    // Handle form submission
    form.onsubmit = async (e) => {
        e.preventDefault();
        await handleEditReviewSubmit(form);
    };

    // Assemble modal
    modalContent.appendChild(closeBtn);
    modalContent.appendChild(h3);
    modalContent.appendChild(form);
    modal.appendChild(modalContent);

    return modal;
}

/**
 * Create star input for rating
 * @returns {HTMLElement} Star input container
 */
function createStarInput() {
    const container = document.createElement('div');
    container.className = 'star-rating-input';

    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.id = 'edit_review_rating';
    hiddenInput.name = 'rating';
    hiddenInput.value = '5';

    const starsContainer = document.createElement('div');
    starsContainer.className = 'stars';

    for (let i = 1; i <= 5; i++) {
        const star = document.createElement('i');
        star.className = 'fas fa-star';
        star.dataset.rating = i;
        star.onclick = function () {
            const rating = parseInt(this.dataset.rating, 10);
            hiddenInput.value = rating;
            updateStarRating(rating);
        };
        starsContainer.appendChild(star);
    }

    container.appendChild(hiddenInput);
    container.appendChild(starsContainer);

    return container;
}

/**
 * Update star rating display
 * @param {number} rating - Rating value (1-5)
 */
function updateStarRating(rating) {
    const stars = document.querySelectorAll('.star-rating-input .stars i');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

/**
 * Handle edit review form submission
 * @param {HTMLFormElement} form - The form element
 */
async function handleEditReviewSubmit(form) {
    try {
        const formData = new FormData(form);
        const reviewId = formData.get('review_id');
        const reviewData = {
            rating: parseInt(formData.get('rating'), 10),
            title: formData.get('title'),
            comment: formData.get('comment')
        };

        await apiService.updateReview(reviewId, reviewData);
        showToast('Review updated successfully!', 'success');
        closeModal('edit-review-modal');
        await loadReviews(); // Reload reviews to show updated data
    } catch (error) {
        console.error('Failed to update review:', error);
        showToast('Failed to update review. Please try again.', 'error');
    }
}


/**
 * Delete review
 */
export async function deleteReview(reviewId) {
    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
        await apiService.deleteReview(reviewId);
        showToast('Review deleted successfully.', 'success');
        await loadReviews();
    } catch (error) {
        console.error('Failed to delete review:', error);
        showToast('Failed to delete review.', 'error');
    }
}

// ==================== WISHLIST SECTION ====================

/**
 * Load wishlist section
 */
async function loadWishlist() {
    try {
        const wishlistData = await apiService.getWishlist();
        renderWishlist(wishlistData);
        setupWishlistActions();
        setupWishlistItemActions();
    } catch (error) {
        console.error('Failed to load wishlist:', error);
        // Don't show toast on 404 (empty wishlist for new user)
        if (error.status !== 404) {
            showToast('Failed to load wishlist.', 'error');
        } else {
            renderWishlist({ items: [] });
        }
    }

    /**
     * Setup wishlist actions
     */
    function setupWishlistActions() {
        document.getElementById('clear-wishlist-btn')?.addEventListener('click', handleClearWishlist);
        document.getElementById('move-all-to-cart-btn')?.addEventListener('click', handleMoveAllToCart);
    }

    /**
     * Setup wishlist item actions (remove, move to cart)
     */
    function setupWishlistItemActions() {
        const container = document.getElementById('wishlist-container');
        if (!container) return;

        // Remove existing listeners by cloning
        const newContainer = container.cloneNode(true);
        container.parentNode.replaceChild(newContainer, container);

        // Add event delegation for remove buttons
        newContainer.addEventListener('click', async (e) => {
            const removeBtn = e.target.closest('.remove-btn');
            const moveBtn = e.target.closest('.move-to-cart-btn');

            if (removeBtn) {
                const productId = parseInt(removeBtn.dataset.productId, 10);
                await removeFromWishlistDashboard(productId);
            } else if (moveBtn) {
                const productId = parseInt(moveBtn.dataset.productId, 10);
                await moveItemToCart(productId);
            }
        });
    }

    /**
     * Handle clear wishlist
     */
    async function handleClearWishlist() {
        if (!confirm('Are you sure you want to clear your entire wishlist?')) return;

        try {
            const { clearWishlist } = await import('./wishlist.js');
            await clearWishlist();
            showToast('Wishlist cleared.', 'success');
            await loadWishlist();
        } catch (error) {
            console.error('Failed to clear wishlist:', error);
            showToast('Failed to clear wishlist.', 'error');
        }
    }

    /**
     * Handle move all to cart
     */
    async function handleMoveAllToCart() {
        try {
            const wishlistData = getWishlistData();
            let productIds = [];

            if (Array.isArray(wishlistData)) {
                // Guest user - array of IDs
                productIds = wishlistData;
            } else if (wishlistData && wishlistData.items) {
                // Authenticated user - extract IDs from items
                productIds = wishlistData.items.map(item => item.product.id);
            }

            if (productIds.length === 0) {
                showToast('Wishlist is empty.', 'info');
                return;
            }

            let successCount = 0;
            for (const productId of productIds) {
                try {
                    const product = await apiService.getProductById(productId);
                    await moveToCart(productId, product);
                    successCount++;
                } catch (error) {
                    console.error(`Failed to move product ${productId}:`, error);
                }
            }

            if (successCount > 0) {
                showToast(`${successCount} item(s) moved to cart!`, 'success');
                await loadWishlist();
                await loadOverview(); // Update stats
            } else {
                showToast('Failed to move items to cart.', 'error');
            }
        } catch (error) {
            console.error('Failed to move items to cart:', error);
            showToast('Failed to move items to cart.', 'error');
        }
    }

    /**
     * Render wishlist
     */
    function renderWishlist(wishlistData) {
        const container = document.getElementById('wishlist-container');
        if (!container) return;

        container.innerHTML = ''; // Clear container

        const items = wishlistData?.items || [];

        if (items.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';

            const icon = document.createElement('i');
            icon.className = 'fas fa-heart';

            const p = document.createElement('p');
            p.textContent = 'Your wishlist is empty.';

            emptyState.appendChild(icon);
            emptyState.appendChild(p);
            container.appendChild(emptyState);
            return;
        }

        items.forEach(item => {
            const product = item.product;
            if (!product) return;

            const image = product.images?.[0]?.image || '';
            const productName = product.name || 'Unknown Product';
            const productPrice = product.price ? parseFloat(product.price).toFixed(2) : '0.00';

            const card = document.createElement('div');
            card.className = 'wishlist-item-card';
            card.dataset.productId = product.id;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.dataset.productId = product.id;
            removeBtn.setAttribute('aria-label', 'Remove from wishlist');

            const removeIcon = document.createElement('i');
            removeIcon.className = 'fas fa-times';
            removeBtn.appendChild(removeIcon);

            card.appendChild(removeBtn);

            if (image) {
                const img = document.createElement('img');
                img.src = image;
                img.alt = productName;
                img.loading = 'lazy';
                card.appendChild(img);
            } else {
                const noImage = document.createElement('div');
                noImage.className = 'no-image';
                card.appendChild(noImage);
            }

            const h4 = document.createElement('h4');
            h4.textContent = productName;
            card.appendChild(h4);

            const pPrice = document.createElement('p');
            pPrice.className = 'price';
            pPrice.textContent = `$${productPrice}`;
            card.appendChild(pPrice);

            const moveBtn = document.createElement('button');
            moveBtn.className = 'btn btn-primary btn-sm move-to-cart-btn';
            moveBtn.dataset.productId = product.id;
            moveBtn.textContent = 'Add to Cart';

            card.appendChild(moveBtn);

            container.appendChild(card);
        });

        // Setup event listeners after rendering
        setupWishlistItemActions();
    }
}

/**
 * Remove from wishlist
 */
export async function removeFromWishlistDashboard(productId) {
    try {
        await removeFromWishlist(productId);
        showToast('Removed from wishlist.', 'success');
        await loadWishlist();
        await loadOverview(); // Update stats
    } catch (error) {
        console.error('Failed to remove from wishlist:', error);
        showToast('Failed to remove from wishlist.', 'error');
    }
}

/**
 * Move item to cart
 */
export async function moveItemToCart(productId) {
    try {
        // Fetch product details
        const product = await apiService.getProductById(productId);

        if (product) {
            await moveToCart(productId, product);
            showToast('Item moved to cart!', 'success');
            await loadWishlist();
            await loadOverview(); // Update stats
        }
    } catch (error) {
        console.error('Failed to move to cart:', error);
        showToast('Failed to move to cart.', 'error');
    }
}

// ==================== ADDRESSES SECTION ====================

/**
 * Load addresses section
 */
async function loadAddresses() {
    try {
        const addresses = await apiService.getShippingAddresses();
        dashboardState.addresses = addresses;
        renderAddresses(addresses);

        // Setup add address button
        document.getElementById('add-address-btn')?.addEventListener('click', () => {
            openAddressModal();
        });
    } catch (error) {
        console.error('Failed to load addresses:', error);
        showToast('Failed to load addresses.', 'error');
    }
}

/**
 * Render addresses
 * @param {Array} addresses - Array of address objects
 */
function renderAddresses(addresses) {
    const container = document.getElementById('addresses-container');
    if (!container) return;

    container.innerHTML = ''; // Clear container

    if (!addresses || addresses.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';

        const icon = document.createElement('i');
        icon.className = 'fas fa-map-marker-alt';

        const p = document.createElement('p');
        p.textContent = "You haven't added any addresses yet.";

        emptyState.appendChild(icon);
        emptyState.appendChild(p);
        container.appendChild(emptyState);
        return;
    }

    addresses.forEach(address => {
        const card = document.createElement('div');
        card.className = 'address-card';
        if (address.is_default) {
            card.classList.add('default');
        }

        // Address header
        const headerDiv = document.createElement('div');
        headerDiv.className = 'address-header';

        const labelSpan = document.createElement('span');
        labelSpan.className = 'address-label';
        labelSpan.textContent = address.label || 'Address';

        headerDiv.appendChild(labelSpan);

        if (address.is_default) {
            const defaultBadge = document.createElement('span');
            defaultBadge.className = 'default-badge';
            defaultBadge.textContent = 'Default';
            headerDiv.appendChild(defaultBadge);
        }

        // Address details
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'address-details';

        const nameLine = document.createElement('p');
        nameLine.className = 'address-name';
        nameLine.textContent = `${address.first_name} ${address.last_name}`;
        detailsDiv.appendChild(nameLine);

        if (address.company) {
            const companyLine = document.createElement('p');
            companyLine.textContent = address.company;
            detailsDiv.appendChild(companyLine);
        }

        const streetLine = document.createElement('p');
        streetLine.textContent = address.address_line1;
        detailsDiv.appendChild(streetLine);

        if (address.address_line2) {
            const street2Line = document.createElement('p');
            street2Line.textContent = address.address_line2;
            detailsDiv.appendChild(street2Line);
        }

        const cityLine = document.createElement('p');
        const cityParts = [address.city];
        if (address.state) cityParts.push(address.state);
        if (address.postal_code) cityParts.push(address.postal_code);
        cityLine.textContent = cityParts.join(', ');
        detailsDiv.appendChild(cityLine);

        const countryLine = document.createElement('p');
        countryLine.textContent = address.country;
        detailsDiv.appendChild(countryLine);

        if (address.phone) {
            const phoneLine = document.createElement('p');
            phoneLine.className = 'address-phone';
            phoneLine.textContent = address.phone;
            detailsDiv.appendChild(phoneLine);
        }

        // Actions
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'address-actions';

        if (!address.is_default) {
            const setDefaultBtn = document.createElement('button');
            setDefaultBtn.className = 'btn btn-secondary btn-sm';
            setDefaultBtn.textContent = 'Set as Default';
            setDefaultBtn.addEventListener('click', () => setDefaultAddress(address.id));
            actionsDiv.appendChild(setDefaultBtn);
        }

        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-secondary btn-sm';

        const editIcon = document.createElement('i');
        editIcon.className = 'fas fa-edit';
        editBtn.appendChild(editIcon);
        editBtn.appendChild(document.createTextNode(' Edit'));
        editBtn.addEventListener('click', () => editAddress(address.id));

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger btn-sm';

        const deleteIcon = document.createElement('i');
        deleteIcon.className = 'fas fa-trash';
        deleteBtn.appendChild(deleteIcon);
        deleteBtn.appendChild(document.createTextNode(' Delete'));
        deleteBtn.addEventListener('click', () => deleteAddress(address.id));

        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);

        card.appendChild(headerDiv);
        card.appendChild(detailsDiv);
        card.appendChild(actionsDiv);
        container.appendChild(card);
    });
}

/**
 * Open address modal
 * @param {Object} address - Address to edit (optional)
 */
function openAddressModal(address = null) {
    const modal = document.getElementById('address-modal');
    const form = document.getElementById('address-form');
    const title = document.getElementById('address-modal-title');

    if (!modal || !form) return;

    // Reset form
    form.reset();

    if (address) {
        // Edit mode
        title.textContent = 'Edit Address';
        form.querySelector('#address_id').value = address.id;
        form.querySelector('#address_label').value = address.label;
        form.querySelector('#address_first_name').value = address.first_name;
        form.querySelector('#address_last_name').value = address.last_name;
        form.querySelector('#address_company').value = address.company || '';
        form.querySelector('#address_line1').value = address.address_line1;
        form.querySelector('#address_line2').value = address.address_line2 || '';
        form.querySelector('#address_city').value = address.city;
        form.querySelector('#address_state').value = address.state || '';
        form.querySelector('#address_postal_code').value = address.postal_code;
        form.querySelector('#address_country').value = address.country;
        form.querySelector('#address_phone').value = address.phone;
        form.querySelector('#address_is_default').checked = address.is_default;
    } else {
        // Add mode
        title.textContent = 'Add New Address';
        form.querySelector('#address_id').value = '';
    }

    // Setup form submit
    form.onsubmit = async (e) => {
        e.preventDefault();
        await handleAddressSubmit(form);
    };

    openModal('address-modal');
}

/**
 * Handle address form submit
 */
async function handleAddressSubmit(form) {
    try {
        const formData = new FormData(form);
        const addressId = formData.get('address_id');

        const data = {
            label: formData.get('label'),
            first_name: formData.get('first_name'),
            last_name: formData.get('last_name'),
            company: formData.get('company') || '',
            address_line1: formData.get('address_line1'),
            address_line2: formData.get('address_line2') || '',
            city: formData.get('city'),
            state: formData.get('state') || '',
            postal_code: formData.get('postal_code'),
            country: formData.get('country'),
            phone: formData.get('phone'),
            is_default: form.querySelector('#address_is_default').checked
        };

        if (addressId) {
            // Update existing address
            await apiService.updateShippingAddress(addressId, data);
            showToast('Address updated successfully!', 'success');
        } else {
            // Create new address
            await apiService.createShippingAddress(data);
            showToast('Address added successfully!', 'success');
        }

        closeModal('address-modal');
        await loadAddresses();
        await loadOverview(); // Update stats
    } catch (error) {
        console.error('Failed to save address:', error);
        showToast('Failed to save address. Please try again.', 'error');
    }
}

/**
 * Edit address
 */
export async function editAddress(addressId) {
    try {
        const address = dashboardState.addresses.find(a => a.id === addressId);
        if (address) {
            openAddressModal(address);
        }
    } catch (error) {
        console.error('Failed to edit address:', error);
    }
}

/**
 * Delete address
 */
export async function deleteAddress(addressId) {
    if (!confirm('Are you sure you want to delete this address?')) return;

    try {
        await apiService.deleteShippingAddress(addressId);
        showToast('Address deleted successfully.', 'success');
        await loadAddresses();
        await loadOverview(); // Update stats
    } catch (error) {
        console.error('Failed to delete address:', error);
        showToast(error.message || 'Failed to delete address.', 'error');
    }
}

/**
 * Set default address
 */
export async function setDefaultAddress(addressId) {
    try {
        await apiService.updateShippingAddress(addressId, { is_default: true });
        showToast('Default address updated.', 'success');
        await loadAddresses();
    } catch (error) {
        console.error('Failed to set default address:', error);
        showToast('Failed to set default address.', 'error');
    }
}

// ==================== PAYMENT METHODS SECTION ====================

/**
 * Load payment methods section
 */
async function loadPaymentMethods() {
    try {
        const paymentMethods = await apiService.getPaymentMethods();
        dashboardState.paymentMethods = paymentMethods;
        renderPaymentMethods(paymentMethods);

        // Setup add payment method button
        document.getElementById('add-payment-method-btn')?.addEventListener('click', () => {
            showToast('Add payment method feature requires Stripe integration.', 'info');
        });
    } catch (error) {
        console.error('Failed to load payment methods:', error);
        showToast('Failed to load payment methods.', 'error');
    }
}

/**
 * Render payment methods
 * @param {Array} paymentMethods - Array of payment method objects
 */
function renderPaymentMethods(paymentMethods) {
    const container = document.getElementById('payment-methods-container');
    if (!container) return;

    container.innerHTML = ''; // Clear container

    if (!paymentMethods || paymentMethods.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';

        const icon = document.createElement('i');
        icon.className = 'fas fa-credit-card';

        const p = document.createElement('p');
        p.textContent = "You haven't added any payment methods yet.";

        emptyState.appendChild(icon);
        emptyState.appendChild(p);
        container.appendChild(emptyState);
        return;
    }

    paymentMethods.forEach(pm => {
        const card = document.createElement('div');
        card.className = 'payment-method-card';
        if (pm.is_default) {
            card.classList.add('default');
        }

        // Card info section
        const cardInfo = document.createElement('div');
        cardInfo.className = 'payment-method-info';

        // Card icon based on brand
        const cardIcon = document.createElement('i');
        const brandIcons = {
            'visa': 'fab fa-cc-visa',
            'mastercard': 'fab fa-cc-mastercard',
            'amex': 'fab fa-cc-amex',
            'discover': 'fab fa-cc-discover',
            'default': 'fas fa-credit-card'
        };
        cardIcon.className = brandIcons[pm.brand?.toLowerCase()] || brandIcons.default;

        // Card details
        const cardDetails = document.createElement('div');
        cardDetails.className = 'card-details';

        const cardNumber = document.createElement('span');
        cardNumber.className = 'card-number';
        cardNumber.textContent = `•••• •••• •••• ${pm.last4 || '****'}`;

        const cardExpiry = document.createElement('span');
        cardExpiry.className = 'card-expiry';
        cardExpiry.textContent = `Expires ${pm.exp_month || '--'}/${pm.exp_year || '--'}`;

        cardDetails.appendChild(cardNumber);
        cardDetails.appendChild(cardExpiry);

        cardInfo.appendChild(cardIcon);
        cardInfo.appendChild(cardDetails);

        // Default badge
        if (pm.is_default) {
            const defaultBadge = document.createElement('span');
            defaultBadge.className = 'default-badge';
            defaultBadge.textContent = 'Default';
            cardInfo.appendChild(defaultBadge);
        }

        // Actions
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'payment-method-actions';

        if (!pm.is_default) {
            const setDefaultBtn = document.createElement('button');
            setDefaultBtn.className = 'btn btn-secondary btn-sm';
            setDefaultBtn.textContent = 'Set as Default';
            setDefaultBtn.addEventListener('click', () => setDefaultPaymentMethod(pm.id));
            actionsDiv.appendChild(setDefaultBtn);
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger btn-sm';

        const deleteIcon = document.createElement('i');
        deleteIcon.className = 'fas fa-trash';
        deleteBtn.appendChild(deleteIcon);
        deleteBtn.appendChild(document.createTextNode(' Delete'));
        deleteBtn.addEventListener('click', () => deletePaymentMethod(pm.id));

        actionsDiv.appendChild(deleteBtn);

        card.appendChild(cardInfo);
        card.appendChild(actionsDiv);
        container.appendChild(card);
    });
}

/**
 * Set default payment method
 */
export async function setDefaultPaymentMethod(pmId) {
    try {
        await apiService.updatePaymentMethod(pmId, { is_default: true });
        showToast('Default payment method updated.', 'success');
        await loadPaymentMethods();
    } catch (error) {
        console.error('Failed to set default payment method:', error);
        showToast('Failed to set default payment method.', 'error');
    }
}

/**
 * Delete payment method
 */
export async function deletePaymentMethod(pmId) {
    if (!confirm('Are you sure you want to delete this payment method?')) return;

    try {
        await apiService.deletePaymentMethod(pmId);
        showToast('Payment method deleted successfully.', 'success');
        await loadPaymentMethods();
    } catch (error) {
        console.error('Failed to delete payment method:', error);
        showToast('Failed to delete payment method.', 'error');
    }
}

// ==================== SECURITY SECTION ====================

/**
 * Initialize security section
 */
function initSecuritySection() {
    const form = document.getElementById('password-form');
    if (!form) return;

    // Setup form submit
    form.onsubmit = async (e) => {
        e.preventDefault();
        await handlePasswordUpdate(form);
    };

    // Setup password validation (reuse from auth.js)
    const newPasswordInput = form.querySelector('#new_password');
    const confirmPasswordInput = form.querySelector('#confirm_password');

    if (newPasswordInput && confirmPasswordInput) {
        newPasswordInput.addEventListener('input', () => {
            updatePasswordStrength(newPasswordInput.value);
            validatePasswordsMatch(newPasswordInput.value, confirmPasswordInput.value);
        });

        confirmPasswordInput.addEventListener('input', () => {
            validatePasswordsMatch(newPasswordInput.value, confirmPasswordInput.value);
        });
    }
}

/**
 * Handle password update
 */
async function handlePasswordUpdate(form) {
    try {
        const formData = new FormData(form);
        const data = {
            old_password: formData.get('old_password'),
            new_password: formData.get('new_password'),
            confirm_password: formData.get('confirm_password')
        };

        await apiService.updatePassword(data);
        showToast('Password updated successfully!', 'success');
        form.reset();
    } catch (error) {
        console.error('Failed to update password:', error);
        const errorMessage = error.response?.data?.detail || error.message || 'Failed to update password.';
        showToast(errorMessage, 'error');
    }
}

// Copy password strength functions from auth.js
function updatePasswordStrength(password) {
    const strengthMeter = document.querySelector('.strength-bar');
    const helpText = document.getElementById('password-help');
    if (!strengthMeter || !helpText) return;

    let score = 0;
    if (password.length > 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    strengthMeter.style.width = `${(score / 4) * 100}%`;
    switch (score) {
        case 0:
        case 1:
            strengthMeter.style.backgroundColor = 'var(--danger-color)';
            helpText.textContent = 'Password is too weak.';
            helpText.className = 'form-text error';
            break;
        case 2:
            strengthMeter.style.backgroundColor = 'var(--warning-color)';
            helpText.textContent = 'Password is okay.';
            helpText.className = 'form-text warning';
            break;
        case 3:
        case 4:
            strengthMeter.style.backgroundColor = 'var(--success-color)';
            helpText.textContent = 'Password is strong.';
            helpText.className = 'form-text success';
            break;
    }
}

function validatePasswordsMatch(password, confirmPassword) {
    const helpText = document.getElementById('password-match-help');
    if (!helpText) return false;

    if (confirmPassword.length === 0) {
        helpText.textContent = '';
        return false;
    }
    if (password === confirmPassword) {
        helpText.textContent = 'Passwords match.';
        helpText.className = 'form-text success';
        return true;
    } else {
        helpText.textContent = 'Passwords do not match.';
        helpText.className = 'form-text error';
        return false;
    }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Handle logout
 */
function handleLogout(e) {
    e.preventDefault();

    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    }
}

/**
 * Show/hide loading state
 */
function showLoading(show) {
    const loadingState = document.getElementById('loading-state');
    if (loadingState) {
        loadingState.style.display = show ? 'flex' : 'none';
    }
}

/**
 * Initialize modals
 */
function initModals() {
    // Close modal buttons
    document.querySelectorAll('.modal-close, [data-modal-close]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = btn.getAttribute('data-modal-close') || btn.closest('.modal')?.id;
            if (modalId) closeModal(modalId);
        });
    });

    // Close modal on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
}

/**
 * Open modal
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Close modal
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/**
 * Format date
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Render star rating
 */
function createStarsElement(rating) {
    const starsDiv = document.createElement('div');
    starsDiv.className = 'stars';
    for (let i = 1; i <= 5; i++) {
        const icon = document.createElement('i');
        icon.className = `fas fa-star ${i <= rating ? 'filled' : ''}`;
        starsDiv.appendChild(icon);
    }
    return starsDiv;
}

// Export dashboard functions for global access
window.dashboard = {
    viewOrderDetails,
    cancelOrder,
    editReview,
    deleteReview,
    removeFromWishlist: removeFromWishlistDashboard,
    moveItemToCart,
    editAddress,
    deleteAddress,
    setDefaultAddress,
    setDefaultPaymentMethod,
    deletePaymentMethod
};

// Initialize dashboard on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}
