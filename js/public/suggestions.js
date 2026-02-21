// ============================================
// ASA Policy App - Suggestions Page JavaScript
// ============================================

// API Configuration
const API_BASE_URL = window.API_BASE_URL || 'https://asa-policy-backend.onrender.com';

/**
 * Makes an API request with error handling
 * @param {string} endpoint - API endpoint (e.g., '/api/policies/approved')
 * @param {Object} options - Fetch options (method, body, headers, etc.)
 * @returns {Promise<Object>} The response data or throws an error
 */
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
    };
    
    const config = { ...defaultOptions, ...options };
    
    try {
        const response = await fetch(url, config);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Resource not found');
            } else if (response.status >= 500) {
                throw new Error('Server error. Please try again later.');
            } else {
                const error = await response.json().catch(() => ({ detail: 'Request failed' }));
                throw new Error(error.detail || 'Request failed');
            }
        }
        
        // Handle 204 No Content responses
        if (response.status === 204) {
            return null;
        }
        
        return await response.json();
    } catch (error) {
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            throw new Error('Network error. Please check your connection and try again.');
        }
        throw error;
    }
}

/** 
 * Gets the human-readable section name from a section number.
 * @param {string|number} section - The section number (1, 2, or 3).
 * @returns {string} The formatted section name, or "Section {number}" if not found.
 */
function getSectionName(section) {
    const sectionNames = {
        '1': 'Organizational Identity & Values',
        '2': 'Governance & Elections',
        '3': 'Operations, Staff & Finance'
    };
    return sectionNames[section] || `Section ${section}`;
}

/**
 * Retrieves all approved policies from the API.
 * @param {string|null} sectionName - Optional section filter (full section name like "Organizational Identity & Values"). If provided, only returns policies from that section.
 * @returns {Promise<Array<Object>>} An array of approved policy objects.
 */
async function getApprovedPolicies(sectionName = null) {
    try {
        // Build query string with optional section parameter (use full section name)
        let endpoint = '/api/policies/approved';
        if (sectionName) {
            endpoint += `?section=${encodeURIComponent(sectionName)}`;
        }
        
        const policies = await apiRequest(endpoint);
        // Map API field names to frontend field names
        const mappedPolicies = policies.map(policy => ({
            id: policy.id, // Keep UUID for internal use
            policyId: policy.policy_id, // TEXT identifier like "1.1.1"
            name: policy.policy_name,
            policyName: policy.policy_name, // Keep both for compatibility
            section: policy.section,
            content: policy.policy_content,
            policyContent: policy.policy_content, // Keep both for compatibility
            status: policy.status,
            createdAt: policy.created_at,
            updatedAt: policy.updated_at,
            createdBy: policy.created_by,
            updatedBy: policy.updated_by
        }));    
        return mappedPolicies;
    } catch (error) {
        console.error('Error fetching policies:', error);
        return [];
    }
}

/**
 * Populates the suggestions form dropdown with approved policies.
 * Groups policies by section for better organization.
 * @returns {Promise<void>}
 */
async function populateSuggestionsDropdown() {
    const policySelect = document.getElementById('policySelect');
    if (!policySelect) return;
    
    const approvedPolicies = await getApprovedPolicies();
    
    // Clear existing options except the first one
    policySelect.innerHTML = '<option value="">Select</option>';
    
    if (approvedPolicies.length === 0) {
        policySelect.innerHTML += '<option value="">No policies available</option>';
        return;
    }
    
    // Group by section
    const bySection = {};
    approvedPolicies.forEach(policy => {
        const section = policy.section || '1';
        if (!bySection[section]) {
            bySection[section] = [];
        }
        bySection[section].push(policy);
    });
    
    // Add options grouped by section
    Object.keys(bySection).sort().forEach(section => {
        const sectionName = getSectionName(section);
        bySection[section].forEach(policy => {
            const name = policy.name || policy.policyName || 'Untitled';
            const policyId = policy.policyId || policy.id;
            const option = document.createElement('option');
            // Use policy_id (TEXT) for value since API expects TEXT
            option.value = policy.policyId;
            option.textContent = `${policyId} - ${name} (${sectionName})`;
            policySelect.appendChild(option);
        });
    });
}

/**
 * Completed by Dominic del Rosario, 
 * Displays a success message after submitting a suggestion.
 * Creates the message element if it doesn't exist and automatically hides it after 5 seconds.
 * @returns {void}
 */
function showSuccessMessage() {
    // Create success message if it doesn't exist
    let successMsg = document.querySelector('.success-message');
    if (!successMsg) {
        successMsg = document.createElement('div');
        successMsg.className = 'success-message';
        successMsg.textContent = 'Thank you for your suggestion! Your feedback has been submitted successfully.';
        
        const form = document.getElementById('suggestionForm');
        if (form && form.parentNode) {
            form.parentNode.insertBefore(successMsg, form);
        }
    }
    
    successMsg.classList.add('show');
    
    // Hide after 5 seconds
    setTimeout(() => {
        successMsg.classList.remove('show');
    }, 5000);
}

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    const suggestionForm = document.getElementById('suggestionForm');
    
    // Populate suggestions dropdown
    await populateSuggestionsDropdown();
    
    // Suggestion Form Handler
    if (suggestionForm) {
        suggestionForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const policySelect = document.getElementById('policySelect');
            const suggestionText = document.getElementById('suggestionText');
            const emailInput = document.getElementById('emailInput');
            
            const selectedPolicyId = policySelect.value; // This is policy_id (TEXT like "1.1.1")
            const suggestion = suggestionText.value.trim();
            const email = emailInput.value.trim();
            
            // Validation
            if (!email) {
                alert('Please enter your UAlberta email address');
                emailInput.focus();
                return;
            }
            
            if (!selectedPolicyId) {
                alert('Please select a policy to refer to.');
                policySelect.focus();
                return;
            }
            
            if (!suggestion) {
                alert('Please enter your suggestion.');
                suggestionText.focus();
                return;
            }

            if (!emailInput.value.includes('@ualberta.ca')) {
                alert('Please enter a valid UAlberta email address');
                emailInput.focus();
                return;
            }
            
            try {
                // Submit suggestion to API
                // API expects: policy_id (TEXT), suggestion (string), status: "pending"
                await apiRequest('/api/suggestions', {
                    method: 'POST',
                    body: JSON.stringify({
                        policy_id: selectedPolicyId, // TEXT like "1.1.1"
                        suggestion: suggestion,
                        status: 'pending'
                    })
                });
                
                // Show success message
                alert('Thank you for your suggestion!\n\nYour feedback has been submitted successfully.');
                
                // Reset form
                policySelect.value = '';
                suggestionText.value = '';
                emailInput.value = '';
                
                showSuccessMessage();
            } catch (error) {
                console.error('Error submitting suggestion:', error);
                alert('Failed to submit suggestion. Please try again later.');
            }
        });
    }
});
