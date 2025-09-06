// static/script.js
document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('api_key');
    const modelSelect = document.getElementById('model');
    const englishFolderInput = document.getElementById('english_folder');
    const vietnameseFolderInput = document.getElementById('vietnamese_folder');
    const englishFileList = document.getElementById('english-file-list');
    const vietnameseFileList = document.getElementById('vietnamese-file-list');
    const verifyButton = document.getElementById('verify_button');
    const loadingSpan = document.getElementById('loading');
    // History UI elements
    const historyList = document.getElementById('history-list');
    const clearHistoryButton = document.getElementById('clear-history-button');

    // Helpers for history persistence
    const HISTORY_KEY = 'tv_history_items_v1';
    function readHistory() {
        try {
            const raw = localStorage.getItem(HISTORY_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }
    function writeHistory(items) {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
    }
    function makeHistoryId() {
        return 'h_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
    function guessChapterLabel(file) {
        const name = (file.webkitRelativePath || file.name).toLowerCase();
        const match = name.match(/(chapter|chap|ch)[^0-9]*([0-9]{1,4})/i);
        return match ? `Ch ${match[2]}` : (file.name || 'Unknown');
    }

    function renderHistory() {
        const items = readHistory();
        historyList.innerHTML = '';
        if (!items.length) {
            const li = document.createElement('li');
            li.className = 'history-empty';
            li.textContent = 'No saved history yet';
            historyList.appendChild(li);
            return;
        }
        items.forEach((item) => {
            const li = document.createElement('li');
            li.className = 'history-item';
            const title = document.createElement('div');
            title.className = 'history-title';
            title.textContent = `${item.label} — ${item.englishName} | ${item.vietnameseName}`;

            const actions = document.createElement('div');
            actions.className = 'history-actions';

            const loadBtn = document.createElement('button');
            loadBtn.textContent = 'Load';
            loadBtn.addEventListener('click', () => loadHistoryItem(item));

            const delBtn = document.createElement('button');
            delBtn.textContent = 'Delete';
            delBtn.addEventListener('click', () => {
                const next = readHistory().filter(h => h.id !== item.id);
                writeHistory(next);
                renderHistory();
            });

            actions.appendChild(loadBtn);
            actions.appendChild(delBtn);

            li.appendChild(title);
            li.appendChild(actions);
            historyList.appendChild(li);
        });
    }

    function saveToHistory(payload) {
        const items = readHistory();
        items.unshift(payload);
        // Keep only the latest 100 entries to avoid unlimited growth
        writeHistory(items.slice(0, 100));
        renderHistory();
    }

    function loadHistoryItem(item) {
        // Rehydrate UI from stored result without calling backend
        originalEnglishText = item.english_text;
        originalVietnameseText = item.vietnamese_text;
        englishTextDisplay.innerText = originalEnglishText;
        vietnameseTextDisplay.innerText = originalVietnameseText;

        problemsList.innerHTML = '';
        if (!item.markers || !item.markers.length) {
            const li = document.createElement('li');
            li.textContent = 'No problems found.';
            problemsList.appendChild(li);
        } else {
            item.markers.forEach((marker, index) => {
                const li = document.createElement('li');
                li.className = 'problem-item';
                li.setAttribute('data-expanded', 'false');
                const problemText = document.createElement('div');
                problemText.className = 'problem-text';
                problemText.textContent = marker.explanation || `Problem ${index + 1}`;
                const detailedContainer = document.createElement('div');
                detailedContainer.className = 'detailed-explanation-container';
                detailedContainer.style.display = 'none';
                const detailedText = document.createElement('div');
                detailedText.className = 'detailed-explanation-text';
                detailedText.textContent = marker.detailed_explanation || 'No detailed explanation provided';
                detailedContainer.appendChild(detailedText);
                const expandIndicator = document.createElement('span');
                expandIndicator.className = 'expand-indicator';
                expandIndicator.textContent = '▼';
                const toggleAndHighlight = () => {
                    const isExpanded = li.getAttribute('data-expanded') === 'true';
                    if (isExpanded) {
                        detailedContainer.style.display = 'none';
                        expandIndicator.textContent = '▼';
                        li.setAttribute('data-expanded', 'false');
                    } else {
                        detailedContainer.style.display = 'block';
                        expandIndicator.textContent = '▲';
                        li.setAttribute('data-expanded', 'true');
                    }
                    highlightAndScroll('english-text-display', originalEnglishText, marker.english_marker, `en-marker-${index}`);
                    highlightAndScroll('vietnamese-text-display', originalVietnameseText, marker.vietnamese_marker, `vi-marker-${index}`);
                };
                problemText.addEventListener('click', toggleAndHighlight);
                detailedContainer.addEventListener('click', (e) => e.stopPropagation());
                problemText.appendChild(expandIndicator);
                li.appendChild(problemText);
                li.appendChild(detailedContainer);
                problemsList.appendChild(li);
            });
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Initialize history on load
    renderHistory();
    clearHistoryButton?.addEventListener('click', () => {
        localStorage.removeItem(HISTORY_KEY);
        renderHistory();
    });
    const problemsList = document.getElementById('problems-list');
    const englishTextDisplay = document.getElementById('english-text-display');
    const vietnameseTextDisplay = document.getElementById('vietnamese-text-display');

    let originalEnglishText = '';
    let originalVietnameseText = '';

    // Load API key from localStorage
    const savedApiKey = localStorage.getItem('apiKey');
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
    }

    // Save API key on input
    apiKeyInput.addEventListener('input', () => {
        localStorage.setItem('apiKey', apiKeyInput.value);
    });

    // Folder file lists and selection state
    let englishFiles = [];
    let vietnameseFiles = [];
    let selectedEnglishFile = null;
    let selectedVietnameseFile = null;

    const updateVerifyEnabled = () => {
        verifyButton.disabled = !(selectedEnglishFile && selectedVietnameseFile);
    };

    const renderFileList = (listElement, files, selectedFile, onSelect) => {
        listElement.innerHTML = '';
        if (!files.length) {
            const empty = document.createElement('li');
            empty.textContent = 'No files loaded';
            empty.className = 'file-list-empty';
            listElement.appendChild(empty);
            return;
        }
        files.forEach((file, index) => {
            const li = document.createElement('li');
            li.className = 'file-list-item' + (selectedFile === file ? ' selected' : '');
            li.textContent = file.webkitRelativePath || file.name;
            li.title = file.webkitRelativePath || file.name;
            li.addEventListener('click', () => onSelect(file));
            listElement.appendChild(li);
        });
    };

    const handleEnglishFolderChange = () => {
        englishFiles = Array.from(englishFolderInput.files || []).filter(f => f.name.toLowerCase().endsWith('.txt'));
        selectedEnglishFile = null;
        renderFileList(englishFileList, englishFiles, selectedEnglishFile, (file) => {
            selectedEnglishFile = file;
            renderFileList(englishFileList, englishFiles, selectedEnglishFile, (f) => { selectedEnglishFile = f; renderFileList(englishFileList, englishFiles, selectedEnglishFile, () => {}); updateVerifyEnabled(); });
            updateVerifyEnabled();
        });
        updateVerifyEnabled();
    };

    const handleVietnameseFolderChange = () => {
        vietnameseFiles = Array.from(vietnameseFolderInput.files || []).filter(f => f.name.toLowerCase().endsWith('.txt') || f.name.toLowerCase().endsWith('.docx'));
        selectedVietnameseFile = null;
        renderFileList(vietnameseFileList, vietnameseFiles, selectedVietnameseFile, (file) => {
            selectedVietnameseFile = file;
            renderFileList(vietnameseFileList, vietnameseFiles, selectedVietnameseFile, (f) => { selectedVietnameseFile = f; renderFileList(vietnameseFileList, vietnameseFiles, selectedVietnameseFile, () => {}); updateVerifyEnabled(); });
            updateVerifyEnabled();
        });
        updateVerifyEnabled();
    };

    englishFolderInput.addEventListener('change', handleEnglishFolderChange);
    vietnameseFolderInput.addEventListener('change', handleVietnameseFolderChange);

    // Verify button click
    verifyButton.addEventListener('click', async () => {
        loadingSpan.style.display = 'inline';
        verifyButton.disabled = true;
        problemsList.innerHTML = '';
        englishTextDisplay.innerHTML = '';
        vietnameseTextDisplay.innerHTML = '';

        if (!selectedEnglishFile || !selectedVietnameseFile) {
            alert('Please select one English file and one Vietnamese file');
            loadingSpan.style.display = 'none';
            verifyButton.disabled = false;
            return;
        }

        const formData = new FormData();
        formData.append('english_file', selectedEnglishFile, selectedEnglishFile.name);
        formData.append('vietnamese_file', selectedVietnameseFile, selectedVietnameseFile.name);
        formData.append('api_key', apiKeyInput.value);
        formData.append('model', modelSelect.value);

        try {
            const response = await fetch('/verify', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();

            if (data.error) {
                alert(data.error);
                return;
            }

            // Save successful result to history
            try {
                const payload = {
                    id: makeHistoryId(),
                    timestamp: Date.now(),
                    label: guessChapterLabel(selectedEnglishFile) || selectedEnglishFile.name,
                    englishName: selectedEnglishFile.name,
                    vietnameseName: selectedVietnameseFile.name,
                    english_text: data.english_text,
                    vietnamese_text: data.vietnamese_text,
                    markers: data.markers || []
                };
                saveToHistory(payload);
            } catch (e) {
                // ignore storage errors
            }

            originalEnglishText = data.english_text;
            originalVietnameseText = data.vietnamese_text;

            englishTextDisplay.innerText = originalEnglishText;
            vietnameseTextDisplay.innerText = originalVietnameseText;

            if (data.markers.length === 0) {
                const li = document.createElement('li');
                li.textContent = 'No problems found.';
                problemsList.appendChild(li);
            } else {
                data.markers.forEach((marker, index) => {
                    const li = document.createElement('li');
                    li.className = 'problem-item';
                    li.setAttribute('data-expanded', 'false');
                    
                    // Create the main problem title (brief summary)
                    const problemText = document.createElement('div');
                    problemText.className = 'problem-text';
                    problemText.textContent = marker.explanation || `Problem ${index + 1}`;
                    
                    // Create the detailed explanation container (initially hidden)
                    const detailedContainer = document.createElement('div');
                    detailedContainer.className = 'detailed-explanation-container';
                    detailedContainer.style.display = 'none';
                    
                    const detailedText = document.createElement('div');
                    detailedText.className = 'detailed-explanation-text';
                    detailedText.textContent = marker.detailed_explanation || 'No detailed explanation provided';
                    
                    detailedContainer.appendChild(detailedText);
                    
                    // Create expand/collapse indicator
                    const expandIndicator = document.createElement('span');
                    expandIndicator.className = 'expand-indicator';
                    expandIndicator.textContent = '▼';
                    
                    // Add click functionality to toggle expansion and highlight text
                    const toggleAndHighlight = () => {
                        const isExpanded = li.getAttribute('data-expanded') === 'true';
                        
                        if (isExpanded) {
                            // Collapse
                            detailedContainer.style.display = 'none';
                            expandIndicator.textContent = '▼';
                            li.setAttribute('data-expanded', 'false');
                        } else {
                            // Expand
                            detailedContainer.style.display = 'block';
                            expandIndicator.textContent = '▲';
                            li.setAttribute('data-expanded', 'true');
                        }
                        
                        // Always highlight the text when clicked
                        highlightAndScroll('english-text-display', originalEnglishText, marker.english_marker, `en-marker-${index}`);
                        highlightAndScroll('vietnamese-text-display', originalVietnameseText, marker.vietnamese_marker, `vi-marker-${index}`);
                    };
                    
                    // Add click functionality to all clickable elements
                    problemText.addEventListener('click', toggleAndHighlight);
                    detailedContainer.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent toggling when clicking inside detailed explanation
                    });
                    
                    // Add expand indicator to the problem text
                    problemText.appendChild(expandIndicator);
                    
                    li.appendChild(problemText);
                    li.appendChild(detailedContainer);
                    problemsList.appendChild(li);
                });
            }

        } catch (error)
        {
            alert('Error: ' + error.message);
        } finally {
            loadingSpan.style.display = 'none';
            verifyButton.disabled = false;
        }
    });

    function highlightAndScroll(elementId, originalText, marker, markerId) {
        const element = document.getElementById(elementId);
        // Reset content to original text to clear previous highlights
        element.innerText = originalText;

        const text = element.innerHTML; // Use innerHTML to work with HTML tags
        const markerIndex = text.indexOf(marker);

        if (markerIndex !== -1) {
            const highlightedText = text.substring(0, markerIndex) +
                `<span class="highlight" id="${markerId}">` +
                marker +
                '</span>' +
                text.substring(markerIndex + marker.length);
            
            element.innerHTML = highlightedText;
            
            const highlightSpan = document.getElementById(markerId);
            if (highlightSpan) {
                highlightSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }
});
