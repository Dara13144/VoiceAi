class TextToSpeechApp {
    constructor() {
        this.API_URL = 'http://localhost:3000/api'; // Change this to your backend URL
        this.currentAudioUrl = null;
        this.currentFilename = null;
        
        this.initElements();
        this.initEventListeners();
        this.checkBackendConnection();
    }
    
    initElements() {
        this.textInput = document.getElementById('textInput');
        this.languageSelect = document.getElementById('language');
        this.speedRange = document.getElementById('speed');
        this.pitchRange = document.getElementById('pitch');
        this.speedValue = document.getElementById('speedValue');
        this.pitchValue = document.getElementById('pitchValue');
        this.convertBtn = document.getElementById('convertBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.shareBtn = document.getElementById('shareBtn');
        this.outputSection = document.getElementById('outputSection');
        this.audioPlayer = document.getElementById('audioPlayer');
        this.statusMessage = document.getElementById('statusMessage');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.charCount = document.getElementById('charCount');
    }
    
    initEventListeners() {
        // Text input events
        this.textInput.addEventListener('input', () => this.updateCharCount());
        
        // Range inputs
        this.speedRange.addEventListener('input', (e) => {
            this.speedValue.textContent = `${e.target.value}x`;
        });
        
        this.pitchRange.addEventListener('input', (e) => {
            this.pitchValue.textContent = e.target.value;
        });
        
        // Buttons
        this.convertBtn.addEventListener('click', () => this.convertToSpeech());
        this.clearBtn.addEventListener('click', () => this.clearAll());
        this.downloadBtn.addEventListener('click', () => this.downloadAudio());
        this.shareBtn.addEventListener('click', () => this.shareAudio());
        
        // Audio events
        this.audioPlayer.addEventListener('ended', () => {
            this.showStatus('Playback finished', 'info');
        });
        
        // Handle online/offline
        window.addEventListener('online', () => this.showStatus('Back online', 'success'));
        window.addEventListener('offline', () => this.showStatus('You are offline', 'error'));
    }
    
    updateCharCount() {
        const count = this.textInput.value.length;
        this.charCount.textContent = count;
        
        // Visual feedback for long text
        if (count > 1000) {
            this.charCount.style.color = '#dc3545';
        } else {
            this.charCount.style.color = 'var(--secondary-color)';
        }
    }
    
    async checkBackendConnection() {
        try {
            const response = await fetch(`${this.API_URL}/health`);
            if (response.ok) {
                console.log('Backend connected');
            }
        } catch (error) {
            console.log('Backend not connected, using fallback');
        }
    }
    
    async convertToSpeech() {
        const text = this.textInput.value.trim();
        const language = this.languageSelect.value;
        
        if (!text) {
            this.showStatus('Please enter some text', 'error');
            return;
        }
        
        // Validate Khmer text detection (basic check)
        if (language === 'km' && !this.containsKhmer(text)) {
            if (!confirm('The text doesn\'t appear to be Khmer. Continue anyway?')) {
                return;
            }
        }
        
        this.showLoading(true);
        
        try {
            const response = await fetch(`${this.API_URL}/tts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text,
                    language: language,
                    speed: parseFloat(this.speedRange.value),
                    pitch: parseInt(this.pitchRange.value)
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to generate speech');
            }
            
            const data = await response.json();
            
            this.currentAudioUrl = data.audioUrl;
            this.currentFilename = data.filename;
            
            // Update audio player
            this.audioPlayer.src = this.currentAudioUrl;
            this.audioPlayer.load();
            
            // Show output section
            this.outputSection.style.display = 'block';
            
            // Auto-play (with user interaction check)
            this.audioPlayer.play().catch(e => {
                console.log('Auto-play prevented:', e);
            });
            
            this.showStatus(`Speech generated successfully! Duration: ~${data.duration} seconds`, 'success');
            
        } catch (error) {
            console.error('Error:', error);
            this.showStatus('Failed to generate speech. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    containsKhmer(text) {
        // Khmer Unicode range: U+1780 to U+17FF
        const khmerRegex = /[\u1780-\u17FF]/;
        return khmerRegex.test(text);
    }
    
    async downloadAudio() {
        if (!this.currentAudioUrl) {
            this.showStatus('No audio to download', 'error');
            return;
        }
        
        try {
            const response = await fetch(this.currentAudioUrl);
            const blob = await response.blob();
            
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tts-${this.languageSelect.value}-${Date.now()}.mp3`;
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            this.showStatus('Download started', 'success');
            
        } catch (error) {
            console.error('Download error:', error);
            this.showStatus('Failed to download audio', 'error');
        }
    }
    
    async shareAudio() {
        if (!this.currentAudioUrl) {
            this.showStatus('No audio to share', 'error');
            return;
        }
        
        // Check if Web Share API is available
        if (navigator.share) {
            try {
                // Try to share the audio file
                const response = await fetch(this.currentAudioUrl);
                const blob = await response.blob();
                const file = new File([blob], 'speech.mp3', { type: 'audio/mp3' });
                
                await navigator.share({
                    title: 'Text to Speech Audio',
                    text: this.textInput.value.substring(0, 100) + '...',
                    files: [file]
                });
                
                this.showStatus('Shared successfully!', 'success');
                
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Share error:', error);
                    this.showStatus('Sharing failed', 'error');
                }
            }
        } else {
            // Fallback for browsers that don't support Web Share
            this.downloadAudio();
        }
    }
    
    clearAll() {
        this.textInput.value = '';
        this.charCount.textContent = '0';
        this.outputSection.style.display = 'none';
        this.audioPlayer.src = '';
        this.currentAudioUrl = null;
        this.currentFilename = null;
        this.showStatus('Cleared all content', 'info');
    }
    
    showStatus(message, type) {
        this.statusMessage.textContent = message;
        this.statusMessage.className = `status-message ${type}`;
        
        // Auto-hide after 3 seconds for success/info messages
        if (type !== 'error') {
            setTimeout(() => {
                this.statusMessage.textContent = '';
                this.statusMessage.className = 'status-message';
            }, 3000);
        }
    }
    
    showLoading(show) {
        this.loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TextToSpeechApp();
});

// Service Worker for PWA support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(error => {
            console.log('ServiceWorker registration failed:', error);
        });
    });
}
