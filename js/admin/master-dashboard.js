// Master Dashboard JavaScript
// Handles user management, policy reviews, and dashboard functionality

let currentUserRole = null;

document.addEventListener('DOMContentLoaded', async function() {
    await checkUserRole();
    loadMasterDashboard();
    await loadAdminMembers();
    
    // Update password preview when name changes
    document.getElementById('memberName')?.addEventListener('input', updatePasswordPreview);
    
    document.getElementById('sectionFilter').addEventListener('change', function() {
        loadMasterDashboard();
    });
});

async function checkUserRole() {
    try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            currentUserRole = null;
            return;
        }
        
        const response = await fetch('https://asa-policy-backend.onrender.com/api/auth/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const userData = await response.json();
            currentUserRole = userData.role;
            
            // Hide add user button if not admin
            const addUserButton = document.getElementById('addUserButton');
            if (addUserButton) {
                if (currentUserRole !== 'admin') {
                    addUserButton.style.display = 'none';
                } else {
                    addUserButton.style.display = 'inline-block';
                }
            }
            
            // Hide reset reviews button if not admin
            const resetReviewsButton = document.getElementById('resetReviewsButton');
            if (resetReviewsButton) {
                if (currentUserRole !== 'admin') {
                    resetReviewsButton.style.display = 'none';
                } else {
                    resetReviewsButton.style.display = 'inline-block';
                }
            }
        } else {
            currentUserRole = null;
        }
    } catch (error) {
        console.error('Error checking user role:', error);
        currentUserRole = null;
    }
}

function updatePasswordPreview() {
    const nameInput = document.getElementById('memberName').value.trim();
    const passwordField = document.getElementById('memberPassword');
    
    if (nameInput) {
        // Get first name (first word)
        const firstName = nameInput.split(/\s+/)[0].toLowerCase();
        passwordField.value = firstName;
    } else {
        passwordField.value = '';
    }
}

async function showAddMemberForm() {
    // If role not loaded yet, check it first
    if (currentUserRole === null) {
        await checkUserRole();
    }
    
    // Check if user is admin
    if (currentUserRole !== 'admin') {
        showNotification('Can\'t create new user. Only master admin can add new users.', 'error');
        return;
    }
    
    document.getElementById('memberForm').classList.remove('hidden');
    document.getElementById('memberFormTitle').textContent = 'Add New User';
    document.getElementById('adminMemberForm').reset();
    document.getElementById('memberPassword').value = '';
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 5000);
}

function hideAddMemberForm() {
    document.getElementById('memberForm').classList.add('hidden');
    document.getElementById('adminMemberForm').reset();
    document.getElementById('memberPassword').value = '';
}

async function handleMemberSubmit(e) {
    e.preventDefault();
    
    // If role not loaded yet, check it first
    if (currentUserRole === null) {
        await checkUserRole();
    }
    
    // Check if user is admin
    if (currentUserRole !== 'admin') {
        showNotification('Can\'t create new user. Only master admin can add new users.', 'error');
        hideAddMemberForm();
        return;
    }
    
    const nameInput = document.getElementById('memberName').value.trim();
    const email = document.getElementById('memberEmail').value.trim().toLowerCase();
    const passwordField = document.getElementById('memberPassword');
    
    if (!nameInput || !email) {
        alert('Please fill in all fields');
        return;
    }
    
    // Get first name for password
    const firstName = nameInput.split(/\s+/)[0].toLowerCase();
    const password = firstName;
    
    // Concatenate all name parts (remove extra spaces)
    const fullName = nameInput.split(/\s+/).filter(part => part.length > 0).join(' ');
    
    try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            alert('Please login to add users');
            return;
        }
        
        const response = await fetch('https://asa-policy-backend.onrender.com/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                email: email,
                password: password,
                name: fullName
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Failed to register user' }));
            throw new Error(errorData.detail || `Failed to register user: ${response.status}`);
        }
        
        const result = await response.json();
        alert(`User ${fullName} (${email}) has been successfully added!\nPassword: ${password}`);
        
        hideAddMemberForm();
        loadAdminMembers();
    } catch (error) {
        console.error('Error adding user:', error);
        alert(`Error adding user: ${error.message}`);
    }
}

