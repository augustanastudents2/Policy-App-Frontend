// ============================================
// ASA Policy App - Bylaws Page JavaScript
// ============================================

// API Configuration
const API_BASE_URL = window.API_BASE_URL || 'https://asa-policy-backend.onrender.com';

/**
 * Makes an API request with error handling
 * @param {string} endpoint - API endpoint (e.g., '/api/bylaws/approved')
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
 * Retrieves all approved bylaws from the API.
 * @returns {Promise<Array<Object>>} An array of approved bylaw objects.
 */
async function getApprovedBylaws() {
    try {
        const bylaws = await apiRequest('/api/bylaws/approved');
        // Map API field names to frontend field names
        return bylaws.map(bylaw => ({
            id: bylaw.id, // UUID
            bylawNumber: bylaw.bylaw_number,
            number: bylaw.bylaw_number, // Keep both for compatibility
            bylawTitle: bylaw.bylaw_title,
            title: bylaw.bylaw_title, // Keep both for compatibility
            bylawContent: bylaw.bylaw_content,
            content: bylaw.bylaw_content, // Keep both for compatibility
            status: bylaw.status,
            createdAt: bylaw.created_at,
            updatedAt: bylaw.updated_at,
            createdBy: bylaw.created_by,
            updatedBy: bylaw.updated_by
        }));
    } catch (error) {
        console.error('Error fetching bylaws:', error);
        return [];
    }
}

// State
let bylawSearchTerm = "";

/**
 * Renders all bylaw cards in the bylaws container.
 * Filters bylaws based on the current search term.
 * @returns {Promise<void>}
 */
