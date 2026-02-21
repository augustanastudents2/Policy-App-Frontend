/**
 * Deletes a bylaw from the API.
 * Only admins can delete bylaws.
 * 
 * @param {string} bylawId - The UUID of the bylaw to delete.
 * @param {string} bylawNumber - The bylaw number (for display in confirmation).
 * @param {string} bylawTitle - The title of the bylaw for confirmation message.
 * @param {Function} onSuccess - Optional callback function to call after successful deletion (e.g., reload bylaws).
 */
async function deleteBylaw(bylawId, bylawNumber, bylawTitle, onSuccess = null) {
    const token = localStorage.getItem("accessToken");
    if (!token) {
        alert("Please login to delete bylaws.");
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

        // Check if user is admin - only admins can delete bylaws
        if (userRole !== "admin") {
            alert("Sorry, only admin is allowed to delete bylaw.");
            return;
        }

        // Show confirmation dialog only for admins
        const confirmed = confirm(
            `⚠️ WARNING: Are you sure you want to delete "Bylaw #${bylawNumber}: ${bylawTitle}"?\n\n` +
            `This action cannot be undone. The bylaw will be permanently removed from the system.`
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
        // Use UUID in the API endpoint
        const response = await fetch(
            `https://asa-policy-backend.onrender.com/api/bylaws/${encodeURIComponent(bylawId)}`,
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
                alert("Sorry, only admin is allowed to delete bylaw.");
                return;
            }
            if (response.status === 404) {
                alert("Bylaw not found. It may have already been deleted.");
                // Still call onSuccess to refresh the list
                if (onSuccess) {
                    onSuccess();
                }
                return;
            }
            
            const errorText = await response.text();
            throw new Error(`Failed to delete bylaw: ${response.status} - ${errorText}`);
        }

        // Success - bylaw deleted (204 No Content)
        alert("Bylaw deleted successfully.");
        
        // Call success callback if provided (e.g., to reload bylaws)
        if (onSuccess) {
            onSuccess();
        }
    } catch (err) {
        console.error("Error deleting bylaw:", err);
        alert("Failed to delete bylaw. Please try again.\n\nError: " + err.message);
    }
}

// Export function for global access
window.deleteBylaw = deleteBylaw;
