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
        
        // Insert into header-actions area (before user actions) for better positioning
        const headerActions = document.querySelector('.header-actions');
        if (headerActions) {
            // Insert at the beginning of header-actions for top-right placement
            headerActions.insertBefore(switcher, headerActions.firstChild);
        } else {
            // Fallback: try navigation
            const nav = document.querySelector('nav') || document.querySelector('.nav');
            if (nav) {
                nav.appendChild(switcher);
            } else {
                // Final fallback: insert at top of body
                document.body.insertBefore(switcher, document.body.firstChild);
            }
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
                <button class="lang-pill ${currentLang === 'en' ? 'active' : ''}" data-lang-switch="en" aria-pressed="${currentLang === 'en'}" aria-label="Switch to English">EN</button>
                <button class="lang-pill ${currentLang === 'fr' ? 'active' : ''}" data-lang-switch="fr" aria-pressed="${currentLang === 'fr'}" aria-label="Switch to French">FR</button>
            </div>
        `;
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        document.addEventListener('click', (e) => {
            const pill = e.target.closest('.lang-pill');
            if (pill?.hasAttribute('data-lang-switch')) {
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
    .lang-pill { 
        min-width: 38px; 
        padding: 4px 7px; 
        font-size: 0.8rem;
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