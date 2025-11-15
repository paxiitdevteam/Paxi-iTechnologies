/**
 * Chat Widget Controller
 * Main controller for AI Chat Agent widget
 * ALL PATHS USE PMS - NO HARDCODED PATHS
 */

class ChatWidget {
    constructor() {
        console.log('[Chat Widget] 🚀 Creating new ChatWidget instance...');
        this.isOpen = false;
        this.sessionId = null;
        this.conversationHistory = [];
        this.isTyping = false;
        this.initialized = false;
        this.isSending = false; // Prevent duplicate sends
        this.emptyMessageShown = false; // Prevent duplicate empty messages
        this.recognition = null; // Speech recognition
        this.isListening = false; // Voice input state
        this.uploadedFiles = []; // Track uploaded files
        this.voiceBaseText = ''; // Base text before voice input (to prevent duplication)
        this.initialize();
    }

    /**
     * Initialize chat widget
     * Wait for PMS and APIM to be available
     */
    async initialize() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.waitForPMS());
        } else {
            this.waitForPMS();
        }
    }

    /**
     * Wait for PMS, APIM, and CLS to be available before setup
     */
    async waitForPMS() {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait (50 * 100ms)
        
        const checkAndSetup = () => {
            attempts++;
            
            // Check if we've waited too long
            if (attempts > maxAttempts) {
                console.warn('[Chat Widget] Timeout waiting for systems, initializing with fallback...');
                this.setupWithFallback();
                return;
            }
            
            // Wait for PMS (Path Manager System) - PARAMOUNT
            if (typeof window === 'undefined' || typeof window.PMS === 'undefined') {
                console.log('[Chat Widget] Waiting for PMS... (attempt ' + attempts + ')');
                setTimeout(checkAndSetup, 100);
                return;
            }
            
            // Wait for APIM (API Path Manager) - uses PMS internally
            if (typeof window.APIM === 'undefined') {
                console.log('[Chat Widget] Waiting for APIM... (attempt ' + attempts + ')');
                setTimeout(checkAndSetup, 100);
                return;
            }
            
            // Verify APIM has getAPIUrl method
            if (typeof window.APIM.getAPIUrl !== 'function') {
                console.log('[Chat Widget] Waiting for APIM.getAPIUrl method... (attempt ' + attempts + ')');
                setTimeout(checkAndSetup, 100);
                return;
            }
            
            // CLS is optional - we can proceed without it
            if (typeof window.CLS === 'undefined' || !window.CLS.initialized) {
                console.log('[Chat Widget] Waiting for CLS... (attempt ' + attempts + ')');
                // Don't block on CLS - continue after a few attempts
                if (attempts < 10) {
                    setTimeout(checkAndSetup, 100);
                    return;
                } else {
                    console.warn('[Chat Widget] CLS not available, proceeding without translations...');
                }
            }
            
            console.log('[Chat Widget] Systems available, initializing...');
            this.setup();
        };
        
        checkAndSetup();
    }
    
    /**
     * Setup with fallback if systems not available
     */
    setupWithFallback() {
        console.warn('[Chat Widget] Setting up with fallback mode...');
        // Create widget HTML even without full system support
        this.createWidgetHTML();
        this.attachEventListeners();
        // Try to initialize session with fallback
        this.initializeSessionFallback();
    }
    
    /**
     * Initialize session with fallback (direct API call)
     */
    async initializeSessionFallback() {
        try {
            const baseUrl = window.location.origin;
            const sessionUrl = `${baseUrl}/api/chat/session`;
            const response = await fetch(sessionUrl);
            const data = await response.json();
            
            if (data.success && data.data.sessionId) {
                this.sessionId = data.data.sessionId;
                localStorage.setItem('chatSessionId', this.sessionId);
                console.log('[Chat Widget] Session created with fallback method');
            }
        } catch (error) {
            console.error('[Chat Widget] Fallback session creation failed:', error);
        }
    }

    /**
     * Setup chat widget
     */
    async setup() {
        try {
            // Create chat widget HTML
            this.createWidgetHTML();
            
            // Get or create session
            await this.initializeSession();
            
            // Attach event listeners
            this.attachEventListeners();
            
            // Load conversation history (non-blocking)
            this.loadHistory().catch(error => {
                console.warn('[Chat Widget] Could not load history:', error);
            });
            
            this.initialized = true;
            console.log('[Chat Widget] ✅ Initialized successfully');
        } catch (error) {
            console.error('[Chat Widget] ❌ Error during setup:', error);
            // Still show the widget even if there's an error
            try {
                this.createWidgetHTML();
                this.attachEventListeners();
                this.initialized = true;
                console.log('[Chat Widget] Widget displayed with limited functionality');
            } catch (fallbackError) {
                console.error('[Chat Widget] ❌ Critical error - widget cannot be displayed:', fallbackError);
                this.initialized = false;
            }
        }
    }

    /**
     * Get translation from CLS - USING CLS (NO HARDCODED TEXT)
     */
    getTranslation(key, defaultValue = '') {
        // Wait for CLS to be available
        if (typeof window !== 'undefined' && typeof window.CLS !== 'undefined' && window.CLS.initialized) {
            try {
                const translation = window.CLS.translate(`chat.${key}`);
                return translation || defaultValue;
            } catch (error) {
                console.warn(`[Chat Widget] Translation not found for chat.${key}:`, error);
                return defaultValue;
            }
        }
        return defaultValue;
    }

    /**
     * Create chat widget HTML structure - USING CLS TRANSLATIONS
     */
    createWidgetHTML() {
        // Get translations from CLS
        const translations = {
            title: this.getTranslation('title', 'Chat with us'),
            statusOnline: this.getTranslation('statusOnline', '● Online'),
            welcome: this.getTranslation('welcome', '👋 Hello! I\'m your AI assistant. I can help you learn about our services, answer questions about AI training programs, provide contact information, and more. How can I assist you today?'),
            placeholder: this.getTranslation('placeholder', 'Type your message...'),
            send: this.getTranslation('send', 'Send'),
            close: this.getTranslation('close', 'Close chat'),
            open: this.getTranslation('open', 'Open chat'),
            clearChat: this.getTranslation('clearChat', 'Clear chat'),
            newChat: this.getTranslation('newChat', 'New chat')
        };
        
        // Create chat button
        const chatButton = document.createElement('div');
        chatButton.id = 'chat-widget-button';
        chatButton.className = 'chat-widget-button';
        chatButton.innerHTML = '💬';
        chatButton.setAttribute('aria-label', translations.open);
        chatButton.setAttribute('role', 'button');
        chatButton.setAttribute('tabindex', '0');
        
        // Create chat window
        const chatWindow = document.createElement('div');
        chatWindow.id = 'chat-widget-window';
        chatWindow.className = 'chat-widget-window';
        chatWindow.innerHTML = `
            <div class="chat-widget-header">
                <div class="chat-widget-header-content">
                    <h3>${translations.title}</h3>
                    <span class="chat-widget-status" id="chat-status">${translations.statusOnline}</span>
                </div>
                <div class="chat-widget-header-actions">
                    <button class="chat-widget-clear" id="chat-clear-btn" aria-label="${translations.clearChat}" title="${translations.clearChat}">🗑️</button>
                    <button class="chat-widget-close" id="chat-close-btn" aria-label="${translations.close}">×</button>
                </div>
            </div>
            <div class="chat-widget-actions-bar">
                <button class="chat-widget-action-btn" id="chat-escalate-btn" aria-label="${translations.escalate}" title="${translations.escalate}">👤 ${translations.escalate}</button>
                <button class="chat-widget-action-btn" id="chat-feedback-btn" aria-label="${translations.feedback}" title="${translations.feedback}">⭐ ${translations.feedback}</button>
            </div>
            <div class="chat-widget-messages" id="chat-messages">
                <div class="chat-widget-welcome">
                    <p><strong>🤖 AI Assistant</strong><br>${translations.welcome}</p>
                </div>
            </div>
            <div class="chat-widget-typing" id="chat-typing" style="display: none;">
                <span></span><span></span><span></span>
            </div>
            <div class="chat-widget-input-container">
                <div class="chat-widget-input-actions">
                    <button id="chat-voice-btn" class="chat-widget-voice" aria-label="${translations.voiceInput}" title="${translations.voiceInput}">🎤</button>
                    <button id="chat-file-btn" class="chat-widget-file" aria-label="${translations.fileUpload}" title="${translations.fileUpload}">📎</button>
                    <input type="file" id="chat-file-input" accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.webp,image/*" style="display: none;" />
                </div>
                <div class="chat-widget-input-main">
                    <input 
                        type="text" 
                        id="chat-input" 
                        class="chat-widget-input" 
                        placeholder="${translations.placeholder}"
                        aria-label="${translations.placeholder}"
                    />
                    <button id="chat-send-btn" class="chat-widget-send" aria-label="${translations.send}">➤</button>
                </div>
            </div>
            <div id="chat-file-preview" class="chat-widget-file-preview" style="display: none;"></div>
            <div id="chat-voice-status" class="chat-widget-voice-status" style="display: none;"></div>
        `;
        
        // Append to body
        document.body.appendChild(chatButton);
        document.body.appendChild(chatWindow);
        
        // Load styles
        this.loadStyles();
    }

    /**
     * Load chat widget styles - USING PMS (NO HARDCODED PATHS)
     */
    loadStyles() {
        // Check if styles already loaded
        if (document.getElementById('chat-widget-styles')) {
            return;
        }
        
        // Wait for PMS to be available
        if (typeof window === 'undefined' || typeof window.PMS === 'undefined') {
            console.warn('[Chat Widget] PMS not available, waiting...');
            setTimeout(() => this.loadStyles(), 100);
            return;
        }
        
        // Use PMS to get CSS path - SINGLE SOURCE OF TRUTH
        const cssPath = window.PMS.frontend('components', 'chat-widget', 'chat-styles.css');
        
        // Create link to CSS file
        const link = document.createElement('link');
        link.id = 'chat-widget-styles';
        link.rel = 'stylesheet';
        link.href = cssPath;
        document.head.appendChild(link);
    }

    /**
     * Initialize or get session - USING PMS/APIM (NO HARDCODED PATHS)
     */
    async initializeSession() {
        try {
            // Wait for APIM to be available (uses PMS internally)
            if (typeof window === 'undefined' || typeof window.APIM === 'undefined') {
                console.warn('[Chat Widget] APIM not available, waiting...');
                setTimeout(() => this.initializeSession(), 100);
                return;
            }
            
            // Verify APIM.getAPIUrl is available
            if (!window.APIM || typeof window.APIM.getAPIUrl !== 'function') {
                throw new Error('APIM.getAPIUrl is not available');
            }
            
            // Check if session exists in localStorage
            const storedSessionId = localStorage.getItem('chatSessionId');
            
            if (storedSessionId) {
                // Validate existing session - USE APIM (which uses PMS)
                const sessionUrl = window.APIM.getAPIUrl('/api/chat/session', { sessionId: storedSessionId });
                const response = await fetch(sessionUrl);
                const data = await response.json();
                
                if (data.success && data.data.valid) {
                    this.sessionId = storedSessionId;
                    return;
                }
            }
            
            // Create new session - USE APIM (which uses PMS)
            const sessionUrl = window.APIM.getAPIUrl('/api/chat/session');
            const response = await fetch(sessionUrl);
            const data = await response.json();
            
            if (data.success && data.data.sessionId) {
                this.sessionId = data.data.sessionId;
                localStorage.setItem('chatSessionId', this.sessionId);
            } else {
                console.error('[Chat Widget] Failed to create session:', data);
            }
        } catch (error) {
            console.error('[Chat Widget] Error initializing session:', error);
        }
    }

    /**
     * Attach event listeners (with duplicate prevention)
     */
    attachEventListeners() {
        // Remove existing listeners to prevent duplicates
        const chatButton = document.getElementById('chat-widget-button');
        if (chatButton) {
            // Clone and replace to remove old listeners
            const newButton = chatButton.cloneNode(true);
            chatButton.parentNode.replaceChild(newButton, chatButton);
            
            newButton.addEventListener('click', () => this.toggle());
            newButton.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.toggle();
                }
            });
        }
        
        // Close button
        const closeBtn = document.getElementById('chat-close-btn');
        if (closeBtn) {
            const newCloseBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
            newCloseBtn.addEventListener('click', () => this.close());
        }
        
        // Clear chat button
        const clearBtn = document.getElementById('chat-clear-btn');
        if (clearBtn) {
            const newClearBtn = clearBtn.cloneNode(true);
            clearBtn.parentNode.replaceChild(newClearBtn, clearBtn);
            newClearBtn.addEventListener('click', () => this.clearChat());
        }
        
        // Send button
        const sendBtn = document.getElementById('chat-send-btn');
        if (sendBtn) {
            const newSendBtn = sendBtn.cloneNode(true);
            sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);
            
            newSendBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.sendMessage();
            });
            // Ensure button is enabled
            newSendBtn.disabled = false;
            newSendBtn.style.pointerEvents = 'auto';
            newSendBtn.style.cursor = 'pointer';
        } else {
            console.error('[Chat Widget] Send button not found!');
        }
        
        // Input field
        const input = document.getElementById('chat-input');
        if (input) {
            const newInput = input.cloneNode(true);
            input.parentNode.replaceChild(newInput, input);
            
            newInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.sendMessage();
                }
            });
            // Ensure input is enabled
            newInput.disabled = false;
        } else {
            console.error('[Chat Widget] Input field not found!');
        }
        
        // Voice input button
        const voiceBtn = document.getElementById('chat-voice-btn');
        if (voiceBtn) {
            const newVoiceBtn = voiceBtn.cloneNode(true);
            voiceBtn.parentNode.replaceChild(newVoiceBtn, voiceBtn);
            newVoiceBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleVoiceInput();
            });
        }
        
        // File upload button
        const fileBtn = document.getElementById('chat-file-btn');
        const fileInput = document.getElementById('chat-file-input');
        if (fileBtn && fileInput) {
            const newFileBtn = fileBtn.cloneNode(true);
            fileBtn.parentNode.replaceChild(newFileBtn, fileBtn);
            newFileBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                fileInput.click();
            });
            
            const newFileInput = fileInput.cloneNode(true);
            fileInput.parentNode.replaceChild(newFileInput, fileInput);
            newFileInput.addEventListener('change', (e) => {
                this.handleFileUpload(e.target.files);
            });
        }
        
        // Initialize speech recognition if available
        this.initializeSpeechRecognition();
    }
    
    /**
     * Initialize speech recognition (Web Speech API)
     * Enhanced for mobile browser support (Samsung Internet, Chrome Mobile, Safari iOS)
     */
    initializeSpeechRecognition() {
        if (typeof window !== 'undefined') {
            // Try multiple recognition APIs for better mobile support
            const SpeechRecognition = window.SpeechRecognition || 
                                     window.webkitSpeechRecognition || 
                                     window.mozSpeechRecognition || 
                                     window.msSpeechRecognition;
            
            if (SpeechRecognition) {
                try {
                    this.recognition = new SpeechRecognition();
                    this.recognition.continuous = true; // Keep listening until user stops manually
                    this.recognition.interimResults = true;
                    
                    // Detect language from CLS if available
                    let lang = 'en-US';
                    if (typeof window.CLS !== 'undefined' && window.CLS.currentLanguage) {
                        const langMap = {
                            'en': 'en-US',
                            'fr': 'fr-FR',
                            'ar': 'ar-SA',
                            'de': 'de-DE',
                            'es': 'es-ES'
                        };
                        lang = langMap[window.CLS.currentLanguage] || 'en-US';
                    }
                    this.recognition.lang = lang;
                    
                    this.recognition.onresult = (event) => {
                        let interimTranscript = '';
                        let finalTranscript = '';
                        
                        // Process all results from the last index
                        for (let i = event.resultIndex; i < event.results.length; i++) {
                            const transcript = event.results[i][0].transcript;
                            if (event.results[i].isFinal) {
                                finalTranscript += transcript + ' ';
                            } else {
                                interimTranscript += transcript;
                            }
                        }
                        
                        const input = document.getElementById('chat-input');
                        if (input) {
                            if (finalTranscript) {
                                // Add final transcript to base text (no duplication)
                                this.voiceBaseText += finalTranscript;
                                input.value = this.voiceBaseText.trim();
                            } else if (interimTranscript) {
                                // Show interim results (temporary, will be replaced)
                                input.value = (this.voiceBaseText + interimTranscript).trim();
                            }
                        }
                    };
                    
                    this.recognition.onerror = (event) => {
                        console.error('[Chat Widget] Speech recognition error:', event.error);
                        this.stopVoiceInput();
                        
                        // Hide error message on mobile - just disable the button
                        const voiceBtn = document.getElementById('chat-voice-btn');
                        if (voiceBtn) {
                            voiceBtn.style.display = 'none'; // Hide button if not supported
                        }
                        
                        // Only show error if it's a permission issue
                        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
                            const errorMsg = this.getTranslation('voiceInputPermission', 'Please allow microphone access');
                            this.showVoiceStatus(errorMsg, 'error');
                        }
                    };
                    
                    this.recognition.onend = () => {
                        // Only stop if user explicitly stopped, not on automatic end
                        // This allows user to review text before sending
                        if (this.isListening) {
                            // Recognition ended but user might still be speaking
                            // Don't auto-stop - let user manually stop when done
                            // Just update the UI to show it's ready
                            const voiceBtn = document.getElementById('chat-voice-btn');
                            if (voiceBtn) {
                                voiceBtn.classList.remove('chat-widget-voice-active');
                                voiceBtn.textContent = '🎤';
                            }
                            this.hideVoiceStatus();
                            // Keep isListening true so user can continue or stop manually
                        }
                    };
                    
                    console.log('[Chat Widget] ✅ Speech recognition initialized');
                } catch (error) {
                    console.warn('[Chat Widget] Speech recognition not available:', error);
                    this.recognition = null;
                    // Hide voice button if recognition fails
                    const voiceBtn = document.getElementById('chat-voice-btn');
                    if (voiceBtn) {
                        voiceBtn.style.display = 'none';
                    }
                }
            } else {
                console.warn('[Chat Widget] Speech recognition API not supported in this browser');
                // Hide voice button if API not supported
                const voiceBtn = document.getElementById('chat-voice-btn');
                if (voiceBtn) {
                    voiceBtn.style.display = 'none';
                }
            }
        }
    }
    
    /**
     * Toggle voice input
     */
    toggleVoiceInput() {
        if (this.isListening) {
            this.stopVoiceInput();
        } else {
            this.startVoiceInput();
        }
    }
    
    /**
     * Start voice input
     */
    startVoiceInput() {
        if (!this.recognition) {
            // Don't show error message - button should already be hidden if not supported
            console.warn('[Chat Widget] Voice input not available');
            return;
        }
        
        try {
            // Save current input value as base (to prevent duplication)
            const input = document.getElementById('chat-input');
            if (input) {
                this.voiceBaseText = input.value; // Save existing text
            } else {
                this.voiceBaseText = '';
            }
            
            this.recognition.start();
            this.isListening = true;
            
            const voiceBtn = document.getElementById('chat-voice-btn');
            if (voiceBtn) {
                voiceBtn.classList.add('chat-widget-voice-active');
                voiceBtn.textContent = '🔴';
            }
            
            const statusMsg = this.getTranslation('voiceInputListening', 'Listening...');
            this.showVoiceStatus(statusMsg, 'listening');
            
            console.log('[Chat Widget] 🎤 Voice input started');
        } catch (error) {
            if (error.name === 'not-allowed' || error.name === 'PermissionDeniedError') {
                const errorMsg = this.getTranslation('voiceInputPermission', 'Please allow microphone access');
                this.showVoiceStatus(errorMsg, 'error');
            } else {
                // Hide button on other errors (mobile browsers that don't support it)
                const voiceBtn = document.getElementById('chat-voice-btn');
                if (voiceBtn) {
                    voiceBtn.style.display = 'none';
                }
            }
            console.error('[Chat Widget] Error starting voice input:', error);
            this.stopVoiceInput();
        }
    }
    
    /**
     * Stop voice input
     */
    stopVoiceInput() {
        if (this.recognition && this.isListening) {
            try {
                this.recognition.stop();
            } catch (error) {
                console.warn('[Chat Widget] Error stopping recognition:', error);
            }
        }
        
        this.isListening = false;
        
        // Finalize the text - ensure input has the final value
        const input = document.getElementById('chat-input');
        if (input && this.voiceBaseText !== undefined) {
            input.value = this.voiceBaseText.trim();
            // Focus input so user can edit or send
            setTimeout(() => input.focus(), 100);
        }
        
        const voiceBtn = document.getElementById('chat-voice-btn');
        if (voiceBtn) {
            voiceBtn.classList.remove('chat-widget-voice-active');
            voiceBtn.textContent = '🎤';
        }
        
        this.hideVoiceStatus();
        console.log('[Chat Widget] 🎤 Voice input stopped');
    }
    
    /**
     * Show voice status
     */
    showVoiceStatus(message, type = 'listening') {
        const statusDiv = document.getElementById('chat-voice-status');
        if (statusDiv) {
            statusDiv.textContent = message;
            statusDiv.className = `chat-widget-voice-status chat-widget-voice-status-${type}`;
            statusDiv.style.display = 'block';
        }
    }
    
    /**
     * Hide voice status
     */
    hideVoiceStatus() {
        const statusDiv = document.getElementById('chat-voice-status');
        if (statusDiv) {
            statusDiv.style.display = 'none';
        }
    }
    
    /**
     * Handle file upload
     */
    async handleFileUpload(files) {
        if (!files || files.length === 0) return;
        
        const file = files[0];
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        // Allowed file types: documents and images
        const allowedTypes = [
            // Documents
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            // Images
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp'
        ];
        
        // Also check file extension as fallback (for mobile browsers)
        const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        // Validate file size
        if (file.size > maxSize) {
            const errorMsg = this.getTranslation('fileUploadTooLarge', 'File is too large. Maximum size: 10MB');
            this.addMessage('ai', errorMsg);
            return;
        }
        
        // Validate file type (check both MIME type and extension)
        if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
            const errorMsg = this.getTranslation('fileUploadInvalid', 'Invalid file type. Please upload PDF, document, or image files');
            this.addMessage('ai', errorMsg);
            return;
        }
        
        // Show file preview
        this.showFilePreview(file);
        
        // Upload file
        try {
            const uploadMsg = this.getTranslation('fileUploading', 'Uploading file...');
            this.addMessage('user', `${uploadMsg}: ${file.name}`);
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('sessionId', this.sessionId || '');
            
            const uploadUrl = window.APIM.getAPIUrl('/api/chat/upload');
            const response = await fetch(uploadUrl, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                const fileData = {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    url: data.data.url,
                    id: data.data.fileId,
                    fileId: data.data.fileId
                };
                this.uploadedFiles.push(fileData);
                
                // Display file in chat message (with preview for images)
                this.addMessageWithFile('user', `Uploaded: ${file.name}`, fileData);
                
                // Add file info to next message context
                const input = document.getElementById('chat-input');
                if (input && !input.value.trim()) {
                    input.value = `I've uploaded ${file.name} for your review.`;
                }
            } else {
                const errorMsg = this.getTranslation('fileUploadError', 'File upload failed');
                this.addMessage('ai', `${errorMsg}: ${data.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('[Chat Widget] File upload error:', error);
            const errorMsg = this.getTranslation('fileUploadError', 'File upload failed');
            this.addMessage('ai', errorMsg);
        }
    }
    
    /**
     * Show file preview
     */
    showFilePreview(file) {
        const previewDiv = document.getElementById('chat-file-preview');
        if (!previewDiv) return;
        
        const fileSize = (file.size / 1024).toFixed(2) + ' KB';
        previewDiv.innerHTML = `
            <div class="chat-widget-file-item">
                <span class="chat-widget-file-name">📄 ${file.name}</span>
                <span class="chat-widget-file-size">${fileSize}</span>
                <button class="chat-widget-file-remove" onclick="this.closest('.chat-widget-file-item').remove()">×</button>
            </div>
        `;
        previewDiv.style.display = 'block';
    }
    
    /**
     * Handle escalation to human support
     */
    async handleEscalate() {
        const confirmTitle = this.getTranslation('escalateTitle', 'Talk to Human Support');
        const confirmMessage = this.getTranslation('escalateMessage', 'Would you like to escalate this conversation to our human support team?');
        const confirmText = this.getTranslation('escalateConfirm', 'Yes, connect me');
        const cancelText = this.getTranslation('escalateCancel', 'Cancel');
        
        if (!confirm(`${confirmTitle}\n\n${confirmMessage}`)) {
            return;
        }
        
        try {
            const escalateUrl = window.APIM.getAPIUrl('/api/chat/escalate');
            const response = await fetch(escalateUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    reason: 'User requested human support',
                    context: this.conversationHistory.slice(-5) // Last 5 messages
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Redirect to contact form with context
                const contactUrl = data.data.contactFormUrl || '/pages/contact.html';
                const context = data.data.context || [];
                
                // Pre-fill contact form with chat context
                if (context && context.length > 0) {
                    const contextMessage = context.map(conv => {
                        // Handle different conversation formats
                        if (typeof conv === 'object') {
                            if (conv.userMessage && conv.aiResponse) {
                                return `User: ${conv.userMessage}\nAI: ${conv.aiResponse}`;
                            } else if (conv.userMessage) {
                                return `User: ${conv.userMessage}`;
                            } else if (conv.aiResponse) {
                                return `AI: ${conv.aiResponse}`;
                            } else if (conv.message) {
                                return conv.message;
                            }
                        } else if (typeof conv === 'string') {
                            return conv;
                        }
                        return '';
                    }).filter(msg => msg.trim().length > 0).join('\n\n');
                    
                    if (contextMessage.trim().length > 0) {
                        // Store context in sessionStorage for contact form to pick up
                        sessionStorage.setItem('chatEscalationContext', contextMessage);
                        console.log('[Chat Widget] ✅ Stored chat context for contact form pre-fill');
                    }
                } else {
                    // If no context provided, use current conversation history
                    if (this.conversationHistory && this.conversationHistory.length > 0) {
                        const historyMessage = this.conversationHistory.slice(-5).map(conv => {
                            if (conv.userMessage && conv.aiResponse) {
                                return `User: ${conv.userMessage}\nAI: ${conv.aiResponse}`;
                            }
                            return conv.userMessage || conv.aiResponse || '';
                        }).filter(msg => msg.trim().length > 0).join('\n\n');
                        
                        if (historyMessage.trim().length > 0) {
                            sessionStorage.setItem('chatEscalationContext', historyMessage);
                            console.log('[Chat Widget] ✅ Stored conversation history for contact form pre-fill');
                        }
                    }
                }
                
                window.location.href = contactUrl;
            } else {
                const errorMsg = data.message || 'Failed to escalate. Please use the contact form directly.';
                this.addMessage('ai', errorMsg);
            }
        } catch (error) {
            console.error('[Chat Widget] Error escalating:', error);
            this.addMessage('ai', 'Failed to escalate. Please use the contact form directly.');
        }
    }
    
    /**
     * Show feedback dialog
     */
    showFeedbackDialog() {
        const feedbackTitle = this.getTranslation('feedbackTitle', 'Rate your experience');
        const submitText = this.getTranslation('feedbackSubmit', 'Submit feedback');
        const thanksText = this.getTranslation('feedbackThanks', 'Thank you for your feedback!');
        
        // Create feedback modal
        const modal = document.createElement('div');
        modal.className = 'chat-widget-feedback-modal';
        modal.innerHTML = `
            <div class="chat-widget-feedback-content">
                <h3>${feedbackTitle}</h3>
                <div class="chat-widget-feedback-stars">
                    <button class="chat-widget-star" data-rating="1">⭐</button>
                    <button class="chat-widget-star" data-rating="2">⭐</button>
                    <button class="chat-widget-star" data-rating="3">⭐</button>
                    <button class="chat-widget-star" data-rating="4">⭐</button>
                    <button class="chat-widget-star" data-rating="5">⭐</button>
                </div>
                <textarea id="feedback-comment" placeholder="Optional: Tell us more about your experience..." rows="3"></textarea>
                <div class="chat-widget-feedback-actions">
                    <button id="feedback-submit-btn" class="chat-widget-feedback-submit">${submitText}</button>
                    <button id="feedback-cancel-btn" class="chat-widget-feedback-cancel">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        let selectedRating = 0;
        
        // Star rating selection
        const stars = modal.querySelectorAll('.chat-widget-star');
        stars.forEach((star, index) => {
            star.addEventListener('click', () => {
                selectedRating = index + 1;
                stars.forEach((s, i) => {
                    if (i < selectedRating) {
                        s.style.opacity = '1';
                        s.style.transform = 'scale(1.2)';
                    } else {
                        s.style.opacity = '0.3';
                        s.style.transform = 'scale(1)';
                    }
                });
            });
        });
        
        // Submit feedback
        const submitBtn = modal.querySelector('#feedback-submit-btn');
        submitBtn.addEventListener('click', async () => {
            if (selectedRating === 0) {
                alert('Please select a rating');
                return;
            }
            
            const comment = modal.querySelector('#feedback-comment').value.trim();
            
            try {
                const feedbackUrl = window.APIM.getAPIUrl('/api/chat/feedback');
                const response = await fetch(feedbackUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        sessionId: this.sessionId,
                        rating: selectedRating,
                        comment: comment || null
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    modal.remove();
                    this.addMessage('ai', thanksText);
                } else {
                    alert(data.message || 'Failed to submit feedback');
                }
            } catch (error) {
                console.error('[Chat Widget] Error submitting feedback:', error);
                alert('Failed to submit feedback. Please try again.');
            }
        });
        
        // Cancel
        const cancelBtn = modal.querySelector('#feedback-cancel-btn');
        cancelBtn.addEventListener('click', () => {
            modal.remove();
        });
        
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    /**
     * Toggle chat window
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Open chat window
     */
    open() {
        const chatWindow = document.getElementById('chat-widget-window');
        const chatButton = document.getElementById('chat-widget-button');
        
        if (chatWindow && chatButton) {
            chatWindow.classList.add('chat-widget-open');
            chatButton.classList.add('chat-widget-hidden');
            this.isOpen = true;
            
            // Ensure welcome message is always shown when chat opens
            this.ensureWelcomeMessage();
            
            // Focus input
            const input = document.getElementById('chat-input');
            if (input) {
                setTimeout(() => input.focus(), 300);
            }
        }
    }
    
    /**
     * Ensure welcome message is always displayed when chat opens
     */
    ensureWelcomeMessage() {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;
        
        // Check if welcome message already exists
        let welcome = messagesContainer.querySelector('.chat-widget-welcome');
        
        if (!welcome) {
            // Welcome message doesn't exist, create it
            const welcomeMsg = this.getTranslation('welcome', '👋 Hello! I\'m your AI assistant. I can help you learn about our services, answer questions about AI training programs, provide contact information, and more. How can I assist you today?');
            
            // Create welcome message element
            welcome = document.createElement('div');
            welcome.className = 'chat-widget-welcome';
            welcome.innerHTML = `<p><strong>🤖 AI Assistant</strong><br>${welcomeMsg}</p>`;
            
            // Insert at the beginning of messages container
            const firstChild = messagesContainer.firstChild;
            if (firstChild) {
                messagesContainer.insertBefore(welcome, firstChild);
            } else {
                messagesContainer.appendChild(welcome);
            }
        } else {
            // Welcome message exists, make sure it's visible
            welcome.style.display = 'block';
        }
    }

    /**
     * Close chat window
     */
    close() {
        const chatWindow = document.getElementById('chat-widget-window');
        const chatButton = document.getElementById('chat-widget-button');
        
        if (chatWindow && chatButton) {
            chatWindow.classList.remove('chat-widget-open');
            chatButton.classList.remove('chat-widget-hidden');
            this.isOpen = false;
        }
    }

    /**
     * Clear chat conversation and start new chat
     */
    async clearChat() {
        const confirmMessage = this.getTranslation('clearChatConfirm', 'Are you sure you want to clear this conversation?');
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        // Clear conversation history from UI
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            const welcomeMsg = this.getTranslation('welcome', '👋 Hello! I\'m your AI assistant. I can help you learn about our services, answer questions about AI training programs, provide contact information, and more. How can I assist you today?');
            messagesContainer.innerHTML = `
                <div class="chat-widget-welcome">
                    <p><strong>🤖 AI Assistant</strong><br>${welcomeMsg}</p>
                </div>
            `;
        }
        
        // Clear local conversation history
        this.conversationHistory = [];
        
        // Create new session
        try {
            // Clear old session from localStorage
            localStorage.removeItem('chatSessionId');
            this.sessionId = null;
            
            // Create new session
            await this.initializeSession();
            
            console.log('[Chat Widget] Chat cleared, new session created');
        } catch (error) {
            console.error('[Chat Widget] Error creating new session after clear:', error);
        }
    }

    /**
     * Send message - USING APIM (NO HARDCODED PATHS)
     */
    async sendMessage() {
        // Prevent duplicate sends
        if (this.isSending) {
            console.log('[Chat Widget] Message already being sent, ignoring duplicate call');
            return;
        }
        
        const input = document.getElementById('chat-input');
        if (!input) {
            console.error('[Chat Widget] Input field not found');
            return;
        }
        
        // Verify APIM is available (uses PMS internally)
        if (typeof window === 'undefined' || typeof window.APIM === 'undefined' || typeof window.APIM.getAPIUrl !== 'function') {
            console.error('[Chat Widget] APIM not available or getAPIUrl method missing');
            const errorMsg = "I'm experiencing a temporary connection issue, but I'm still here to help! 💪 While we get this sorted, I'd love to tell you about our services. We specialize in Smart IT Management and help businesses achieve clear, real-world results. <a href=\"/pages/services.html\">Explore our services</a> or <a href=\"/pages/contact.html\">contact us</a> - we'd love to discuss how we can help your business! 🚀";
            this.addMessage('ai', errorMsg);
            return;
        }
        
        const message = input.value.trim();
        if (!message) {
            // Show empty message error only once
            if (!this.emptyMessageShown) {
                const emptyMsg = this.getTranslation('emptyMessage', 'Please enter a message.');
                this.addMessage('ai', emptyMsg);
                this.emptyMessageShown = true;
                // Reset flag after 2 seconds
                setTimeout(() => {
                    this.emptyMessageShown = false;
                }, 2000);
            }
            return;
        }
        
        // Reset empty message flag when valid message is sent
        this.emptyMessageShown = false;
        
        // Set sending flag
        this.isSending = true;
        
        // Ensure session is initialized
        if (!this.sessionId) {
            console.log('[Chat Widget] Session not initialized, creating session...');
            try {
                await this.initializeSession();
                if (!this.sessionId) {
                    console.error('[Chat Widget] Failed to initialize session');
                    const errorMsg = "I'm experiencing a temporary connection issue, but I'm still here to help! 💪 While we get this sorted, I'd love to tell you about our services. We specialize in Smart IT Management and help businesses achieve clear, real-world results. <a href=\"/pages/services.html\">Explore our services</a> or <a href=\"/pages/contact.html\">contact us</a> - we'd love to discuss how we can help your business! 🚀";
                    this.addMessage('ai', errorMsg);
                    return;
                }
            } catch (error) {
                console.error('[Chat Widget] Error initializing session:', error);
                const errorMsg = "I'm experiencing a temporary connection issue, but I'm still here to help! 💪 While we get this sorted, I'd love to tell you about our services. We specialize in Smart IT Management and help businesses achieve clear, real-world results. <a href=\"/pages/services.html\">Explore our services</a> or <a href=\"/pages/contact.html\">contact us</a> - we'd love to discuss how we can help your business! 🚀";
                this.addMessage('ai', errorMsg);
                return;
            }
        }
        
        // Get send button reference
        const sendBtn = document.getElementById('chat-send-btn');
        
        // Disable send button and input while sending
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.style.opacity = '0.5';
            sendBtn.style.cursor = 'not-allowed';
        }
        input.disabled = true;
        
        // Add user message to UI (with files if any)
        if (this.uploadedFiles.length > 0) {
            this.addMessage('user', message);
            // Display each uploaded file
            this.uploadedFiles.forEach(fileData => {
                this.addMessageWithFile('user', '', fileData);
            });
        } else {
            this.addMessage('user', message);
        }
        
        // Store uploaded files for API call
        const filesToSend = [...this.uploadedFiles];
        
        // Clear input and uploaded files
        input.value = '';
        this.uploadedFiles = [];
        const filePreview = document.getElementById('chat-file-preview');
        if (filePreview) {
            filePreview.innerHTML = '';
            filePreview.style.display = 'none';
        }
        
        // Show typing indicator
        this.showTyping();
        
        try {
            // Send to API - USE APIM (which uses PMS)
            const apiUrl = window.APIM.getAPIUrl('/api/chat/send');
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message,
                    sessionId: this.sessionId,
                    files: filesToSend.map(f => ({
                        fileId: f.fileId || f.id,
                        name: f.name,
                        url: f.url
                    }))
                })
            });
            
            const data = await response.json();
            
            // Hide typing indicator
            this.hideTyping();
            
            // Re-enable send button and input
            if (sendBtn) {
                sendBtn.disabled = false;
                sendBtn.style.opacity = '1';
                sendBtn.style.cursor = 'pointer';
            }
            input.disabled = false;
            input.focus();
            
            if (data.success && data.data) {
                // Add AI response to UI
                this.addMessage('ai', data.data.message);
                
                // Update session ID if changed
                if (data.data.sessionId && data.data.sessionId !== this.sessionId) {
                    this.sessionId = data.data.sessionId;
                    localStorage.setItem('chatSessionId', this.sessionId);
                }
            } else {
                // Show engaging, marketing-oriented error message
                const errorMsg = "I'm experiencing a temporary connection issue, but I'm still here to help! 💪 While we get this sorted, I'd love to tell you about our services. We specialize in Smart IT Management and help businesses achieve clear, real-world results. <a href=\"/pages/services.html\">Explore our services</a> or <a href=\"/pages/contact.html\">contact us</a> - we'd love to discuss how we can help your business! 🚀";
                this.addMessage('ai', errorMsg);
                console.error('[Chat Widget] Error sending message:', data);
            }
        } catch (error) {
            this.hideTyping();
            
            // Re-enable send button and input on error
            const sendBtn = document.getElementById('chat-send-btn');
            if (sendBtn) {
                sendBtn.disabled = false;
                sendBtn.style.opacity = '1';
                sendBtn.style.cursor = 'pointer';
            }
            if (input) {
                input.disabled = false;
                input.focus();
            }
            
            const errorMsg = "I'm experiencing a temporary connection issue, but I'm still here to help! 💪 While we get this sorted, I'd love to tell you about our services. We specialize in Smart IT Management and help businesses achieve clear, real-world results. <a href=\"/pages/services.html\">Explore our services</a> or <a href=\"/pages/contact.html\">contact us</a> - we'd love to discuss how we can help your business! 🚀";
            this.addMessage('ai', errorMsg);
            console.error('[Chat Widget] Error sending message:', error);
            
            // Reset sending flag on error
            this.isSending = false;
        }
    }

    /**
     * Format text for better readability (markdown-like formatting)
     */
    formatMessage(text) {
        // Convert markdown-style formatting to HTML
        let formatted = text;
        
        // Bold text: **text** or *text*
        formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        
        // Numbered lists: 1. item
        formatted = formatted.replace(/^(\d+)\.\s+(.+)$/gm, '<li class="chat-list-item">$2</li>');
        
        // Bullet points: - item or • item
        formatted = formatted.replace(/^[-•]\s+(.+)$/gm, '<li class="chat-list-item">$1</li>');
        
        // Wrap consecutive list items in <ul>
        formatted = formatted.replace(/(<li class="chat-list-item">.*<\/li>\n?)+/g, (match) => {
            return '<ul class="chat-list">' + match + '</ul>';
        });
        
        // Line breaks
        formatted = formatted.replace(/\n\n/g, '</p><p>');
        formatted = formatted.replace(/\n/g, '<br>');
        
        // Wrap in paragraph if not already wrapped
        if (!formatted.includes('<p>') && !formatted.includes('<ul>')) {
            formatted = '<p>' + formatted + '</p>';
        } else if (!formatted.startsWith('<')) {
            formatted = '<p>' + formatted + '</p>';
        }
        
        return formatted;
    }

    /**
     * Add message with file attachment
     */
    addMessageWithFile(type, text, fileData) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;
        
        // Hide welcome message when first message is added
        const welcome = messagesContainer.querySelector('.chat-widget-welcome');
        if (welcome) {
            welcome.style.display = 'none';
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-widget-message chat-widget-message-${type}`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'chat-widget-message-content';
        
        // Add text
        if (text) {
            messageContent.innerHTML = `<p>${this.escapeHtml(text)}</p>`;
        }
        
        // Add file display
        const fileDisplay = document.createElement('div');
        fileDisplay.className = 'chat-widget-file-attachment';
        
        const isImage = fileData.type && fileData.type.startsWith('image/');
        const fileUrl = window.APIM ? window.APIM.getAPIUrl(fileData.url) : fileData.url;
        
        if (isImage) {
            // Show image preview
            fileDisplay.innerHTML = `
                <div class="chat-widget-image-preview">
                    <img src="${fileUrl}" alt="${this.escapeHtml(fileData.name)}" class="chat-widget-image" />
                    <div class="chat-widget-image-info">
                        <span class="chat-widget-file-name">${this.escapeHtml(fileData.name)}</span>
                        <a href="${fileUrl}" target="_blank" class="chat-widget-file-download" download>Download</a>
                    </div>
                </div>
            `;
        } else {
            // Show document link
            fileDisplay.innerHTML = `
                <div class="chat-widget-document-attachment">
                    <div class="chat-widget-file-icon">📄</div>
                    <div class="chat-widget-file-details">
                        <span class="chat-widget-file-name">${this.escapeHtml(fileData.name)}</span>
                        <span class="chat-widget-file-size">${(fileData.size / 1024).toFixed(2)} KB</span>
                    </div>
                    <a href="${fileUrl}" target="_blank" class="chat-widget-file-download" download>Download</a>
                </div>
            `;
        }
        
        messageContent.appendChild(fileDisplay);
        
        const messageTime = document.createElement('div');
        messageTime.className = 'chat-widget-message-time';
        messageTime.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(messageTime);
        messagesContainer.appendChild(messageDiv);
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Add message to chat window with enhanced formatting
     */
    addMessage(type, text) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;
        
        // Hide welcome message when first message is added (but don't remove it completely)
        // This allows it to be shown again when chat reopens
        const welcome = messagesContainer.querySelector('.chat-widget-welcome');
        if (welcome) {
            welcome.style.display = 'none';
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-widget-message chat-widget-message-${type}`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'chat-widget-message-content';
        
        // Check if text contains HTML (links, etc.)
        if (text.includes('<a ') || text.includes('href=') || text.includes('**') || text.includes('*') || text.match(/^\d+\./m)) {
            // Render HTML content with formatting
            let safeHtml = text;
            
            // First, handle links
            if (text.includes('<a ') || text.includes('href=')) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = text;
                const links = tempDiv.querySelectorAll('a');
                
                links.forEach(link => {
                    const href = link.getAttribute('href');
                    const linkText = link.textContent || link.innerText || href;
                    if (href) {
                        const safeHref = href.startsWith('http') ? href : href;
                        safeHtml = safeHtml.replace(
                            link.outerHTML,
                            `<a href="${safeHref}" class="chat-link" target="_self">${linkText}</a>`
                        );
                    }
                });
            }
            
            // Apply formatting (bold, lists, etc.)
            safeHtml = this.formatMessage(safeHtml);
            
            messageContent.innerHTML = safeHtml;
            
            // Make links clickable
            const chatLinks = messageContent.querySelectorAll('.chat-link');
            chatLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const href = link.getAttribute('href');
                    if (href) {
                        window.location.href = href;
                    }
                });
            });
        } else {
            // Plain text with basic formatting
            const formatted = this.formatMessage(text);
            messageContent.innerHTML = formatted;
        }
        
        const messageTime = document.createElement('div');
        messageTime.className = 'chat-widget-message-time';
        messageTime.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(messageTime);
        messagesContainer.appendChild(messageDiv);
        
        // Scroll to bottom with smooth animation
        setTimeout(() => {
            messagesContainer.scrollTo({
                top: messagesContainer.scrollHeight,
                behavior: 'smooth'
            });
        }, 100);
        
        // Store in history
        this.conversationHistory.push({ type, text, timestamp: new Date().toISOString() });
    }

    /**
     * Show typing indicator
     */
    showTyping() {
        const typingIndicator = document.getElementById('chat-typing');
        if (typingIndicator) {
            typingIndicator.style.display = 'flex';
            this.isTyping = true;
            
            // Scroll to bottom
            const messagesContainer = document.getElementById('chat-messages');
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }
    }

    /**
     * Hide typing indicator
     */
    hideTyping() {
        const typingIndicator = document.getElementById('chat-typing');
        if (typingIndicator) {
            typingIndicator.style.display = 'none';
            this.isTyping = false;
        }
    }

    /**
     * Load conversation history - USING APIM (NO HARDCODED PATHS)
     */
    async loadHistory() {
        if (!this.sessionId) return;
        
        // Verify APIM is available (uses PMS internally)
        if (typeof window === 'undefined' || typeof window.APIM === 'undefined') {
            console.warn('[Chat Widget] APIM not available for loading history');
            return;
        }
        
        try {
            // Use APIM to get API URL - SINGLE SOURCE OF TRUTH
            const historyUrl = window.APIM.getAPIUrl('/api/chat/history', { sessionId: this.sessionId });
            const response = await fetch(historyUrl);
            const data = await response.json();
            
            if (data.success && data.data.conversations) {
                const conversations = data.data.conversations;
                
                // Hide welcome message when loading history (but keep it for when chat reopens)
                const messagesContainer = document.getElementById('chat-messages');
                if (messagesContainer) {
                    const welcome = messagesContainer.querySelector('.chat-widget-welcome');
                    if (welcome) {
                        welcome.style.display = 'none';
                    }
                }
                
                // Add messages to UI
                conversations.forEach(conv => {
                    if (conv.userMessage) {
                        this.addMessage('user', conv.userMessage);
                    }
                    if (conv.aiResponse) {
                        this.addMessage('ai', conv.aiResponse);
                    }
                });
            }
        } catch (error) {
            console.error('[Chat Widget] Error loading history:', error);
        }
    }
}

