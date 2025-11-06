/**
 * validators.js
 * 
 * Centralized validation utilities for consistent input validation across the application.
 * ✅ IMPROVEMENT: Eliminates code duplication and provides consistent error messages
 */

/**
 * Validators class containing all validation methods
 */
export class Validators {
    /**
     * Validates an email address with enhanced checks
     * @param {string} value - The email to validate
     * @returns {{valid: boolean, message?: string, score?: number}} Validation result
     */
    static email(value) {
        if (!value || typeof value !== 'string') {
            return { valid: false, message: 'Email is required' };
        }

        // RFC 5322 compliant regex (simplified but robust)
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        
        if (!emailRegex.test(value)) {
            return { valid: false, message: 'Invalid email format' };
        }
        
        // Check email length constraints
        const [localPart, domain] = value.split('@');
        if (localPart.length > 64) {
            return { valid: false, message: 'Email local part too long (max 64 chars)' };
        }
        if (domain.length > 255) {
            return { valid: false, message: 'Email domain too long (max 255 chars)' };
        }
        
        // Block known disposable email domains
        const disposableDomains = [
            'tempmail.com', '10minutemail.com', 'guerrillamail.com', 
            'mailinator.com', 'throwaway.email', 'temp-mail.org'
        ];
        const domainLower = domain.toLowerCase();
        if (disposableDomains.includes(domainLower)) {
            return { valid: false, message: 'Disposable email addresses are not allowed' };
        }
        
        return { valid: true };
    }

    /**
     * Validates password strength with detailed feedback
     * @param {string} value - The password to validate
     * @returns {{valid: boolean, message?: string, score: number, strength: string}} Validation result with score
     */
    static password(value) {
        if (!value || typeof value !== 'string') {
            return { valid: false, message: 'Password is required', score: 0, strength: 'none' };
        }

        const checks = {
            length: value.length >= 8,
            uppercase: /[A-Z]/.test(value),
            lowercase: /[a-z]/.test(value),
            number: /[0-9]/.test(value),
            special: /[^A-Za-z0-9]/.test(value)
        };
        
        // Calculate strength score (0-5)
        const score = Object.values(checks).filter(Boolean).length;
        
        // Determine strength level
        let strength = 'weak';
        if (score >= 4) strength = 'strong';
        else if (score >= 3) strength = 'medium';
        
        // Check for common passwords (basic check)
        const commonPasswords = ['password', '12345678', 'qwerty', 'admin', 'letmein'];
        if (commonPasswords.some(p => value.toLowerCase().includes(p))) {
            return {
                valid: false,
                message: 'Password is too common',
                score: 0,
                strength: 'weak'
            };
        }
        
        // Minimum requirements: at least 8 chars and 3 types of characters
        if (score < 3) {
            const missing = [];
            if (!checks.length) missing.push('at least 8 characters');
            if (!checks.uppercase) missing.push('uppercase letter');
            if (!checks.lowercase) missing.push('lowercase letter');
            if (!checks.number) missing.push('number');
            if (!checks.special) missing.push('special character');
            
            return {
                valid: false,
                message: `Password must contain: ${missing.slice(0, 3).join(', ')}`,
                score,
                strength
            };
        }
        
        return { valid: true, score, strength };
    }

    /**
     * Validates username format
     * @param {string} value - The username to validate
     * @returns {{valid: boolean, message?: string}} Validation result
     */
    static username(value) {
        if (!value || typeof value !== 'string') {
            return { valid: false, message: 'Username is required' };
        }

        const trimmed = value.trim();
        
        if (trimmed.length < 3) {
            return { valid: false, message: 'Username must be at least 3 characters' };
        }
        
        if (trimmed.length > 30) {
            return { valid: false, message: 'Username must be less than 30 characters' };
        }
        
        // Allow letters, numbers, underscore, and hyphen
        if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
            return {
                valid: false,
                message: 'Username can only contain letters, numbers, underscore, and hyphen'
            };
        }
        
        // Must start with a letter
        if (!/^[a-zA-Z]/.test(trimmed)) {
            return { valid: false, message: 'Username must start with a letter' };
        }
        
