// Load and display a single policy from the API
document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
        alert("Please login to view policies.");
        window.location.href = "admin/login.html";
        return;
    }

    // Get policy ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const policyId = urlParams.get('id');
    
    if (policyId) {
        loadPolicyView(policyId);
    } else {
        alert("No policy ID provided.");
        window.location.href = "policies.html";
    }

    // Handle review form submission
    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) {
        reviewForm.addEventListener('submit', handleReviewSubmit);
    }
});

/**
 * Gets the human-readable section name from a section number.
 * @param {string|number} section - The section number (1, 2, or 3).
 * @returns {string} The formatted section name.
 */
function getSectionName(section) {
    const sectionNames = {
        '1': 'Organizational Identity & Values',
        '2': 'Governance & Elections',
        '3': 'Operations, Staff & Finance'
    };
    return sectionNames[section] || section;
}

/**
 * Loads a single policy from the API and displays it.
 * @param {string} policyId - The UUID of the policy to load.
 */
async function loadPolicyView(policyId) {
    const token = localStorage.getItem("accessToken");
    if (!token) {
        console.error("No access token found");
        return;
    }

    try {
        // Fetch all policies and find the one with matching UUID
        const response = await fetch(
            "https://asa-policy-backend.onrender.com/api/policies",
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                alert("You don't have permission to view policies. Please login with an admin or policy_working_group account.");
                window.location.href = "admin/login.html";
                return;
            }
            throw new Error(`Failed to load policy: ${response.status}`);
        }

        const policies = await response.json();
        console.log("All policies loaded:", policies);

        // Find the policy with matching UUID
        const policy = policies.find(p => p.id === policyId);
        
        if (!policy) {
            alert("Policy not found.");
            window.location.href = "policies.html";
            return;
        }

        console.log("Policy found:", policy);

        // Populate the view
        populatePolicyView(policy);
        
        // Load reviews and check if user has already reviewed
        if (policy.policy_id) {
            await loadPolicyReviews(policy.policy_id);
        }
    } catch (err) {
        console.error("Error loading policy:", err);
        alert("Error loading policy. Please try again.");
        window.location.href = "policies.html";
    }
}

/**
 * Populates the policy view with data from the API.
 * @param {Object} policy - Policy object from the API.
 */
function populatePolicyView(policy) {
    // Set title
    const policyTitle = document.getElementById('policyTitle');
    if (policyTitle) {
        policyTitle.textContent = policy.policy_name || 'Untitled Policy';
    }

    // Set policy ID
    const policyIdEl = document.getElementById('policyId');
    if (policyIdEl) {
        policyIdEl.textContent = policy.policy_id || policy.id || 'N/A';
    }

    // Set section
    const policySection = document.getElementById('policySection');
    if (policySection) {
        const sectionName = getSectionName(policy.section || '1');
        policySection.textContent = sectionName;
    }

    // Set status
    const policyStatus = document.getElementById('policyStatus');
    if (policyStatus) {
        const status = policy.status || 'draft';
        const statusClass = status === 'approved' ? 'approved' : 'pending';
        const statusText = status.charAt(0).toUpperCase() + status.slice(1);
        policyStatus.innerHTML = `<span class="policy-status ${statusClass}">${statusText}</span>`;
    }

    // Set content
    const policyContent = document.getElementById('policyContent');
    if (policyContent) {
        const content = policy.policy_content || 'No content available';
        policyContent.innerHTML = formatContent(content);
    }

    // Set dates
    const createdAt = document.getElementById('createdAt');
    if (createdAt && policy.created_at) {
        createdAt.textContent = new Date(policy.created_at).toLocaleString();
    }

    const updatedAt = document.getElementById('updatedAt');
    if (updatedAt && policy.updated_at) {
        updatedAt.textContent = new Date(policy.updated_at).toLocaleString();
    }

    // Store policy ID for edit button (UUID)
    const editBtn = document.getElementById('editBtn');
    if (editBtn) {
        editBtn.dataset.policyId = policy.id;
        // Also store policy_id (TEXT) for reviews
        editBtn.dataset.policyIdText = policy.policy_id;
    }
}

