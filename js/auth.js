// Authentication state management
document.addEventListener('DOMContentLoaded', function() {
    console.log('Auth state manager loaded');
    
    // Check if user is authenticated
    function isAuthenticated() {
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('user');
        return token && user;
    }
    
    // Get current user data
    function getCurrentUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }
    
    // Update header based on auth state
    function updateHeader() {
        const authNav = document.querySelector('.auth-nav');
        if (!authNav) return;

        if (isAuthenticated()) {
            const user = getCurrentUser();
            const firstName = (user?.fullName || '').split(' ')[0] || 'User';

            // Replace Sign In/Sign Up with user menu (no inline event handlers)
            authNav.innerHTML = `
                <span class="welcome-text">Welcome, ${firstName}!</span>
                <a href="profile.html" class="auth-link">Account</a>
                <button class="auth-link logout-btn">Sign Out</button>
            `;

            const logoutButton = authNav.querySelector('.logout-btn');
            if (logoutButton) {
                logoutButton.addEventListener('click', logout);
            }
        } else {
            // Show default Sign In/Sign Up links
            authNav.innerHTML = `
                <a href="login.html" class="auth-link">Sign In</a>
                <a href="signup.html" class="auth-link primary">Sign Up</a>
            `;
        }
    }
    
    // Logout function
    window.logout = function() {
        if (confirm('Are you sure you want to sign out?')) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            
            // Show logout message
            alert('You have been signed out successfully.');
            
            // Refresh page to update state
            window.location.reload();
        }
    };
    
    // Initialize auth state on page load
    updateHeader();
    
    // Add some styling for the welcome text and logout button
    const style = document.createElement('style');
    style.textContent = `
        .welcome-text {
            color: #64ffda;
            font-size: 0.9rem;
            margin-right: 1rem;
            font-weight: 500;
        }
        
        .logout-btn {
            background: none;
            border: none;
            cursor: pointer;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            transition: all 0.3s ease;
        }
        
        .logout-btn:hover {
            background-color: #2a2f3a;
        }
        
        @media (max-width: 768px) {
            .welcome-text {
                display: block;
                margin-bottom: 0.5rem;
                margin-right: 0;
                text-align: center;
            }
        }
    `;
    document.head.appendChild(style);
});
