/**
 * cart.js
 *
 * Shopping cart state backed by an in-memory Map for O(1) updates and
 * debounced localStorage persistence via StateManager.
 */

import { StateManager, debounce } from './utils.js';

const CART_KEY = 'shoppingCart';
const PERSIST_DEBOUNCE_MS = 500;

const cartStateManager = new StateManager(CART_KEY, { items: {} });

let inMemoryCart = new Map();

function isValidCartItem(item) {
    return item && (typeof item.id === 'number' || typeof item.id === 'string');
}

function normalizeStoredItems(items) {
    if (!items) return [];
    if (Array.isArray(items)) {
        return items.filter(isValidCartItem).map((item) => ({ ...item }));
    }
    if (typeof items === 'object') {
        return Object.values(items)
            .filter(isValidCartItem)
            .map((item) => ({ ...item }));
    }
    return [];
}

function cloneCartItems(sourceMap = inMemoryCart) {
    return Array.from(sourceMap.values()).map((item) => ({ ...item }));
}

function loadCartFromState(state) {
    if (!state) {
        inMemoryCart = new Map();
        return;
    }

    const normalizedItems = normalizeStoredItems(state.items);
    const entries = normalizedItems.map((item) => [String(item.id), item]);
    inMemoryCart = new Map(entries);
}

function persistCartToStorage() {
    const itemsObject = {};
    inMemoryCart.forEach((item, key) => {
        itemsObject[key] = { ...item };
    });

    cartStateManager.update((currentState) => ({
        ...currentState,
        items: itemsObject,
        lastPersistedAt: Date.now()
    }));
}

const debouncedPersistCart = debounce(persistCartToStorage, PERSIST_DEBOUNCE_MS);

function dispatchUpdateEvent(oldCartItems = []) {
    const previous = oldCartItems.map((item) => ({ ...item }));
    const current = cloneCartItems();

    document.dispatchEvent(new CustomEvent('cartUpdated', {
        detail: {
            cart: current,
            oldCart: previous
        }
    }));
}

cartStateManager.addEventListener('change', (event) => {
    const { newState, oldState } = event.detail || {};
    const previousItems = normalizeStoredItems(oldState?.items);

    loadCartFromState(newState);

    document.dispatchEvent(new CustomEvent('cartUpdated', {
        detail: {
            cart: cloneCartItems(),
            oldCart: previousItems
        }
    }));
});

cartStateManager.addEventListener('quotaExceeded', (event) => {
    console.error('Cart storage quota exceeded:', event.detail.error);
    document.dispatchEvent(new CustomEvent('cartStorageError', {
        detail: {
            error: event.detail.error,
            message: 'Cart storage is full. Some items may not be saved.'
        }
    }));
});

loadCartFromState(cartStateManager.getState());

export function getCart() {
    return cloneCartItems();
}

export function addToCart(product, quantity) {
    if (!product || product.id === undefined || product.id === null || quantity <= 0) {
        console.error('Invalid product or quantity for addToCart');
        return;
    }

    const oldCart = cloneCartItems();
    const productKey = String(product.id);
    const existingItem = inMemoryCart.get(productKey);

    if (existingItem) {
        const updatedItem = {
            ...existingItem,
            quantity: existingItem.quantity + quantity,
            updatedAt: new Date().toISOString()
        };
        inMemoryCart.set(productKey, updatedItem);
    } else {
        const priceNumber = Number.parseFloat(product.price);
        const imageUrl = Array.isArray(product.images) && product.images.length > 0
            ? product.images[0].image
            : null;

        const newItem = {
            id: product.id,
            name: product.name,
            price: Number.isFinite(priceNumber) ? priceNumber : 0,
            image: imageUrl,
            quantity,
            addedAt: new Date().toISOString()
        };
        inMemoryCart.set(productKey, newItem);
    }

    dispatchUpdateEvent(oldCart);
    debouncedPersistCart();
}

export function updateCartItemQuantity(productId, quantity) {
    if (productId === undefined || productId === null || quantity <= 0) {
        console.error('Invalid productId or quantity for updateCartItemQuantity');
        return;
    }

    const productKey = String(productId);
    const item = inMemoryCart.get(productKey);

    if (item) {
        const oldCart = cloneCartItems();
        const updatedItem = {
            ...item,
            quantity,
            updatedAt: new Date().toISOString()
        };
        inMemoryCart.set(productKey, updatedItem);

        dispatchUpdateEvent(oldCart);
        debouncedPersistCart();
    }
}

export function removeFromCart(productId) {
    if (productId === undefined || productId === null) {
        console.error('Invalid productId for removeFromCart');
        return;
    }

    const productKey = String(productId);
    if (inMemoryCart.has(productKey)) {
        const oldCart = cloneCartItems();
        inMemoryCart.delete(productKey);

        dispatchUpdateEvent(oldCart);
        debouncedPersistCart();
    }
}

export function clearCart() {
    if (inMemoryCart.size === 0) {
        cartStateManager.clear({ items: {}, lastPersistedAt: Date.now() });
        return;
    }

    const oldCart = cloneCartItems();
    inMemoryCart.clear();

    dispatchUpdateEvent(oldCart);
    cartStateManager.clear({ items: {}, lastPersistedAt: Date.now() });
}

export function cleanupCartMetadata() {
    if (inMemoryCart.size === 0) {
        persistCartToStorage();
        return;
    }

    const oldCart = cloneCartItems();
    const cleanedEntries = Array.from(inMemoryCart.entries()).map(([key, item]) => [
        key,
        {
            id: item.id,
            name: item.name,
            price: item.price,
            image: item.image,
            quantity: item.quantity
        }
    ]);
    inMemoryCart = new Map(cleanedEntries);

    dispatchUpdateEvent(oldCart);
    persistCartToStorage();
}

export function getCartItemCount() {
    let total = 0;
    inMemoryCart.forEach((item) => {
        total += item.quantity;
    });
    return total;
}

export function getCartTotal() {
    let total = 0;
    inMemoryCart.forEach((item) => {
        const price = Number.isFinite(item.price) ? item.price : 0;
        total += price * item.quantity;
    });
    return total;
}

export function getCartStats() {
    const items = cloneCartItems();
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = items.reduce((sum, item) => sum + ((Number.isFinite(item.price) ? item.price : 0) * item.quantity), 0);
    const oldestItem = items.reduce((oldest, item) => {
        if (!oldest) return item;
        return new Date(item.addedAt || 0) < new Date(oldest.addedAt || 0) ? item : oldest;
    }, null);

    return {
        itemCount: items.length,
        totalQuantity,
        totalValue,
        isEmpty: items.length === 0,
        oldestItem
    };
}

export function validateCart() {
    const issues = [];

    inMemoryCart.forEach((item, key) => {
        if (!isValidCartItem(item)) {
            issues.push(`Item with key ${key} is invalid`);
            return;
        }
        if (String(item.id) !== key) {
            issues.push(`Item key ${key} mismatches id ${item.id}`);
        }
        if (!item.name) {
            issues.push(`Item ${item.id} missing name`);
        }
        if (typeof item.price !== 'number' || Number.isNaN(item.price) || item.price < 0) {
            issues.push(`Item ${item.id} has invalid price`);
        }
        if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
            issues.push(`Item ${item.id} has invalid quantity`);
        }
    });

    return {
        isValid: issues.length === 0,
        issues
    };
}

export { cartStateManager };