/**
 * Formats content with line breaks.
 * @param {string} content - The content to format.
 * @returns {string} Formatted HTML content.
 */
function formatContent(content) {
    if (!content) return '';
    
    // If content already contains HTML tags (from Quill editor), return as-is
    if (content.includes('<p>') || content.includes('<div>') || content.includes('<h') || content.includes('<strong>') || content.includes('<em>')) {
        return content;
    }
    
    // Otherwise, convert newlines to <br> for plain text
    return content
        .replace(/\r\n/g, '<br>')
        .replace(/\n/g, '<br>');
}

/**
 * Navigates to the policy edit page.
 */
function editPolicy() {
    const editBtn = document.getElementById('editBtn');
    if (editBtn && editBtn.dataset.policyId) {
        window.location.href = `policy-form.html?id=${editBtn.dataset.policyId}`;
    }
}

/**
 * Loads existing review for the policy and displays review statistics.
 * @param {string} policyIdText - The policy_id (TEXT like "1.1.1"), not UUID.
 */
async function loadPolicyReviews(policyIdText) {
    const token = localStorage.getItem("accessToken");
    if (!token) {
        return; // Can't load reviews without auth
    }

    try {
        // Get current user info to check if they've already reviewed
        const userResponse = await fetch(
            "https://asa-policy-backend.onrender.com/api/auth/me",
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        let userEmail = null;
        if (userResponse.ok) {
            const userData = await userResponse.json();
            userEmail = userData.email;
        }

        // Get all reviews for this policy
        const reviewsResponse = await fetch(
            `https://asa-policy-backend.onrender.com/api/policies/${encodeURIComponent(policyIdText)}/reviews`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        if (!reviewsResponse.ok) {
            console.error("Failed to load reviews");
            return;
        }

        const reviewsData = await reviewsResponse.json();
        
        // Check if current user has already reviewed
        if (userEmail) {
            const confirmedEmails = reviewsData.confirmed?.people || [];
            const needsWorkEmails = reviewsData.needs_work?.people || [];
            
            if (confirmedEmails.includes(userEmail)) {
                const reviewConfirm = document.getElementById('reviewConfirm');
                if (reviewConfirm) {
                    reviewConfirm.checked = true;
                }
            } else if (needsWorkEmails.includes(userEmail)) {
                const reviewNeedsWork = document.getElementById('reviewNeedsWork');
                if (reviewNeedsWork) {
                    reviewNeedsWork.checked = true;
                }
            }
        }

        // Display review statistics
        displayReviewStatistics(reviewsData);
    } catch (err) {
        console.error("Error loading reviews:", err);
    }
}

/**
 * Displays review statistics on the page.
 * @param {Object} reviewsData - Review data from API.
 */
function displayReviewStatistics(reviewsData) {
    // You can add a section to display the statistics
    // For example, showing counts and emails
    const confirmedCount = reviewsData.confirmed?.numberOfPeople || 0;
    const needsWorkCount = reviewsData.needs_work?.numberOfPeople || 0;
    
    console.log("Confirmed:", confirmedCount, "people:", reviewsData.confirmed?.people);
    console.log("Needs Work:", needsWorkCount, "people:", reviewsData.needs_work?.people);
    
    // You can add UI elements to display this information
    // For now, we'll just log it
}

/**
 * Shows a review status message.
 * @param {string} message - The message to display.
 * @param {string} type - The message type ('success' or 'error').
 */
function showReviewMessage(message, type) {
    const messageEl = document.getElementById('reviewStatusMessage');
    if (messageEl) {
        messageEl.textContent = message;
        messageEl.className = 'review-status-message ' + type;
        messageEl.style.display = 'block';
        
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 3000);
    }
}

/**
 * Handles review form submission.
 * @param {Event} e - The form submit event.
 */
async function handleReviewSubmit(e) {
    e.preventDefault();
    
    const token = localStorage.getItem("accessToken");
    if (!token) {
        alert("Please login to submit a review.");
        window.location.href = "admin/login.html";
        return;
    }

    // Get policy_id (TEXT) from the edit button where we stored it
    const editBtn = document.getElementById('editBtn');
    const policyIdText = editBtn?.dataset.policyIdText;
    
    if (!policyIdText) {
        showReviewMessage('Error: Could not find policy ID.', 'error');
        return;
    }
    
    const reviewStatus = document.querySelector('input[name="reviewStatus"]:checked');
    
    if (!reviewStatus) {
        showReviewMessage('Please select a review option.', 'error');
        return;
    }

    try {
        const response = await fetch(
            `https://asa-policy-backend.onrender.com/api/policies/${encodeURIComponent(policyIdText)}/reviews`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    review_status: reviewStatus.value
                })
            }
        );

        if (!response.ok) {
            if (response.status === 401) {
                alert("Your session has expired. Please login again.");
                window.location.href = "admin/login.html";
                return;
            }
            
            let errorMessage = "Failed to submit review.";
            try {
                const errorData = await response.json();
                if (errorData.detail) {
                    errorMessage = errorData.detail;
                }
            } catch (e) {
                errorMessage = `Failed to submit review: ${response.status} ${response.statusText}`;
            }
            showReviewMessage(errorMessage, 'error');
            return;
        }

        showReviewMessage('Review submitted successfully!', 'success');
        
        // Reload reviews to update statistics
        await loadPolicyReviews(policyIdText);
    } catch (err) {
        console.error("Error submitting review:", err);
        showReviewMessage("Failed to submit review. Please try again.", 'error');
    }
}

