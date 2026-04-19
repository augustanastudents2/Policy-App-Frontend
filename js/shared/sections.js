// Shared helper for dynamic policy sections
var API_BASE_URL = window.API_BASE_URL || "https://policy-app-backend.onrender.com";

(function () {
    const CACHE_TTL_MS = 30_000;
    let cachedAt = 0;
    let cachedPromise = null;
    let lastSections = [];

    async function fetchSections() {
        const now = Date.now();
        if (cachedPromise && now - cachedAt < CACHE_TTL_MS) return cachedPromise;
        cachedAt = now;
        cachedPromise = fetch(`${API_BASE_URL}/api/sections`, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        })
            .then(async (res) => {
                if (!res.ok) throw new Error(`Failed to load sections: ${res.status}`);
                const data = await res.json();
                lastSections = Array.isArray(data) ? data : [];
                return lastSections;
            })
            .catch((err) => {
                cachedPromise = null;
                cachedAt = 0;
                throw err;
            });
        return cachedPromise;
    }

    function fallbackName(sectionKeyOrName) {
        const sectionNames = {
            '1': 'Organizational Identity & Values',
            '2': 'Governance & Elections',
            '3': 'Operations, Staff & Finance',
            'Organizational Identity & Values': 'Organizational Identity & Values',
            'Governance & Elections': 'Governance & Elections',
            'Operations, Staff & Finance': 'Operations, Staff & Finance'
        };
        return sectionNames[sectionKeyOrName] || (sectionKeyOrName ? `Section ${sectionKeyOrName}` : 'N/A');
    }

    async function getSectionName(sectionKeyOrName) {
        if (!sectionKeyOrName) return 'N/A';
        try {
            const sections = await fetchSections();
            const match = sections.find((s) => String(s.key) === String(sectionKeyOrName));
            return match?.name || fallbackName(sectionKeyOrName);
        } catch {
            return fallbackName(sectionKeyOrName);
        }
    }

    function getSectionNameSyncPreferred(sectionKeyOrName) {
        // For legacy synchronous call sites; prefer last fetched list if available.
        if (!sectionKeyOrName) return 'N/A';
        const match = lastSections.find((s) => String(s.key) === String(sectionKeyOrName));
        return match?.name || fallbackName(sectionKeyOrName);
    }

    async function populateSectionSelect(selectEl, opts = {}) {
        if (!selectEl) return;
        const { includeAll = false, includeEmptyOption = true } = opts;

        let sections = [];
        try {
            sections = await fetchSections();
        } catch {
            // If API not available yet, keep existing options
            return;
        }

        const currentValue = selectEl.value;
        const parts = [];

        if (includeAll) parts.push(`<option value="all">All Sections</option>`);
        if (includeEmptyOption) parts.push(`<option value="">Select section</option>`);

        parts.push(
            sections
                .slice()
                .sort((a, b) => String(a.key).localeCompare(String(b.key), undefined, { numeric: true }))
                .map((s) => `<option value="${String(s.key)}">${s.name}</option>`)
                .join('')
        );

        selectEl.innerHTML = parts.join('');
        if (currentValue) {
            // preserve current selection if possible
            const option = Array.from(selectEl.options).find((o) => o.value === currentValue);
            if (option) selectEl.value = currentValue;
        }
    }

    window.Sections = {
        fetchSections,
        getSectionName,
        getSectionNameSyncPreferred,
        populateSectionSelect
    };
})();

