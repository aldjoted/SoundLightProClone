/**
 * install-prompt.js
 * 
 * Manages the "Add to Home Screen" install prompt for the PWA.
 * 
 * Features:
 * - Detects if app is installable
 * - Shows install prompt (only once per session or until dismissed permanently)
 * - Tracks installation status in localStorage
 * - Provides install button for header/footer
 * 
 * @version 1.0.0
 */

/**
 * InstallPrompt class manages PWA installation prompts
 */
class InstallPrompt {
    constructor() {
        this.deferredPrompt = null;
        this.installButton = null;
        this.promptBanner = null;
        this.isInstalled = false;
        this.isDismissed = false;

        // Storage keys
        this.STORAGE_KEY = 'pwa-install-dismissed';
        this.INSTALLED_KEY = 'pwa-installed';

        // Bind event handlers
        this.handleBeforeInstallPrompt = this.handleBeforeInstallPrompt.bind(this);
        this.handleAppInstalled = this.handleAppInstalled.bind(this);
        this.handleInstallClick = this.handleInstallClick.bind(this);
        this.handleDismissClick = this.handleDismissClick.bind(this);

        this.init();
    }

    /**
     * Initialize the install prompt
     */
    init() {
        console.log('[InstallPrompt] Initializing...');

        // Check if already installed
        this.checkInstallationStatus();

        // Check if user dismissed the prompt
        this.isDismissed = localStorage.getItem(this.STORAGE_KEY) === 'true';

        if (this.isInstalled) {
            console.log('[InstallPrompt] App is already installed');
            return;
        }

        // Listen for the beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', this.handleBeforeInstallPrompt);

        // Listen for the app installed event
        window.addEventListener('appinstalled', this.handleAppInstalled);

        // Create install button in header/footer
        this.createInstallButton();

        console.log('[InstallPrompt] Initialized');
    }

    /**
     * Check if app is already installed
     */
    checkInstallationStatus() {
        // Check if running as PWA
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone === true ||
            document.referrer.includes('android-app://');

        if (isStandalone) {
            this.isInstalled = true;
            localStorage.setItem(this.INSTALLED_KEY, 'true');
            return;
        }

        // Check localStorage
        this.isInstalled = localStorage.getItem(this.INSTALLED_KEY) === 'true';
    }

    /**
     * Handle beforeinstallprompt event
     */
    handleBeforeInstallPrompt(event) {
        console.log('[InstallPrompt] Install prompt available');

        // Prevent the default browser install prompt
        event.preventDefault();

        // Store the event for later use
        this.deferredPrompt = event;

        // Show our custom install UI
        this.showInstallUI();
    }

    /**
     * Handle appinstalled event - called when the app is successfully installed
     */
    handleAppInstalled() {
        console.log('[InstallPrompt] App was installed');

        // Update installation status
        this.isInstalled = true;
        localStorage.setItem(this.INSTALLED_KEY, 'true');

        // Clear the deferred prompt
        this.deferredPrompt = null;

        // Hide install UI
        this.hideInstallUI();

        // Track installation
        this.trackInstallation('installed');
    }

    /**
     * Show custom install UI
     */
    showInstallUI() {
        // Don't show if user dismissed it or app is installed
        if (this.isDismissed || this.isInstalled) {
            console.log('[InstallPrompt] Not showing UI (dismissed or installed)');
            return;
        }

        // Show install button
        if (this.installButton) {
            this.installButton.style.display = 'block';
            this.installButton.classList.add('install-button--visible');
        }

        // Show install banner after a delay (3 seconds)
        setTimeout(() => {
            if (!this.isDismissed && !this.isInstalled) {
                this.showInstallBanner();
            }
        }, 3000);
    }

    /**
     * Create install button in header
     */
    createInstallButton() {
        // Check if button already exists
        if (document.getElementById('install-app-button')) {
            this.installButton = document.getElementById('install-app-button');
            return;
        }

        this.installButton = document.createElement('button');
        this.installButton.id = 'install-app-button';
        this.installButton.className = 'install-button';
        this.installButton.setAttribute('aria-label', 'Install SoundLightPro app');
        this.installButton.style.display = 'none'; // Hidden by default

        const icon = document.createElement('i');
        icon.className = 'fas fa-download';

        const span = document.createElement('span');
        span.className = 'install-button__text';
        span.textContent = 'Install App';

        this.installButton.appendChild(icon);
        this.installButton.appendChild(span);

        this.installButton.addEventListener('click', this.handleInstallClick);

        // Add to header actions
        const header = document.querySelector('.main-header');
        if (header) {
            const headerActions = header.querySelector('.header-actions');
            if (headerActions) {
                // Insert before user actions
                const userActions = headerActions.querySelector('.user-actions');
                if (userActions) {
                    headerActions.insertBefore(this.installButton, userActions);
                } else {
                    headerActions.appendChild(this.installButton);
                }
            }
        } else {
            console.warn('[InstallPrompt] Header not found for install button');
        }
    }

