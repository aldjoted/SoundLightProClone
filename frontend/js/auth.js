// js/auth.js

import { Validators } from './validators.js';
import { getStoredUserProfile, clearStoredUserProfile, ensureAccessToken, getUserProfile } from './apiService.js';

const ACCESS_TOKEN_STORAGE_KEY = 'slp_access_token';

function showValidationMessage(element, message, type = 'error') {
    element.textContent = message;
    element.className = `form-text ${type}`;
}

function updatePasswordStrength(password, strengthBar, helpText) {
    if (!strengthBar || !helpText) {
        return;
    }

    // ✅ USE CENTRALIZED VALIDATOR
    const result = Validators.password(password);
    const score = result.score || 0;

    strengthBar.style.width = `${(score / 5) * 100}%`;

    if (result.valid) {
        strengthBar.style.backgroundColor = 'var(--success-color)';
        showValidationMessage(helpText, '✓ Password is strong', 'success');
    } else if (score >= 2) {
        strengthBar.style.backgroundColor = 'var(--warning-color)';
        showValidationMessage(helpText, '⚠ Password is okay', 'warning');
    } else {
        strengthBar.style.backgroundColor = 'var(--danger-color)';
        showValidationMessage(helpText, result.message || 'Password is too weak', 'error');
    }
}

function validatePasswordsMatch(password, confirmPassword, helpText) {
    if (!helpText) {
        return false;
    }

    if (!confirmPassword || confirmPassword.length === 0) {
        helpText.textContent = '';
        helpText.className = 'form-text';
        return false;
    }

    // ✅ USE CENTRALIZED VALIDATOR
    const result = Validators.match(password, confirmPassword, 'Passwords');

    if (result.valid) {
        showValidationMessage(helpText, '✓ Passwords match', 'success');
        return true;
    }

    showValidationMessage(helpText, result.message, 'error');
    return false;
}

export function initRegisterPageValidation() {
    const forms = document.querySelectorAll('form.auth-form[data-content]');
    if (!forms.length) {
        return;
    }

    forms.forEach((form) => {
        const passwordInput = form.querySelector('input[name="password"]');
        const confirmPasswordInput = form.querySelector('input[name="password2"]');
        const strengthBar = form.querySelector('.strength-bar');
        const passwordHelp = form.querySelector('[id^="password-help"]');
        const matchHelp = form.querySelector('[id^="password-match-help"]');

        if (passwordInput) {
            passwordInput.addEventListener('input', () => {
                updatePasswordStrength(passwordInput.value, strengthBar, passwordHelp);
                if (confirmPasswordInput) {
                    validatePasswordsMatch(passwordInput.value, confirmPasswordInput.value, matchHelp);
                }
            });
        }

        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', () => {
                validatePasswordsMatch(passwordInput ? passwordInput.value : '', confirmPasswordInput.value, matchHelp);
            });
        }
    });
    
    // La validation finale avant la soumission peut être ajoutée ici.
}

/**
 * Authenticate user on page load
 * Checks if user has a valid refresh token and attempts to get user profile
 * @returns {Promise<Object|null>} User profile object or null if not authenticated
 */
export async function authenticateUser() {
    try {
        // Ensure we have a valid access token (will attempt refresh using httpOnly cookie)
        const accessToken = await ensureAccessToken();
        if (!accessToken) {
            console.log('[Auth] No valid session found, user not logged in');
            return null;
        }

        // Fetch user profile (will refresh automatically if needed)
        const user = await getUserProfile();
        
        console.log('[Auth] User authenticated:', user.username);
        return user;
        
    } catch (error) {
        console.error('[Auth] Authentication failed:', error);
        
        // If authentication fails, clear tokens
        try {
            sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
        } catch (storageError) {
            console.warn('Failed to clear session access token during auth failure:', storageError);
        }
        localStorage.removeItem('refreshToken');
        clearStoredUserProfile();
        
        return null;
    }
}

export function getCachedUser() {
    return getStoredUserProfile();
}