// login.js
import * as apiService from './apiService.js';
import * as ui from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('#login-form');
    if (!form) return;

    const formMessage = document.getElementById('form-message');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        // Clear previous messages
        if (formMessage) {
            formMessage.className = 'hidden';
            formMessage.textContent = '';
        }
        
        // Set loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        
        try {
            const identifier = form.username.value.trim();
            const password = form.password.value;
            
            // Login (backend always returns both tokens)
            const response = await apiService.loginUser(identifier, password, false);
            
            submitBtn.innerHTML = '<i class="fas fa-check"></i> Success!';
            ui.showToast('Login successful!', 'success');
            
            // Small delay to show success message before redirect
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 500);
            
        } catch (error) {
            console.error('Login error:', error);
            
            // Display error message
            if (formMessage) {
                formMessage.textContent = error.message || 'Login failed. Please check your credentials.';
                formMessage.className = 'alert alert-error';
            }
            
            // Show error toast
            ui.showToast('Login failed. Please check your credentials.', 'error');
            
            // Reset button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
});