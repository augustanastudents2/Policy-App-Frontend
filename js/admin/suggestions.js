// Load and display suggestions from the API
document.addEventListener("DOMContentLoaded", () => {
    const suggestionsList = document.getElementById("suggestionsList");
    if (!suggestionsList) return;

    const token = localStorage.getItem("accessToken");
    if (!token) {
        // Not logged in, redirect to login page
        alert("Please login to view suggestions.");
        window.location.href = "admin/login.html";
        return;
    }

    // Load suggestions on page load
    loadSuggestions();

    // Handle search functionality
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase();
            filterSuggestions(query);
        });
    }
});

/**
 * Loads all suggestions from the API and displays them.
 */
async function loadSuggestions() {
    const suggestionsList = document.getElementById("suggestionsList");
    if (!suggestionsList) return;

    const token = localStorage.getItem("accessToken");
    if (!token) {
        console.error("No access token found");
        return;
    }

    try {
        // Show loading state
        suggestionsList.innerHTML = '<div class="empty-state"><div class="empty-state-text">Loading suggestions...</div></div>';

        // Fetch suggestions (now includes policy/bylaw info in response)
        const suggestionsResponse = await fetch("https://asa-policy-backend.onrender.com/api/suggestions", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        if (!suggestionsResponse.ok) {
            if (suggestionsResponse.status === 401 || suggestionsResponse.status === 403) {
                alert("You don't have permission to view suggestions. Please login with an admin or policy_working_group account.");
                window.location.href = "admin/login.html";
                return;
            }
            throw new Error(`Failed to load suggestions: ${suggestionsResponse.status}`);
        }

        const suggestions = await suggestionsResponse.json();
        console.log("Suggestions loaded:", suggestions);

        if (suggestions.length === 0) {
            suggestionsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">💡</div>
                    <div class="empty-state-text">No suggestions found</div>
                    <div class="empty-state-subtext">Student suggestions will appear here</div>
                </div>
            `;
            return;
        }

        // Sort by date (newest first) - API already orders by created_at desc, but ensure it's sorted
        const sortedSuggestions = [...suggestions].sort((a, b) => {
            const dateA = new Date(a.created_at || 0);
            const dateB = new Date(b.created_at || 0);
            return dateB - dateA;
        });

        // Render suggestions (policy/bylaw info is now included in each suggestion)
        let html = sortedSuggestions.map(suggestion => renderSuggestionItem(suggestion)).join('');
        suggestionsList.innerHTML = html;
    } catch (err) {
        console.error("Error loading suggestions:", err);
        suggestionsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <div class="empty-state-text">Error loading suggestions</div>
                <div class="empty-state-subtext">${err.message}</div>
            </div>
        `;
    }
}

/**
 * Renders a single suggestion item.
 * @param {Object} suggestion - Suggestion object from the API (includes policy_id_text, policy_name, bylaw_number, bylaw_title).
 * @returns {string} HTML string for the suggestion item.
 */
function renderSuggestionItem(suggestion) {
    const date = suggestion.created_at ? new Date(suggestion.created_at).toLocaleDateString() : 'N/A';
    const suggestionId = suggestion.id;
    const suggestionText = suggestion.suggestion || '';
    const status = suggestion.status || 'pending';
    
    // Determine reference text using fields directly from API response
    let referenceText = 'General';
    if (suggestion.policy_id_text && suggestion.policy_name) {
        referenceText = `Policy: ${suggestion.policy_id_text} - ${suggestion.policy_name}`;
    } else if (suggestion.bylaw_number !== null && suggestion.bylaw_number !== undefined && suggestion.bylaw_title) {
        referenceText = `Bylaw #${suggestion.bylaw_number}: ${suggestion.bylaw_title}`;
    } else if (suggestion.policy_id) {
        // Fallback if policy info not available
        referenceText = `Policy: ${suggestion.policy_id.substring(0, 8)}...`;
    } else if (suggestion.bylaw_id) {
        // Fallback if bylaw info not available
        referenceText = `Bylaw: ${suggestion.bylaw_id.substring(0, 8)}...`;
    }

    return `
        <div class="suggestion-item" data-id="${suggestionId}" data-suggestion="${suggestionText.toLowerCase()}">
            <div class="suggestion-header">
                <div class="suggestion-meta">
                    <div class="suggestion-policy">${referenceText}</div>
                    <div class="suggestion-date">${date}</div>
                </div>
                <div class="suggestion-actions">
                    <button class="btn btn-secondary" onclick="deleteSuggestion('${suggestionId}', '${suggestionText.substring(0, 50).replace(/'/g, "\\'")}', loadSuggestions)">Delete</button>
                </div>
            </div>
            <div class="suggestion-content">${suggestionText}</div>
        </div>
    `;
}

/**
 * Filters suggestions based on search query.
 * @param {string} query - The search query string.
 */
function filterSuggestions(query) {
    const items = document.querySelectorAll('.suggestion-item');
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        const suggestionText = item.getAttribute('data-suggestion') || '';
        const shouldShow = text.includes(query) || suggestionText.includes(query);
        item.style.display = shouldShow ? 'block' : 'none';
    });
}

// Note: deleteSuggestion is exported from deleteSuggestion.js
