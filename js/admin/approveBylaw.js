/**
 * Approves a bylaw
 * @param {string} bylawId - Bylaw UUID
 * @param {Function} onSuccess - Optional callback function to call after successful approval
 */
async function approveBylaw(bylawId, onSuccess = null) {
    const token = localStorage.getItem("accessToken");
    if (!token) {
        alert("Please login to approve bylaws.");
        window.location.href = "admin/login.html";
        return;
    }

    if (!confirm('Are you sure you want to approve this bylaw?')) {
        return;
    }

    try {
        const response = await fetch(
            `https://asa-policy-backend.onrender.com/api/bylaws/${bylawId}/approve`,
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
                alert("Only admins can approve bylaws.");
                return;
            }
            if (response.status === 404) {
                alert("Bylaw not found. It may have already been deleted.");
                if (onSuccess) {
                    onSuccess();
                }
                return;
            }
            
            let errorMessage = "Failed to approve bylaw.";
            try {
                const errorData = await response.json();
                if (errorData.detail) {
                    errorMessage = errorData.detail;
                }
            } catch (e) {
                errorMessage = `Failed to approve bylaw: ${response.status} ${response.statusText}`;
            }
            alert(errorMessage);
            return;
        }

        alert('Bylaw approved successfully!');
        
        if (onSuccess) {
            onSuccess();
        }
    } catch (err) {
        console.error("Error approving bylaw:", err);
        alert("Failed to approve bylaw. Please try again.\n\nError: " + err.message);
    }
}

// Export for global access
window.approveBylaw = approveBylaw;
