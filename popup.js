document.addEventListener('DOMContentLoaded', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs.length || !tabs[0].url.includes('dev.azure.com')) {
            document.body.innerHTML = '<p style="padding: 1rem; font-weight: bold;">⚠️ This extension only works on Azure DevOps.</p>';
            return;
        }

        const applyFiltersButton = document.getElementById('az-apply-filters');
        const stopFiltersButton = document.getElementById('az-stop-filters');
        const filterTypeSelect = document.getElementById('az-filter-type');
        const customInput = document.getElementById('custom-extensions');
        const infoBtn = document.getElementById('info-btn');
        const infoSection = document.getElementById('info-section');
        const filterStatus = document.getElementById('filter-status');

        let isFilteringActive = false;

        function updateButtonState() {
            const selectedFilter = filterTypeSelect.value;
            const customValue = customInput.value.trim();
            const isCustom = selectedFilter === 'custom';

            if (isCustom) {
                const shouldDisable = customValue === '';
                applyFiltersButton.disabled = shouldDisable;
                applyFiltersButton.classList.toggle('disabled', shouldDisable);
            } else {
                applyFiltersButton.disabled = false;
                applyFiltersButton.classList.remove('disabled');
            }

            stopFiltersButton.disabled = !isFilteringActive;
            stopFiltersButton.classList.toggle('disabled', !isFilteringActive);
        }

        function updateFilterStatus(active) {
            isFilteringActive = active;
            filterStatus.textContent = active ? 'Filtering is active' : 'Filtering is inactive';
            filterStatus.className = active ? 'status-active' : 'status-inactive';

            chrome.storage.local.set({ isFilteringActive: active });

            const iconPath = active ? 'icons/highlighter-active.png' : 'icons/highlighter-purple.png';

            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs.length > 0) {
                    chrome.action.setIcon({ path: iconPath, tabId: tabs[0].id });
                }
            });

            updateButtonState();
        }

        chrome.storage.local.get(['azSelectedFilter', 'azCustomExtensions', 'isFilteringActive'], (result) => {
            const savedFilter = result.azSelectedFilter || 'frontend';
            const savedCustom = result.azCustomExtensions || '';
            const savedFilteringStatus = result.isFilteringActive || false;

            filterTypeSelect.value = savedFilter;

            if (savedFilter === 'custom') {
                customInput.style.display = 'block';
                customInput.value = savedCustom;
            }

            updateFilterStatus(savedFilteringStatus);
            updateButtonState();
        });

        filterTypeSelect.addEventListener('change', () => {
            const isCustom = filterTypeSelect.value === 'custom';
            customInput.style.display = isCustom ? 'block' : 'none';
            updateButtonState();
        });

        customInput.addEventListener('input', updateButtonState);

        applyFiltersButton.addEventListener('click', () => {
            const selectedFilter = filterTypeSelect.value;
            const customExtensions = customInput.value.trim();

            if (selectedFilter === 'custom' && !customExtensions) {
                alert('⚠️ Please enter custom extensions before applying filters.');
                return;
            }

            chrome.storage.local.set({
                azSelectedFilter: selectedFilter,
                azCustomExtensions: customExtensions,
            });

            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (!tabs.length || !tabs[0].url) return;

                chrome.tabs.sendMessage(tabs[0].id, {
                    filter: selectedFilter,
                    extensions: customExtensions,
                });

                updateFilterStatus(true);
            });
        });

        stopFiltersButton.addEventListener('click', () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (!tabs.length || !tabs[0].url) return;

                chrome.tabs.sendMessage(tabs[0].id, { stopFiltering: true });
                updateFilterStatus(false);
            });
        });

        document.getElementById('inspire-btn').addEventListener('click', () => {
            fetch(chrome.runtime.getURL('quotes.json'))
                .then((response) => response.json())
                .then((quotes) => {
                    const random = Math.floor(Math.random() * quotes.length);
                    const display = document.getElementById('quote-display');
                    display.textContent = quotes[random];
                    display.style.display = 'block';
                })
                .catch(() => {
                    const display = document.getElementById('quote-display');
                    display.textContent = 'Oops, no inspiration today.';
                    display.style.display = 'block';
                });
        });

        if (infoBtn && infoSection) {
            infoBtn.addEventListener('click', () => {
                const visible = infoSection.style.display === 'block';
                infoSection.style.display = visible ? 'none' : 'block';
                infoBtn.textContent = visible ? 'Show Info' : 'Hide Info';
                document.body.classList.toggle('expanded', !visible);
            });
        }

        document.getElementById('dont-btn').addEventListener('click', () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]?.id) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'flicker-css' });
                }
            });
        });
    });
});