/**
 * Resets all reviews for all policies (admin only).
 */
async function resetAllPolicyReviews() {
    const token = localStorage.getItem("accessToken");
    if (!token) {
        alert("Please login to reset reviews.");
        window.location.href = "admin/login.html";
        return;
    }

    // Check if user is admin
    try {
        const userResponse = await fetch(
            "https://asa-policy-backend.onrender.com/api/auth/me",
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        if (!userResponse.ok) {
            alert("Failed to verify user permissions.");
            return;
        }

        const userData = await userResponse.json();
        if (userData.role !== "admin") {
            alert("Only admins can reset all reviews.");
            return;
        }
    } catch (err) {
        console.error("Error checking user role:", err);
        alert("Failed to verify permissions. Please try again.");
        return;
    }

    if (!confirm('⚠️ WARNING: Are you sure you want to reset ALL reviews for ALL policies?\n\nThis will delete all confirmed and needs_work reviews for every policy in the system and cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(
            `https://asa-policy-backend.onrender.com/api/policies/reviews/reset-all`,
            {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            if (response.status === 401) {
                alert("Your session has expired. Please login again.");
                window.location.href = "admin/login.html";
                return;
            }
            if (response.status === 403) {
                alert("Only admins can reset all reviews.");
                return;
            }
            
            let errorMessage = "Failed to reset reviews.";
            try {
                const errorData = await response.json();
                if (errorData.detail) {
                    errorMessage = errorData.detail;
                }
            } catch (e) {
                errorMessage = `Failed to reset reviews: ${response.status} ${response.statusText}`;
            }
            alert(errorMessage);
            return;
        }

        const result = await response.json();
        alert(`All reviews reset successfully. ${result.deleted_count || 0} review(s) deleted across all policies.`);
        
        // Reload current policy reviews if we're on a policy view page
        const editBtn = document.getElementById('editBtn');
        const policyIdText = editBtn?.dataset.policyIdText;
        if (policyIdText) {
            await loadPolicyReviews(policyIdText);
            // Clear any selected review options
            const reviewConfirm = document.getElementById('reviewConfirm');
            const reviewNeedsWork = document.getElementById('reviewNeedsWork');
            if (reviewConfirm) reviewConfirm.checked = false;
            if (reviewNeedsWork) reviewNeedsWork.checked = false;
        }
    } catch (err) {
        console.error("Error resetting reviews:", err);
        alert("Failed to reset reviews. Please try again.\n\nError: " + err.message);
    }
}

// Export functions for global access
window.editPolicy = editPolicy;
window.resetAllPolicyReviews = resetAllPolicyReviews;
