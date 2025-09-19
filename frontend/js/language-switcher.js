/**
 * language-switcher.js
 * 
 * Language switcher component for SoundLightPro
 * Creates a dropdown for switching between French and English
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
        const currentLangName = i18n.t(`language_${currentLang}`);
        
        return `
            <div class="lang-switcher-container">
                <button class="lang-switcher-toggle" aria-label="${i18n.t('language_switch_to')}">
                    <span class="lang-current">${currentLangName}</span>
                    <svg class="lang-arrow" width="12" height="8" viewBox="0 0 12 8">
                        <path d="M1 1l5 5 5-5" stroke="currentColor" stroke-width="2" fill="none"/>
                    </svg>
                </button>
                <div class="lang-dropdown ${this.isOpen ? 'open' : ''}">
                    <div class="lang-options">
                        <button class="lang-option ${currentLang === 'en' ? 'active' : ''}" 
                                data-lang-switch="en">
                            English
                        </button>
                        <button class="lang-option ${currentLang === 'fr' ? 'active' : ''}" 
                                data-lang-switch="fr">
                            Français
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        document.addEventListener('click', (e) => {
            // Toggle dropdown
            if (e.target.closest('.lang-switcher-toggle')) {
                e.preventDefault();
                this.toggle();
                return;
            }
            
            // Close dropdown when clicking outside
            if (!e.target.closest('.language-switcher')) {
                this.close();
            }
        });
        
        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
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
        const currentSpan = this.element.querySelector('.lang-current');
        if (currentSpan) {
            currentSpan.textContent = i18n.t(`language_${currentLang}`);
        }
        
        // Update active option
        this.element.querySelectorAll('.lang-option').forEach(option => {
            const lang = option.getAttribute('data-lang-switch');
            option.classList.toggle('active', lang === currentLang);
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

// CSS styles for the language switcher
const styles = `
.language-switcher {
    position: relative;
    display: inline-block;
    margin-left: var(--spacing-md);
    z-index: 1000;
}

.lang-switcher-container {
    position: relative;
}

.lang-switcher-toggle {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.875rem;
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: var(--radius-full, 50px);
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-primary, #1f2937);
    transition: all 0.2s ease;
    backdrop-filter: blur(8px);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.lang-switcher-toggle:hover {
    background: rgba(99, 102, 241, 0.05);
    border-color: var(--primary-color, #6366f1);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
}

.lang-current {
    font-weight: 500;
    letter-spacing: -0.01em;
}

.lang-arrow {
    transition: transform 0.2s ease;
    opacity: 0.7;
}

.lang-dropdown.open ~ .lang-switcher-toggle .lang-arrow,
.lang-switcher-toggle:hover .lang-arrow {
    transform: rotate(180deg);
    opacity: 1;
}

.lang-dropdown {
    position: absolute;
    top: calc(100% + 0.25rem);
    left: 0;
    right: 0;
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: var(--radius-lg, 12px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.05);
    opacity: 0;
    visibility: hidden;
    transform: translateY(-8px) scale(0.95);
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    z-index: 1001;
    min-width: 120px;
}

.lang-dropdown.open {
    opacity: 1;
    visibility: visible;
    transform: translateY(0) scale(1);
}

.lang-options {
    padding: 0.375rem;
}

.lang-option {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 0.5rem 0.75rem;
    background: none;
    border: none;
    border-radius: var(--radius-md, 8px);
    text-align: left;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-primary, #1f2937);
    transition: all 0.15s ease;
    position: relative;
    overflow: hidden;
}

.lang-option:hover {
    background: rgba(99, 102, 241, 0.08);
    color: var(--primary-color, #6366f1);
    transform: translateX(2px);
}

.lang-option.active {
    background: var(--primary-color, #6366f1);
    color: white;
}

.lang-option.active:hover {
    background: var(--primary-dark, #4f46e5);
}

.lang-option.active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 0 2px 2px 0;
}

/* Responsive adjustments */
@media (max-width: 1024px) {
    .language-switcher {
        margin-left: var(--spacing-sm);
    }
    
    .lang-switcher-toggle {
        padding: 0.375rem 0.75rem;
        font-size: 0.8rem;
    }
}

@media (max-width: 768px) {
    .language-switcher {
        margin-left: 0;
        margin-right: var(--spacing-sm);
    }
    
    .lang-switcher-toggle {
        padding: 0.375rem 0.625rem;
        font-size: 0.75rem;
    }
    
    .lang-dropdown {
        min-width: 110px;
        right: 0;
        left: auto;
    }
}

@media (max-width: 480px) {
    .lang-switcher-toggle .lang-current {
        display: none;
    }
    
    .lang-switcher-toggle::before {
        content: 'Lang';
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