/**
 * Disapproves a policy by deleting it
 * @param {string} policyId - Policy ID (TEXT like "1.1.1"), not UUID
 * @param {Function} onSuccess - Optional callback function to call after successful disapproval
 */
async function disapprovePolicy(policyId, onSuccess = null) {
    const token = localStorage.getItem("accessToken");
    if (!token) {
        alert("Please login to disapprove policies.");
        window.location.href = "admin/login.html";
        return;
    }

    const reason = prompt('Please provide a reason for disapproval (optional):');
    if (reason === null) {
        // User cancelled
        return;
    }

    if (!confirm('Are you sure you want to disapprove (delete) this policy? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(
            `https://asa-policy-backend.onrender.com/api/policies/${encodeURIComponent(policyId)}`,
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
                alert("Only admins can disapprove policies.");
                return;
            }
            if (response.status === 404) {
                alert("Policy not found. It may have already been deleted.");
                if (onSuccess) {
                    onSuccess();
                }
                return;
            }
            
            let errorMessage = "Failed to disapprove policy.";
            try {
                const errorData = await response.json();
                if (errorData.detail) {
                    errorMessage = errorData.detail;
                }
            } catch (e) {
                errorMessage = `Failed to disapprove policy: ${response.status} ${response.statusText}`;
            }
            alert(errorMessage);
            return;
        }

        alert('Policy has been disapproved and deleted.');
        
        if (onSuccess) {
            onSuccess();
        }
    } catch (err) {
        console.error("Error disapproving policy:", err);
        alert("Failed to disapprove policy. Please try again.\n\nError: " + err.message);
    }
}

// Export for global access
window.disapprovePolicy = disapprovePolicy;
