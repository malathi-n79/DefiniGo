// Create context menu item
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "lookupWord",
        title: "Look up \"%s\"",
        contexts: ["selection"]
    });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "lookupWord") {
        // Open popup with the selected word
        chrome.action.openPopup();
        
        // Send message to popup to search for the word
        setTimeout(() => {
            chrome.runtime.sendMessage({
                action: "lookupWord",
                word: info.selectionText.trim()
            });
        }, 300);
    }
});

// Listen for messages from content script for selected text
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "wordSelected") {
        // Open popup with the selected word
        chrome.action.openPopup();
        
        // Send message to popup to search for the word
        setTimeout(() => {
            chrome.runtime.sendMessage({
                action: "lookupWord",
                word: request.word
            });
        }, 300);
    }
});
