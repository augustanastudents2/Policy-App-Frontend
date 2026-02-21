// ============================================
// ASA Policy App - Policies Page JavaScript
// ============================================

// API Configuration
const API_BASE_URL = window.API_BASE_URL || 'https://asa-policy-backend.onrender.com';

/**
 * Makes an API request with error handling
 * @param {string} endpoint - API endpoint (e.g., '/api/policies/approved')
 * @param {Object} options - Fetch options (method, body, headers, etc.)
 * @returns {Promise<Object>} The response data or throws an error
 */
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
    };
    
    const config = { ...defaultOptions, ...options };
    
    try {
        const response = await fetch(url, config);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Resource not found');
            } else if (response.status >= 500) {
                throw new Error('Server error. Please try again later.');
            } else {
                const error = await response.json().catch(() => ({ detail: 'Request failed' }));
                throw new Error(error.detail || 'Request failed');
            }
        }
        
        // Handle 204 No Content responses
        if (response.status === 204) {
            return null;
        }
        
        return await response.json();
    } catch (error) {
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            throw new Error('Network error. Please check your connection and try again.');
        }
        throw error;
    }
}

/** 
 * Gets the human-readable section name from a section number.
 * @param {string|number} section - The section number (1, 2, or 3).
 * @returns {string} The formatted section name, or "Section {number}" if not found.
 */
function getSectionName(section) {
    const sectionNames = {
        '1': 'Organizational Identity & Values',
        '2': 'Governance & Elections',
        '3': 'Operations, Staff & Finance'
    };
    return sectionNames[section] || `Section ${section}`;
}

/**
 * Sorts policy items by policy number in ascending order.
 * Handles policy IDs like "1.1.1", "1.1.2", "2.3.1" by comparing numeric parts.
 * @param {Array<Object>} items - Array of policy items with policyId property.
 * @returns {Array<Object>} Sorted array of policy items.
 */
function sortItemsByPolicyNumber(items) {
    return items.sort((a, b) => {
        const policyIdA = a.policyId || '';
        const policyIdB = b.policyId || '';
        
        // Split policy IDs by dots and convert to numbers for comparison
        const partsA = policyIdA.split('.').map(part => {
            const num = parseInt(part, 10);
            return isNaN(num) ? 0 : num;
        });
        const partsB = policyIdB.split('.').map(part => {
            const num = parseInt(part, 10);
            return isNaN(num) ? 0 : num;
        });
        
        // Compare each part numerically
        const maxLength = Math.max(partsA.length, partsB.length);
        for (let i = 0; i < maxLength; i++) {
            const partA = partsA[i] || 0;
            const partB = partsB[i] || 0;
            
            if (partA < partB) return -1;
            if (partA > partB) return 1;
        }
        
        // If all parts are equal, compare as strings as fallback
        return policyIdA.localeCompare(policyIdB);
    });
}

/**
 * Retrieves all approved policies from the API.
 * @param {string|null} sectionName - Optional section filter (full section name like "Organizational Identity & Values"). If provided, only returns policies from that section.
 * @returns {Promise<Array<Object>>} An array of approved policy objects.
 */
async function getApprovedPolicies(sectionName = null) {
    try {
        // Build query string with optional section parameter (use full section name)
        let endpoint = '/api/policies/approved';
        if (sectionName) {
            endpoint += `?section=${encodeURIComponent(sectionName)}`;
        }
        
        const policies = await apiRequest(endpoint);
        console.log('Approved policies:', policies);
        // Map API field names to frontend field names
        const mappedPolicies = policies.map(policy => ({
            id: policy.id, // Keep UUID for internal use
            policyId: policy.policy_id, // TEXT identifier like "1.1.1"
            name: policy.policy_name,
            policyName: policy.policy_name, // Keep both for compatibility
            section: policy.section,
            content: policy.policy_content,
            policyContent: policy.policy_content, // Keep both for compatibility
            status: policy.status,
            createdAt: policy.created_at,
            updatedAt: policy.updated_at,
            createdBy: policy.created_by,
            updatedBy: policy.updated_by
        }));    
        console.log('Mapped policies:', mappedPolicies);
        return mappedPolicies;
    } catch (error) {
        console.error('Error fetching policies:', error);
        return [];
    }
}

