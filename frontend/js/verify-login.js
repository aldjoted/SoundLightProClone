import * as apiService from './apiService.js';
import { showToast } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    // Get email from session storage
    const email = sessionStorage.getItem('slp_verification_email') || sessionStorage.getItem('verification_email');

    if (!email) {
        // Redirect to login if no email found
        showToast('Please login first', 'error');
        window.location.href = 'login.html';
        return;
    }

    // Display email
    const emailDisplay = document.getElementById('email-display');
    if (emailDisplay) {
        emailDisplay.textContent = email;
    }

    // Get all code inputs
    const codeInputs = [
        document.getElementById('code-1'),
        document.getElementById('code-2'),
        document.getElementById('code-3'),
        document.getElementById('code-4'),
        document.getElementById('code-5'),
        document.getElementById('code-6')
    ];

    // Focus first input on load
    if (codeInputs[0]) {
        codeInputs[0].focus();
    }

    // Handle input navigation
    codeInputs.forEach((input, index) => {
        if (!input) return;

        input.addEventListener('input', (e) => {
            // Only allow numbers
            e.target.value = e.target.value.replace(/[^0-9]/g, '');

            // Move to next input if current is filled
            if (e.target.value && index < codeInputs.length - 1) {
                codeInputs[index + 1].focus();
            }
        });

        input.addEventListener('keydown', (e) => {
            // Move to previous input on backspace if current is empty
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                codeInputs[index - 1].focus();
            }
        });

        // Handle paste event
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');

            // Fill inputs with pasted data
            for (let i = 0; i < Math.min(pastedData.length, 6); i++) {
                if (codeInputs[i]) {
                    codeInputs[i].value = pastedData[i];
                }
            }

            // Focus last filled input or last input
            const lastIndex = Math.min(pastedData.length, 6) - 1;
            if (codeInputs[lastIndex]) {
                codeInputs[lastIndex].focus();
            }
        });
    });

    // Form submission
    const form = document.getElementById('verification-form');
    const formMessage = document.getElementById('form-message');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Get verification code
            const code = codeInputs.map(input => input ? input.value : '').join('');

            if (code.length !== 6) {
                if (formMessage) {
                    formMessage.textContent = 'Please enter all 6 digits';
                    formMessage.className = 'alert alert-error';
                }
                return;
            }

            // Get submit button
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn ? submitBtn.textContent : 'Verify Code';

            // Clear previous messages
            if (formMessage) {
                formMessage.className = 'hidden';
                formMessage.textContent = '';
            }

            // Set loading state
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = '';
                const spinner = document.createElement('i');
                spinner.className = 'fas fa-spinner fa-spin';
                submitBtn.appendChild(spinner);
                submitBtn.appendChild(document.createTextNode(' Verifying...'));
            }

            try {
                await apiService.verifyLoginCode(email, code);

                // Success!
                showToast('Login successful!', 'success');
                if (submitBtn) {
                    submitBtn.textContent = '';
                    const check = document.createElement('i');
                    check.className = 'fas fa-check';
                    submitBtn.appendChild(check);
                    submitBtn.appendChild(document.createTextNode(' Success! Redirecting...'));
                }

                // Clear session storage
                sessionStorage.removeItem('slp_verification_email');
                sessionStorage.removeItem('verification_email');

                // Redirect to dashboard or home
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);

            } catch (err) {
                // Check if account is locked
                if (err.status === 423 || err.response?.locked) {
                    if (formMessage) {
                        formMessage.textContent = err.message || 'Account is temporarily locked. Please try again later.';
                        formMessage.className = 'alert alert-error';
                    }

                    // Disable form for locked duration
                    if (submitBtn) {
                        submitBtn.disabled = true;
                        const retryAfter = err.response?.retry_after || 900;
                        setTimeout(() => {
                            submitBtn.disabled = false;
                            submitBtn.textContent = originalText;
                        }, retryAfter * 1000);
                    }
                } else {
                    // Display error with attempts remaining if provided
                    let errorMsg = err.message || 'Verification failed. Please try again.';
                    if (formMessage) {
                        formMessage.textContent = errorMsg;
                        formMessage.className = 'alert alert-error';
                    }

                    // Restore button
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText;
                    }
                }

                showToast('Verification failed', 'error');

                // Clear inputs
                codeInputs.forEach(input => {
                    if (input) input.value = '';
                });
                if (codeInputs[0]) {
                    codeInputs[0].focus();
                }
            }
        });
    }

    // Resend timer
    let timeLeft = 60;
    const resendBtn = document.getElementById('resend-btn');

    function startResendTimer() {
        if (!resendBtn) return;

        timeLeft = 60;
        resendBtn.disabled = true;

        // Clear existing content
        resendBtn.textContent = '';
        resendBtn.appendChild(document.createTextNode('Resend ('));
        const timerSpan = document.createElement('span');
        timerSpan.className = 'timer';
        timerSpan.textContent = timeLeft;
        resendBtn.appendChild(timerSpan);
        resendBtn.appendChild(document.createTextNode('s)'));

        const countdown = setInterval(() => {
            timeLeft--;
            const timerSpan = resendBtn.querySelector('.timer');
            if (timerSpan) timerSpan.textContent = timeLeft;

            if (timeLeft <= 0) {
                clearInterval(countdown);
                resendBtn.disabled = false;
                resendBtn.textContent = 'Resend Code';
            }
        }, 1000);
    }

    // Start initial timer
    startResendTimer();

    // Resend functionality
    if (resendBtn) {
        resendBtn.addEventListener('click', async () => {
            resendBtn.disabled = true;
            resendBtn.textContent = '';
            const spinner = document.createElement('i');
            spinner.className = 'fas fa-spinner fa-spin';
            resendBtn.appendChild(spinner);
            resendBtn.appendChild(document.createTextNode(' Sending...'));

            try {
                await apiService.resendVerificationCode(email);
                showToast('A new verification code has been sent to your email.', 'success');

                // Clear inputs for new code
                codeInputs.forEach(input => {
                    if (input) input.value = '';
                });
                if (codeInputs[0]) {
                    codeInputs[0].focus();
                }

                // Restart timer
                startResendTimer();
            } catch (err) {
                showToast(err.message || 'Failed to resend code. Please try again.', 'error');

                // Check if locked
                if (err.status === 423 || err.response?.locked) {
                    if (formMessage) {
                        formMessage.textContent = err.message || 'Account is temporarily locked.';
                        formMessage.className = 'alert alert-error';
                    }
                }

                // Re-enable button after error
                resendBtn.disabled = false;
                resendBtn.textContent = 'Resend Code';
            }
        });
    }
});
