// Load and display draft policies and bylaws for approval
document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
        alert("Please login to view approvals.");
        window.location.href = "admin/login.html";
        return;
    }

    // Load pending items on page load
    loadPendingPolicies();
    loadPendingBylaws();
    initSearch();
});

/**
 * Loads draft policies from the API and displays them
 */
async function loadPendingPolicies() {
    const container = document.getElementById('pendingPoliciesList');
    if (!container) return;

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-text">Loading policies...</div></div>';

        const response = await fetch(
            `https://asa-policy-backend.onrender.com/api/policies?status=draft`,
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
        const draftPolicies = policies.filter(p => p.status === 'draft');

        if (draftPolicies.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">✅</div>
                    <div class="empty-state-text">No pending policies</div>
                    <div class="empty-state-subtext">All policies have been reviewed</div>
                </div>
            `;
            return;
        }

        container.innerHTML = draftPolicies.map(policy => renderApprovalItem(policy, 'policy')).join('');
    } catch (err) {
        console.error("Error loading policies:", err);
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <div class="empty-state-text">Error loading policies</div>
                <div class="empty-state-subtext">${err.message}</div>
            </div>
        `;
    }
}

/**
 * Loads draft bylaws from the API and displays them
 */
async function loadPendingBylaws() {
    const container = document.getElementById('pendingBylawsList');
    if (!container) return;

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-text">Loading bylaws...</div></div>';

        const response = await fetch(
            `https://asa-policy-backend.onrender.com/api/bylaws?status=draft`,
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
        const draftBylaws = bylaws.filter(b => b.status === 'draft');

        if (draftBylaws.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">✅</div>
                    <div class="empty-state-text">No pending bylaws</div>
                    <div class="empty-state-subtext">All bylaws have been reviewed</div>
                </div>
            `;
            return;
        }

        container.innerHTML = draftBylaws.map(bylaw => renderApprovalItem(bylaw, 'bylaw')).join('');
    } catch (err) {
        console.error("Error loading bylaws:", err);
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <div class="empty-state-text">Error loading bylaws</div>
                <div class="empty-state-subtext">${err.message}</div>
            </div>
        `;
    }
}

/**
 * Renders an approval item (policy or bylaw)
 * @param {Object} item - Policy or bylaw object from API
 * @param {string} type - 'policy' or 'bylaw'
 * @returns {string} HTML string for the approval item
 */
function renderApprovalItem(item, type) {
    const isPolicy = type === 'policy';
    const title = isPolicy ? (item.policy_name || item.name) : (item.bylaw_title || item.title);
    const id = isPolicy ? item.policy_id : `Bylaw #${item.bylaw_number || item.number}`;
    const content = isPolicy ? (item.policy_content || item.content) : (item.bylaw_content || item.content);
    const preview = content ? (content.substring(0, 200) + (content.length > 200 ? '...' : '')) : 'No content';
    const createdDate = item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A';
    const itemId = item.id; // UUID for both
    const identifier = isPolicy ? item.policy_id : itemId; // For policies, use policy_id (TEXT) for approve endpoint

    return `
        <div class="approval-item" data-id="${itemId}" data-identifier="${identifier}" data-type="${type}">
            <div class="approval-item-header">
                <div class="approval-item-info">
                    <h3 class="approval-item-title">${title || 'Untitled'}</h3>
                    <div class="approval-item-meta">
                        <span class="approval-item-id">${id}</span>
                        ${isPolicy ? `<span class="approval-item-section">${getSectionName(item.section || 'N/A')}</span>` : ''}
                        <span class="approval-item-date">Submitted: ${createdDate}</span>
                    </div>
                </div>
                <div class="approval-item-actions">
                    <button class="btn btn-view" onclick="viewItem('${itemId}', '${type}')">View</button>
                </div>
            </div>
            <div class="approval-item-content">
                <p>${preview.replace(/\n/g, ' ')}</p>
            </div>
            <div class="approval-item-footer">
                <button class="btn btn-approve" onclick="approveItem('${identifier}', '${type}')">✓ Approve</button>
                <button class="btn btn-disapprove" onclick="disapproveItem('${identifier}', '${type}')">✗ Disapprove</button>
            </div>
        </div>
    `;
}

/**
 * Gets the human-readable section name from a section number or name
 * @param {string} section - The section number or name
 * @returns {string} The formatted section name
 */
function getSectionName(section) {
    const sectionNames = {
        '1': 'Organizational Identity & Values',
        '2': 'Governance & Elections',
        '3': 'Operations, Staff & Finance',
        'Organizational Identity & Values': 'Organizational Identity & Values',
        'Governance & Elections': 'Governance & Elections',
        'Operations, Staff & Finance': 'Operations, Staff & Finance'
    };
    return sectionNames[section] || `Section ${section}`;
}

/**
 * Switches between policies and bylaws tabs
 * @param {string} tab - 'policies' or 'bylaws'
 */
function switchTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tab}Tab`).classList.add('active');
}

/**
 * Navigates to view a policy or bylaw
 * @param {string} id - UUID of the item
 * @param {string} type - 'policy' or 'bylaw'
 */
function viewItem(id, type) {
    if (type === 'policy') {
        window.location.href = `policy-view.html?id=${id}`;
    } else {
        window.location.href = `bylaw-view.html?id=${id}`;
    }
}

/**
 * Initializes search functionality
 */
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const query = e.target.value.toLowerCase();
            filterApprovals(query);
        });
    }
}

/**
 * Filters approval items based on search query
 * @param {string} query - The search query string
 */
function filterApprovals(query) {
    const items = document.querySelectorAll('.approval-item');
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query) ? 'block' : 'none';
    });
}

/**
 * Wrapper function for approveItem to handle both policies and bylaws
 * @param {string} identifier - Policy ID (TEXT) for policies, UUID for bylaws
 * @param {string} type - 'policy' or 'bylaw'
 */
async function approveItem(identifier, type) {
    if (type === 'policy') {
        const approvePolicy = window.approvePolicy;
        if (approvePolicy) {
            await approvePolicy(identifier, () => {
                if (typeof loadPendingPolicies === 'function') {
                    loadPendingPolicies();
                }
                if (typeof loadPendingBylaws === 'function') {
                    loadPendingBylaws();
                }
            });
        }
    } else if (type === 'bylaw') {
        const approveBylaw = window.approveBylaw;
        if (approveBylaw) {
            await approveBylaw(identifier, () => {
                if (typeof loadPendingPolicies === 'function') {
                    loadPendingPolicies();
                }
                if (typeof loadPendingBylaws === 'function') {
                    loadPendingBylaws();
                }
            });
        }
    }
}

/**
 * Wrapper function for disapproveItem to handle both policies and bylaws
 * @param {string} identifier - Policy ID (TEXT) for policies, UUID for bylaws
 * @param {string} type - 'policy' or 'bylaw'
 */
async function disapproveItem(identifier, type) {
    if (type === 'policy') {
        const disapprovePolicy = window.disapprovePolicy;
        if (disapprovePolicy) {
            await disapprovePolicy(identifier, () => {
                if (typeof loadPendingPolicies === 'function') {
                    loadPendingPolicies();
                }
                if (typeof loadPendingBylaws === 'function') {
                    loadPendingBylaws();
                }
            });
        }
    } else if (type === 'bylaw') {
        const disapproveBylaw = window.disapproveBylaw;
        if (disapproveBylaw) {
            await disapproveBylaw(identifier, () => {
                if (typeof loadPendingPolicies === 'function') {
                    loadPendingPolicies();
                }
                if (typeof loadPendingBylaws === 'function') {
                    loadPendingBylaws();
                }
            });
        }
    }
}

// Export functions for global access
window.switchTab = switchTab;
window.viewItem = viewItem;
window.loadPendingPolicies = loadPendingPolicies;
window.loadPendingBylaws = loadPendingBylaws;
window.approveItem = approveItem;
window.disapproveItem = disapproveItem;
