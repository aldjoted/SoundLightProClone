import * as cart from '../cart.js';
import * as ui from '../ui.js';
import { ListenerManager } from '../utils.js';
import { STRIPE_PUBLISHABLE_KEY } from '../config.js';
import { createOrder } from '../apiService.js';

export function initCartPage() {
    const container = document.getElementById('cart-container');
    const checkoutSection = document.getElementById('checkout-section');
    if (!container) return;

    const pageListenerManager = new ListenerManager();
    let stripe = null;
    let elements = null;
    let card = null;

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

    // Handle Checkout Form Submission
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        pageListenerManager.add(checkoutForm, 'submit', async (e) => {
            e.preventDefault();

            if (!stripe || !card) {
                ui.showToast('Payment system not initialized. Please refresh.', 'error');
                return;
            }

            const submitBtn = document.getElementById('submit-payment-btn');
            const originalBtnText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = '';
            const spinner = document.createElement('i');
            spinner.className = 'fas fa-spinner fa-spin';
            submitBtn.appendChild(spinner);
            submitBtn.appendChild(document.createTextNode(' Processing...'));

            try {
                const { token, error } = await stripe.createToken(card);

                if (error) {
                    // Inform the user if there was an error.
                    const errorElement = document.getElementById('card-errors');
                    errorElement.textContent = error.message;
                    submitBtn.disabled = false;
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                    return;
                }

                // Send the token to your server.
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
                    product_id: item.id,
                    quantity: item.quantity
                }));

                const orderData = {
                    items: cartItems,
                    shipping_info: shippingInfo,
                    stripe_token: token.id
                };

                await createOrder(orderData);

                // Success!
                cart.clearCart();
                ui.showToast('Order placed successfully!', 'success');

                // Redirect to dashboard or show success message
                container.innerHTML = '';
                const successDiv = document.createElement('div');
                successDiv.className = 'order-success';

                const icon = document.createElement('i');
                icon.className = 'fas fa-check-circle';

                const h2 = document.createElement('h2');
                h2.textContent = 'Thank you for your order!';

                const p = document.createElement('p');
                p.textContent = 'Your order has been placed successfully. You will receive a confirmation email shortly.';

                const link = document.createElement('a');
                link.href = 'index.html';
                link.className = 'btn btn-primary';
                link.textContent = 'Continue Shopping';

                successDiv.appendChild(icon);
                successDiv.appendChild(h2);
                successDiv.appendChild(p);
                successDiv.appendChild(link);

                container.appendChild(successDiv);
                checkoutSection.classList.add('hidden');

            } catch (err) {
                console.error('Order creation failed:', err);
                ui.showToast(err.message || 'Failed to place order. Please try again.', 'error');
                submitBtn.disabled = false;
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        });
    }

    pageListenerManager.add(document, 'cartUpdated', render);
    render();

    window.addEventListener('beforeunload', () => {
        pageListenerManager.removeAll();
        if (card) {
            card.unmount();
            card.destroy();
        }
    });
}