        return { valid: true };
    }

    /**
     * Validates phone number (international format support)
     * @param {string} value - The phone number to validate
     * @returns {{valid: boolean, message?: string}} Validation result
     */
    static phone(value) {
        if (!value || typeof value !== 'string') {
            return { valid: false, message: 'Phone number is required' };
        }

        // Remove common formatting characters
        const cleaned = value.replace(/[\s\-().+]/g, '');
        
        // Check if it contains only digits (and optionally starts with +)
        if (!/^\+?\d{8,15}$/.test(cleaned)) {
            return {
                valid: false,
                message: 'Phone number must be 8-15 digits (with optional + prefix)'
            };
        }
        
        return { valid: true };
    }

    /**
     * Validates URL format
     * @param {string} value - The URL to validate
     * @param {Array<string>} allowedProtocols - Allowed protocols (default: http, https)
     * @returns {{valid: boolean, message?: string, url?: URL}} Validation result
     */
    static url(value, allowedProtocols = ['http:', 'https:']) {
        if (!value || typeof value !== 'string') {
            return { valid: false, message: 'URL is required' };
        }

        try {
            const urlObj = new URL(value);
            
            // Check protocol
            if (!allowedProtocols.includes(urlObj.protocol)) {
                return {
                    valid: false,
                    message: `URL must use one of: ${allowedProtocols.join(', ')}`
                };
            }
            
            // Block dangerous protocols
            const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
            if (dangerousProtocols.includes(urlObj.protocol)) {
                return { valid: false, message: 'URL protocol not allowed' };
            }
            
            return { valid: true, url: urlObj };
        } catch (error) {
            return { valid: false, message: 'Invalid URL format' };
        }
    }

    /**
     * Validates that two fields match (e.g., password confirmation)
     * @param {string} value1 - First value
     * @param {string} value2 - Second value
     * @param {string} fieldName - Name of the field for error message
     * @returns {{valid: boolean, message?: string}} Validation result
     */
    static match(value1, value2, fieldName = 'Values') {
        if (value1 !== value2) {
            return { valid: false, message: `${fieldName} do not match` };
        }
        return { valid: true };
    }

    /**
     * Validates required field
     * @param {any} value - The value to check
     * @param {string} fieldName - Name of the field for error message
     * @returns {{valid: boolean, message?: string}} Validation result
     */
    static required(value, fieldName = 'This field') {
        if (value === null || value === undefined || value === '') {
            return { valid: false, message: `${fieldName} is required` };
        }
        
        if (typeof value === 'string' && value.trim() === '') {
            return { valid: false, message: `${fieldName} cannot be empty` };
        }
        
        return { valid: true };
    }

    /**
     * Validates minimum length
     * @param {string} value - The value to check
     * @param {number} min - Minimum length
     * @param {string} fieldName - Name of the field for error message
     * @returns {{valid: boolean, message?: string}} Validation result
     */
    static minLength(value, min, fieldName = 'This field') {
        if (!value || value.length < min) {
            return {
                valid: false,
                message: `${fieldName} must be at least ${min} characters`
            };
        }
        return { valid: true };
    }

    /**
     * Validates maximum length
     * @param {string} value - The value to check
     * @param {number} max - Maximum length
     * @param {string} fieldName - Name of the field for error message
     * @returns {{valid: boolean, message?: string}} Validation result
     */
    static maxLength(value, max, fieldName = 'This field') {
        if (value && value.length > max) {
            return {
                valid: false,
                message: `${fieldName} must be less than ${max} characters`
            };
        }
        return { valid: true };
    }

    /**
     * Validates numeric range
     * @param {number} value - The value to check
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @param {string} fieldName - Name of the field for error message
     * @returns {{valid: boolean, message?: string}} Validation result
     */
    static range(value, min, max, fieldName = 'This field') {
        const num = Number(value);
        if (isNaN(num)) {
            return { valid: false, message: `${fieldName} must be a number` };
        }
        if (num < min || num > max) {
            return {
                valid: false,
                message: `${fieldName} must be between ${min} and ${max}`
            };
        }
        return { valid: true };
    }
}

/**
 * Form validator helper that validates multiple fields
 */
export class FormValidator {
    constructor(formElement) {
        this.form = formElement;
        this.errors = {};
    }

    /**
     * Validates a single field
     * @param {string} fieldName - Name of the field
     * @param {Array<Function>} validators - Array of validator functions
     * @returns {boolean} Whether the field is valid
     */
    validateField(fieldName, validators) {
        const field = this.form.elements[fieldName];
        if (!field) return false;

        const value = field.value;
        
        for (const validator of validators) {
            const result = validator(value);
            if (!result.valid) {
                this.errors[fieldName] = result.message;
                this.showFieldError(field, result.message);
                return false;
            }
        }
        
        this.clearFieldError(field);
        delete this.errors[fieldName];
        return true;
    }

    /**
     * Shows error message for a field
     * @param {HTMLElement} field - The form field element
     * @param {string} message - Error message to display
     */
    showFieldError(field, message) {
        const errorElement = field.parentElement.querySelector('.field-error') ||
                           document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.textContent = message;
        errorElement.setAttribute('role', 'alert');
        
        if (!field.parentElement.contains(errorElement)) {
            field.parentElement.appendChild(errorElement);
        }
        
        field.setAttribute('aria-invalid', 'true');
        field.setAttribute('aria-describedby', errorElement.id || 'error-' + field.name);
    }

    /**
     * Clears error message for a field
     * @param {HTMLElement} field - The form field element
     */
    clearFieldError(field) {
        const errorElement = field.parentElement.querySelector('.field-error');
        if (errorElement) {
            errorElement.remove();
        }
        field.removeAttribute('aria-invalid');
        field.removeAttribute('aria-describedby');
    }

    /**
     * Validates entire form
     * @param {Object} rules - Validation rules object {fieldName: [validators]}
     * @returns {boolean} Whether the form is valid
     */
    validateForm(rules) {
        this.errors = {};
        let isValid = true;

        for (const [fieldName, validators] of Object.entries(rules)) {
            if (!this.validateField(fieldName, validators)) {
                isValid = false;
            }
        }

        return isValid;
    }

    /**
     * Gets all validation errors
     * @returns {Object} Object of field names to error messages
     */
    getErrors() {
        return { ...this.errors };
    }

    /**
     * Clears all errors
     */
    clearErrors() {
        Object.keys(this.errors).forEach(fieldName => {
            const field = this.form.elements[fieldName];
            if (field) {
                this.clearFieldError(field);
            }
        });
        this.errors = {};
    }
}

export default Validators;
