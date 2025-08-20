document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, JavaScript is running!');
    
    const form = document.getElementById('signupForm');
    const submitBtn = document.getElementById('submitBtn');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    
    console.log('Form element:', form);
    console.log('Submit button:', submitBtn);

    // Password strength checker
    function checkPasswordStrength(password) {
        let score = 0;
        let feedback = '';

        if (password.length >= 8) score += 1;
        if (password.length >= 12) score += 1;
        if (/[a-z]/.test(password)) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/[0-9]/.test(password)) score += 1;
        if (/[^A-Za-z0-9]/.test(password)) score += 1;

        if (score < 3) {
            strengthFill.className = 'strength-fill weak';
            feedback = 'Weak password';
        } else if (score < 4) {
            strengthFill.className = 'strength-fill fair';
            feedback = 'Fair password';
        } else if (score < 5) {
            strengthFill.className = 'strength-fill good';
            feedback = 'Good password';
        } else {
            strengthFill.className = 'strength-fill strong';
            feedback = 'Strong password';
        }

        strengthText.textContent = feedback;
    }

    passwordInput.addEventListener('input', function() {
        checkPasswordStrength(this.value);
        validateField(this);
    });

    confirmPasswordInput.addEventListener('input', function() {
        validateField(this);
    });

    // Field validation
    function validateField(field) {
        const value = field.value.trim();
        let isValid = true;

        field.classList.remove('error');

        switch (field.name) {
            case 'fullName':
                isValid = value.length >= 2;
                break;
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                isValid = emailRegex.test(value);
                break;
            case 'password':
                isValid = value.length >= 8;
                break;
            case 'confirmPassword':
                isValid = value === passwordInput.value;
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
            if (field.type === 'checkbox') {
                if (!field.checked) {
                    field.classList.add('error');
                    isValid = false;
                    console.log('Checkbox validation failed:', field.id);
                }
            } else {
                if (!validateField(field) || !field.value.trim()) {
                    field.classList.add('error');
                    isValid = false;
                    console.log('Field validation failed:', field.id, field.value);
                }
            }
        });

        return isValid;
    }

    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('Form submitted!');

        if (!validateForm()) {
            console.log('Form validation failed');
            return;
        }
        
        console.log('Form validation passed');

        // Show loading state
        submitBtn.innerHTML = '<span class="loading"></span>Creating Account...';
        submitBtn.disabled = true;

        try {
            // Get form data
            const formData = {
                fullName: document.getElementById('fullName').value.trim(),
                email: document.getElementById('email').value.trim(),
                institution: document.getElementById('institution').value.trim() || null,
                password: document.getElementById('password').value,
                newsletter: document.getElementById('newsletter').checked
            };

            // Make API call to register endpoint
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                // Success - show success message
                alert('Account created successfully! Please check your email to verify your account.');
                
                // Reset form
                form.reset();
                strengthFill.className = 'strength-fill';
                strengthText.textContent = 'Password strength';
                
                // Redirect to login with success parameter
                window.location.href = 'login.html?signup=success';
            } else {
                // Handle API errors
                let errorMessage = 'Registration failed. Please try again.';
                
                if (data.error) {
                    if (data.error === 'User with this email already exists') {
                        errorMessage = 'An account with this email already exists. Please try logging in instead.';
                    } else if (data.details && Array.isArray(data.details)) {
                        errorMessage = data.details.map(detail => detail.msg).join(', ');
                    } else {
                        errorMessage = data.error;
                    }
                }
                
                alert(errorMessage);
            }

        } catch (error) {
            console.error('Registration error:', error);
            alert('Network error. Please check your connection and try again.');
        } finally {
            // Reset button state
            submitBtn.innerHTML = 'Create Account';
            submitBtn.disabled = false;
        }
    });

    // Real-time validation
    form.addEventListener('input', function(e) {
        validateField(e.target);
    });

    // Auto-populate institution from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const school = urlParams.get('school');
    const institutionField = document.getElementById('institution');
    
    if (school === 'uofsc') {
        institutionField.value = 'UofSC School of Medicine';
        institutionField.style.background = '#1a2332';
        institutionField.style.borderColor = '#64ffda';
        
        // Add a subtle highlight effect
        setTimeout(() => {
            institutionField.style.background = '#0f1419';
            institutionField.style.borderColor = '#2a2f3a';
        }, 2000);
    }
});
