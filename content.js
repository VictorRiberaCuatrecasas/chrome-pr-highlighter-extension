const frontendAllowedExtensions = ['.vue', '.css', '.scss', '.js', '.ts', '.json', '.less', '.graphql'];
const frontendExcludedPatterns = ['swagger.json', /^appsetting.*\.json$/, /^nswag.*\.json$/];

const backendAllowedExtensions = ['.cs', '.csproj', '.bicep', '.yml'];
const backendExcludedPatterns = [/CoreCommerce\.Addon\.App4Sales\.Order\.Adapter\/Controllers\/Orders\/Generated\.cs$/];

let activeFilter = null;
let activeCustomExtensions = null;

const colors = {
    frontend: { background: '#FFECEC', label: '#EF4444' },
    backend: { background: '#EBF5FF', label: '#6366F1' },
    custom: { background: '#F0FDF4', label: '#22C55E' },
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.requestIconUpdate === 'active') {
        chrome.runtime.sendMessage({ requestIconUpdate: 'active' });
    }

    if (message.stopFiltering) {
        activeFilter = null;
        if (observer) observer.disconnect();
        resetFilterHighlighting();
        console.log('Filtering stopped.');

        chrome.storage.local.set({ isFilteringActive: false });
        chrome.runtime.sendMessage({ stopFiltering: true });
        chrome.action.setIcon({ path: 'icons/highlighter-purple.png' });

        sendResponse({ status: 'Filtering stopped!' });
        return;
    }

    if (message.filter) {
        const customExtensions = message.extensions || null;
        applyFilters(message.filter, customExtensions);

        chrome.storage.local.set({ isFilteringActive: true });
        chrome.runtime.sendMessage({ startFiltering: true });
        chrome.action.setIcon({ path: 'icons/highlighter-active.png' });

        sendResponse({ status: 'Filters applied!' });
    }
});

chrome.storage.local.get(['isFilteringActive', 'azSelectedFilter', 'azCustomExtensions'], (result) => {
    const { isFilteringActive = false, azSelectedFilter: selectedFilter = null, azCustomExtensions: customExtensions = null } = result;

    if (isFilteringActive && selectedFilter) {
        applyFilters(selectedFilter, customExtensions);
        chrome.runtime.sendMessage({ requestIconUpdate: 'active' });
    } else {
        resetFilterHighlighting();
        chrome.action.setIcon({ path: 'icons/highlighter-purple.png' });
    }
});

function applyFilters(filter, customExtensions = null) {
    activeFilter = filter;
    activeCustomExtensions = customExtensions;

    resetFilterHighlighting();

    const rows = document.querySelectorAll('.is-folder .repos-summary-header .flex-row');
    const sidebarItems = document.querySelectorAll('.bolt-tree-row:not(.bolt-tree-row.is-expanded) .bolt-tree-cell .text-ellipsis');

    const applyLogic = {
        frontend: () => applyFilterToElements(rows, sidebarItems, frontendAllowedExtensions, frontendExcludedPatterns, colors.frontend, 'FRONTEND'),
        backend: () => applyFilterToElements(rows, sidebarItems, backendAllowedExtensions, backendExcludedPatterns, colors.backend, 'BACKEND'),
        both: () => {
            applyFilterToElements(rows, sidebarItems, frontendAllowedExtensions, frontendExcludedPatterns, colors.frontend, 'FRONTEND');
            applyFilterToElements(rows, sidebarItems, backendAllowedExtensions, backendExcludedPatterns, colors.backend, 'BACKEND');
        },
        custom: () => {
            if (customExtensions) {
                const extArray = customExtensions
                    .split(',')
                    .map((e) => e.trim().toLowerCase())
                    .filter(Boolean);
                applyCustomExtensionsFilter(extArray);
            } else {
                console.warn('No custom extensions provided');
            }
        },
    };

    (applyLogic[filter] || (() => console.error('Unknown filter type:', filter)))();

    observer.observe(document.body, { childList: true, subtree: true });
    chrome.runtime.sendMessage({ filterStatus: 'active' });
}

function applyFilterToElements(rows, sidebarItems, allowedExts, excludedPatterns, color, label) {
    rows.forEach((row) => highlightIfMatch(row, allowedExts, excludedPatterns, color, label));
    sidebarItems.forEach((span) => {
        const itemRow = span.closest('.bolt-tree-row');
        if (itemRow) highlightIfMatch(itemRow, allowedExts, excludedPatterns, color, label, span);
    });
}

function highlightIfMatch(row, allowedExts, excludedPatterns, color, label, spanOverride = null) {
    const span = spanOverride || row.querySelector('span.text-ellipsis');
    if (!span) return;
    const fileName = span.textContent.trim().toLowerCase();
    const isExcluded = excludedPatterns.some((pattern) => (pattern instanceof RegExp ? pattern.test(fileName) : pattern === fileName));
    const isAllowed = allowedExts.some((ext) => fileName.endsWith(ext));

    if (isAllowed && !isExcluded) {
        highlightRow(row, color.background, label, color.label);
    }
}

