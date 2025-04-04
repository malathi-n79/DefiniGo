// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getSelectedText") {
        const selectedText = window.getSelection().toString().trim();
        sendResponse({ text: selectedText });
    }
    return true;  // Keep the message channel open for asynchronous response
});

// Remove the debounce as it's causing delay
document.addEventListener('mouseup', handleTextSelection);

// Handle text selection
function handleTextSelection() {
    // Small timeout to ensure selection is complete
    setTimeout(() => {
        const selectedText = window.getSelection().toString().trim();
        
        // If text is selected and it's not too long (to avoid selecting paragraphs)
        if (selectedText && selectedText.length > 0 && selectedText.length < 50 && !window.getSelection().isCollapsed) {
            // Check if selection is a single word (no spaces)
            if (!/\s/.test(selectedText)) {
                // Show definition directly
                showDefinition(selectedText);
            }
        }
    }, 10); // Very short timeout
}

async function showDefinition(selectedText) {
  // Check if a popup already exists and remove it
  const existingPopup = document.getElementById("dictionary-popup");
  if (existingPopup) {
    existingPopup.remove();
  }

  // Create a temporary popup while we're loading
  const popup = document.createElement("div");
  popup.id = "dictionary-popup";
  popup.style.position = "fixed"; // Keep this as fixed
  popup.style.zIndex = 10000;
  popup.style.borderRadius = "8px";
  popup.style.padding = "15px";
  popup.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
  popup.style.maxWidth = "350px";
  popup.style.minWidth = "300px";
  popup.style.fontSize = "14px";
  popup.style.lineHeight = "1.5";
  popup.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
  popup.style.maxHeight = "80vh"; // Limit height to 80% of viewport
  popup.style.overflowY = "auto"; // Add scrolling to popup content

  // Add loading message
  popup.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">Searching...</div>';

  // Append the popup to the body
  document.body.appendChild(popup);

  // Position the popup near the selection
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Calculate position to ensure popup stays within viewport
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Default position below the selection
    let top = rect.bottom + 10;
    let left = rect.left;
    
    // Check if popup would go off bottom of screen
    if (top + 200 > viewportHeight) {
      top = rect.top - 10 - 200; // Position above selection
    }
    
    // Check if popup would go off right of screen
    if (left + 300 > viewportWidth) {
      left = viewportWidth - 320;
    }
    
    popup.style.top = `${top}px`;
    popup.style.left = `${left}px`;
  }

  // Directly check if dark mode is enabled in the document
  let isDarkTheme = false;
  
  // First check if body has dark-theme class (this is how popup.js sets it)
  if (document.body.classList.contains('dark-theme')) {
    isDarkTheme = true;
  } else {
    // If not found in body class, try storage
    try {
      const result = await new Promise(resolve => {
        chrome.storage.local.get('theme', resolve);
      });
      isDarkTheme = result.theme === 'dark';
    } catch (error) {
      console.error("Error getting theme:", error);
      // Fallback to localStorage
      isDarkTheme = localStorage.getItem('theme') === 'dark';
    }
  }

  // Apply theme immediately
  applyTheme(popup, isDarkTheme);

  // Fetch the definition from a dictionary API
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${selectedText}`);
    
    if (!response.ok) {
      popup.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid ${isDarkTheme ? "#34495e" : "#ddd"}; padding-bottom: 10px;">
          <div>
            <h1 style="color: #3498db; margin: 0; font-size: 20px; font-weight: bold;">DefiniGo</h1>
            <p style="margin: 0; color: #666; font-style: italic; font-size: 12px;">Definitions on the go!</p>
          </div>
          <div id="theme-toggle" style="cursor: pointer; font-size: 18px;">
            ${isDarkTheme ? '🌙' : '☀️'}
          </div>
        </div>
        <div style="color: #e74c3c; text-align: center; padding: 10px;">
          <p>Word not found</p>
          <p>Please try another word.</p>
        </div>
        <button id="popup-close-btn" style="background: ${isDarkTheme ? "#2c3e50" : "#eee"}; color: ${isDarkTheme ? "#f0f0f0" : "#333"}; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-top: 10px; float: right;">Close</button>
      `;
      
      setupCloseAndThemeToggle(popup);
      return;
    }
    
    const data = await response.json();
    
    if (data && data[0]) {
      const word = data[0];
      
      // Find audio URL if available
      let audioUrl = '';
      if (word.phonetics && word.phonetics.length > 0) {
        for (const phonetic of word.phonetics) {
          if (phonetic.audio && phonetic.audio.trim() !== '') {
            audioUrl = phonetic.audio;
            break;
          }
        }
      }
      
      // Create HTML content for the popup - matching the extension popup style
      let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid ${isDarkTheme ? "#34495e" : "#ddd"}; padding-bottom: 10px;">
          <div>
            <h1 style="color: #3498db; margin: 0; font-size: 20px; font-weight: bold;">DefiniGo</h1>
            <p style="margin: 0; color: #666; font-style: italic; font-size: 12px;">Definitions on the go!</p>
          </div>
          <div id="theme-toggle" style="cursor: pointer; font-size: 18px;">
            ${isDarkTheme ? '🌙' : '☀️'}
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <div style="font-size: 18px; font-weight: bold;">${word.word}</div>
          <div style="color: #666; font-style: italic;">/${word.phonetic || ''}/</div>
          <button id="popup-audio-btn" style="background: #3498db; color: white; border: none; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; ${!audioUrl ? 'opacity: 0.5;' : ''}">
            <span style="font-size: 12px;">🔊</span>
          </button>
        </div>
        <div style="font-weight: bold; margin: 10px 0 5px; color: #3498db;">Definitions</div>
      `;
      
      // Add definitions
      if (word.meanings && word.meanings.length > 0) {
        word.meanings.forEach((meaning, index) => {
          if (index < 3) { // Show up to 3 parts of speech
            html += `<div style="background-color: ${isDarkTheme ? "#2c3e50" : "white"}; border-radius: 6px; padding: 10px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
                      <div style="display: inline-block; background: #e74c3c; color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px; margin-bottom: 5px;">
                        ${meaning.partOfSpeech}
                      </div>`;
            
            // Add definitions
            if (meaning.definitions && meaning.definitions.length > 0) {
              meaning.definitions.slice(0, 3).forEach((def, i) => {
                html += `<div style="margin-bottom: 5px;">${def.definition}</div>`;
                
                // Add example if available
                if (def.example) {
                  html += `<div style="color: #666; font-style: italic; margin-left: 10px; margin-bottom: 5px;">"${def.example}"</div>`;
                }
              });
            }
            
            // Add synonyms if available
            if (meaning.synonyms && meaning.synonyms.length > 0) {
              html += `<div style="font-weight: bold; margin: 10px 0 5px; color: #3498db;">Synonyms</div>
                      <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px;">`;
              
              meaning.synonyms.slice(0, 5).forEach(synonym => {
                html += `<span style="background: ${isDarkTheme ? "#34495e" : "#f0f0f0"}; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${synonym}</span>`;
              });
              
              html += `</div>`;
            }
            
            html += `</div>`;
          }
        });
      }
      
      // Add close button
      html += `<button id="popup-close-btn" style="background: ${isDarkTheme ? "#2c3e50" : "#eee"}; color: ${isDarkTheme ? "#f0f0f0" : "#333"}; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-top: 10px; float: right;">Close</button>`;
      
      popup.innerHTML = html;
      
      // Add audio functionality
      const audioBtn = document.getElementById("popup-audio-btn");
      if (audioBtn && audioUrl) {
        audioBtn.addEventListener("click", function() {
          if (audioUrl) {
            console.log("Playing audio:", audioUrl);
            const audio = new Audio(audioUrl);
            audio.play().catch(err => {
              console.error("Error playing audio:", err);
            });
          }
        });
      } else if (audioBtn) {
        // Disable the button if no audio is available
        audioBtn.style.opacity = "0.5";
        audioBtn.style.cursor = "not-allowed";
      }
      
      // Setup close button and theme toggle
      setupCloseAndThemeToggle(popup);
    } else {
      // This is the case when the API returns data but it's not in the expected format
      popup.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid ${isDarkTheme ? "#34495e" : "#ddd"}; padding-bottom: 10px;">
          <div>
            <h1 style="color: #3498db; margin: 0; font-size: 20px; font-weight: bold;">DefiniGo</h1>
            <p style="margin: 0; color: #666; font-style: italic; font-size: 12px;">Definitions on the go!</p>
          </div>
          <div id="theme-toggle" style="cursor: pointer; font-size: 18px;">
            ${isDarkTheme ? '🌙' : '☀️'}
          </div>
        </div>
        <div style="color: #e74c3c; text-align: center; padding: 10px;">
          <p>Invalid response format</p>
          <p>Please try another word.</p>
        </div>
        <button id="popup-close-btn" style="background: ${isDarkTheme ? "#2c3e50" : "#eee"}; color: ${isDarkTheme ? "#f0f0f0" : "#333"}; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-top: 10px; float: right;">Close</button>
      `;
      
      setupCloseAndThemeToggle(popup);
    }
  } catch (error) {
    console.error("Dictionary API error:", error);
    popup.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid ${isDarkTheme ? "#34495e" : "#ddd"}; padding-bottom: 10px;">
        <div>
          <h1 style="color: #3498db; margin: 0; font-size: 20px; font-weight: bold;">DefiniGo</h1>
          <p style="margin: 0; color: #666; font-style: italic; font-size: 12px;">Definitions on the go!</p>
        </div>
        <div id="theme-toggle" style="cursor: pointer; font-size: 18px;">
          ${isDarkTheme ? '🌙' : '☀️'}
        </div>
      </div>
      <div style="color: #e74c3c; text-align: center; padding: 10px;">
        <p>Error fetching definition</p>
        <p>Please check your internet connection and try again.</p>
      </div>
      <button id="popup-close-btn" style="background: ${isDarkTheme ? "#2c3e50" : "#eee"}; color: ${isDarkTheme ? "#f0f0f0" : "#333"}; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-top: 10px; float: right;">Close</button>
    `;
    
    setupCloseAndThemeToggle(popup);
  }

  // Add click outside to close
  document.addEventListener("click", function closePopup(e) {
    if (e.target !== popup && !popup.contains(e.target)) {
      popup.remove();
      document.removeEventListener("click", closePopup);
    }
  });

  // Add escape key to close
  document.addEventListener("keydown", function escapeClose(e) {
    if (e.key === "Escape") {
      popup.remove();
      document.removeEventListener("keydown", escapeClose);
    }
  });
}

