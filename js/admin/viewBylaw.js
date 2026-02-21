// Load and display a single bylaw from the API
document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
        alert("Please login to view bylaws.");
        window.location.href = "admin/login.html";
        return;
    }

    // Get bylaw ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const bylawId = urlParams.get('id');
    
    if (bylawId) {
        loadBylawView(bylawId);
    } else {
        alert("No bylaw ID provided.");
        window.location.href = "bylaw.html";
    }
});

/**
 * Loads a single bylaw from the API and displays it.
 * @param {string} bylawId - The UUID of the bylaw to load.
 */
async function loadBylawView(bylawId) {
    const token = localStorage.getItem("accessToken");
    if (!token) {
        console.error("No access token found");
        return;
    }

    try {
        // Fetch all bylaws and find the one with matching UUID
        const response = await fetch(
            "https://asa-policy-backend.onrender.com/api/bylaws",
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
                alert("You don't have permission to view bylaws. Please login with an admin or policy_working_group account.");
                window.location.href = "admin/login.html";
                return;
            }
            throw new Error(`Failed to load bylaw: ${response.status}`);
        }

        const bylaws = await response.json();
        console.log("All bylaws loaded:", bylaws);

        // Find the bylaw with matching UUID
        const bylaw = bylaws.find(b => b.id === bylawId);
        
        if (!bylaw) {
            alert("Bylaw not found.");
            window.location.href = "bylaw.html";
            return;
        }

        console.log("Bylaw found:", bylaw);

        // Populate the view
        populateBylawView(bylaw);
    } catch (err) {
        console.error("Error loading bylaw:", err);
        alert("Error loading bylaw. Please try again.");
        window.location.href = "bylaw.html";
    }
}

/**
 * Populates the bylaw view with data from the API.
 * @param {Object} bylaw - Bylaw object from the API.
 */
function populateBylawView(bylaw) {
    // Set title
    const bylawTitle = document.getElementById('bylawTitle');
    if (bylawTitle) {
        bylawTitle.textContent = bylaw.bylaw_title || 'Untitled Bylaw';
    }

    // Set bylaw number
    const bylawNumber = document.getElementById('bylawNumber');
    if (bylawNumber) {
        bylawNumber.textContent = `#${bylaw.bylaw_number || 'N/A'}`;
    }

    // Set status
    const bylawStatus = document.getElementById('bylawStatus');
    if (bylawStatus) {
        const status = bylaw.status || 'draft';
        const statusClass = status === 'approved' ? 'approved' : 'pending';
        const statusText = status.charAt(0).toUpperCase() + status.slice(1);
        bylawStatus.innerHTML = `<span class="policy-status ${statusClass}">${statusText}</span>`;
    }

    // Set content
    const bylawContent = document.getElementById('bylawContent');
    if (bylawContent) {
        const content = bylaw.bylaw_content || 'No content available';
        bylawContent.innerHTML = formatContent(content);
    }

    // Set dates
    const createdAt = document.getElementById('createdAt');
    if (createdAt && bylaw.created_at) {
        createdAt.textContent = new Date(bylaw.created_at).toLocaleString();
    }

    const updatedAt = document.getElementById('updatedAt');
    if (updatedAt && bylaw.updated_at) {
        updatedAt.textContent = new Date(bylaw.updated_at).toLocaleString();
    }

    // Store bylaw ID for edit button
    const editBtn = document.getElementById('editBtn');
    if (editBtn) {
        editBtn.dataset.bylawId = bylaw.id;
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
 * Navigates to the bylaw edit page.
 */
function editBylaw() {
    const editBtn = document.getElementById('editBtn');
    if (editBtn && editBtn.dataset.bylawId) {
        window.location.href = `bylaw-form.html?id=${editBtn.dataset.bylawId}`;
    }
}

// Export functions for global access
window.editBylaw = editBylaw;
