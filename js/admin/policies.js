// Load and display policies from the API
var API_BASE_URL = window.API_BASE_URL || "https://policy-app-backend.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
    const policiesList = document.getElementById("policiesList");
    if (!policiesList) return;

    const token = localStorage.getItem("accessToken");
    if (!token) {
        // Not logged in, redirect to login page
        alert("Please login to view policies.");
        window.location.href = "admin/login.html";
        return;
    }

    (async () => {
        // Prefetch sections so section headers render with latest names
        try {
            await window.Sections?.fetchSections?.();
        } catch {}
        // Load policies on page load
        loadPolicies();
    })();

    // Handle search functionality
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase();
            filterPolicies(query);
        });
    }
});

// If sections were updated in another tab, reload section names and re-render list.
window.addEventListener('storage', async (e) => {
    if (e.key !== 'asa_sections_updated_at') return;
    try {
        await window.Sections?.fetchSections?.();
    } catch {}
    try {
        await loadPolicies();
    } catch {}
});

/**
 * Gets the human-readable section name from a section number.
 * @param {string|number} section - The section number (1, 2, or 3).
 * @returns {string} The formatted section name.
 */
function getSectionName(section) {
    return window.Sections?.getSectionNameSyncPreferred
        ? window.Sections.getSectionNameSyncPreferred(section)
        : (section || 'N/A');
}

/**
 * Loads all policies from the API and displays them grouped by section.
 */
async function loadPolicies() {
    const policiesList = document.getElementById("policiesList");
    if (!policiesList) return;

    const token = localStorage.getItem("accessToken");
    if (!token) {
        console.error("No access token found");
        return;
    }

    try {
        // Show loading state
        policiesList.innerHTML = '<div class="empty-state"><div class="empty-state-text">Loading policies...</div></div>';

        const response = await fetch(
            `${API_BASE_URL}/api/policies`,
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
                alert("You don't have permission to view policies. Please login with an admin or policy_working_group account.");
                window.location.href = "admin/login.html";
                return;
            }
            throw new Error(`Failed to load policies: ${response.status}`);
        }

        const policies = await response.json();
        console.log("Policies loaded:", policies);

        // Group policies by section
        const grouped = groupPoliciesBySection(policies || []);
        console.log("Grouped policies:", grouped);

        // Prefer rendering based on sections list so new/empty sections still show.
        let sectionsList = [];
        try {
            sectionsList = await window.Sections?.fetchSections?.();
        } catch {}

        const sectionKeysFromPolicies = Object.keys(grouped);
        const sectionKeysFromApi = (sectionsList || []).map((s) => String(s.key));
        const mergedKeys = Array.from(new Set([...sectionKeysFromApi, ...sectionKeysFromPolicies]));

        // Render policies grouped by section with preferred order: 1, 2, 3, then anything else.
        let html = '';
        const preferredSectionOrder = ['1', '2', '3'];
        const preferredKeys = preferredSectionOrder.filter((k) => mergedKeys.includes(k));
        const otherKeys = mergedKeys
            .filter((k) => !preferredSectionOrder.includes(k))
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
        const sectionRenderOrder = [...preferredKeys, ...otherKeys];
        
        for (const section of sectionRenderOrder) {
            const sectionPolicies = grouped[section] || [];
            const sectionName = getSectionName(section);
            html += `
                <div class="policy-section expanded" data-section="${section}">
                    <div class="policy-section-header" onclick="toggleSection('${section}')">
                        <span class="policy-section-title">${sectionName}</span>
                        <span class="policy-section-toggle">▼</span>
                    </div>
                    <div class="policy-items">
                        ${
                            sectionPolicies.length > 0
                                ? sectionPolicies.map(policy => renderPolicyItem(policy)).join('')
                                : '<div class="empty-state"><div class="empty-state-text">No policies in this section</div></div>'
                        }
                    </div>
                </div>
            `;
        }

        // (No separate fallback needed; we always attempt to render all section keys.)

        if (!policies || policies.length === 0) {
            policiesList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📄</div>
                    <div class="empty-state-text">No policies found</div>
                    <div class="empty-state-subtext">Create your first policy to get started</div>
                </div>
            `;
        } else {
            policiesList.innerHTML = html;
        }
    } catch (err) {
        console.error("Error loading policies:", err);
        policiesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <div class="empty-state-text">Error loading policies</div>
                <div class="empty-state-subtext">${err.message}</div>
            </div>
        `;
    }
}

