// Profile Panel Functions
// Handles user profile display and logout functionality

async function toggleProfilePanel() {
    const panel = document.getElementById('profilePanel');
    if (panel) {
        panel.classList.toggle('hidden');
        if (!panel.classList.contains('hidden')) {
            await loadProfileData();
        }
    }
}

function closeProfilePanel() {
    const panel = document.getElementById('profilePanel');
    if (panel) {
        panel.classList.add('hidden');
    }
}

async function loadProfileData() {
    try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            console.warn('No access token found');
            return;
        }

        const response = await fetch('https://asa-policy-backend.onrender.com/api/auth/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user info');
        }

        const userData = await response.json();
        
        // Update profile fields
        const nameEl = document.getElementById('profileName');
        const emailEl = document.getElementById('profileEmail');
        
        // Display name and email
        if (nameEl) nameEl.textContent = userData.name || '-';
        if (emailEl) emailEl.textContent = userData.email || '-';
    } catch (error) {
        console.error('Error loading profile data:', error);
        // Set default values on error
        const nameEl = document.getElementById('profileName');
        const emailEl = document.getElementById('profileEmail');
        
        if (nameEl) nameEl.textContent = '-';
        if (emailEl) emailEl.textContent = '-';
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('accessToken');
        window.location.href = 'login.html';
    }
}

// Export functions to window object
window.toggleProfilePanel = toggleProfilePanel;
window.closeProfilePanel = closeProfilePanel;
window.handleLogout = handleLogout;
