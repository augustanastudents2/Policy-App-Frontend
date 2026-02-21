/**
 * Deletes a policy from the API.
 * Only admins can delete policies.
 * 
 * @param {string} policyId - The policy_id (TEXT identifier like "1.1.1"), not UUID.
 * @param {string} policyName - The name of the policy for confirmation message.
 * @param {Function} onSuccess - Optional callback function to call after successful deletion (e.g., reload policies).
 */
async function deletePolicy(policyId, policyName, onSuccess = null) {
    const token = localStorage.getItem("accessToken");
    if (!token) {
        alert("Please login to delete policies.");
        window.location.href = "admin/login.html";
        return;
    }

    try {
        // Get current user info to check role
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
            if (userResponse.status === 401) {
                alert("Your session has expired. Please login again.");
                window.location.href = "admin/login.html";
                return;
            }
            throw new Error("Failed to get user information");
        }

        const userData = await userResponse.json();
        const userRole = userData.role;

        // Check if user is admin - only admins can delete policies
        if (userRole !== "admin") {
            alert("Sorry, only admin is allowed to delete policy.");
            return;
        }

        // Show confirmation dialog only for admins
        const confirmed = confirm(
            `⚠️ WARNING: Are you sure you want to delete "${policyName}"?\n\n` +
            `This action cannot be undone. The policy will be permanently removed from the system.`
        );

        if (!confirmed) {
            return;
        }
    } catch (err) {
        console.error("Error checking user role:", err);
        alert("Failed to verify permissions. Please try again.");
        return;
    }

    try {
        // Use policy_id (TEXT like "1.1.1") in the API endpoint
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
                alert("Sorry, only admin is allowed to delete policy.");
                return;
            }
            if (response.status === 404) {
                alert("Policy not found. It may have already been deleted.");
                // Still call onSuccess to refresh the list
                if (onSuccess) {
                    onSuccess();
                }
                return;
            }
            
            const errorText = await response.text();
            throw new Error(`Failed to delete policy: ${response.status} - ${errorText}`);
        }

        // Success - policy deleted (204 No Content)
        alert("Policy deleted successfully.");
        
        // Call success callback if provided (e.g., to reload policies)
        if (onSuccess) {
            onSuccess();
        }
    } catch (err) {
        console.error("Error deleting policy:", err);
        alert("Failed to delete policy. Please try again.\n\nError: " + err.message);
    }
}

// Export function for global access
window.deletePolicy = deletePolicy;