    /**
     * Show install banner
     */
    showInstallBanner() {
        // Check if banner already exists
        if (document.getElementById('install-banner')) {
            this.promptBanner = document.getElementById('install-banner');
            this.promptBanner.classList.add('install-banner--visible');
            return;
        }

        this.promptBanner = document.createElement('div');
        this.promptBanner.id = 'install-banner';
        this.promptBanner.className = 'install-banner';
        this.promptBanner.setAttribute('role', 'dialog');
        this.promptBanner.setAttribute('aria-labelledby', 'install-banner-title');
        this.promptBanner.setAttribute('aria-describedby', 'install-banner-description');

        const content = document.createElement('div');
        content.className = 'install-banner__content';

        const iconDiv = document.createElement('div');
        iconDiv.className = 'install-banner__icon';
        const icon = document.createElement('i');
        icon.className = 'fas fa-mobile-alt';
        iconDiv.appendChild(icon);

        const textDiv = document.createElement('div');
        textDiv.className = 'install-banner__text';

        const h3 = document.createElement('h3');
        h3.id = 'install-banner-title';
        h3.className = 'install-banner__title';
        h3.textContent = 'Install SoundLightPro';

        const p = document.createElement('p');
        p.id = 'install-banner-description';
        p.className = 'install-banner__description';
        p.textContent = 'Get faster access and work offline. Install our app for the best experience.';

        textDiv.appendChild(h3);
        textDiv.appendChild(p);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'install-banner__actions';

        const installBtn = document.createElement('button');
        installBtn.className = 'install-banner__install-btn btn btn--primary';
        installBtn.setAttribute('aria-label', 'Install app');
        const installIcon = document.createElement('i');
        installIcon.className = 'fas fa-download';
        installBtn.appendChild(installIcon);
        installBtn.appendChild(document.createTextNode(' Install'));

        const dismissBtn = document.createElement('button');
        dismissBtn.className = 'install-banner__dismiss-btn btn btn--secondary';
        dismissBtn.setAttribute('aria-label', 'Dismiss install prompt');
        const dismissIcon = document.createElement('i');
        dismissIcon.className = 'fas fa-times';
        dismissBtn.appendChild(dismissIcon);
        dismissBtn.appendChild(document.createTextNode(' Not Now'));

        actionsDiv.appendChild(installBtn);
        actionsDiv.appendChild(dismissBtn);

        content.appendChild(iconDiv);
        content.appendChild(textDiv);
        content.appendChild(actionsDiv);

        this.promptBanner.appendChild(content);

        // Add event listeners
        installBtn.addEventListener('click', this.handleInstallClick);
        dismissBtn.addEventListener('click', this.handleDismissClick);

        // Add to page
        document.body.appendChild(this.promptBanner);

        // Trigger animation after a brief delay
        setTimeout(() => {
            this.promptBanner.classList.add('install-banner--visible');
        }, 100);

        console.log('[InstallPrompt] Banner shown');
    }

    /**
     * Handle install button click
     */
    async handleInstallClick() {
        console.log('[InstallPrompt] Install clicked');

        if (!this.deferredPrompt) {
            console.warn('[InstallPrompt] No deferred prompt available');

            // Show informational message
            this.showInstallInstructions();
            return;
        }

        // Hide our custom UI
        this.hideInstallUI();

        // Show the browser's install prompt
        this.deferredPrompt.prompt();

        // Wait for the user to respond
        const { outcome } = await this.deferredPrompt.userChoice;
        console.log('[InstallPrompt] User choice:', outcome);

        if (outcome === 'accepted') {
            console.log('[InstallPrompt] User accepted the install');

            // Track installation
            this.trackInstallation('accepted');
        } else {
            console.log('[InstallPrompt] User dismissed the install');

            // Track dismissal
            this.trackInstallation('dismissed');

            // Mark as dismissed so we don't show it again this session
            this.isDismissed = true;
            localStorage.setItem(this.STORAGE_KEY, 'true');
        }

        // Clear the deferred prompt
        this.deferredPrompt = null;
    }

