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
import { getWishlistData, isInWishlist, removeFromWishlist, moveToCart } from './wishlist.js';
import { showToast } from './ui.js';
import { initRegisterPageValidation } from './auth.js';
import i18n from './i18n.js';

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
    
    // Check if user is authenticated
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
        window.location.href = 'login.html?redirect=dashboard.html';
        return;
    }

    try {
        // Show loading state
        showLoading(true);

        // Load user profile
        await loadUserProfile();

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

    if (orders.length === 0) {
        container.innerHTML = '<p class="empty-state">No orders yet. Start shopping!</p>';
        return;
    }

    container.innerHTML = orders.map(order => `
        <div class="order-item-summary">
            <div class="order-info">
                <h4>Order #${order.id}</h4>
                <span class="order-date">${formatDate(order.created_at)}</span>
            </div>
            <div class="order-status">
                <span class="status-badge ${order.status_class}">${order.status_display}</span>
            </div>
            <div class="order-amount">
                <strong>$${order.total_paid}</strong>
            </div>
        </div>
    `).join('');
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

    if (orders.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-box"></i><p>No orders found.</p></div>';
        return;
    }

    container.innerHTML = orders.map(order => `
        <div class="order-card" data-order-id="${order.id}">
            <div class="order-header">
                <div class="order-number">
                    <h3>Order #${order.id}</h3>
                    <span class="order-date">${formatDate(order.created_at)}</span>
                </div>
                <span class="status-badge ${order.status_class}">${order.status_display}</span>
            </div>
            
            <div class="order-body">
                <div class="order-items">
                    ${order.items.slice(0, 2).map(item => `
                        <div class="order-item-mini">
                            ${item.product_image ? `<img src="${item.product_image}" alt="${item.product_name}">` : '<div class="no-image"></div>'}
                            <span>${item.product_name} (x${item.quantity})</span>
                        </div>
                    `).join('')}
                    ${order.items.length > 2 ? `<span class="more-items">+${order.items.length - 2} more</span>` : ''}
                </div>
                
                <div class="order-summary">
                    <div class="order-total">
                        <span>Total:</span>
                        <strong>$${order.total_paid}</strong>
                    </div>
                    ${order.tracking_number ? `
                        <div class="tracking-info">
                            <i class="fas fa-truck"></i>
                            <span>Tracking: ${order.tracking_number}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="order-actions">
                <button class="btn btn-secondary btn-sm" onclick="dashboard.viewOrderDetails(${order.id})">
                    View Details
                </button>
                ${order.can_cancel ? `
                    <button class="btn btn-danger btn-sm" onclick="dashboard.cancelOrder(${order.id})">
                        Cancel Order
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
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

        content.innerHTML = `
            <div class="order-details">
                <div class="order-info-section">
                    <h3>Order Information</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>Order Number:</label>
                            <span>#${order.id}</span>
                        </div>
                        <div class="info-item">
                            <label>Date:</label>
                            <span>${formatDate(order.created_at)}</span>
                        </div>
                        <div class="info-item">
                            <label>Status:</label>
                            <span class="status-badge ${order.status_class}">${order.status_display}</span>
                        </div>
                        <div class="info-item">
                            <label>Total:</label>
                            <strong>$${order.total_paid}</strong>
                        </div>
                        ${order.tracking_number ? `
                            <div class="info-item">
                                <label>Tracking Number:</label>
                                <span>${order.tracking_number}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="order-items-section">
                    <h3>Order Items</h3>
                    ${order.items.map(item => `
                        <div class="order-item-detail">
                            ${item.product_image ? `<img src="${item.product_image}" alt="${item.product_name}">` : '<div class="no-image"></div>'}
                            <div class="item-info">
                                <h4>${item.product_name}</h4>
                                <p>Quantity: ${item.quantity}</p>
                                <p class="item-price">$${item.price} each</p>
                            </div>
                            <div class="item-total">
                                <strong>$${(item.price * item.quantity).toFixed(2)}</strong>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="shipping-info-section">
                    <h3>Shipping Information</h3>
                    <p>${order.first_name} ${order.last_name}</p>
                    <p>${order.address}</p>
                    <p>${order.city}, ${order.postal_code}</p>
                    <p>${order.email}</p>
                </div>
            </div>
        `;

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

    if (reviews.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-star"></i><p>You haven\'t written any reviews yet.</p></div>';
        return;
    }

    container.innerHTML = reviews.map(review => `
        <div class="review-card">
            <div class="review-header">
                <div class="product-info">
                    <h4>${review.product?.name || 'Product'}</h4>
                    <span class="review-date">${formatDate(review.created_at)}</span>
                </div>
                <div class="review-rating">
                    ${renderStars(review.rating)}
                </div>
            </div>
            
            <div class="review-body">
                ${review.title ? `<h5>${review.title}</h5>` : ''}
                <p>${review.comment}</p>
                ${review.is_verified_purchase ? '<span class="verified-badge"><i class="fas fa-check-circle"></i> Verified Purchase</span>' : ''}
            </div>
            
            <div class="review-actions">
                <button class="btn btn-secondary btn-sm" onclick="dashboard.editReview(${review.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger btn-sm" onclick="dashboard.deleteReview(${review.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Edit review (placeholder - would need a modal)
 */
export function editReview(reviewId) {
    showToast('Edit review feature coming soon!', 'info');
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
        const wishlistData = getWishlistData();
        renderWishlist(wishlistData);

        // Setup wishlist actions
        setupWishlistActions();
    } catch (error) {
        console.error('Failed to load wishlist:', error);
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
        const items = Array.isArray(wishlistData) ? wishlistData : wishlistData.items || [];
        
        if (items.length === 0) {
            showToast('Wishlist is empty.', 'info');
            return;
        }

        for (const item of items) {
            const product = item.product || item;
            await moveToCart(product.id, product);
        }

        showToast(`${items.length} items moved to cart!`, 'success');
        await loadWishlist();
    } catch (error) {
        console.error('Failed to move items to cart:', error);
        showToast('Failed to move some items to cart.', 'error');
    }
}

/**
 * Render wishlist
 */
function renderWishlist(wishlistData) {
    const container = document.getElementById('wishlist-container');
    if (!container) return;

    const items = Array.isArray(wishlistData) ? [] : wishlistData.items || [];

    if (items.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-heart"></i><p>Your wishlist is empty.</p></div>';
        return;
    }

    container.innerHTML = items.map(item => {
        const product = item.product;
        const image = product.images?.[0]?.image || '';
        
        return `
            <div class="wishlist-item-card" data-product-id="${product.id}">
                <button class="remove-btn" onclick="dashboard.removeFromWishlist(${product.id})">
                    <i class="fas fa-times"></i>
                </button>
                ${image ? `<img src="${image}" alt="${product.name}">` : '<div class="no-image"></div>'}
                <h4>${product.name}</h4>
                <p class="price">$${product.price}</p>
                <button class="btn btn-primary btn-sm" onclick="dashboard.moveItemToCart(${product.id})">
                    Add to Cart
                </button>
            </div>
        `;
    }).join('');
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
        const wishlistData = getWishlistData();
        const items = wishlistData.items || [];
        const item = items.find(i => i.product.id === productId);
        
        if (item) {
            await moveToCart(productId, item.product);
            showToast('Item moved to cart!', 'success');
            await loadWishlist();
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
 */
function renderAddresses(addresses) {
    const container = document.getElementById('addresses-container');
    if (!container) return;

    if (addresses.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-map-marker-alt"></i><p>No saved addresses.</p></div>';
        return;
    }

    container.innerHTML = addresses.map(address => `
        <div class="address-card ${address.is_default ? 'default' : ''}">
            ${address.is_default ? '<span class="default-badge">Default</span>' : ''}
            <h4>${address.label}</h4>
            <p><strong>${address.first_name} ${address.last_name}</strong></p>
            ${address.company ? `<p>${address.company}</p>` : ''}
            <p>${address.address_line1}</p>
            ${address.address_line2 ? `<p>${address.address_line2}</p>` : ''}
            <p>${address.city}, ${address.state || ''} ${address.postal_code}</p>
            <p>${address.country}</p>
            <p><i class="fas fa-phone"></i> ${address.phone}</p>
            
            <div class="address-actions">
                <button class="btn btn-secondary btn-sm" onclick="dashboard.editAddress(${address.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger btn-sm" onclick="dashboard.deleteAddress(${address.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
                ${!address.is_default ? `
                    <button class="btn btn-primary btn-sm" onclick="dashboard.setDefaultAddress(${address.id})">
                        Set as Default
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

/**
 * Open address modal for adding/editing
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
 */
function renderPaymentMethods(paymentMethods) {
    const container = document.getElementById('payment-methods-container');
    if (!container) return;

    if (paymentMethods.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-credit-card"></i><p>No saved payment methods.</p></div>';
        return;
    }

    container.innerHTML = paymentMethods.map(pm => `
        <div class="payment-method-card ${pm.is_default ? 'default' : ''}">
            ${pm.is_default ? '<span class="default-badge">Default</span>' : ''}
            ${pm.is_expired ? '<span class="expired-badge">Expired</span>' : ''}
            
            <div class="pm-icon">
                <i class="fas fa-${pm.payment_type === 'card' ? 'credit-card' : 'university'}"></i>
            </div>
            
            <div class="pm-info">
                <h4>${pm.display_name}</h4>
                ${pm.payment_type === 'card' && pm.card_exp_month && pm.card_exp_year ? 
                    `<p>Expires: ${pm.card_exp_month}/${pm.card_exp_year}</p>` : ''}
            </div>
            
            <div class="pm-actions">
                ${!pm.is_default && !pm.is_expired ? `
                    <button class="btn btn-primary btn-sm" onclick="dashboard.setDefaultPaymentMethod(${pm.id})">
                        Set as Default
                    </button>
                ` : ''}
                <button class="btn btn-danger btn-sm" onclick="dashboard.deletePaymentMethod(${pm.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
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
function renderStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        stars += `<i class="fas fa-star ${i <= rating ? 'filled' : ''}"></i>`;
    }
    return `<div class="stars">${stars}</div>`;
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
