// Master Dashboard JavaScript
// Handles user management, policy reviews, and dashboard functionality
var API_BASE_URL = window.API_BASE_URL || "https://policy-app-backend.onrender.com";

let currentUserRole = null;

document.addEventListener('DOMContentLoaded', async function() {
    await checkUserRole();
    loadMasterDashboard();
    await loadAdminMembers();
    await initSectionsManagement();
    
    document.getElementById('sectionFilter').addEventListener('change', function() {
        loadMasterDashboard();
    });

    await loadEmailJsConfigFromEnv();
    initEmailJsIfConfigured();
});

async function loadEmailJsConfigFromEnv() {
    // If already configured (e.g. local override), keep it.
    if (window.EMAILJS?.publicKey && window.EMAILJS?.serviceId && window.EMAILJS?.templateId) return;

    try {
        const res = await fetch('/api/emailjs-config', { method: 'GET' });
        if (!res.ok) return;
        const cfg = await res.json();
        window.EMAILJS = window.EMAILJS || {};
        window.EMAILJS.publicKey = cfg?.publicKey || window.EMAILJS.publicKey || '';
        window.EMAILJS.serviceId = cfg?.serviceId || window.EMAILJS.serviceId || '';
        window.EMAILJS.templateId = cfg?.templateId || window.EMAILJS.templateId || '';
    } catch (e) {
        // Silent: app still works without EmailJS
    }
}

function initEmailJsIfConfigured() {
    try {
        const cfg = window.EMAILJS;
        if (!window.emailjs || !cfg?.publicKey) return;
        window.emailjs.init({ publicKey: cfg.publicKey });
    } catch (e) {}
}