// Helper function to apply theme to popup
function applyTheme(popup, isDarkTheme) {
  if (isDarkTheme) {
    popup.style.backgroundColor = "#1e2a3a";
    popup.style.color = "#f0f0f0";
    popup.style.border = "1px solid #34495e";
  } else {
    popup.style.backgroundColor = "white";
    popup.style.color = "#333";
    popup.style.border = "1px solid #ddd";
  }
}

// Helper function to set up close button and theme toggle
function setupCloseAndThemeToggle(popup) {
  // Add close button functionality
  const closeBtn = document.getElementById("popup-close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", function() {
      popup.remove();
    });
  }
  
  // Add theme toggle functionality
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", function() {
      // Check current theme
      let isDarkTheme = document.body.classList.contains('dark-theme');
      
      // Toggle theme
      if (isDarkTheme) {
        // Switch to light theme
        document.body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
        chrome.storage.local.set({theme: 'light'});
        
        // Update current popup instead of recreating it
        applyTheme(popup, false);
        updatePopupContent(popup, false);
      } else {
        // Switch to dark theme
        document.body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
        chrome.storage.local.set({theme: 'dark'});
        
        // Update current popup instead of recreating it
        applyTheme(popup, true);
        updatePopupContent(popup, true);
      }
    });
  }
}