async function loadAdminMembers() {
    const container = document.getElementById('membersList');
    container.innerHTML = '<p class="empty-message">Loading users...</p>';
    
    try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            container.innerHTML = '<p class="empty-message">Please login to view users.</p>';
            return;
        }
        
        const response = await fetch('https://asa-policy-backend.onrender.com/api/auth/users', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            if (response.status === 403) {
                container.innerHTML = '<p class="empty-message">You don\'t have permission to view users.</p>';
                return;
            }
            throw new Error(`Failed to load users: ${response.status}`);
        }
        
        const users = await response.json();
        
        // Show all users (including public) so admins can change roles
        if (users.length === 0) {
            container.innerHTML = '<p class="empty-message">No users found.</p>';
            return;
        }
        
        // Only show Actions column for admin users
        const actionsHeader = currentUserRole === 'admin' ? '<th>Actions</th>' : '';
        let html = `<table class="members-table"><thead><tr><th>Name</th><th>Email</th><th>Password</th><th>Role</th>${actionsHeader}</tr></thead><tbody>`;
        
        users.forEach(user => {
            // Extract first name from full name for password display
            const firstName = user.name ? user.name.split(/\s+/)[0].toLowerCase() : 'N/A';
            
            // Only show delete button for admin users
            const deleteButton = currentUserRole === 'admin' 
                ? `<button class="btn btn-small btn-danger" onclick="deleteUser('${user.id}', '${user.email}')">Delete</button>`
                : '';
            
            // Role display - make it editable for admin users
            const roleDisplay = currentUserRole === 'admin'
                ? `<select class="role-select ${user.role}" onchange="updateUserRole('${user.id}', this.value)" data-user-id="${user.id}">
                    <option value="public" ${user.role === 'public' ? 'selected' : ''}>Public</option>
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    <option value="policy_working_group" ${user.role === 'policy_working_group' ? 'selected' : ''}>Policy Working Group</option>
                   </select>`
                : `<span class="role-badge ${user.role}">${user.role === 'admin' ? 'Admin' : user.role === 'policy_working_group' ? 'Policy Working Group' : 'Public'}</span>`;
            
            html += `
                <tr>
                    <td>${user.name || '-'}</td>
                    <td>${user.email}</td>
                    <td><code>${firstName}</code></td>
                    <td>${roleDisplay}</td>
                    ${currentUserRole === 'admin' ? `<td>${deleteButton}</td>` : ''}
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading users:', error);
        container.innerHTML = `<p class="empty-message">Error loading users: ${error.message}</p>`;
    }
}

async function updateUserRole(userId, newRole) {
    // Check if user is admin
    if (currentUserRole === null) {
        await checkUserRole();
    }
    
    if (currentUserRole !== 'admin') {
        showNotification('Only master admin can change user roles.', 'error');
        // Reload to reset the select
        await loadAdminMembers();
        return;
    }
    
    try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            showNotification('Please login to change user roles.', 'error');
            await loadAdminMembers();
            return;
        }
        
        const response = await fetch(`https://asa-policy-backend.onrender.com/api/auth/users/${userId}/role`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                role: newRole
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Failed to update user role' }));
            throw new Error(errorData.detail || `Failed to update user role: ${response.status}`);
        }
        
        const result = await response.json();
        showNotification(`User role updated to ${newRole} successfully.`, 'success');
        
        // Reload the user list
        await loadAdminMembers();
    } catch (error) {
        console.error('Error updating user role:', error);
        showNotification(`Error updating user role: ${error.message}`, 'error');
        // Reload to reset the select
        await loadAdminMembers();
    }
}

async function deleteUser(userId, userEmail) {
    // Check if user is admin
    if (currentUserRole === null) {
        await checkUserRole();
    }
    
    if (currentUserRole !== 'admin') {
        showNotification('Only master admin can delete users.', 'error');
        return;
    }
    
    // Confirm before deleting
    const confirmed = confirm(`Are you sure you want to delete user "${userEmail}"? This action cannot be undone.`);
    if (!confirmed) {
        return;
    }
    
    try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            showNotification('Please login to delete users.', 'error');
            return;
        }
        
        const response = await fetch(`https://asa-policy-backend.onrender.com/api/auth/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Failed to delete user' }));
            throw new Error(errorData.detail || `Failed to delete user: ${response.status}`);
        }
        
        const result = await response.json();
        showNotification(result.message || `User ${userEmail} has been deleted successfully.`, 'success');
        
        // Reload the user list
        await loadAdminMembers();
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification(`Error deleting user: ${error.message}`, 'error');
    }
}

async function getPolicies() {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        console.error('No access token found');
        return [];
    }

    try {
        const response = await fetch('https://asa-policy-backend.onrender.com/api/policies', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to load policies: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching policies:', error);
        return [];
    }
}

async function getPolicyReviews(policyId) {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        return { confirmed: { numberOfPeople: 0, people: [] }, needs_work: { numberOfPeople: 0, people: [] } };
    }

    try {
        const response = await fetch(`https://asa-policy-backend.onrender.com/api/policies/${policyId}/reviews`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                // No reviews yet
                return { confirmed: { numberOfPeople: 0, people: [] }, needs_work: { numberOfPeople: 0, people: [] } };
            }
            throw new Error(`Failed to load reviews: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error fetching reviews for policy ${policyId}:`, error);
        return { confirmed: { numberOfPeople: 0, people: [] }, needs_work: { numberOfPeople: 0, people: [] } };
    }
}

function getSectionName(section) {
    const sectionNames = {
        '1': 'Organizational Identity & Values',
        '2': 'Governance & Elections',
        '3': 'Operations, Staff & Finance'
    };
    return sectionNames[section] || section || 'N/A';
}

