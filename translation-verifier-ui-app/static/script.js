// static/script.js
document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('api_key');
    const modelSelect = document.getElementById('model');
    const englishFileInput = document.getElementById('english_file');
    const vietnameseFileInput = document.getElementById('vietnamese_file');
    const verifyButton = document.getElementById('verify_button');
    const loadingSpan = document.getElementById('loading');
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

    // Enable button when both files selected
    const checkFilesSelected = () => {
        verifyButton.disabled = !englishFileInput.files.length || !vietnameseFileInput.files.length;
    };
    englishFileInput.addEventListener('change', checkFilesSelected);
    vietnameseFileInput.addEventListener('change', checkFilesSelected);

    // Verify button click
    verifyButton.addEventListener('click', async () => {
        loadingSpan.style.display = 'inline';
        verifyButton.disabled = true;
        problemsList.innerHTML = '';
        englishTextDisplay.innerHTML = '';
        vietnameseTextDisplay.innerHTML = '';

        const formData = new FormData();
        formData.append('english_file', englishFileInput.files[0]);
        formData.append('vietnamese_file', vietnameseFileInput.files[0]);
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
                    li.textContent = `Problem ${index + 1}: English: "${marker.english_marker}" | Vietnamese: "${marker.vietnamese_marker}"`;
                    li.addEventListener('click', () => {
                        highlightAndScroll('english-text-display', originalEnglishText, marker.english_marker, `en-marker-${index}`);
                        highlightAndScroll('vietnamese-text-display', originalVietnameseText, marker.vietnamese_marker, `vi-marker-${index}`);
                    });
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
