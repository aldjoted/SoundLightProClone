/**
 * Register Page - Account Type Tabs Handler
 * Manages switching between individual and professional account forms
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Register tabs script loaded');
    
    // Get tab buttons and form containers
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const sameAsBillingCheckbox = document.getElementById('same-as-billing');
    const shippingAddressFields = document.getElementById('shipping-address-fields');
    
    console.log('Tab buttons found:', tabButtons.length);
    console.log('Tab contents found:', tabContents.length);

    // Tab switching functionality
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
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

    // Form submission handlers (placeholder - to be integrated with backend)
    const individualForm = document.getElementById('register-form-individual');
    const professionalForm = document.getElementById('register-form-professional');

    if (individualForm) {
        individualForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Individual account registration:', new FormData(this));
            // TODO: Integrate with backend API
        });
    }

    if (professionalForm) {
        professionalForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Professional account registration:', new FormData(this));
            // TODO: Integrate with backend API
        });
    }
});

