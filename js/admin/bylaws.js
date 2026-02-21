// Load and display bylaws from the API
document.addEventListener("DOMContentLoaded", () => {
    const bylawsList = document.getElementById("bylawsList");
    if (!bylawsList) return;

    const token = localStorage.getItem("accessToken");
    if (!token) {
        // Not logged in, redirect to login page
        alert("Please login to view bylaws.");
        window.location.href = "admin/login.html";
        return;
    }

    // Load bylaws on page load
    loadBylaws();

    // Handle search functionality
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase();
            filterBylaws(query);
        });
    }
});

/**
 * Loads all bylaws from the API and displays them.
 */
async function loadBylaws() {
    const bylawsList = document.getElementById("bylawsList");
    if (!bylawsList) return;

    const token = localStorage.getItem("accessToken");
    if (!token) {
        console.error("No access token found");
        return;
    }

    try {
        // Show loading state
        bylawsList.innerHTML = '<div class="empty-state"><div class="empty-state-text">Loading bylaws...</div></div>';

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
            throw new Error(`Failed to load bylaws: ${response.status}`);
        }

        const bylaws = await response.json();
        console.log("Bylaws loaded:", bylaws);

        if (bylaws.length === 0) {
            bylawsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <div class="empty-state-text">No bylaws found</div>
                    <div class="empty-state-subtext">Create your first bylaw to get started</div>
                </div>
            `;
            return;
        }

        // Sort bylaws by number
        const sortedBylaws = [...bylaws].sort((a, b) => {
            const aNum = a.bylaw_number || 0;
            const bNum = b.bylaw_number || 0;
            return aNum - bNum;
        });

        // Render bylaws
        let html = sortedBylaws.map(bylaw => renderBylawItem(bylaw)).join('');
        bylawsList.innerHTML = html;
    } catch (err) {
        console.error("Error loading bylaws:", err);
        bylawsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <div class="empty-state-text">Error loading bylaws</div>
                <div class="empty-state-subtext">${err.message}</div>
            </div>
        `;
    }
}

/**
 * Renders a single bylaw item.
 * @param {Object} bylaw - Bylaw object from the API.
 * @returns {string} HTML string for the bylaw item.
 */
function renderBylawItem(bylaw) {
    const status = bylaw.status || 'draft';
    const statusClass = status === 'approved' ? 'approved' : 'pending';
    const statusText = status === 'approved' ? 'Approved' : 'Pending';
    const bylawNumber = bylaw.bylaw_number || 'N/A';
    const bylawTitle = bylaw.bylaw_title || 'Untitled Bylaw';
    const bylawContent = bylaw.bylaw_content || '';
    const bylawUuid = bylaw.id; // UUID for API calls

    return `
        <div class="bylaw-item" data-id="${bylawUuid}" data-bylaw-number="${bylawNumber}" data-name="${bylawTitle.toLowerCase()}">
            <div class="bylaw-item-header">
                <div class="bylaw-item-title">Bylaw #${bylawNumber}</div>
                <div class="bylaw-item-actions">
                    <button class="action-btn view" onclick="viewBylaw('${bylawUuid}')" title="View">👁️</button>
                    <button class="action-btn edit" onclick="editBylaw('${bylawUuid}')" title="Edit">✏️</button>
                    <button class="action-btn delete" onclick="deleteBylawFromList('${bylawUuid}', '${bylawNumber}', '${bylawTitle}', loadBylaws)" title="Delete">🗑️</button>
                </div>
            </div>
            <div class="bylaw-item-content">
                <strong>${bylawTitle}</strong>
                <p>${bylawContent.substring(0, 150)}${bylawContent.length > 150 ? '...' : ''}</p>
            </div>
            <div class="bylaw-item-meta">
                <div class="policy-status ${statusClass}">${statusText}</div>
            </div>
        </div>
    `;
}

/**
 * Filters bylaws based on search query.
 * @param {string} query - The search query string.
 */
function filterBylaws(query) {
    const items = document.querySelectorAll('.bylaw-item');
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        const bylawName = item.getAttribute('data-name') || '';
        const shouldShow = text.includes(query) || bylawName.includes(query);
        item.style.display = shouldShow ? 'block' : 'none';
    });
}

/**
 * Navigates to the bylaw view page.
 * @param {string} id - The UUID of the bylaw.
 */
function viewBylaw(id) {
    window.location.href = `bylaw-view.html?id=${id}`;
}

/**
 * Navigates to the bylaw edit page.
 * @param {string} id - The UUID of the bylaw.
 */
function editBylaw(id) {
    window.location.href = `bylaw-form.html?id=${id}`;
}

// Export functions for global access
window.viewBylaw = viewBylaw;
window.editBylaw = editBylaw;
window.deleteBylawFromList = deleteBylawFromList;

/**
 * Wrapper function to call deleteBylaw from deleteBylaw.js
 * @param {string} bylawId - The UUID of the bylaw.
 * @param {string} bylawNumber - The bylaw number.
 * @param {string} bylawTitle - The bylaw title.
 * @param {Function} onSuccess - Success callback.
 */
function deleteBylawFromList(bylawId, bylawNumber, bylawTitle, onSuccess) {
    // Call the deleteBylaw function from deleteBylaw.js
    if (window.deleteBylaw) {
        window.deleteBylaw(bylawId, bylawNumber, bylawTitle, onSuccess);
    } else {
        console.error("deleteBylaw function not found. Make sure deleteBylaw.js is loaded.");
    }
}
