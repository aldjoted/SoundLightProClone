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
        this.init();
    }
    
    /**
     * Initialize the language switcher
     */
    init() {
        this.createSwitcher();
        this.setupEventListeners();
        
        // Listen for language changes
        i18n.addListener((newLang) => {
            this.updateCurrentLanguage();
        });
    }
    
    /**
     * Create the language switcher HTML
     */
    createSwitcher() {
        const switcher = document.createElement('div');
        switcher.className = 'language-switcher';
    switcher.innerHTML = this.getSwitcherHTML();
        
        // Insert into navigation if it exists
        const nav = document.querySelector('nav') || document.querySelector('.nav');
        if (nav) {
            nav.appendChild(switcher);
        } else {
            // Fallback: insert at top of body
            document.body.insertBefore(switcher, document.body.firstChild);
        }
        
        this.element = switcher;
    }
    
    /**
     * Get the HTML for the language switcher
     */
    getSwitcherHTML() {
        const currentLang = i18n.getCurrentLanguage();
        return `
            <div class="lang-toggle" role="group" aria-label="Language selector">
                <button class="lang-pill ${currentLang === 'en' ? 'active' : ''}" data-lang-switch="en" aria-pressed="${currentLang === 'en'}">EN</button>
                <button class="lang-pill ${currentLang === 'fr' ? 'active' : ''}" data-lang-switch="fr" aria-pressed="${currentLang === 'fr'}">FR</button>
            </div>
        `;
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        document.addEventListener('click', (e) => {
            const pill = e.target.closest('.lang-pill');
            if (pill && pill.hasAttribute('data-lang-switch')) {
                const lang = pill.getAttribute('data-lang-switch');
                i18n.setLanguage(lang);
                this.updateCurrentLanguage();
            }
        });
    }
    
    /**
     * Toggle dropdown
     */
    toggle() {
        this.isOpen = !this.isOpen;
        this.updateDropdown();
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
    position: relative;
    display: inline-block;
    margin-left: var(--spacing-md);
    z-index: 1000;
}
/* Pill buttons */
.lang-toggle {
    display: inline-flex;
    background: rgba(255,255,255,0.95);
    border: 1px solid rgba(0,0,0,0.08);
    border-radius: var(--radius-full, 999px);
    padding: 4px;
    gap: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
.lang-pill {
    min-width: 44px;
    padding: 6px 10px;
    border-radius: var(--radius-full, 999px);
    border: none;
    cursor: pointer;
    background: transparent;
    color: var(--text-primary, #1f2937);
    font-weight: 600;
    letter-spacing: 0.02em;
}
.lang-pill.active {
    background: var(--primary-color, #6366f1);
    color: #fff;
    box-shadow: 0 4px 12px rgba(99,102,241,0.25);
}
.lang-pill:hover { background: rgba(99,102,241,0.08); }

/* Responsive adjustments */
@media (max-width: 1024px) {
    .language-switcher {
        margin-left: var(--spacing-sm);
    }
}

@media (max-width: 768px) {
    .language-switcher {
        margin-left: 0;
        margin-right: var(--spacing-sm);
    }
}

@media (max-width: 480px) {
    .lang-toggle { padding: 2px; }
    .lang-pill { min-width: 40px; padding: 5px 8px; }
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