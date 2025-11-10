import * as cart from '../cart.js';
import * as ui from '../ui.js';
import { ListenerManager } from '../utils.js';

export function initCartPage() {
    const container = document.getElementById('cart-container');
    const checkoutSection = document.getElementById('checkout-section');
    if (!container) return;

    const pageListenerManager = new ListenerManager();

    const render = () => {
        const items = cart.getCart();
        container.innerHTML = '';

        if (items.length === 0) {
            container.innerHTML = ui.getEmptyCartHTML();
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

    pageListenerManager.add(document, 'cartUpdated', render);
    render();

    window.addEventListener('beforeunload', () => {
        pageListenerManager.removeAll();
    });
}