async function generateRandomPassword(length = 16) {
    const res = await fetch(`/api/generate-password?length=${encodeURIComponent(String(length))}`, {
        method: 'GET'
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to generate password (${res.status})`);
    }
    const data = await res.json();
    if (!data?.password) throw new Error('Invalid password response');
    return data.password;
}

async function checkUserRole() {
    try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            currentUserRole = null;
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
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

    // Generate a password immediately (admin can regenerate if needed).
    try {
        const pwd = await generateRandomPassword(16);
        document.getElementById('memberPassword').value = pwd;
    } catch (e) {
        console.warn('Password generation failed:', e);
    }
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

function showSectionsNotification(message, type = 'info') {
    const notification = document.getElementById('sectionsNotification');
    if (!notification) return;

    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.remove('hidden');

    setTimeout(() => {
        notification.classList.add('hidden');
    }, 5000);
}

function hideAddMemberForm() {
    document.getElementById('memberForm').classList.add('hidden');
    document.getElementById('adminMemberForm').reset();
    document.getElementById('memberPassword').value = '';
}

async function regenerateMemberPassword() {
    try {
        const pwd = await generateRandomPassword(16);
        document.getElementById('memberPassword').value = pwd;
        showNotification('New password generated.', 'success');
    } catch (e) {
        showNotification(`Couldn't generate password: ${e.message}`, 'error');
    }
}

async function sendNewUserEmail({ fullName, email, password }) {
    const cfg = window.EMAILJS;
    if (!window.emailjs || !cfg?.serviceId || !cfg?.templateId) {
        return { sent: false, reason: 'EmailJS not configured' };
    }

    const loginUrl = `${window.location.origin}/admin/login.html`;
    const templateParams = {
        to_name: fullName,
        to_email: email,
        password: password,
        login_url: loginUrl,
    };

    await window.emailjs.send(cfg.serviceId, cfg.templateId, templateParams);
    return { sent: true };
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

    let password = passwordField?.value?.trim();
    if (!password) {
        try {
            password = await generateRandomPassword(16);
            passwordField.value = password;
        } catch (e) {
            // Last-resort fallback (keeps old behavior if password API is unavailable)
            password = nameInput.split(/\s+/)[0].toLowerCase();
            passwordField.value = password;
        }
    }
    
    // Concatenate all name parts (remove extra spaces)
    const fullName = nameInput.split(/\s+/).filter(part => part.length > 0).join(' ');
    
    try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            alert('Please login to add users');
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
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

        // Email the user their login details (best-effort; user creation succeeds even if email fails)
        try {
            const emailResult = await sendNewUserEmail({ fullName, email, password });
            if (emailResult.sent) {
                showNotification(`User added. Login details emailed to ${email}.`, 'success');
            } else {
                showNotification(`User added. Email not sent (${emailResult.reason}).`, 'info');
                alert(`User ${fullName} (${email}) has been successfully added!\nPassword: ${password}`);
            }
        } catch (emailError) {
            console.error('EmailJS send failed:', emailError);
            showNotification('User added, but failed to send email. Password shown in alert.', 'error');
            alert(`User ${fullName} (${email}) has been successfully added!\nPassword: ${password}`);
        }
        
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
        
        const response = await fetch(`${API_BASE_URL}/api/auth/users`, {
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
                    <td><code>sent via email</code></td>
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
        
        const response = await fetch(`${API_BASE_URL}/api/auth/users/${userId}/role`, {
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
        
        const response = await fetch(`${API_BASE_URL}/api/auth/users/${userId}`, {
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
        const response = await fetch(`${API_BASE_URL}/api/policies`, {
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
        const response = await fetch(`${API_BASE_URL}/api/policies/${policyId}/reviews`, {
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
    // Prefer dynamic section names if available (sync fallback for table rendering)
    return window.Sections?.getSectionNameSyncPreferred
        ? window.Sections.getSectionNameSyncPreferred(section)
        : (section || 'N/A');
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
        
        const response = await fetch(`${API_BASE_URL}/api/policies/reviews/reset-all`, {
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

async function initSectionsManagement() {
    // Populate the section filter dropdown dynamically
    try {
        await window.Sections?.populateSectionSelect(document.getElementById('sectionFilter'), {
            includeAll: true,
            includeEmptyOption: false
        });
    } catch (e) {
        console.warn('Failed to populate section filter:', e);
    }

    // Load list
    await loadSectionsList();

    // Wire create form
    const form = document.getElementById('sectionsCreateForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await createSectionFromForm();
        });
    }
}

async function loadSectionsList() {
    const container = document.getElementById('sectionsList');
    if (!container) return;

    container.innerHTML = '<p class="empty-message">Loading sections...</p>';
    try {
        const sections = await window.Sections?.fetchSections?.();
        if (!sections || sections.length === 0) {
            container.innerHTML = '<p class="empty-message">No sections found.</p>';
            return;
        }

        const rows = sections
            .slice()
            .sort((a, b) => String(a.key).localeCompare(String(b.key), undefined, { numeric: true }))
            .map((s) => {
                return `
                    <div class="policy-item" data-section-key="${String(s.key)}">
                        <div class="policy-item-header">
                            <div class="policy-item-title">Section ${String(s.key)}</div>
                            <div class="policy-item-actions">
                                <button class="action-btn edit" onclick="enableSectionEdit('${String(s.key)}')" title="Edit">✏️</button>
                                <button class="action-btn view" onclick="saveSectionName('${String(s.key)}')" title="Save">💾</button>
                                <button class="action-btn delete" onclick="deleteSection('${String(s.key)}')" title="Delete">🗑️</button>
                            </div>
                        </div>
                        <div class="policy-item-meta" style="gap:12px; align-items:center;">
                            <div style="flex:1;">
                                <input id="section-name-${String(s.key)}" type="text" value="${escapeHtml(s.name || '')}" style="width:100%;" disabled>
                            </div>
                        </div>
                    </div>
                `;
            })
            .join('');

        container.innerHTML = rows;
    } catch (error) {
        console.error('Error loading sections:', error);
        container.innerHTML = `<p class="empty-message">Error loading sections: ${error.message}</p>`;
    }
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function enableSectionEdit(sectionKey) {
    const input = document.getElementById(`section-name-${sectionKey}`);
    if (input) {
        input.disabled = false;
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
    }
}

async function deleteSection(sectionKey) {
    if (currentUserRole === null) {
        await checkUserRole();
    }
    if (currentUserRole !== 'admin') {
        showSectionsNotification('Only master admin can delete sections.', 'error');
        return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
        showSectionsNotification('Please login to delete sections.', 'error');
        return;
    }

    const confirmed = confirm(`Delete section "${sectionKey}"? This can only succeed if it has 0 policies.`);
    if (!confirmed) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/sections/${encodeURIComponent(sectionKey)}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: 'Failed to delete section' }));
            throw new Error(err.detail || `Failed to delete section: ${res.status}`);
        }

        showSectionsNotification(`Section ${sectionKey} deleted.`, 'success');
        try {
            await window.Sections?.refreshSections?.();
        } catch {}
        await loadSectionsList();
        await window.Sections?.populateSectionSelect(document.getElementById('sectionFilter'), {
            includeAll: true,
            includeEmptyOption: false
        });
        window.Sections?.broadcastSectionsUpdated?.();
    } catch (error) {
        console.error('Error deleting section:', error);
        showSectionsNotification(`Error deleting section: ${error.message}`, 'error');
    }
}

async function saveSectionName(sectionKey) {
    // Check if user is admin
    if (currentUserRole === null) {
        await checkUserRole();
    }
    if (currentUserRole !== 'admin') {
        showSectionsNotification('Only master admin can edit section names.', 'error');
        await loadSectionsList();
        return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
        showSectionsNotification('Please login to edit sections.', 'error');
        return;
    }

    const input = document.getElementById(`section-name-${sectionKey}`);
    const newName = input?.value?.trim();
    if (!newName) {
        showSectionsNotification('Section name cannot be empty.', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/sections/${encodeURIComponent(sectionKey)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name: newName })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: 'Failed to update section' }));
            throw new Error(err.detail || `Failed to update section: ${res.status}`);
        }

        showSectionsNotification(`Section ${sectionKey} updated.`, 'success');
        // Refresh cached sections so UI updates immediately
        try {
            await window.Sections?.refreshSections?.();
        } catch {}

        // Reload list + dropdown
        await loadSectionsList();
        await window.Sections?.populateSectionSelect(document.getElementById('sectionFilter'), {
            includeAll: true,
            includeEmptyOption: false
        });
        window.Sections?.broadcastSectionsUpdated?.();
    } catch (error) {
        console.error('Error saving section:', error);
        showSectionsNotification(`Error updating section: ${error.message}`, 'error');
    } finally {
        if (input) input.disabled = true;
    }
}

async function createSectionFromForm() {
    // Check if user is admin
    if (currentUserRole === null) {
        await checkUserRole();
    }
    if (currentUserRole !== 'admin') {
        showSectionsNotification('Only master admin can add new sections.', 'error');
        return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
        showSectionsNotification('Please login to add sections.', 'error');
        return;
    }

    const key = document.getElementById('newSectionKey')?.value?.trim();
    const name = document.getElementById('newSectionName')?.value?.trim();
    if (!key || !name) {
        showSectionsNotification('Please provide a key and name.', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/sections`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ key, name })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: 'Failed to create section' }));
            throw new Error(err.detail || `Failed to create section: ${res.status}`);
        }

        showSectionsNotification('Section created.', 'success');
        document.getElementById('sectionsCreateForm')?.reset();

        // Refresh cached sections so UI updates immediately
        try {
            await window.Sections?.refreshSections?.();
        } catch {}

        await loadSectionsList();
        await window.Sections?.populateSectionSelect(document.getElementById('sectionFilter'), {
            includeAll: true,
            includeEmptyOption: false
        });
        window.Sections?.broadcastSectionsUpdated?.();
    } catch (error) {
        console.error('Error creating section:', error);
        showSectionsNotification(`Error creating section: ${error.message}`, 'error');
    }
}

// Export functions to window object for inline event handlers
window.showAddMemberForm = showAddMemberForm;
window.hideAddMemberForm = hideAddMemberForm;
window.handleMemberSubmit = handleMemberSubmit;
window.regenerateMemberPassword = regenerateMemberPassword;
window.updateUserRole = updateUserRole;
window.deleteUser = deleteUser;
window.resetAllReviews = resetAllReviews;
window.enableSectionEdit = enableSectionEdit;
window.saveSectionName = saveSectionName;
window.deleteSection = deleteSection;
