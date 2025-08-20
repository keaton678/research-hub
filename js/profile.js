document.addEventListener('DOMContentLoaded', function() {
    console.log('Profile page loaded');
    
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
    
    // Redirect if not authenticated
    if (!isAuthenticated()) {
        alert('Please sign in to access your account.');
        window.location.href = 'login.html';
        return;
    }
    
    // Load user data
    const user = getCurrentUser();
    console.log('Current user:', user);
    
    // Update profile information
    document.getElementById('profileName').textContent = `${user.fullName}'s Account`;
    document.getElementById('fullName').textContent = user.fullName;
    document.getElementById('email').textContent = user.email;
    document.getElementById('institution').textContent = user.institution || 'Not specified';
    
    // Format member since date
    const memberSince = new Date(user.createdAt || Date.now());
    document.getElementById('memberSince').textContent = memberSince.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Update email status
    const emailStatusBadge = document.getElementById('emailStatus');
    if (user.emailVerified) {
        emailStatusBadge.textContent = 'Verified';
        emailStatusBadge.className = 'badge';
    } else {
        emailStatusBadge.textContent = 'Unverified';
        emailStatusBadge.className = 'badge unverified';
    }
    
    // Load activity stats (placeholder for now)
    document.getElementById('guidesViewed').textContent = '12';
    document.getElementById('resourcesAccessed').textContent = '8';
    document.getElementById('daysActive').textContent = '3';
});

// Profile action functions
window.editProfile = function() {
    alert('Edit profile functionality would be implemented here. You could update your name, institution, etc.');
};

window.changePassword = function() {
    const currentPassword = prompt('Enter your current password:');
    if (currentPassword) {
        const newPassword = prompt('Enter your new password:');
        if (newPassword && newPassword.length >= 8) {
            alert('Password change functionality would be implemented here. Your password would be updated securely.');
        } else {
            alert('New password must be at least 8 characters long.');
        }
    }
};

window.downloadData = function() {
    const user = JSON.parse(localStorage.getItem('user'));
    const userData = {
        fullName: user.fullName,
        email: user.email,
        institution: user.institution,
        memberSince: user.createdAt,
        emailVerified: user.emailVerified,
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(userData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `research-junkie-data-${user.email}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert('Your data has been downloaded as a JSON file.');
};

window.logout = function() {
    if (confirm('Are you sure you want to sign out?')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        
        alert('You have been signed out successfully.');
        window.location.href = 'index.html';
    }
};
