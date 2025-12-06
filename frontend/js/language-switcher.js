/**
 * language-switcher.js
 * 
 * Language switcher component for SoundLightPro
 * Creates compact FR/EN pill buttons for switching languages
 */

import i18n from './i18n.js';

/**
 * Language Switcher class
 */
class LanguageSwitcher {
    constructor() {
        this.isOpen = false;
        this.element = null;
        this.init();
    }

    /**
     * Initialize the language switcher
     */
    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.createSwitcher();
                this.setupEventListeners();
                this.updateCurrentLanguage();
            });
        } else {
            this.createSwitcher();
            this.setupEventListeners();
            this.updateCurrentLanguage();
        }
    }

    /**
     * Create the language switcher UI
     */
    createSwitcher() {
        // Check if already exists
        if (document.querySelector('.language-switcher')) {
            this.element = document.querySelector('.language-switcher');
            return;
        }

        // Create switcher element
        this.element = document.createElement('div');
        this.element.className = 'language-switcher';
        this.element.setAttribute('role', 'group');
        this.element.setAttribute('aria-label', 'Language selection');

        const toggle = document.createElement('div');
        toggle.className = 'lang-toggle';

        // English button
        const enBtn = document.createElement('button');
        enBtn.className = 'lang-pill';
        enBtn.setAttribute('data-lang-switch', 'en');
        enBtn.setAttribute('aria-pressed', 'false');
        enBtn.textContent = 'EN';
        enBtn.type = 'button';

        // French button
        const frBtn = document.createElement('button');
        frBtn.className = 'lang-pill';
        frBtn.setAttribute('data-lang-switch', 'fr');
        frBtn.setAttribute('aria-pressed', 'false');
        frBtn.textContent = 'FR';
        frBtn.type = 'button';

        toggle.appendChild(enBtn);
        toggle.appendChild(frBtn);
        this.element.appendChild(toggle);

        // Insert into header
        const header = document.querySelector('.main-header');
        if (header) {
            const headerActions = header.querySelector('.header-actions');
            if (headerActions) {
                headerActions.insertBefore(this.element, headerActions.firstChild);
            }
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        if (!this.element) return;

        this.element.querySelectorAll('.lang-pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const lang = e.target.getAttribute('data-lang-switch');
                if (lang) {
                    i18n.setLanguage(lang);
                    this.updateCurrentLanguage();
                }
            });
        });
    }

    /**
     * Open dropdown
     */
    open() {
        this.isOpen = true;
        this.updateDropdown();
    }

    /**
     * Close dropdown
     */
    close() {
        this.isOpen = false;
        this.updateDropdown();
    }

    /**
     * Update dropdown state
     */
    updateDropdown() {
        if (!this.element) return;

        const dropdown = this.element.querySelector('.lang-dropdown');
        if (dropdown) {
            dropdown.classList.toggle('open', this.isOpen);
        }
    }

    /**
     * Update current language display
     */
    updateCurrentLanguage() {
        if (!this.element) return;

        const currentLang = i18n.getCurrentLanguage();
        // Update active state on pills
        this.element.querySelectorAll('.lang-pill').forEach(btn => {
            const lang = btn.getAttribute('data-lang-switch');
            const isActive = lang === currentLang;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', String(isActive));
        });
    }

    /**
     * Destroy the language switcher
     */
    destroy() {
        if (this.element) {
            this.element.remove();
        }
    }
}

// CSS styles for the language switcher (pill buttons)
const styles = `
.language-switcher {
    display: inline-flex;
    align-items: center;
    margin-right: var(--spacing-sm);
    z-index: 10;
    flex-shrink: 0;
}

/* Pill buttons - Default styling for black header */
.lang-toggle {
    display: inline-flex;
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: var(--radius-full, 999px);
    padding: 4px;
    gap: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
}

.lang-pill {
    min-width: 44px;
    padding: 6px 12px;
    border-radius: var(--radius-full, 999px);
    border: none;
    cursor: pointer;
    background: transparent;
    color: rgba(255, 255, 255, 0.85);
    font-weight: 600;
    font-size: 0.875rem;
    letter-spacing: 0.02em;
    transition: all 0.2s ease;
    white-space: nowrap;
}

.lang-pill.active {
    background: rgba(255, 255, 255, 0.9);
    color: #000000;
    box-shadow: 0 2px 8px rgba(255, 255, 255, 0.3);
}

.lang-pill:hover:not(.active) { 
    background: rgba(255, 255, 255, 0.25);
    color: #ffffff;
}

/* Responsive adjustments */
@media (max-width: 1200px) {
    .language-switcher {
        margin-right: var(--spacing-xs);
    }
}

@media (max-width: 1024px) {
    .language-switcher {
        margin-right: var(--spacing-xs);
    }
    .lang-toggle { 
        padding: 3px; 
        gap: 3px; 
    }
    .lang-pill { 
        min-width: 40px; 
        padding: 5px 10px; 
        font-size: 0.8rem;
    }
}

@media (max-width: 900px) {
    .language-switcher {
        margin-right: var(--spacing-xs);
    }
}

@media (max-width: 768px) {
    .language-switcher {
        margin-right: var(--spacing-xs);
    }
}

@media (max-width: 480px) {
    .lang-toggle { padding: 2px; gap: 2px; }
    .lang-pill { 
        min-width: 38px; 
        padding: 4px 8px; 
        font-size: 0.75rem;
    }
}
`;

// Inject styles
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// Create and export instance
const languageSwitcher = new LanguageSwitcher();

export default languageSwitcher;