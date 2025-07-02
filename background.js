let lastKnownState = { isFilteringActive: false, selectedFilter: null, customExtensions: null };

chrome.tabs.onActivated.addListener(({ tabId }) => {
    chrome.tabs.get(tabId, (tab) => {
        if (!tab?.url) return;

        const isAzure = tab.url.includes('dev.azure.com');

        if (isAzure) {
            chrome.storage.local.get(['azSelectedFilter', 'azCustomExtensions', 'isFilteringActive'], (res) => {
                lastKnownState = {
                    isFilteringActive: res.isFilteringActive,
                    selectedFilter: res.azSelectedFilter,
                    customExtensions: res.azCustomExtensions,
                };

                if (res.isFilteringActive && res.azSelectedFilter) {
                    chrome.tabs.sendMessage(tabId, {
                        filter: res.azSelectedFilter,
                        extensions: res.azCustomExtensions,
                    });
                    chrome.action.setIcon({ path: 'icons/highlighter-active.png', tabId });
                } else {
                    chrome.tabs.sendMessage(tabId, { stopFiltering: true });
                    chrome.action.setIcon({ path: 'icons/highlighter-purple.png', tabId });
                }
            });
        } else {
            chrome.tabs.sendMessage(tabId, { stopFiltering: true });
            chrome.action.setIcon({ path: 'icons/highlighter-purple.png', tabId });
        }
    });
});