async function renderBylaws() {
    const container = document.getElementById('bylawsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Get approved bylaws from API
    const approvedBylaws = await getApprovedBylaws();
    
    const filteredBylaws = approvedBylaws.filter(bylaw => {
        const title = (bylaw.title || bylaw.bylawTitle || '').toLowerCase();
        const number = (bylaw.number || bylaw.bylawNumber || '').toString().toLowerCase();
        const search = bylawSearchTerm.toLowerCase();
        return title.includes(search) || number.includes(search);
    });
    
    // Sort bylaws by number in ascending order
    filteredBylaws.sort((a, b) => {
        const numA = a.number || a.bylawNumber || 0;
        const numB = b.number || b.bylawNumber || 0;
        return numA - numB;
    });
    
    if (filteredBylaws.length > 0) {
        const grid = document.createElement('div');
        grid.className = 'cards-grid';
        
        filteredBylaws.forEach(bylaw => {
            const card = createBylawCardElement(bylaw);
            grid.appendChild(card);
        });
        
        container.appendChild(grid);
    } else {
        container.innerHTML = '<div class="no-results">No results found</div>';
    }
}

/**
 * Completed by Dominic del Rosario, with indirect steps from Claude AI
 * Creates a DOM element for a bylaw card with click handler.
 * @param {Object} bylaw - The bylaw object containing id, title/bylawTitle, and number/bylawNumber.
 * @returns {HTMLElement} The created card DOM element.
 */
function createBylawCardElement(bylaw) {
    const card = document.createElement('div');
    card.className = 'card';
    card.onclick = () => handleBylawCardClick(bylaw);
    
    const title = bylaw.title || bylaw.bylawTitle || 'Untitled';
    const number = bylaw.number || bylaw.bylawNumber || '';
    
    card.innerHTML = `
        <div class="card-policy-name">${title}</div>
        <div class="card-section-name">Bylaw</div>
        <div class="card-policy-id">Bylaw #${number}</div>
    `;
    
    return card;
}

/**
 * Completed by Dominic del Rosario, 
 * Handles click events on bylaw cards by navigating to the bylaw detail page.
 * @param {Object} bylaw - The bylaw object containing the id to navigate to.
 * @returns {void}
 */
function handleBylawCardClick(bylaw) {
    // Navigate to bylaw detail page with the bylaw's id as a query parameter
    window.location.href = `/frontend/public/bylaw-detail.html?id=${bylaw.id}`;
}

/**
 * Completed by Dominic del Rosario, 
 * Handles search input events for filtering bylaws.
 * @param {Event} e - The input event object.
 * @returns {Promise<void>}
 */
async function handleBylawSearch(e) {
    bylawSearchTerm = e.target.value;
    await renderBylaws();
}

/**
 * Loads and displays bylaw detail information on the bylaw detail page.
 * Retrieves bylaw data from API using UUID.
 * @returns {Promise<void>}
 */
async function loadBylawDetail() {
    const container = document.querySelector('.policy-detail-container');
    if (!container) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const bylawId = urlParams.get('id'); // This should be UUID
    
    if (!bylawId) {
        container.innerHTML = '<div class="no-results">Bylaw not found</div>';
        return;
    }
    
    try {
        // API endpoint expects UUID
        const bylaw = await apiRequest(`/api/bylaws/${bylawId}`);
        
        // Map API fields to frontend fields
        const mappedBylaw = {
            id: bylaw.id,
            bylawNumber: bylaw.bylaw_number,
            number: bylaw.bylaw_number,
            bylawTitle: bylaw.bylaw_title,
            title: bylaw.bylaw_title,
            bylawContent: bylaw.bylaw_content,
            content: bylaw.bylaw_content,
            status: bylaw.status,
            updatedAt: bylaw.updated_at
        };
        
        // Update page content
        const bylawNumber = document.querySelector('.policy-number');
        const bylawTitle = document.querySelector('.policy-title');
        const bylawContent = document.querySelector('.policy-content');
        const bylawUpdated = document.querySelector('.policy-updated');
        
        if (bylawNumber) {
            bylawNumber.textContent = `Bylaw #${mappedBylaw.number || ''}`;
        }
        
        if (bylawTitle) {
            bylawTitle.textContent = mappedBylaw.title || 'Untitled';
        }
        
        if (bylawContent) {
            const content = mappedBylaw.content || 'No content available.';
            bylawContent.innerHTML = `<p>${content}</p>`;
        }
        
        if (bylawUpdated && mappedBylaw.updatedAt) {
            const date = new Date(mappedBylaw.updatedAt);
            bylawUpdated.textContent = `Last Updated: ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }
        
        // Update sidebar with other bylaws
        await updateBylawSidebar(mappedBylaw);
    } catch (error) {
        console.error('Error loading bylaw detail:', error);
        container.innerHTML = '<div class="no-results">Bylaw not found</div>';
    }
}

/**
 * Updates the bylaw sidebar with links to other approved bylaws.
 * Excludes the current bylaw from the list.
 * @param {Object} currentBylaw - The currently displayed bylaw object.
 * @returns {Promise<void>}
 */
async function updateBylawSidebar(currentBylaw) {
    const sidebar = document.querySelector('.policy-sidebar');
    if (!sidebar) return;
    
    const approvedBylaws = await getApprovedBylaws();
    // Filter out current bylaw by UUID id
    const otherBylaws = approvedBylaws.filter(b => b.id !== currentBylaw.id);
    
    if (otherBylaws.length === 0) {
        sidebar.innerHTML = '<h3 class="sidebar-title">Other Bylaws</h3><div class="sidebar-section"><p>No other bylaws available</p></div>';
        return;
    }
    
    // Sort bylaws by number in ascending order
    otherBylaws.sort((a, b) => {
        const numA = a.number || a.bylawNumber || 0;
        const numB = b.number || b.bylawNumber || 0;
        return numA - numB;
    });
    
    let html = '<h3 class="sidebar-title">Other Bylaws</h3><div class="sidebar-section">';
    otherBylaws.forEach(bylaw => {
        const title = bylaw.title || bylaw.bylawTitle || 'Untitled';
        const number = bylaw.number || bylaw.bylawNumber || '';
        html += `<a href="/frontend/public/bylaw-detail.html?id=${bylaw.id}" class="sidebar-link">Bylaw #${number} - ${title}</a>`;
    });
    html += '</div>';
    
    sidebar.innerHTML = html;
}

/**
 * Downloads a PDF file from the assets folder.
 * @param {string} filename - The name of the PDF file to download (e.g., 'bylaws.pdf')
 * @returns {void}
 */
function downloadPDFFromAssets(filename) {
    const pdfUrl = `/frontend/assets/${filename}`;
    
    // Create a temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = filename;
    link.style.display = 'none';
    
    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    const searchInput = document.getElementById('searchInput');
    const bylawsContainer = document.getElementById('bylawsContainer');
    const policyDetailContainer = document.querySelector('.policy-detail-container');
    
    // Determine page type from URL path
    const currentPath = window.location.pathname;
    const isBylawDetailPage = currentPath.includes('bylaw-detail.html');
    
    if (bylawsContainer) {
        // Bylaws page
        if (searchInput) {
            searchInput.addEventListener('input', handleBylawSearch);
        }
        await renderBylaws();
        
        // Download PDF button handler
        const downloadBtn = document.querySelector('.download-pdf-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                downloadPDFFromAssets('ASABylaws.pdf');
            });
        }
    } else if (policyDetailContainer) {
        // Bylaw detail page
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        
        if (id && isBylawDetailPage) {
            await loadBylawDetail();
        }
    }
});