// Function to update popup content with new theme
function updatePopupContent(popup, isDarkTheme) {
  // Update the main popup background and text color
  applyTheme(popup, isDarkTheme);
  
  // Update all definition cards (divs with background color)
  const definitionCards = popup.querySelectorAll('div[style*="background-color"]');
  definitionCards.forEach(card => {
    if (card.id !== "dictionary-popup") { // Skip the main popup
      card.style.backgroundColor = isDarkTheme ? "#2c3e50" : "white";
    }
  });
  
  // Update all synonym tags
  const synonymTags = popup.querySelectorAll('span[style*="background"]');
  synonymTags.forEach(tag => {
    tag.style.background = isDarkTheme ? "#34495e" : "#f0f0f0";
  });
  
  // Update close button
  const closeBtn = document.getElementById("popup-close-btn");
  if (closeBtn) {
    closeBtn.style.background = isDarkTheme ? "#2c3e50" : "#eee";
    closeBtn.style.color = isDarkTheme ? "#f0f0f0" : "#333";
  }
  
  // Update all borders
  const borderedElements = popup.querySelectorAll('div[style*="border-bottom"]');
  borderedElements.forEach(el => {
    el.style.borderBottom = `1px solid ${isDarkTheme ? "#34495e" : "#ddd"}`;
  });
  
  // Update theme toggle icon
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.innerHTML = isDarkTheme ? '🌙' : '☀️';
  }
  
  // Update text colors for specific elements
  const examples = popup.querySelectorAll('div[style*="font-style: italic"]');
  examples.forEach(el => {
    el.style.color = isDarkTheme ? "#a0a0a0" : "#666";
  });
}