// State
let openSections = [1, 2, 3]; // Start with all sections open
let searchTerm = "";
let currentPolicyIds = new Set(); // Track current policy IDs to detect new ones
let pollingInterval = null; // Store polling interval ID

/**
 * Renders all policy sections with their cards in the sections container.
 * Fetches policies by section from the API and filters based on the current search term.
 * Falls back to fetching all policies if section-based fetching fails.
 * @returns {Promise<void>}
 */
async function renderSections() {
    const container = document.getElementById('sectionsContainer');
    if (!container) {
        console.error('sectionsContainer not found in DOM');
        return;
    }
    
    container.innerHTML = '';
    console.log('Starting renderSections...');

    // Define sections to render
    const sections = [
        { id: 1, title: getSectionName('1'), sectionKey: '1' },
        { id: 2, title: getSectionName('2'), sectionKey: '2' },
        { id: 3, title: getSectionName('3'), sectionKey: '3' }
    ];

    let sectionsWithItems = [];
    let useFallback = false;

    try {
        // Try fetching policies for each section in parallel
        const sectionPromises = sections.map(async (section) => {
            try {
                console.log(`Fetching policies for section: ${section.title}...`);
                // Fetch policies for this specific section from API using full section name
                const policies = await getApprovedPolicies(section.title);
                console.log(`Section ${section.title} policies:`, policies);
                
                // Map policies to items format
                const items = policies.map(policy => ({
                    id: policy.id,
                    policyId: policy.policyId || policy.id,
                    name: policy.name || policy.policyName || 'Untitled',
                    section: section.sectionKey,
                    sectionName: section.title
                }));

                // Apply client-side search filter if search term exists
                let filteredItems = items;
                if (searchTerm !== '') {
                    filteredItems = items.filter(item => 
                        (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (item.policyId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (item.sectionName || '').toLowerCase().includes(searchTerm.toLowerCase())
                    );
                }

                // Sort items by policy number in ascending order
                filteredItems = sortItemsByPolicyNumber(filteredItems);

                return {
                    ...section,
                    items: filteredItems
                };
            } catch (error) {
                console.error(`Error fetching section ${section.title}:`, error);
                useFallback = true;
                return {
                    ...section,
                    items: []
                };
            }
        });

        // Wait for all sections to be fetched
        sectionsWithItems = await Promise.all(sectionPromises);
        console.log('All sections fetched:', sectionsWithItems);
    } catch (error) {
        console.error('Error in section-based fetch, falling back to fetch all:', error);
        useFallback = true;
    }

    // Fallback: If section-based fetching had errors, try fetching all policies
    if (useFallback) {
        console.log('Using fallback: fetching all policies...');
        try {
            const allPolicies = await getApprovedPolicies();
            console.log('All policies fetched:', allPolicies);
            
            // Group policies by section
            const sectionsMap = {};
            sections.forEach(section => {
                sectionsMap[section.sectionKey] = {
                    ...section,
                    items: []
                };
            });

            allPolicies.forEach(policy => {
                const section = policy.section || '1';
                if (sectionsMap[section]) {
                    sectionsMap[section].items.push({
                        id: policy.id,
                        policyId: policy.policyId || policy.id,
                        name: policy.name || policy.policyName || 'Untitled',
                        section: section,
                        sectionName: getSectionName(section)
                    });
                }
            });

            // Apply search filter and sort
            sectionsWithItems = Object.values(sectionsMap).map(section => {
                let filteredItems = section.items;
                if (searchTerm !== '') {
                    filteredItems = section.items.filter(item => 
                        (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (item.policyId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (item.sectionName || '').toLowerCase().includes(searchTerm.toLowerCase())
                    );
                }
                // Sort items by policy number in ascending order
                filteredItems = sortItemsByPolicyNumber(filteredItems);
                
                return {
                    ...section,
                    items: filteredItems
                };
            });
        } catch (error) {
            console.error('Error in fallback fetch:', error);
        }
    }
    
    // Render each section
    sectionsWithItems.forEach(section => {
        // Show section if it has items, or if search is empty (to show empty sections)
        const shouldShow = section.items.length > 0 || searchTerm === '';
        console.log(`Section ${section.title}: ${section.items.length} items, shouldShow: ${shouldShow}`);
        
        if (shouldShow) {
            const sectionEl = createSectionElement(section, section.items);
            container.appendChild(sectionEl);
        }
    });

    if (container.children.length === 0) {
        container.innerHTML = '<div class="no-results">No results found</div>';
        console.log('No sections rendered - showing no results message');
    } else {
        console.log(`Rendered ${container.children.length} sections`);
    }
    
    // Update current policy IDs for change detection
    currentPolicyIds.clear();
    sectionsWithItems.forEach(section => {
        section.items.forEach(item => {
            currentPolicyIds.add(item.policyId || item.id);
        });
    });
}

/**
 * Completed by Dominic del Rosario, with steps from Claude AI
 * Creates a DOM element for a policy section with collapsible header and content.
 * @param {Object} section - The section object containing id, title, and items.
 * @param {Array<Object>} items - Array of policy items to display in the section.
 * @returns {HTMLElement} The created section DOM element.
 */
function createSectionElement(section, items) {
    const isOpen = openSections.includes(section.id);
    
    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'section';
    sectionDiv.setAttribute('data-section-id', section.id); // Add data attribute for identification
    
    const header = document.createElement('div');
    header.className = 'section-header';
    header.innerHTML = `
        <h2 class="section-title">${section.title}</h2>
        <span class="section-arrow ${isOpen ? 'open' : ''}">▼</span>
    `;
    header.onclick = () => toggleSection(section.id);
    
    const content = document.createElement('div');
    content.className = `section-content ${isOpen ? 'open' : ''}`;
    
    if (items.length > 0) {
        const grid = document.createElement('div');
        grid.className = 'cards-grid';
        
        items.forEach(item => {
            const card = createCardElement(item);
            grid.appendChild(card);
        });
        
        content.appendChild(grid);
    } else {
        content.innerHTML = '<div class="no-results">No items in this section</div>';
    }
    
    sectionDiv.appendChild(header);
    sectionDiv.appendChild(content);
    
    return sectionDiv;
}

/**
 * Completed by Dominic del Rosario, with steps from Claude AI
 * Creates a DOM element for a policy card with click handler.
 * @param {Object} item - The policy item object containing id, name, sectionName, and policyId.
 * @returns {HTMLElement} The created card DOM element.
 */
function createCardElement(item) {
    const card = document.createElement('div');
    card.className = 'card';
    card.onclick = () => handleCardClick(item);
    
    // Display: Policy name (bold, top), Section name, Policy ID
    card.innerHTML = `
        <div class="card-policy-name">${item.name || 'Untitled'}</div>
        <div class="card-section-name">${item.sectionName}</div>
        <div class="card-policy-id">${item.policyId}</div>
    `;
    
    return card;
}

/**
 * Completed by Dominic del Rosario,
 * Toggles the open/closed state of a policy section.
 * Updates the DOM directly without re-rendering everything.
 * @param {number} sectionId - The ID of the section to toggle (1, 2, or 3).
 * @returns {void}
 */
function toggleSection(sectionId) {
    // Update the openSections array
    const index = openSections.indexOf(sectionId);
    if (index > -1) {
        openSections.splice(index, 1);
    } else {
        openSections.push(sectionId);
    }
    
    // Find the section element in the DOM using data attribute
    const container = document.getElementById('sectionsContainer');
    if (!container) return;
    
    const sectionEl = container.querySelector(`[data-section-id="${sectionId}"]`);
    if (!sectionEl) return;
    
    const content = sectionEl.querySelector('.section-content');
    const arrow = sectionEl.querySelector('.section-arrow');
    
    if (content && arrow) {
        const isOpen = openSections.includes(sectionId);
        
        // Toggle the 'open' class
        if (isOpen) {
            content.classList.add('open');
            arrow.classList.add('open');
        } else {
            content.classList.remove('open');
            arrow.classList.remove('open');
        }
    }
}

/**
 * Completed by Dominic del Rosario, 
 * Handles click events on policy cards by navigating to the policy detail page.
 * Uses policy_id (TEXT like "1.1.1") for navigation since API endpoint expects TEXT.
 * @param {Object} item - The policy item object containing the policyId to navigate to.
 * @returns {void}
 */
function handleCardClick(item) {
    // Navigate to policy detail page with the policy_id (TEXT) as a query parameter
    // The API endpoint /api/policies/{policy_id} expects TEXT like "1.1.1"
    window.location.href = `/frontend/public/policy-detail.html?id=${item.policyId || item.id}`;
}

/**
 * Completed by Dominic del Rosario, 
 * Handles search input events for filtering policies.
 * Opens all sections when a search term is entered.
 * @param {Event} e - The input event object.
 * @returns {Promise<void>}
 */
async function handleSearch(e) {
    searchTerm = e.target.value;
    
    // Open all sections when searching
    if (searchTerm !== '') {
        openSections = [1, 2, 3];
    }
    
    await renderSections();
}

/**
 * Loads and displays policy detail information on the policy detail page.
 * Retrieves policy data from API using policy_id (TEXT like "1.1.1").
 * @returns {Promise<void>}
 */
async function loadPolicyDetail() {
    const container = document.querySelector('.policy-detail-container');
    if (!container) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const policyId = urlParams.get('id'); // This should be policy_id TEXT like "1.1.1"
    
    if (!policyId) {
        container.innerHTML = '<div class="no-results">Policy not found</div>';
        return;
    }
    
    try {
        // API endpoint expects policy_id (TEXT like "1.1.1"), not UUID
        const policy = await apiRequest(`/api/policies/${policyId}`);
        
        // Map API fields to frontend fields
        const mappedPolicy = {
            id: policy.id,
            policyId: policy.policy_id,
            name: policy.policy_name,
            policyName: policy.policy_name,
            section: policy.section,
            content: policy.policy_content,
            policyContent: policy.policy_content,
            status: policy.status,
            updatedAt: policy.updated_at
        };
        
        // Update page content
        const policyNumber = document.querySelector('.policy-number');
        const policyTitle = document.querySelector('.policy-title');
        const policyContent = document.querySelector('.policy-content');
        const policyUpdated = document.querySelector('.policy-updated');
        
        if (policyNumber) {
            policyNumber.textContent = `Policy # ${mappedPolicy.policyId}`;
        }
        
        if (policyTitle) {
            policyTitle.textContent = mappedPolicy.name || 'Untitled';
        }
        
        if (policyContent) {
            const content = mappedPolicy.content || 'No content available.';
            policyContent.innerHTML = `<p>${content}</p>`;
        }
        
        if (policyUpdated && mappedPolicy.updatedAt) {
            const date = new Date(mappedPolicy.updatedAt);
            policyUpdated.textContent = `Last Updated: ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }
        
        // Update sidebar with other policies
        await updatePolicySidebar(mappedPolicy);
    } catch (error) {
        console.error('Error loading policy detail:', error);
        container.innerHTML = '<div class="no-results">Policy not found</div>';
    }
}

/**
 * Updates the policy sidebar with links to other approved policies.
 * Groups policies by section and excludes the current policy.
 * @param {Object} currentPolicy - The currently displayed policy object.
 * @returns {Promise<void>}
 */
async function updatePolicySidebar(currentPolicy) {
    const sidebar = document.querySelector('.policy-sidebar');
    if (!sidebar) return;
    
    const approvedPolicies = await getApprovedPolicies();
    // Filter out current policy by policy_id (TEXT) since that's what we use for navigation
    const otherPolicies = approvedPolicies.filter(p => p.policyId !== currentPolicy.policyId);
    
    if (otherPolicies.length === 0) {
        sidebar.innerHTML = '<h3 class="sidebar-title">Other Policies</h3><div class="sidebar-section"><p>No other policies available</p></div>';
        return;
    }
    
    // Group by section
    const bySection = {};
    otherPolicies.forEach(policy => {
        const section = policy.section || '1';
        if (!bySection[section]) {
            bySection[section] = [];
        }
        bySection[section].push(policy);
    });
    
    let html = '<h3 class="sidebar-title">Other Policies</h3>';
    
    Object.keys(bySection).sort().forEach(section => {
        html += `<div class="sidebar-section">`;
        html += `<h4 class="sidebar-section-title">${getSectionName(section)}</h4>`;
        // Sort policies by policy number before displaying
        const sortedPolicies = sortItemsByPolicyNumber(bySection[section]);
        sortedPolicies.forEach(policy => {
            const name = policy.name || policy.policyName || 'Untitled';
            const policyId = policy.policyId || policy.id;
            // Use policy_id (TEXT) for navigation since API endpoint expects TEXT
            html += `<a href="/frontend/public/policy-detail.html?id=${policy.policyId}" class="sidebar-link-small">${policyId} - ${name}</a>`;
        });
        html += `</div>`;
    });
    
    sidebar.innerHTML = html;
}

/**
 * Checks for newly approved policies and updates the page if found.
 * Preserves the current open/closed state of sections.
 * @returns {Promise<void>}
 */
async function checkForNewPolicies() {
    // Only check if we're on the policies page
    const container = document.getElementById('sectionsContainer');
    if (!container) return;
    
    try {
        console.log('Checking for new policies...');
        
        // Fetch all approved policies
        const allPolicies = await getApprovedPolicies();
        
        // Check if there are any new policies
        const newPolicyIds = new Set();
        allPolicies.forEach(policy => {
            const policyId = policy.policyId || policy.id;
            newPolicyIds.add(policyId);
            if (!currentPolicyIds.has(policyId)) {
                console.log('New policy found:', policyId, policy.name || policy.policyName);
            }
        });
        
        // If we have new policies, update the page
        if (newPolicyIds.size > currentPolicyIds.size) {
            const newCount = newPolicyIds.size - currentPolicyIds.size;
            console.log(`Found ${newCount} new policy/policies. Updating page...`);
            
            // Show notification
            showNewPoliciesNotification(newCount);
            
            // Re-render sections (this will preserve open/closed state via openSections array)
            await renderSections();
        }
    } catch (error) {
        console.error('Error checking for new policies:', error);
        // Silently fail - don't disrupt user experience
    }
}

/**
 * Shows a notification when new policies are found.
 * @param {number} count - Number of new policies found.
 * @returns {void}
 */
function showNewPoliciesNotification(count) {
    // Remove existing notification if any
    const existing = document.querySelector('.new-policies-notification');
    if (existing) {
        existing.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'new-policies-notification';
    notification.innerHTML = `
        <span>✨ ${count} new ${count === 1 ? 'policy' : 'policies'} ${count === 1 ? 'has' : 'have'} been approved!</span>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    // Add styles if not already in the page
    if (!document.getElementById('newPoliciesNotificationStyles')) {
        const style = document.createElement('style');
        style.id = 'newPoliciesNotificationStyles';
        style.textContent = `
            .new-policies-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: #4CAF50;
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                z-index: 1000;
                display: flex;
                align-items: center;
                gap: 15px;
                animation: slideIn 0.3s ease-out;
                max-width: 350px;
            }
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            .notification-close {
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                line-height: 1;
            }
            .notification-close:hover {
                opacity: 0.8;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
    
    // Add slideOut animation if not already defined
    if (!document.getElementById('slideOutAnimation')) {
        const style = document.createElement('style');
        style.id = 'slideOutAnimation';
        style.textContent = `
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Starts polling for new policies.
 * Checks every 30 seconds (configurable).
 * @param {number} intervalSeconds - Polling interval in seconds (default: 30).
 * @returns {void}
 */
function startPolicyPolling(intervalSeconds = 30) {
    // Clear any existing polling
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }
    
    // Only poll if we're on the policies page
    const container = document.getElementById('sectionsContainer');
    if (!container) return;
    
    console.log(`Starting policy polling (checking every ${intervalSeconds} seconds)...`);
    
    // Check immediately, then set up interval
    checkForNewPolicies();
    pollingInterval = setInterval(checkForNewPolicies, intervalSeconds * 1000);
    
    // Stop polling when page becomes hidden (to save resources)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (pollingInterval) {
                clearInterval(pollingInterval);
                pollingInterval = null;
                console.log('Polling paused (page hidden)');
            }
        } else {
            // Resume polling when page becomes visible
            if (!pollingInterval && container) {
                checkForNewPolicies();
                pollingInterval = setInterval(checkForNewPolicies, intervalSeconds * 1000);
                console.log('Polling resumed (page visible)');
            }
        }
    });
}

/**
 * Stops polling for new policies.
 * @returns {void}
 */
function stopPolicyPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
        console.log('Policy polling stopped');
    }
}

/**
 * Downloads the current policy content as a PDF.
 * Extracts policy information from the DOM and generates a formatted PDF document.
 * @returns {void}
 */
function downloadPolicyAsPDF() {
    // Check if jsPDF is available
    if (typeof window.jspdf === 'undefined') {
        console.error('jsPDF library not loaded');
        alert('PDF generation library not available. Please refresh the page and try again.');
        return;
    }

    // Get policy content from DOM
    const policyNumber = document.querySelector('.policy-number')?.textContent || '';
    const policyTitle = document.querySelector('.policy-title')?.textContent || '';
    const policyUpdated = document.querySelector('.policy-updated')?.textContent || '';
    const policyContent = document.querySelector('.policy-content')?.innerText || '';

    // Check if policy content has been loaded
    if (!policyTitle || policyTitle.trim() === '') {
        alert('Policy content is still loading. Please wait a moment and try again.');
        return;
    }

    // Initialize jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    // Set margins
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxWidth = pageWidth - (margin * 2);
    let yPosition = margin;

    // Set font styles
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    
    // Add policy number
    if (policyNumber) {
        doc.text(policyNumber, margin, yPosition);
        yPosition += 8;
    }

    // Add policy title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    const titleLines = doc.splitTextToSize(policyTitle.trim(), maxWidth);
    doc.text(titleLines, margin, yPosition);
    yPosition += titleLines.length * 7 + 5;

    // Add last updated date
    if (policyUpdated) {
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(policyUpdated, margin, yPosition);
        yPosition += 8;
        doc.setTextColor(0, 0, 0); // Reset to black
    }

    // Add horizontal line
    yPosition += 3;
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;

    // Add policy content
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    const contentText = policyContent.trim() || 'No content available.';
    const contentLines = doc.splitTextToSize(contentText, maxWidth);
    
    // Handle multi-page content
    contentLines.forEach((line) => {
        // Check if we need a new page
        if (yPosition > pageHeight - margin - 10) {
            doc.addPage();
            yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += 6;
    });

    // Add footer with page numbers
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
            `Page ${i} of ${totalPages}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
        );
    }

    // Generate filename
    const filename = policyNumber.replace(/\s+/g, '_').replace(/#/g, '') + '_' + 
                     policyTitle.replace(/[^a-z0-9]/gi, '_').substring(0, 30) + '.pdf';

    // Save the PDF
    doc.save(filename);
}

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    const searchInput = document.getElementById('searchInput');
    const sectionsContainer = document.getElementById('sectionsContainer');
    const policyDetailContainer = document.querySelector('.policy-detail-container');
    
    // Determine page type from URL path
    const currentPath = window.location.pathname;
    const isPolicyDetailPage = currentPath.includes('policy-detail.html');
    
    if (sectionsContainer) {
        // Policies page
        if (searchInput) {
            searchInput.addEventListener('input', handleSearch);
        }
        await renderSections();
        
        // Start polling for new policies (check every 30 seconds)
        startPolicyPolling(30);
        
        // Clean up polling when page unloads
        window.addEventListener('beforeunload', stopPolicyPolling);
    } else if (policyDetailContainer) {
        // Policy detail page
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        
        if (id && isPolicyDetailPage) {
            await loadPolicyDetail();
            
            // Add event listener for download PDF button
            const downloadBtn = document.querySelector('.download-pdf-btn');
            if (downloadBtn) {
                downloadBtn.addEventListener('click', downloadPolicyAsPDF);
            }
        }
    }
});
