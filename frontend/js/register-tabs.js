/**
 * Register Page - Account Type Tabs Handler
 * Manages switching between individual and professional account forms
 * 
 * ✅ SECURITY: Integrated CAPTCHA verification for registration
 */

import { CaptchaManager } from './captcha.js';
import { registerUser } from './apiService.js';

// Track which captcha container is currently active
let activeCaptchaContainer = null;

/**
 * Initialize CAPTCHA for the active form
 * @param {string} containerId - The ID of the captcha container
 */
async function initCaptchaForForm(containerId) {
    // Don't re-render if it's the same container
    if (activeCaptchaContainer === containerId) {
        return;
    }
    
    // Initialize CAPTCHA if not already done
    const isEnabled = await CaptchaManager.init();
    
    if (isEnabled) {
        // Render captcha in the new container
        CaptchaManager.render(containerId, {
            theme: 'light',
            callback: () => {
                console.log('[CAPTCHA] Verified');
            },
            expiredCallback: () => {
                console.log('[CAPTCHA] Expired, please verify again');
            },
            errorCallback: (err) => {
                console.error('[CAPTCHA] Error:', err);
            }
        });
        activeCaptchaContainer = containerId;
    }
}

/**
 * Show message in form
 * @param {HTMLElement} messageEl - The message element
 * @param {string} message - The message text
 * @param {string} type - 'success' or 'error'
 */
function showFormMessage(messageEl, message, type = 'error') {
    if (!messageEl) return;
    
    messageEl.textContent = message;
    messageEl.className = `form-message ${type}`;
    messageEl.classList.remove('hidden');
    
    // Auto-hide success messages
    if (type === 'success') {
        setTimeout(() => {
            messageEl.classList.add('hidden');
        }, 5000);
    }
}

/**
 * Handle form submission with CAPTCHA
 * @param {Event} e - Submit event
 * @param {string} formType - 'individual' or 'professional'
 */
