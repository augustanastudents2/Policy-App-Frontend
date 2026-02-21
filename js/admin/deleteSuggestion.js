/**
 * Deletes a suggestion from the API.
 * Both admin and policy_working_group can delete suggestions.
 * 
 * @param {string} suggestionId - The UUID of the suggestion to delete.
 * @param {string} suggestionPreview - A preview of the suggestion text for confirmation message.
 * @param {Function} onSuccess - Optional callback function to call after successful deletion (e.g., reload suggestions).
 */
async function deleteSuggestion(suggestionId, suggestionPreview, onSuccess = null) {
    const token = localStorage.getItem("accessToken");
    if (!token) {
        alert("Please login to delete suggestions.");
        window.location.href = "admin/login.html";
        return;
    }

    // Show confirmation dialog
    const confirmed = confirm(
        `⚠️ WARNING: Are you sure you want to delete this student suggestion?\n\n` +
        `Preview: "${suggestionPreview}..."\n\n` +
        `This action cannot be undone. The suggestion will be permanently removed from the system.`
    );

    if (!confirmed) {
        return;
    }

    try {
        // Use suggestion_id (UUID) in the API endpoint
        const response = await fetch(
            `https://asa-policy-backend.onrender.com/api/suggestions/${encodeURIComponent(suggestionId)}`,
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
                alert("You don't have permission to delete suggestions. Only admin and policy_working_group members can delete suggestions.");
                return;
            }
            if (response.status === 404) {
                alert("Suggestion not found. It may have already been deleted.");
                // Still call onSuccess to refresh the list
                if (onSuccess) {
                    onSuccess();
                }
                return;
            }
            
            const errorText = await response.text();
            throw new Error(`Failed to delete suggestion: ${response.status} - ${errorText}`);
        }

        // Success - suggestion deleted (204 No Content)
        alert("Suggestion deleted successfully.");
        
        // Call success callback if provided (e.g., to reload suggestions)
        if (onSuccess) {
            onSuccess();
        }
    } catch (err) {
        console.error("Error deleting suggestion:", err);
        alert("Failed to delete suggestion. Please try again.\n\nError: " + err.message);
    }
}

// Export function for global access
window.deleteSuggestion = deleteSuggestion;