function applyCustomExtensionsFilter(extensions) {
    const rows = document.querySelectorAll('.is-folder .repos-summary-header .flex-row');
    const sidebarItems = document.querySelectorAll('.bolt-tree-row:not(.bolt-tree-row.is-expanded) .bolt-tree-cell .text-ellipsis');

    rows.forEach((row) => highlightIfExtensionMatch(row, extensions, colors.custom, 'CUSTOM EXTENSION'));
    sidebarItems.forEach((span) => {
        const itemRow = span.closest('.bolt-tree-row');
        if (itemRow) highlightIfExtensionMatch(itemRow, extensions, colors.custom, 'CUSTOM', span);
    });
}

function highlightIfExtensionMatch(row, extensions, color, label, spanOverride = null) {
    const span = spanOverride || row.querySelector('span.text-ellipsis');
    if (!span) return;
    const fileName = span.textContent.trim().toLowerCase();
    if (extensions.some((ext) => fileName.endsWith(ext))) {
        highlightRow(row, color.background, label, color.label);
    }
}

function highlightRow(row, color, label = null, labelColor = null) {
    const isFocused = row.classList.contains('focused');
    if (!isFocused) {
        row.style.backgroundColor = color;
    }

    if (!label || row.querySelector('.filter-label')) return;

    const labelSpan = document.createElement('span');
    labelSpan.textContent = label;
    labelSpan.className = 'filter-label';
    labelSpan.style.cssText = `
        background-color: ${labelColor};
        color: white;
        font-size: 12px;
        border-radius: 4px;
        padding: 2px 6px;
        margin-right: 8px;
        font-weight: bold;
        height: fit-content;
        align-self: center;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    `;

    const viewLink = row.querySelector('a[href*="pullrequest"][role="link"], a[role="link"]:not(.filter-label)');
    if (viewLink) {
        const parentFlex = viewLink.parentElement;
        if (parentFlex && getComputedStyle(parentFlex).display !== 'flex') {
            parentFlex.style.display = 'flex';
            parentFlex.style.alignItems = 'center';
        }
        viewLink.insertAdjacentElement('beforebegin', labelSpan);
    } else {
        const flexRowEnd = row.querySelector('.flex-row.flex-grow.justify-end');
        if (flexRowEnd) {
            flexRowEnd.style.display = 'flex';
            flexRowEnd.style.alignItems = 'center';
            flexRowEnd.appendChild(labelSpan);
        }
    }
}

function resetFilterHighlighting() {
    document.querySelectorAll('.repos-summary-header .flex-row, .bolt-tree-row').forEach((row) => {
        if (!row.classList.contains('focused')) {
            row.style.backgroundColor = '';
        }

        const label = row.querySelector('.filter-label');
        if (label) label.remove();
    });
}

const observer = new MutationObserver((mutationsList) => {
    if (!activeFilter) return;
    const shouldTrigger = mutationsList.some(({ addedNodes }) =>
        [...addedNodes].some((node) => node.nodeType === Node.ELEMENT_NODE && (node.matches('.text-ellipsis') || node.querySelector('.text-ellipsis')))
    );
    if (shouldTrigger) {
        clearTimeout(window.domMutationTimeout);
        window.domMutationTimeout = setTimeout(() => applyFilters(activeFilter, activeCustomExtensions), 500);
    }
});

observer.observe(document.body, { childList: true, subtree: true });

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'flicker-css') {
        const duration = 3000;
        const interval = 300;
        let elapsed = 0;
        let toggle = false;

        const styleElements = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'));
        const placeholders = new Map();

        const flickerInterval = setInterval(() => {
            toggle = !toggle;

            document.body.style.backgroundColor = getRandomColor();
            document.body.style.filter = toggle ? 'invert(1) hue-rotate(180deg) saturate(2)' : 'none';

            if (toggle) {
                styleElements.forEach((el) => {
                    const placeholder = document.createComment('flicker-css-placeholder');
                    if (el.parentNode) {
                        el.parentNode.replaceChild(placeholder, el);
                        placeholders.set(el, placeholder);
                    }
                });
            } else {
                placeholders.forEach((placeholder, el) => {
                    if (placeholder.parentNode) {
                        placeholder.parentNode.replaceChild(el, placeholder);
                    }
                });
                placeholders.clear();
            }

            elapsed += interval;
            if (elapsed >= duration) {
                clearInterval(flickerInterval);
                document.body.style.backgroundColor = '';
                document.body.style.filter = '';

                placeholders.forEach((placeholder, el) => {
                    if (placeholder.parentNode) {
                        placeholder.parentNode.replaceChild(el, placeholder);
                    }
                });
                placeholders.clear();

                alert('I mean... Well deserved, now go and do it again.');
            }
        }, interval);

        function getRandomColor() {
            const colors = ['#ff006e', '#8338ec', '#3a86ff', '#fb5607', '#ffbe0b', '#00f5d4', '#e63946', '#06d6a0'];
            return colors[Math.floor(Math.random() * colors.length)];
        }
    }
});
