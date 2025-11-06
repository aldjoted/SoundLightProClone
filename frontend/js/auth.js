// js/auth.js

import { Validators } from './validators.js';

function showValidationMessage(element, message, type = 'error') {
    element.textContent = message;
    element.className = `form-text ${type}`;
}

function updatePasswordStrength(password) {
    const strengthMeter = document.querySelector('.strength-bar');
    const helpText = document.getElementById('password-help') || 
                    document.getElementById('password-help-ind');
    if (!strengthMeter || !helpText) return;
    
    // ✅ USE CENTRALIZED VALIDATOR
    const result = Validators.password(password);
    const score = result.score || 0;
    
    strengthMeter.style.width = `${(score / 5) * 100}%`;
    
    if (result.valid) {
        strengthMeter.style.backgroundColor = 'var(--success-color)';
        showValidationMessage(helpText, '✓ Password is strong', 'success');
    } else if (score >= 2) {
        strengthMeter.style.backgroundColor = 'var(--warning-color)';
        showValidationMessage(helpText, '⚠ Password is okay', 'warning');
    } else {
        strengthMeter.style.backgroundColor = 'var(--danger-color)';
        showValidationMessage(helpText, result.message || 'Password is too weak', 'error');
    }
}

function validatePasswordsMatch(password, confirmPassword) {
    const helpText = document.getElementById('password-match-help') || 
                    document.getElementById('password-match-help-ind');
    if (!helpText) return false;
    
    if (confirmPassword.length === 0) {
        helpText.textContent = '';
        return false;
    }
    
    // ✅ USE CENTRALIZED VALIDATOR
    const result = Validators.match(password, confirmPassword, 'Passwords');
    
    if (result.valid) {
        showValidationMessage(helpText, '✓ Passwords match', 'success');
        return true;
    } else {
        showValidationMessage(helpText, result.message, 'error');
        return false;
    }
}

export function initRegisterPageValidation() {
    const form = document.getElementById('register-form');
    if (!form) return;

    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('password2');

    passwordInput.addEventListener('input', () => {
        updatePasswordStrength(passwordInput.value);
        validatePasswordsMatch(passwordInput.value, confirmPasswordInput.value);
    });

    confirmPasswordInput.addEventListener('input', () => {
        validatePasswordsMatch(passwordInput.value, confirmPasswordInput.value);
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
        // Check if we have a refresh token
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (!refreshToken) {
            console.log('[Auth] No refresh token found, user not logged in');
            return null;
        }
        
        // Try to get user profile (this will automatically refresh access token if needed)
        const { getUserProfile } = await import('./apiService.js');
        const user = await getUserProfile();
        
        console.log('[Auth] User authenticated:', user.username);
        return user;
        
    } catch (error) {
        console.error('[Auth] Authentication failed:', error);
        
        // If authentication fails, clear tokens
        localStorage.removeItem('refreshToken');
        
        return null;
    }
}