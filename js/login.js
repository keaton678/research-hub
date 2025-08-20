document.addEventListener('DOMContentLoaded', function() {
    console.log('Login page DOM loaded, JavaScript is running!');
    
    const form = document.getElementById('loginForm');
    const submitBtn = document.getElementById('submitBtn');
    const alertMessage = document.getElementById('alertMessage');
    
    console.log('Login form element:', form);
    console.log('Login submit button:', submitBtn);

    // Show alert message
    function showAlert(message, type) {
        alertMessage.textContent = message;
        alertMessage.className = `alert ${type}`;
        alertMessage.style.display = 'block';
        
        setTimeout(() => {
            alertMessage.style.display = 'none';
        }, 5000);
    }

    // Field validation
    function validateField(field) {
        const value = field.value.trim();
        let isValid = true;

        field.classList.remove('error');

        switch (field.name) {
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                isValid = emailRegex.test(value);
                break;
            case 'password':
                isValid = value.length > 0;
                break;
        }

        if (!isValid && value !== '') {
            field.classList.add('error');
        }

        return isValid;
    }

    // Form validation
    function validateForm() {
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!validateField(field) || !field.value.trim()) {
                field.classList.add('error');
                isValid = false;
            }
        });

        return isValid;
    }

    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (!validateForm()) {
            showAlert('Please check your email and password', 'error');
            return;
        }

        // Show loading state
        submitBtn.innerHTML = '<span class="loading"></span>Signing In...';
        submitBtn.disabled = true;

        try {
            // Get form data
            const formData = {
                email: document.getElementById('email').value.trim(),
                password: document.getElementById('password').value,
                remember: document.getElementById('remember').checked
            };

            // Make API call to login endpoint
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                // Success - store token and redirect
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                showAlert('Successfully signed in! Redirecting...', 'success');
                
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            } else {
                // Handle API errors
                let errorMessage = 'Login failed. Please try again.';
                
                if (data.error) {
                    if (data.error === 'Invalid credentials') {
                        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
                    } else if (data.error === 'Email verification required') {
                        errorMessage = 'Please verify your email address before signing in. Check your inbox for the verification link.';
                    } else if (data.error === 'Account is deactivated') {
                        errorMessage = 'Your account has been deactivated. Please contact support.';
                    } else if (data.details && Array.isArray(data.details)) {
                        errorMessage = data.details.map(detail => detail.msg).join(', ');
                    } else {
                        errorMessage = data.error;
                    }
                }
                
                showAlert(errorMessage, 'error');
            }

        } catch (error) {
            console.error('Login error:', error);
            showAlert('Network error. Please check your connection and try again.', 'error');
        } finally {
            // Reset button state
            submitBtn.innerHTML = 'Sign In';
            submitBtn.disabled = false;
        }
    });

    // Real-time validation
    form.addEventListener('input', function(e) {
        validateField(e.target);
    });

    // Social login handlers
    document.getElementById('googleLogin').addEventListener('click', function() {
        showAlert('Google login would be implemented here', 'success');
    });

    document.getElementById('githubLogin').addEventListener('click', function() {
        showAlert('GitHub login would be implemented here', 'success');
    });

    // Forgot password handler
    document.getElementById('forgotPassword').addEventListener('click', function(e) {
        e.preventDefault();
        const email = prompt('Enter your email address to reset password:');
        if (email) {
            showAlert(`Password reset link sent to ${email}`, 'success');
        }
    });

    // Check for signup success message
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('signup') === 'success') {
        showAlert('Account created successfully! Please sign in.', 'success');
    }
});