async function loadMasterDashboard() {
    const policies = await getPolicies();
    
    // Update stats
    document.getElementById('totalPoliciesCount').textContent = policies.length;
    
    // Load review summary table (this will also calculate review stats)
    await loadReviewSummaryTable(policies);
}

async function loadReviewSummaryTable(policies) {
    const sectionFilter = document.getElementById('sectionFilter').value;
    const filteredPolicies = sectionFilter === 'all' 
        ? policies 
        : policies.filter(p => String(p.section) === String(sectionFilter));
    
    const container = document.getElementById('reviewSummaryTable');
    
    if (filteredPolicies.length === 0) {
        container.innerHTML = '<p class="empty-message">No policies found.</p>';
        document.getElementById('totalReviewsCount').textContent = '0';
        document.getElementById('confirmedCount').textContent = '0';
        document.getElementById('needsWorkCount').textContent = '0';
        return;
    }
    
    // Show loading state
    container.innerHTML = '<p class="empty-message">Loading reviews...</p>';
    
    let totalReviews = 0;
    let totalConfirmed = 0;
    let totalNeedsWork = 0;
    
    let html = `
        <table class="review-table">
            <thead>
                <tr>
                    <th>Policy ID</th>
                    <th>Policy Name</th>
                    <th>Section</th>
                    <th>Confirmed</th>
                    <th>Needs Work</th>
                    <th>Reviewers</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    // Fetch reviews for each policy
    for (const policy of filteredPolicies) {
        const policyId = policy.policy_id || policy.id;
        const reviews = await getPolicyReviews(policyId);
        
        const confirmed = reviews.confirmed.numberOfPeople;
        const needsWork = reviews.needs_work.numberOfPeople;
        const total = confirmed + needsWork;
        
        totalReviews += total;
        totalConfirmed += confirmed;
        totalNeedsWork += needsWork;
        
        // Build reviewers display
        let reviewersHtml = '';
        if (total === 0) {
            reviewersHtml = '<span class="no-reviews">No reviews yet</span>';
        } else {
            reviewersHtml = '<div class="reviewers-list">';
            
            if (confirmed > 0) {
                reviewersHtml += `<div class="reviewer-group confirmed"><strong>Confirmed (${confirmed}):</strong> `;
                reviewersHtml += reviews.confirmed.people.map(email => `<span class="reviewer-email">${email}</span>`).join(', ');
                reviewersHtml += '</div>';
            }
            
            if (needsWork > 0) {
                if (confirmed > 0) reviewersHtml += '<br>';
                reviewersHtml += `<div class="reviewer-group needs-work"><strong>Needs Work (${needsWork}):</strong> `;
                reviewersHtml += reviews.needs_work.people.map(email => `<span class="reviewer-email">${email}</span>`).join(', ');
                reviewersHtml += '</div>';
            }
            
            reviewersHtml += '</div>';
        }
        
        html += `
            <tr>
                <td>${policyId}</td>
                <td><a href="policy-view.html?id=${policy.id}" class="policy-link">${policy.policy_name || 'Untitled'}</a></td>
                <td>${getSectionName(policy.section)}</td>
                <td class="confirmed-count">${confirmed}</td>
                <td class="needs-work-count">${needsWork}</td>
                <td class="reviewers-cell">${reviewersHtml}</td>
            </tr>
        `;
    }
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
    
    // Update stats
    document.getElementById('totalReviewsCount').textContent = totalReviews;
    document.getElementById('confirmedCount').textContent = totalConfirmed;
    document.getElementById('needsWorkCount').textContent = totalNeedsWork;
}

async function resetAllReviews() {
    // Check if user is admin
    if (currentUserRole === null) {
        await checkUserRole();
    }
    
    if (currentUserRole !== 'admin') {
        showNotification('Only master admin can reset reviews.', 'error');
        return;
    }
    
    // Confirm before resetting
    const confirmed = confirm('Are you sure you want to reset ALL reviews for ALL policies? This action cannot be undone.');
    if (!confirmed) {
        return;
    }
    
    try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            showNotification('Please login to reset reviews.', 'error');
            return;
        }
        
        const response = await fetch('https://asa-policy-backend.onrender.com/api/policies/reviews/reset-all', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Failed to reset reviews' }));
            throw new Error(errorData.detail || `Failed to reset reviews: ${response.status}`);
        }
        
        const result = await response.json();
        showNotification(`Successfully reset ${result.deleted_count || 0} reviews.`, 'success');
        
        // Reload the dashboard to reflect changes
        await loadMasterDashboard();
    } catch (error) {
        console.error('Error resetting reviews:', error);
        showNotification(`Error resetting reviews: ${error.message}`, 'error');
    }
}

// Export functions to window object for inline event handlers
window.showAddMemberForm = showAddMemberForm;
window.hideAddMemberForm = hideAddMemberForm;
window.handleMemberSubmit = handleMemberSubmit;
window.updateUserRole = updateUserRole;
window.deleteUser = deleteUser;
window.resetAllReviews = resetAllReviews;
