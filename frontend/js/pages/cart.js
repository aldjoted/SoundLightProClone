import * as cart from '../cart.js';
import * as ui from '../ui.js';
import { ListenerManager } from '../utils.js';
import { STRIPE_PUBLISHABLE_KEY } from '../config.js';
import { createOrder, createQuote, getQuotePDFUrl, getDashboardProfile, getShippingAddresses, ensureAccessToken } from '../apiService.js';

export function initCartPage() {
    const container = document.getElementById('cart-container');
    const checkoutSection = document.getElementById('checkout-section');
    if (!container) return;

    const pageListenerManager = new ListenerManager();
    let stripe = null;
    let elements = null;
    let card = null;
    let currentMode = 'payment'; // 'payment' or 'quote'
    let savedAddresses = [];
    let userProfile = null;

    // Initialize Stripe
    if (window.Stripe && STRIPE_PUBLISHABLE_KEY) {
        stripe = window.Stripe(STRIPE_PUBLISHABLE_KEY);
        elements = stripe.elements();
        card = elements.create('card', {
            style: {
                base: {
                    color: '#32325d',
                    fontFamily: '"Inter", sans-serif',
                    fontSmoothing: 'antialiased',
                    fontSize: '16px',
                    '::placeholder': {
                        color: '#aab7c4'
                    }
                },
                invalid: {
                    color: '#fa755a',
                    iconColor: '#fa755a'
                }
            }
        });

        const cardElementContainer = document.getElementById('card-element');
        if (cardElementContainer) {
            card.mount('#card-element');

            // Handle real-time validation errors from the card Element.
            card.on('change', function (event) {
                const displayError = document.getElementById('card-errors');
                if (event.error) {
                    displayError.textContent = event.error.message;
                } else {
                    displayError.textContent = '';
                }
            });
        }
    }

    // DOM Elements for tabs and sections
    const checkoutForm = document.getElementById('checkout-form');
    const tabPayment = document.getElementById('tab-payment');
    const tabQuote = document.getElementById('tab-quote');
    const paymentFieldset = document.getElementById('payment-fieldset');
    const paymentActions = document.getElementById('payment-actions');
    const quoteActions = document.getElementById('quote-actions');
    const quoteOptionsFieldset = document.getElementById('quote-options-fieldset');
    const shippingAddressFieldset = document.getElementById('shipping-address-fieldset');
    const savedAddressesSection = document.getElementById('saved-addresses-section');
    const savedAddressSelect = document.getElementById('saved-address-select');
    const toggleManualAddressBtn = document.getElementById('toggle-manual-address');
    const sameAsBillingCheckbox = document.getElementById('same_as_billing');
    const shippingFields = document.getElementById('shipping-fields');

    /**
     * Switch between payment and quote modes
     */
    function switchMode(mode) {
        currentMode = mode;
        
        // Update tab styles
        if (tabPayment && tabQuote) {
            if (mode === 'payment') {
                tabPayment.style.borderBottomColor = '#003366';
                tabPayment.style.color = '#003366';
                tabPayment.style.fontWeight = '600';
                tabQuote.style.borderBottomColor = 'transparent';
                tabQuote.style.color = '#666';
                tabQuote.style.fontWeight = '500';
            } else {
                tabQuote.style.borderBottomColor = '#003366';
                tabQuote.style.color = '#003366';
                tabQuote.style.fontWeight = '600';
                tabPayment.style.borderBottomColor = 'transparent';
                tabPayment.style.color = '#666';
                tabPayment.style.fontWeight = '500';
            }
        }

        // Toggle fieldsets visibility
        if (paymentFieldset) {
            paymentFieldset.classList.toggle('hidden', mode === 'quote');
        }
        if (paymentActions) {
            paymentActions.classList.toggle('hidden', mode === 'quote');
        }
        if (quoteActions) {
            quoteActions.classList.toggle('hidden', mode === 'payment');
        }
        if (quoteOptionsFieldset) {
            quoteOptionsFieldset.classList.toggle('hidden', mode === 'payment');
        }
        if (shippingAddressFieldset) {
            shippingAddressFieldset.classList.toggle('hidden', mode === 'payment');
        }
    }

    /**
     * Populate form with user profile data
     */
    function populateFormWithProfile(profile) {
        if (!profile) return;

        const fields = {
            'first_name': profile.first_name,
            'last_name': profile.last_name,
            'email': profile.email,
            'phone': profile.phone
        };

        Object.entries(fields).forEach(([id, value]) => {
            const input = document.getElementById(id);
            if (input && value) input.value = value;
        });
    }

    /**
     * Populate saved addresses dropdown
     */
    function populateSavedAddresses(addresses) {
        if (!savedAddressSelect || !addresses?.length) return;

        savedAddressSelect.innerHTML = '<option value="">-- Select a saved address --</option>';
        
        addresses.forEach(addr => {
            const option = document.createElement('option');
            option.value = addr.id;
            const defaultTag = addr.is_default ? ' (Default)' : '';
            option.textContent = `${addr.label}${defaultTag} - ${addr.address_line1}, ${addr.city}`;
            option.dataset.address = JSON.stringify(addr);
            savedAddressSelect.appendChild(option);
        });

        // Show saved addresses section
        if (savedAddressesSection) {
            savedAddressesSection.classList.remove('hidden');
        }

        // Auto-select default address
        const defaultAddr = addresses.find(a => a.is_default);
        if (defaultAddr) {
            savedAddressSelect.value = defaultAddr.id;
            applyAddressToForm(defaultAddr);
        }
    }

    /**
     * Apply selected address to form fields
     */
    function applyAddressToForm(address) {
        if (!address) return;

        const fields = {
            'first_name': address.first_name,
            'last_name': address.last_name,
            'address': address.address_line1,
            'address_line_2': address.address_line2 || '',
            'city': address.city,
            'postal_code': address.postal_code,
            'state': address.state || '',
            'country': address.country,
            'phone': address.phone || ''
        };

        Object.entries(fields).forEach(([id, value]) => {
            const input = document.getElementById(id);
            if (input) input.value = value;
        });
    }

    /**
     * Fetch user data if logged in
     */
    async function loadUserData() {
        try {
            const accessToken = await ensureAccessToken();
            if (!accessToken) {
                console.log('User not logged in, skipping profile fetch');
                return;
            }

            // Fetch profile and addresses in parallel
            const [profile, addresses] = await Promise.all([
                getDashboardProfile().catch(() => null),
                getShippingAddresses().catch(() => [])
            ]);

            userProfile = profile;
            savedAddresses = addresses || [];

            // Populate form with user data
            if (profile) {
                populateFormWithProfile(profile);
            }

            // Populate saved addresses
            if (savedAddresses.length > 0) {
                populateSavedAddresses(savedAddresses);
            }

        } catch (err) {
            console.warn('Failed to load user data:', err);
        }
    }

    /**
     * Validate form fields based on current mode
     */
    function validateForm() {
        const requiredFields = ['first_name', 'last_name', 'email', 'address', 'postal_code', 'city', 'country'];
        const errors = [];

        requiredFields.forEach(fieldId => {
            const input = document.getElementById(fieldId);
            if (input && !input.value.trim()) {
                const label = input.previousElementSibling?.textContent?.replace('*', '').trim() || fieldId;
                errors.push(`${label} is required`);
                input.style.borderColor = '#fa755a';
            } else if (input) {
                input.style.borderColor = '#ddd';
            }
        });

        // Validate email format
        const emailInput = document.getElementById('email');
        if (emailInput && emailInput.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value)) {
            errors.push('Please enter a valid email address');
            emailInput.style.borderColor = '#fa755a';
        }

        // If quote mode and shipping is different, validate shipping fields
        if (currentMode === 'quote' && sameAsBillingCheckbox && !sameAsBillingCheckbox.checked) {
            const shippingRequired = ['shipping_address', 'shipping_city', 'shipping_postal_code', 'shipping_country'];
            shippingRequired.forEach(fieldId => {
                const input = document.getElementById(fieldId);
                if (input && !input.value.trim()) {
                    const label = input.previousElementSibling?.textContent?.replace('*', '').trim() || fieldId;
                    errors.push(`Shipping ${label} is required`);
                    input.style.borderColor = '#fa755a';
                } else if (input) {
                    input.style.borderColor = '#ddd';
                }
            });
        }

        return errors;
    }

    /**
     * Get form data for quote creation
     */
    function getQuoteFormData() {
        const formData = new FormData(checkoutForm);
        
        const billingAddress = {
            address_line_1: formData.get('address') || '',
            address_line_2: formData.get('address_line_2') || '',
            city: formData.get('city') || '',
            postal_code: formData.get('postal_code') || '',
            country: formData.get('country') || 'Cameroon',
            state: formData.get('state') || ''
        };

        const sameAsBilling = sameAsBillingCheckbox?.checked ?? true;
        
        let shippingAddress = null;
        if (!sameAsBilling) {
            shippingAddress = {
                address_line_1: formData.get('shipping_address') || '',
                address_line_2: formData.get('shipping_address_line_2') || '',
                city: formData.get('shipping_city') || '',
                postal_code: formData.get('shipping_postal_code') || '',
                country: formData.get('shipping_country') || 'Cameroon',
                state: formData.get('shipping_state') || ''
            };
        }

        return {
            items: cart.getCart().map(item => ({
                id: item.id,
                quantity: item.quantity
            })),
            customer_name: `${formData.get('first_name') || ''} ${formData.get('last_name') || ''}`.trim(),
            email: formData.get('email') || '',
            phone: formData.get('phone') || '',
            company: formData.get('company') || '',
            billing_address: billingAddress,
            shipping_address: shippingAddress,
            same_as_billing: sameAsBilling,
            shipping_cost: parseFloat(formData.get('shipping_cost')) || 0,
            tax_rate: parseFloat(formData.get('tax_rate')) || 21,
            notes: formData.get('quote_notes') || ''
        };
    }

    /**
     * Show success state after quote generation
     */
    function showQuoteSuccess(quoteNumber, accessToken = '') {
        container.innerHTML = '';
        
        const successDiv = document.createElement('div');
        successDiv.className = 'order-success quote-success';
        successDiv.style.cssText = 'text-align: center; padding: 3rem 2rem; background: #f8f9fa; border-radius: 12px; margin: 2rem 0;';

        const iconWrap = document.createElement('div');
        iconWrap.style.cssText = 'width: 80px; height: 80px; background: linear-gradient(135deg, #003366, #0066cc); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;';
        const icon = document.createElement('i');
        icon.className = 'fas fa-file-pdf';
        icon.style.cssText = 'font-size: 2rem; color: white;';
        iconWrap.appendChild(icon);

        const title = document.createElement('h2');
        title.style.cssText = 'color: #003366; margin-bottom: 0.5rem;';
        title.textContent = 'Your Quote is Ready!';

        const quoteLine = document.createElement('p');
        quoteLine.style.cssText = 'color: #666; margin-bottom: 0.5rem;';
        quoteLine.appendChild(document.createTextNode('Quote Number: '));
        const quoteStrong = document.createElement('strong');
        quoteStrong.style.cssText = 'color: #003366;';
        quoteStrong.textContent = String(quoteNumber || '');
        quoteLine.appendChild(quoteStrong);

        const subtitle = document.createElement('p');
        subtitle.style.cssText = 'color: #888; font-size: 0.9rem; margin-bottom: 1.5rem;';
        subtitle.textContent = 'Your quote has been generated and is ready for download.';

        const actions = document.createElement('div');
        actions.style.cssText = 'display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;';

        const pdfLink = document.createElement('a');
        pdfLink.className = 'btn btn-primary';
        pdfLink.style.cssText = 'display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.875rem 1.5rem;';
        pdfLink.target = '_blank';
        pdfLink.rel = 'noopener noreferrer';
        // Avoid URL injection; quoteNumber is used as a path segment.
        const safeQuoteNumber = encodeURIComponent(String(quoteNumber || ''));
        pdfLink.href = getQuotePDFUrl(safeQuoteNumber, accessToken);
        const downloadIcon = document.createElement('i');
        downloadIcon.className = 'fas fa-download';
        pdfLink.appendChild(downloadIcon);
        pdfLink.appendChild(document.createTextNode(' Download PDF Quote'));

        const continueLink = document.createElement('a');
        continueLink.className = 'btn btn-secondary';
        continueLink.style.cssText = 'padding: 0.875rem 1.5rem;';
        continueLink.href = 'index.html';
        continueLink.textContent = 'Continue Shopping';

        actions.appendChild(pdfLink);
        actions.appendChild(continueLink);

        const info = document.createElement('p');
        info.style.cssText = 'margin-top: 1.5rem; font-size: 0.85rem; color: #888;';
        const infoIcon = document.createElement('i');
        infoIcon.className = 'fas fa-info-circle';
        info.appendChild(infoIcon);
        info.appendChild(document.createTextNode(' This quote is valid for 30 days. Contact us to place your order.'));

        successDiv.appendChild(iconWrap);
        successDiv.appendChild(title);
        successDiv.appendChild(quoteLine);
        successDiv.appendChild(subtitle);
        successDiv.appendChild(actions);
        successDiv.appendChild(info);

        container.appendChild(successDiv);
        checkoutSection.classList.add('hidden');
    }

    // Tab click handlers
    if (tabPayment) {
        pageListenerManager.add(tabPayment, 'click', () => switchMode('payment'));
    }
    if (tabQuote) {
        pageListenerManager.add(tabQuote, 'click', () => switchMode('quote'));
    }

    // Saved address selection handler
    if (savedAddressSelect) {
        pageListenerManager.add(savedAddressSelect, 'change', (e) => {
            const selectedOption = e.target.selectedOptions[0];
            if (selectedOption && selectedOption.dataset.address) {
                try {
                    const address = JSON.parse(selectedOption.dataset.address);
                    applyAddressToForm(address);
                } catch (err) {
                    console.error('Failed to parse address:', err);
                }
            }
        });
    }

    // Toggle manual address entry
    if (toggleManualAddressBtn) {
        pageListenerManager.add(toggleManualAddressBtn, 'click', () => {
            if (savedAddressesSection) {
                const isHidden = savedAddressesSection.classList.contains('hidden');
                savedAddressesSection.classList.toggle('hidden');
                toggleManualAddressBtn.textContent = isHidden ? 'Enter manually' : 'Use saved address';
            }
        });
    }

    // Same as billing checkbox handler
    if (sameAsBillingCheckbox) {
        pageListenerManager.add(sameAsBillingCheckbox, 'change', (e) => {
            if (shippingFields) {
                shippingFields.classList.toggle('hidden', e.target.checked);
            }
        });
    }

    const render = () => {
        const items = cart.getCart();
        container.innerHTML = '';

        if (items.length === 0) {
            container.appendChild(ui.createEmptyCartElement());
            checkoutSection?.classList.add('hidden');
            return;
        }

        const { cartLayout, summary } = ui.getCartLayoutHTML(items);
        container.appendChild(cartLayout);
        container.appendChild(summary);

        checkoutSection?.classList.remove('hidden');
    };

    pageListenerManager.add(container, 'change', (e) => {
        if (e.target.classList.contains('qty-input')) {
            const id = parseInt(e.target.closest('.cart-item').dataset.id, 10);
            const qty = Math.max(1, parseInt(e.target.value, 10) || 1);
            cart.updateCartItemQuantity(id, qty);
        }
    });

    pageListenerManager.add(container, 'click', (e) => {
        const itemEl = e.target.closest('.cart-item');
        if (itemEl) {
            const id = parseInt(itemEl.dataset.id, 10);
            if (e.target.closest('.qty-increment')) {
                const input = itemEl.querySelector('.qty-input');
                const current = Math.max(1, parseInt(input.value, 10) || 1);
                const next = current + 1;
                input.value = String(next);
                cart.updateCartItemQuantity(id, next);
                return;
            }
            if (e.target.closest('.qty-decrement')) {
                const input = itemEl.querySelector('.qty-input');
                const current = Math.max(1, parseInt(input.value, 10) || 1);
                const next = Math.max(1, current - 1);
                input.value = String(next);
                cart.updateCartItemQuantity(id, next);
                return;
            }
        }

        if (e.target.closest('.remove-btn')) {
            const id = parseInt(e.target.closest('.cart-item').dataset.id, 10);
            cart.removeFromCart(id);
        }

        if (e.target.closest('#proceed-checkout')) {
            checkoutSection?.scrollIntoView({ behavior: 'smooth' });
        }
    });

    // Handle Checkout Form Submission (Payment only)
    if (checkoutForm) {
        pageListenerManager.add(checkoutForm, 'submit', async (e) => {
            e.preventDefault();

            // Only handle payment mode
            if (currentMode !== 'payment') return;

            if (!stripe || !card) {
                ui.showToast('Payment system not initialized. Please refresh.', 'error');
                return;
            }

            const errors = validateForm();
            if (errors.length > 0) {
                ui.showToast(errors[0], 'error');
                return;
            }

            const submitBtn = document.getElementById('submit-payment-btn');
            const originalBtnHTML = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

            try {
                const { token, error } = await stripe.createToken(card);

                if (error) {
                    const errorElement = document.getElementById('card-errors');
                    errorElement.textContent = error.message;
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnHTML;
                    return;
                }

                const formData = new FormData(checkoutForm);
                const shippingInfo = {
                    first_name: formData.get('first_name'),
                    last_name: formData.get('last_name'),
                    email: formData.get('email'),
                    address: formData.get('address'),
                    postal_code: formData.get('postal_code'),
                    city: formData.get('city')
                };

                const cartItems = cart.getCart().map(item => ({
                    id: item.id,
                    quantity: item.quantity
                }));

                const orderData = {
                    items: cartItems,
                    shipping_info: shippingInfo,
                    stripe_token: token.id
                };

                await createOrder(orderData);

                cart.clearCart();
                ui.showToast('Order placed successfully!', 'success');

                container.innerHTML = '';
                const successDiv = document.createElement('div');
                successDiv.className = 'order-success';
                successDiv.style.cssText = 'text-align: center; padding: 3rem 2rem; background: #f8f9fa; border-radius: 12px;';
                successDiv.innerHTML = `
                    <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #28a745, #20c997); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
                        <i class="fas fa-check" style="font-size: 2rem; color: white;"></i>
                    </div>
                    <h2 style="color: #28a745; margin-bottom: 0.5rem;">Thank you for your order!</h2>
                    <p style="color: #666; margin-bottom: 1.5rem;">Your order has been placed successfully. You will receive a confirmation email shortly.</p>
                    <a href="index.html" class="btn btn-primary">Continue Shopping</a>
                `;
                container.appendChild(successDiv);
                checkoutSection.classList.add('hidden');

            } catch (err) {
                console.error('Order creation failed:', err);
                ui.showToast(err.message || 'Failed to place order. Please try again.', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnHTML;
            }
        });
    }

    // Handle Request Quote Button
    const requestQuoteBtn = document.getElementById('request-quote-btn');
    if (requestQuoteBtn) {
        pageListenerManager.add(requestQuoteBtn, 'click', async (e) => {
            e.preventDefault();

            const errors = validateForm();
            if (errors.length > 0) {
                ui.showToast(errors[0], 'error');
                return;
            }

            const cartItems = cart.getCart();
            if (cartItems.length === 0) {
                ui.showToast('Your cart is empty.', 'error');
                return;
            }

            const originalBtnHTML = requestQuoteBtn.innerHTML;
            requestQuoteBtn.disabled = true;
            requestQuoteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating Quote...';

            try {
                const quoteData = getQuoteFormData();
                const response = await createQuote(quoteData);

                if (response?.quote_number) {
                    ui.showToast('Quote generated successfully!', 'success');
                    showQuoteSuccess(response.quote_number, response.access_token);
                } else {
                    throw new Error('Failed to generate quote - no quote number received');
                }

            } catch (err) {
                console.error('Quote creation failed:', err);
                ui.showToast(err.message || 'Failed to generate quote. Please try again.', 'error');
                requestQuoteBtn.disabled = false;
                requestQuoteBtn.innerHTML = originalBtnHTML;
            }
        });
    }

    pageListenerManager.add(document, 'cartUpdated', render);
    
    // Initialize
    render();
    loadUserData();

    window.addEventListener('beforeunload', () => {
        pageListenerManager.removeAll();
        if (card) {
            card.unmount();
            card.destroy();
        }
    });
}