    /**
     * Handle dismiss button click
     */
    handleDismissClick() {
        console.log('[InstallPrompt] Dismissed by user');

        // Hide the banner
        this.hideInstallUI();

        // Mark as dismissed
        this.isDismissed = true;
        localStorage.setItem(this.STORAGE_KEY, 'true');

        // Track dismissal
        this.trackInstallation('dismissed');
    }

    /**
     * Hide install UI
     */
    hideInstallUI() {
        // Hide banner
        if (this.promptBanner) {
            this.promptBanner.classList.remove('install-banner--visible');
            setTimeout(() => {
                if (this.promptBanner && this.promptBanner.parentNode) {
                    this.promptBanner.parentNode.removeChild(this.promptBanner);
                    this.promptBanner = null;
                }
            }, 300);
        }

        // Hide button
        if (this.installButton) {
            this.installButton.classList.remove('install-button--visible');
            setTimeout(() => {
                if (this.installButton) {
                    this.installButton.style.display = 'none';
                }
            }, 300);
        }
    }

    /**
     * Show manual install instructions (for iOS or when prompt not available)
     */
    showInstallInstructions() {
        // Create instructions modal for iOS/unsupported browsers
        const modal = document.createElement('div');
        modal.className = 'install-instructions-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');

        const content = document.createElement('div');
        content.className = 'install-instructions-content';

        const h3 = document.createElement('h3');
        h3.textContent = 'Install SoundLightPro';

        const p = document.createElement('p');
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
            p.textContent = 'Tap the Share button in Safari, then tap "Add to Home Screen".';
        } else {
            p.textContent = 'Use your browser menu to install this app.';
        }

        const closeBtn = document.createElement('button');
        closeBtn.className = 'btn btn--primary';
        closeBtn.textContent = 'Got it';
        closeBtn.addEventListener('click', () => {
            modal.remove();
        });

        content.appendChild(h3);
        content.appendChild(p);
        content.appendChild(closeBtn);
        modal.appendChild(content);
        document.body.appendChild(modal);

        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 10000);
    }

    /**
     * Track installation events (for analytics)
     */
    trackInstallation(action) {
        console.log('[InstallPrompt] Tracking:', action);

        // Send to analytics if available
        if (window.gtag) {
            window.gtag('event', 'pwa_install', {
                event_category: 'PWA',
                event_label: action,
                value: action === 'installed' ? 1 : 0
            });
        }

        // Send custom event
        window.dispatchEvent(new CustomEvent('pwa-install-event', {
            detail: { action }
        }));
    }

    /**
     * Check if app can be installed
     * @returns {boolean}
     */
    canInstall() {
        return this.deferredPrompt !== null && !this.isInstalled;
    }

    /**
     * Get installation status
     * @returns {Object}
     */
    getStatus() {
        return {
            isInstalled: this.isInstalled,
            isDismissed: this.isDismissed,
            canInstall: this.canInstall(),
            hasPrompt: this.deferredPrompt !== null
        };
    }

    /**
     * Manually trigger install prompt
     * Useful for custom install buttons
     */
    triggerInstall() {
        if (this.canInstall()) {
            this.handleInstallClick();
        } else {
            this.showInstallInstructions();
        }
    }

    /**
     * Reset dismissal (for testing or user preference)
     */
    resetDismissal() {
        console.log('[InstallPrompt] Resetting dismissal state');
        localStorage.removeItem(this.STORAGE_KEY);
        this.isDismissed = false;

        // Show UI if we have a prompt
        if (this.deferredPrompt) {
            this.showInstallUI();
        }
    }

    /**
     * Destroy install prompt (cleanup)
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('beforeinstallprompt', this.handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', this.handleAppInstalled);

        // Remove UI elements
        if (this.installButton && this.installButton.parentNode) {
            this.installButton.parentNode.removeChild(this.installButton);
        }

        if (this.promptBanner && this.promptBanner.parentNode) {
            this.promptBanner.parentNode.removeChild(this.promptBanner);
        }

        this.deferredPrompt = null;

        console.log('[InstallPrompt] Destroyed');
    }
}

// Export singleton instance
let installPromptInstance = null;

/**
 * Initialize install prompt
 * @returns {InstallPrompt}
 */
export function initInstallPrompt() {
    if (!installPromptInstance) {
        installPromptInstance = new InstallPrompt();
    }
    return installPromptInstance;
}

/**
 * Get install prompt instance
 * @returns {InstallPrompt|null}
 */
export function getInstallPrompt() {
    return installPromptInstance;
}

export default InstallPrompt;
