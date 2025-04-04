document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const resultContainer = document.getElementById('result-container');
    const themeToggle = document.querySelector('.theme-toggle');
    
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    } else {
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    // Theme toggle functionality
    themeToggle.addEventListener('click', function() {
        document.body.classList.toggle('dark-theme');
        if (document.body.classList.contains('dark-theme')) {
            localStorage.setItem('theme', 'dark');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        } else {
            localStorage.setItem('theme', 'light');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
    });
    
    // Search functionality
    searchBtn.addEventListener('click', function() {
        searchWord(searchInput.value.trim());
    });
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchWord(searchInput.value.trim());
        }
    });
    
    // Check if there's a selected word from context menu
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === "lookupWord") {
            searchInput.value = request.word;
            searchWord(request.word);
        }
    });
    
    // Function to search for a word
    function searchWord(word) {
        if (!word) return;
        
        resultContainer.innerHTML = '<div class="loading">Searching...</div>';
        
        // Using Free Dictionary API
        fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Word not found');
                }
                return response.json();
            })
            .then(data => {
                displayResults(data);
            })
            .catch(error => {
                resultContainer.innerHTML = `
                    <div class="error-message">
                        <p>${error.message}</p>
                        <p>Please try another word.</p>
                    </div>
                `;
            });
    }
    
    // Function to display results
    function displayResults(data) {
        if (!data || data.length === 0) {
            resultContainer.innerHTML = '<div class="error-message">No results found.</div>';
            return;
        }
        
        const wordData = data[0];
        let html = `
            <div class="word-header">
                <div class="word-title">${wordData.word}</div>
                <div class="pronunciation">/${wordData.phonetic || ''}/</div>
                <button class="audio-btn" id="audio-btn">
                    <i class="fas fa-volume-up"></i>
                </button>
            </div>
        `;
        
        html += '<div class="section-title">Definitions</div>';
        
        // Process each meaning
        wordData.meanings.forEach(meaning => {
            html += `
                <div class="definition-card">
                    <div class="part-of-speech">${meaning.partOfSpeech}</div>
            `;
            
            // Add definitions
            meaning.definitions.forEach((def, index) => {
                if (index < 3) { // Limit to 3 definitions per part of speech
                    html += `<div class="definition-text">${def.definition}</div>`;
                    
                    // Add example if available
                    if (def.example) {
                        html += `<div class="example">"${def.example}"</div>`;
                    }
                }
            });
            
            // Add synonyms if available
            if (meaning.synonyms && meaning.synonyms.length > 0) {
                html += `
                    <div class="section-title">Synonyms</div>
                    <div class="synonyms-list">
                `;
                
                meaning.synonyms.slice(0, 5).forEach(synonym => {
                    html += `<span class="synonym-tag">${synonym}</span>`;
                });
                
                html += '</div>';
            }
            
            html += '</div>';
        });
        
        resultContainer.innerHTML = html;
        
        // Add audio functionality
        const audioBtn = document.getElementById('audio-btn');
        if (audioBtn) {
            audioBtn.addEventListener('click', function() {
                // Find audio URL
                let audioUrl = '';
                if (wordData.phonetics) {
                    for (const phonetic of wordData.phonetics) {
                        if (phonetic.audio) {
                            audioUrl = phonetic.audio;
                            break;
                        }
                    }
                }
                
                if (audioUrl) {
                    const audio = new Audio(audioUrl);
                    audio.play();
                }
            });
        }
    }
});