/**
 * Groups policies by their section.
 * @param {Array} policies - Array of policy objects.
 * @returns {Object} Object with section numbers as keys and arrays of policies as values.
 */
function groupPoliciesBySection(policies) {
    const grouped = {};
    policies.forEach(policy => {
        // Convert section to string to ensure consistent key matching
        let section = policy.section;
        if (section === null || section === undefined) {
            section = '1';
        } else {
            section = String(section);
        }
        
        if (!grouped[section]) {
            grouped[section] = [];
        }
        grouped[section].push(policy);
    });
    // Sort policies within each section by policy_id
    Object.keys(grouped).forEach(section => {
        grouped[section].sort((a, b) => {
            const aId = a.policy_id || '';
            const bId = b.policy_id || '';
            return aId.localeCompare(bId, undefined, { numeric: true, sensitivity: 'base' });
        });
    });
    console.log("Grouped by section:", grouped);
    return grouped;
}

/**
 * Renders a single policy item.
 * @param {Object} policy - Policy object from the API.
 * @returns {string} HTML string for the policy item.
 */
function renderPolicyItem(policy) {
    const status = policy.status || 'draft';
    const statusClass =
        status === 'approved' ? 'approved' :
        status === 'draft' ? 'draft' :
        status === 'disapproved' ? 'disapproved' :
        'pending';
    const statusText =
        status === 'approved' ? 'Approved' :
        status === 'draft' ? 'Draft' :
        status === 'disapproved' ? 'Disapproved' :
        'Pending';
    const policyId = policy.policy_id || policy.id || 'N/A';
    const policyName = policy.policy_name || 'Untitled Policy';
    const policyUuid = policy.id; // UUID for API calls

    return `
        <div class="policy-item" data-id="${policyUuid}" data-policy-id="${policyId}" data-name="${policyName.toLowerCase()}">
            <div class="policy-item-header">
                <div class="policy-item-title">${policyName}</div>
                <div class="policy-item-actions">
                    <button class="action-btn view" onclick="viewPolicy('${policyUuid}')" title="View">👁️</button>
                    <button class="action-btn edit" onclick="editPolicy('${policyUuid}')" title="Edit">✏️</button>
                    <button class="action-btn delete" onclick="deletePolicy('${policyId}', '${policyName}', loadPolicies)" title="Delete">🗑️</button>
                </div>
            </div>
            <div class="policy-item-meta">
                <div>ID: ${policyId}</div>
                <div class="policy-status ${statusClass}">${statusText}</div>
            </div>
        </div>
    `;
}

/**
 * Toggles the visibility of a policy section.
 * @param {string} section - The section number to toggle.
 */
function toggleSection(section) {
    const sectionEl = document.querySelector(`[data-section="${section}"]`);
    if (sectionEl) {
        sectionEl.classList.toggle('expanded');
        const toggle = sectionEl.querySelector('.policy-section-toggle');
        if (toggle) {
            toggle.textContent = sectionEl.classList.contains('expanded') ? '▼' : '▶';
        }
    }
}

/**
 * Filters policies based on search query.
 * @param {string} query - The search query string.
 */
function filterPolicies(query) {
    const items = document.querySelectorAll('.policy-item');
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        const policyName = item.getAttribute('data-name') || '';
        const shouldShow = text.includes(query) || policyName.includes(query);
        item.style.display = shouldShow ? 'block' : 'none';
    });

    // Hide sections that have no visible items
    const sections = document.querySelectorAll('.policy-section');
    sections.forEach(section => {
        const visibleItems = section.querySelectorAll('.policy-item[style*="block"], .policy-item:not([style*="none"])');
        const sectionItems = section.querySelectorAll('.policy-item');
        const hasVisibleItems = Array.from(visibleItems).some(item => {
            const style = item.getAttribute('style') || '';
            return !style.includes('display: none');
        });
        
        if (sectionItems.length > 0 && !hasVisibleItems) {
            section.style.display = 'none';
        } else {
            section.style.display = 'block';
        }
    });
}

/**
 * Navigates to the policy view page.
 * @param {string} id - The UUID of the policy.
 */
function viewPolicy(id) {
    window.location.href = `policy-view.html?id=${id}`;
}

/**
 * Navigates to the policy edit page.
 * @param {string} id - The UUID of the policy.
 */
function editPolicy(id) {
    window.location.href = `policy-form.html?id=${id}`;
}

// Export functions for global access
window.toggleSection = toggleSection;
window.viewPolicy = viewPolicy;
window.editPolicy = editPolicy;
// deletePolicy is exported from deletePolicy.js