async function handleFormSubmit(e, formType) {
    e.preventDefault();
    
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const messageEl = form.querySelector('[id^="form-message"]');
    
    // Get form data
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Disable submit button
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
    }
    
    try {
        // Get CAPTCHA token
        let captchaToken = '';
        if (CaptchaManager.isEnabled()) {
            try {
                captchaToken = await CaptchaManager.getToken('register');
            } catch (captchaError) {
                showFormMessage(messageEl, captchaError.message || 'Please complete the CAPTCHA', 'error');
                return;
            }
        }
        
        // Prepare registration data
        const registrationData = {
            username: data.username,
            email: data.email,
            password: data.password,
            password2: data.password2,
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            captcha_token: captchaToken,
        };
        
        // Add professional-specific fields
        if (formType === 'professional') {
            registrationData.company_name = data.company_name;
            registrationData.vat_number = data.vat_number;
            registrationData.phone = data.phone;
            registrationData.billing_address = data.billing_address;
            registrationData.billing_city = data.billing_city;
            registrationData.billing_postal = data.billing_postal;
            registrationData.billing_country = data.billing_country;
            
            if (!data.same_as_billing) {
                registrationData.shipping_address = data.shipping_address;
                registrationData.shipping_city = data.shipping_city;
                registrationData.shipping_postal = data.shipping_postal;
                registrationData.shipping_country = data.shipping_country;
            }
        }
        
        // Submit registration
        const result = await registerUser(registrationData);
        
        showFormMessage(messageEl, 'Account created successfully! Redirecting to login...', 'success');
        
        // Redirect to login page after success
        setTimeout(() => {
            window.location.href = 'login.html?registered=true';
        }, 2000);
        
    } catch (error) {
        console.error('Registration error:', error);
        
        // Handle CAPTCHA-specific errors
        if (error.code === 'CAPTCHA_FAILED') {
            showFormMessage(messageEl, 'CAPTCHA verification failed. Please try again.', 'error');
            CaptchaManager.reset();
        } else {
            showFormMessage(messageEl, error.message || 'Registration failed. Please try again.', 'error');
        }
        
        // Reset CAPTCHA on error
        if (CaptchaManager.isEnabled()) {
            CaptchaManager.reset();
        }
        
    } finally {
        // Re-enable submit button
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = formType === 'individual' 
                ? '<i class="fas fa-user-plus"></i> Create Individual Account'
                : '<i class="fas fa-briefcase"></i> Create Professional Account';
        }
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Register tabs script loaded');
    
    // Get tab buttons and form containers
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const sameAsBillingCheckbox = document.getElementById('same-as-billing');
    const shippingAddressFields = document.getElementById('shipping-address-fields');
    
    console.log('Tab buttons found:', tabButtons.length);
    console.log('Tab contents found:', tabContents.length);

    // Initialize CAPTCHA for the default active form (individual)
    await initCaptchaForForm('captcha-container-ind');

    // Tab switching functionality
    tabButtons.forEach(button => {
        button.addEventListener('click', async function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Remove active class from all tabs and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Show corresponding content
            const targetContent = document.querySelector(`[data-content="${targetTab}"]`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
            
            // Re-render CAPTCHA in the new form
            const captchaContainerId = targetTab === 'individual' 
                ? 'captcha-container-ind' 
                : 'captcha-container-pro';
            await initCaptchaForForm(captchaContainerId);
        });
    });

    // Handle "Same as billing address" checkbox
    if (sameAsBillingCheckbox && shippingAddressFields) {
        sameAsBillingCheckbox.addEventListener('change', function() {
            const shippingInputs = shippingAddressFields.querySelectorAll('input');
            
            if (this.checked) {
                // Copy billing address to shipping address
                const billingAddress = document.getElementById('billing-address-pro').value;
                const billingCity = document.getElementById('billing-city-pro').value;
                const billingPostal = document.getElementById('billing-postal-pro').value;
                const billingCountry = document.getElementById('billing-country-pro').value;
                
                document.getElementById('shipping-address-pro').value = billingAddress;
                document.getElementById('shipping-city-pro').value = billingCity;
                document.getElementById('shipping-postal-pro').value = billingPostal;
                document.getElementById('shipping-country-pro').value = billingCountry;
                
                // Disable shipping address fields
                shippingInputs.forEach(input => {
                    input.disabled = true;
                    input.style.opacity = '0.5';
                    input.style.cursor = 'not-allowed';
                });
            } else {
                // Enable shipping address fields
                shippingInputs.forEach(input => {
                    input.disabled = false;
                    input.style.opacity = '1';
                    input.style.cursor = 'text';
                });
            }
        });

        // Also update shipping address when billing address changes (if checkbox is checked)
        const billingInputs = [
            document.getElementById('billing-address-pro'),
            document.getElementById('billing-city-pro'),
            document.getElementById('billing-postal-pro'),
            document.getElementById('billing-country-pro')
        ];

        billingInputs.forEach((input, index) => {
            if (input) {
                input.addEventListener('input', function() {
                    if (sameAsBillingCheckbox.checked) {
                        const shippingInputIds = [
                            'shipping-address-pro',
                            'shipping-city-pro',
                            'shipping-postal-pro',
                            'shipping-country-pro'
                        ];
                        const correspondingShippingInput = document.getElementById(shippingInputIds[index]);
                        if (correspondingShippingInput) {
                            correspondingShippingInput.value = this.value;
                        }
                    }
                });
            }
        });
    }

    // Form submission handlers with CAPTCHA integration
    const individualForm = document.getElementById('register-form-individual');
    const professionalForm = document.getElementById('register-form-professional');

    if (individualForm) {
        individualForm.addEventListener('submit', (e) => handleFormSubmit(e, 'individual'));
    }

    if (professionalForm) {
        professionalForm.addEventListener('submit', (e) => handleFormSubmit(e, 'professional'));
    }
});

