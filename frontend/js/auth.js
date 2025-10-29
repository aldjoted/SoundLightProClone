// js/auth.js

function showValidationMessage(element, message, type = 'error') {
    element.textContent = message;
    element.className = `form-text ${type}`;
}

function updatePasswordStrength(password) {
    const strengthMeter = document.querySelector('.strength-bar');
    const helpText = document.getElementById('password-help');
    let score = 0;
    if (password.length > 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    strengthMeter.style.width = `${(score / 4) * 100}%`;
    switch (score) {
        case 0:
        case 1:
            strengthMeter.style.backgroundColor = 'var(--danger-color)';
            showValidationMessage(helpText, 'Password is too weak.', 'error');
            break;
        case 2:
            strengthMeter.style.backgroundColor = 'var(--warning-color)';
            showValidationMessage(helpText, 'Password is okay.', 'warning');
            break;
        case 3:
        case 4:
            strengthMeter.style.backgroundColor = 'var(--success-color)';
            showValidationMessage(helpText, 'Password is strong.', 'success');
            break;
    }
}

function validatePasswordsMatch(password, confirmPassword) {
    const helpText = document.getElementById('password-match-help');
    if (confirmPassword.length === 0) {
        helpText.textContent = '';
        return false;
    }
    if (password === confirmPassword) {
        showValidationMessage(helpText, 'Passwords match.', 'success');
        return true;
    } else {
        showValidationMessage(helpText, 'Passwords do not match.', 'error');
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