// login.js
import { initiateLogin } from './apiService.js';
import * as ui from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('#login-form');
    if (!form) {
        return;
    }

    const formMessage = document.getElementById('form-message');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonContent = submitButton ? submitButton.textContent : '';
        let redirectScheduled = false;

        if (formMessage) {
            formMessage.textContent = '';
            formMessage.className = 'hidden';
        }

        const formData = new FormData(form);
        const identifier = (formData.get('identifier') || formData.get('username') || '').toString().trim();
        const password = (formData.get('password') || '').toString();

        if (!identifier || !password) {
            if (formMessage) {
                formMessage.textContent = 'Please enter both username/email and password.';
                formMessage.className = 'alert alert-error';
            }
            ui.showToast('Please enter both username/email and password.', 'error');
            return;
        }

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = '';
            const spinner = document.createElement('i');
            spinner.className = 'fas fa-spinner fa-spin';
            submitButton.appendChild(spinner);
            submitButton.appendChild(document.createTextNode(' Logging in...'));
        }

        try {
            const response = await initiateLogin(identifier, password);

            if (response?.requires_verification) {
                const emailForVerification = response.email || identifier;
                sessionStorage.setItem('slp_verification_email', emailForVerification);

                ui.showToast('Verification code sent to your email.', 'success');

                if (submitButton) {
                    submitButton.textContent = '';
                    const check = document.createElement('i');
                    check.className = 'fas fa-check';
                    submitButton.appendChild(check);
                    submitButton.appendChild(document.createTextNode(' Redirecting...'));
                }

                redirectScheduled = true;
                setTimeout(() => {
                    window.location.href = 'verify-login.html';
                }, 600);
                return;
            }

            throw new Error('Login failed: Unexpected response from server.');
        } catch (error) {
            console.error('Login error:', error);
            const message = error instanceof Error && error.message
                ? error.message
                : 'An unknown error occurred. Please try again.';

            if (formMessage) {
                formMessage.textContent = message;
                formMessage.className = 'alert alert-error';
            }

            ui.showToast('Login failed. Please check your credentials.', 'error');
        } finally {
            if (submitButton && !redirectScheduled) {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonContent;
            }
        }
    });
});


