/**
 * Disapproves a bylaw by deleting it
 * @param {string} bylawId - Bylaw UUID
 * @param {Function} onSuccess - Optional callback function to call after successful disapproval
 */
async function disapproveBylaw(bylawId, onSuccess = null) {
    const token = localStorage.getItem("accessToken");
    if (!token) {
        alert("Please login to disapprove bylaws.");
        window.location.href = "admin/login.html";
        return;
    }

    const reason = prompt('Please provide a reason for disapproval (optional):');
    if (reason === null) {
        // User cancelled
        return;
    }

    if (!confirm('Are you sure you want to disapprove (delete) this bylaw? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(
            `https://asa-policy-backend.onrender.com/api/bylaws/${bylawId}`,
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
                alert("Only admins can disapprove bylaws.");
                return;
            }
            if (response.status === 404) {
                alert("Bylaw not found. It may have already been deleted.");
                if (onSuccess) {
                    onSuccess();
                }
                return;
            }
            
            let errorMessage = "Failed to disapprove bylaw.";
            try {
                const errorData = await response.json();
                if (errorData.detail) {
                    errorMessage = errorData.detail;
                }
            } catch (e) {
                errorMessage = `Failed to disapprove bylaw: ${response.status} ${response.statusText}`;
            }
            alert(errorMessage);
            return;
        }

        alert('Bylaw has been disapproved and deleted.');
        
        if (onSuccess) {
            onSuccess();
        }
    } catch (err) {
        console.error("Error disapproving bylaw:", err);
        alert("Failed to disapprove bylaw. Please try again.\n\nError: " + err.message);
    }
}

// Export for global access
window.disapproveBylaw = disapproveBylaw;
