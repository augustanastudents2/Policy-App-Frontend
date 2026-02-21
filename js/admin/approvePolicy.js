/**
 * Approves a policy
 * @param {string} policyId - Policy ID (TEXT like "1.1.1"), not UUID
 * @param {Function} onSuccess - Optional callback function to call after successful approval
 */
async function approvePolicy(policyId, onSuccess = null) {
    const token = localStorage.getItem("accessToken");
    if (!token) {
        alert("Please login to approve policies.");
        window.location.href = "admin/login.html";
        return;
    }

    if (!confirm('Are you sure you want to approve this policy?')) {
        return;
    }

    try {
        const response = await fetch(
            `https://asa-policy-backend.onrender.com/api/policies/${encodeURIComponent(policyId)}/approve`,
            {
                method: "PUT",
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
                alert("Only admins can approve policies.");
                return;
            }
            if (response.status === 404) {
                alert("Policy not found. It may have already been deleted.");
                if (onSuccess) {
                    onSuccess();
                }
                return;
            }
            
            let errorMessage = "Failed to approve policy.";
            try {
                const errorData = await response.json();
                if (errorData.detail) {
                    errorMessage = errorData.detail;
                }
            } catch (e) {
                errorMessage = `Failed to approve policy: ${response.status} ${response.statusText}`;
            }
            alert(errorMessage);
            return;
        }

        alert('Policy approved successfully!');
        
        if (onSuccess) {
            onSuccess();
        }
    } catch (err) {
        console.error("Error approving policy:", err);
        alert("Failed to approve policy. Please try again.\n\nError: " + err.message);
    }
}

// Export for global access
window.approvePolicy = approvePolicy;