// Initialize chat widget when script loads
if (typeof window !== 'undefined') {
    // Remove existing widget if it exists
    if (window.chatWidget) {
        try {
            // Remove existing widget elements
            const existingButton = document.getElementById('chat-widget-button');
            const existingWindow = document.getElementById('chat-widget-window');
            if (existingButton) existingButton.remove();
            if (existingWindow) existingWindow.remove();
        } catch (error) {
            console.warn('[Chat Widget] Error removing existing widget:', error);
        }
    }
    
    // Initialize new widget instance
    console.log('[Chat Widget] Initializing chat widget...');
    window.chatWidget = new ChatWidget();
    
    // Make it globally accessible for debugging
    if (typeof window !== 'undefined') {
        window.reinitializeChatWidget = function() {
            console.log('[Chat Widget] Reinitializing...');
            if (window.chatWidget) {
                try {
                    const existingButton = document.getElementById('chat-widget-button');
                    const existingWindow = document.getElementById('chat-widget-window');
                    if (existingButton) existingButton.remove();
                    if (existingWindow) existingWindow.remove();
                } catch (error) {
                    console.warn('[Chat Widget] Error removing existing widget:', error);
                }
            }
            window.chatWidget = new ChatWidget();
            console.log('[Chat Widget] ✅ Reinitialized successfully');
        };
    }
}

