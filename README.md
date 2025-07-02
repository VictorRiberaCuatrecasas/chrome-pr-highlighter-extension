# Azure DevOps File Highlighter

A Chrome extension to visually highlight files in Azure DevOps pull requests based on their type (frontend, backend, or custom).

## Features

-   Highlights files using color-coded backgrounds and labels
-   Supports predefined filters (frontend, backend, both) and custom extensions
-   Remembers filter settings between sessions
-   Automatically activates/deactivates based on whether you're in a dev.azure.com tab

## Installation

1. Download and unzip the folder
2. Open `chrome://extensions/`
3. Enable **Developer mode**
4. Click **Load unpacked** and select the folder

## How It Works

-   The popup allows filter selection and management
-   The content script colors file rows in pull requests
-   The background script toggles filter state based on active tab
-   Styling and labels are applied dynamically and persist as you browse

### Popup Interface (`popup.html`, `popup.js`, `popup.css`)

-   The popup allows you to choose the filter type (frontend, backend, both, or custom).
-   You can enter custom file extensions (comma-separated) if "Custom" is selected.
-   Clicking **Apply Filters** injects the active filter into the currently open Azure DevOps tab.
-   The **Stop Filtering** button deactivates the highlighter.

### Content Script (`content.js`)

-   Applies color-coded backgrounds and labels to file rows in PR file trees.
-   Reacts to DOM mutations so it can reapply filters when navigating within Azure.
-   Filters are based on file extensions, excluding specific patterns when configured.
-   Uses `.focused` class to preserve Azure DevOps' native selection styles.

### Background Script (`background.js`)

-   Tracks tab activity.
-   Deactivates filters when leaving an Azure DevOps tab.
-   Restores filters (if previously active) when returning to a `dev.azure.com` tab.

## Notes

-   Works only on `dev.azure.com` URLs
-   Filtering uses file name patterns, not file contents
-   May break if Azure DevOps updates its UI structure
-   Needs a browser / extension refresh for it to work after installing or editing the extension

## Limitations

-   Filtering is based on visible file names; it does not follow symbolic links or repo structure.
-   Extension uses DOM polling and mutation observation, which may have minor performance impact in very large PRs.

## License

This project is distributed as-is for internal or personal use. No license or warranties provided.
