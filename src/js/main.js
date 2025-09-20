/**
 * Enterprise Chat Application - Main Entry Point
 * Orchestrates all modules and initializes the application
 */
class OllamaEnterpriseApp {
    constructor() {
        this.configManager = null;
        this.apiManager = null;
        this.uiManager = null;
        this.storageManager = null;
        this.chatManager = null;
        
        this.isInitialized = false;
        this.isGenerating = false;
        this.currentProvider = 'ollama';
    }

    async init() {
        try {
            console.log('🚀 Initializing Ollama Enterprise Chat...');
            
            // Initialize configuration first
            this.configManager = new ConfigManager();
            await this.configManager.init();
            
            // Initialize managers in order
            this.initializeManagers();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load previous session
            await this.loadPreviousSession();
            
            // Initialize API connection
            await this.initializeAPI();
            
            this.isInitialized = true;
            this.showWelcomeMessage();
            
            // Ensure UI is in ready state
            this.uiManager.updateGeneratingState(false);
            
            // Ensure current model display is updated
            const modelSelect = document.getElementById('model-select');
            if (modelSelect && modelSelect.value) {
                this.uiManager.updateCurrentModel(modelSelect.value);
                console.log('🎯 Final UI update - Current model:', modelSelect.value);
            }
            
            // Debug function for clearing history (temporary)
            window.clearChatHistory = () => {
                localStorage.removeItem('ollama_enterprise_conversations');
                localStorage.removeItem('ollama_enterprise_messages');
                console.log('🧹 Chat history cleared!');
                location.reload();
            };
            
            // Debug function to check input field
            window.checkInputField = () => {
                const messageInput = document.getElementById('message-input');
                console.log('🔍 Input field debug:');
                console.log('  - Element exists:', !!messageInput);
                console.log('  - Element disabled:', messageInput?.disabled);
                console.log('  - Element readonly:', messageInput?.readOnly);
                console.log('  - Element value:', messageInput?.value);
                console.log('  - Element style display:', messageInput?.style.display);
                console.log('  - Element computed style:', window.getComputedStyle(messageInput).display);
                if (messageInput) {
                    messageInput.disabled = false;
                    messageInput.readOnly = false;
                    messageInput.focus();
                    console.log('  - Input enabled and focused');
                }
            };
            
            console.log('✅ Application initialized successfully');
            console.log('💡 Debug: Use clearChatHistory() in console to clear conversation history');
            console.log('💡 Debug: Use checkInputField() to debug input field issues');
            
        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            this.handleInitializationError(error);
        }
    }

    initializeManagers() {
        try {
            // Initialize UI Manager
            this.uiManager = new UIManager(this.configManager);
            console.log('✅ UI Manager initialized');
            
            // Initialize Storage Manager
            this.storageManager = new StorageManager(this.configManager);
            console.log('✅ Storage Manager initialized');
            
            // Initialize File Manager
            this.fileManager = new FileManager(this.configManager);
            console.log('✅ File Manager initialized');
            
            // Initialize API Manager
            this.apiManager = new APIManager(this.configManager);
            console.log('✅ API Manager initialized');
            
            // Initialize Chat Manager
            this.chatManager = new ChatManager(this.configManager, this.apiManager, this.uiManager, this.storageManager, this.fileManager);
            console.log('✅ Chat Manager initialized');
            
        } catch (error) {
            console.error('Failed to initialize managers:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Send message events
        const sendBtn = document.getElementById('send-btn');
        const messageInput = document.getElementById('message-input');
        
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.handleSendMessage());
        }
        
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleSendMessage();
                }
            });
            
            // Auto-resize textarea
            messageInput.addEventListener('input', () => this.autoResizeTextarea(messageInput));
        }

        // Model selection
        const modelSelect = document.getElementById('model-select');
        if (modelSelect) {
            modelSelect.addEventListener('change', () => this.handleModelChange());
        }

        // Provider selection
        const providerSelect = document.getElementById('provider-select');
        if (providerSelect) {
            providerSelect.addEventListener('change', () => this.handleProviderChange());
        }

        // Clear chat
        const clearBtn = document.getElementById('clear-chat');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.handleClearChat());
        }

        // Export chat
        const exportBtn = document.getElementById('export-chat');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.handleExportChat());
        }

        // Import chat
        const importBtn = document.getElementById('import-chat');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.handleImportChat());
        }

        // Refresh models
        const refreshModelsBtn = document.getElementById('refresh-models');
        if (refreshModelsBtn) {
            refreshModelsBtn.addEventListener('click', () => this.refreshModels());
        }

        // Connection test
        const testConnectionBtn = document.getElementById('test-connection');
        if (testConnectionBtn) {
            testConnectionBtn.addEventListener('click', () => this.testConnection());
        }

        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // File upload event listeners
        this.initializeFileUploadListeners();
        
        // Debug: Test input field functionality
        setTimeout(() => {
            const messageInput = document.getElementById('message-input');
            console.log('🔍 Input field check:');
            console.log('  - Element exists:', !!messageInput);
            console.log('  - Element disabled:', messageInput?.disabled);
            console.log('  - Element value:', messageInput?.value);
            console.log('  - Can focus:', messageInput?.focus && typeof messageInput.focus === 'function');
            
            if (messageInput) {
                messageInput.focus();
                console.log('  - Focus attempted');
            }
        }, 2000);
    }

    async loadPreviousSession() {
        try {
            const conversation = this.storageManager.loadCurrentConversation();
            if (conversation && conversation.messages) {
                console.log(`📜 Loading previous session with ${conversation.messages.length} messages`);
                this.chatManager.loadConversationFromHistory(conversation.messages);
                this.uiManager.updateMessageCount(conversation.messages.length);
            }
        } catch (error) {
            console.error('Failed to load previous session:', error);
        }
    }

    async initializeAPI() {
        try {
            this.uiManager.updateServerStatus('connecting');
            
            const connected = await this.apiManager.testConnection();
            if (connected) {
                this.uiManager.updateServerStatus('connected');
                await this.loadAvailableModels();
                this.uiManager.showToast('Connected to Ollama successfully', 'success');
            } else {
                this.uiManager.updateServerStatus('disconnected');
                this.uiManager.showToast('Failed to connect to AI service. Please check your settings.', 'error');
            }
        } catch (error) {
            console.error('API initialization failed:', error);
            this.uiManager.updateServerStatus('error');
            this.uiManager.showToast('API initialization failed: ' + error.message, 'error');
        }
    }

    async loadAvailableModels() {
        try {
            const models = await this.apiManager.getAvailableModels();
            this.populateModelSelect(models);
            
            const modelSelect = document.getElementById('model-select');
            if (modelSelect && models.length > 0) {
                // Get default model from current provider config
                const currentProvider = this.configManager.get('DEFAULT_PROVIDER', 'ollama');
                const providerConfig = this.configManager.getProviderConfig(currentProvider);
                const defaultModel = providerConfig?.defaultModel || this.configManager.get('OLLAMA_DEFAULT_MODEL', 'llama3.2:1b');
                
                let selectedModel = null;
                
                if (defaultModel && models.some(m => (m.name || m) === defaultModel)) {
                    // Use configured default if it exists in available models
                    selectedModel = defaultModel;
                    modelSelect.value = defaultModel;
                } else {
                    // Use first available model as fallback
                    selectedModel = models[0].name || models[0];
                    modelSelect.value = selectedModel;
                }
                
                // Update UI display
                this.uiManager.updateCurrentModel(selectedModel);
                console.log('🤖 Model selected:', selectedModel);
                console.log('📋 Available models:', models.map(m => m.name || m));
            } else {
                // No models available
                this.uiManager.updateCurrentModel('No models available');
                console.warn('⚠️ No models available');
            }
        } catch (error) {
            console.error('Failed to load models:', error);
            this.uiManager.updateCurrentModel('Error loading models');
            this.uiManager.showError('Failed to load available models');
        }
    }

    populateModelSelect(models) {
        const modelSelect = document.getElementById('model-select');
        if (modelSelect && models.length > 0) {
            modelSelect.innerHTML = '';
            models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.name || model;
                option.textContent = model.name || model;
                modelSelect.appendChild(option);
            });
        }
    }

    async handleSendMessage() {
        console.log('🔍 Send message triggered, isGenerating:', this.isGenerating);
        
        if (this.isGenerating) {
            console.log('❌ Already generating, skipping');
            return;
        }

        const messageInput = document.getElementById('message-input');
        const message = messageInput?.value.trim();
        
        console.log('📝 Message input value:', message);
        console.log('📝 Message input element:', messageInput);
        console.log('📝 Input disabled?', messageInput?.disabled);
        
        if (!message) {
            console.log('❌ No message to send');
            return;
        }

        if (!this.isInitialized) {
            this.uiManager.showError('Application is still initializing. Please wait...');
            return;
        }

        try {
            this.isGenerating = true;
            this.uiManager.updateGeneratingState(true);
            console.log('🔄 Started generating, input disabled');
            
            // Clear input
            messageInput.value = '';
            this.autoResizeTextarea(messageInput);
            
            // Send message through chat manager
            await this.chatManager.sendMessage(message);
            
            console.log('✅ Message generation completed');
            
        } catch (error) {
            console.error('Failed to send message:', error);
            this.uiManager.showError('Failed to send message: ' + error.message);
        } finally {
            this.isGenerating = false;
            this.uiManager.updateGeneratingState(false);
            
            // Clear uploaded files after message is completely processed
            if (this.fileManager.getAllFiles().length > 0) {
                console.log('🗑️ Clearing uploaded files after sending message');
                this.fileManager.clearAllFiles();
                this.updateFilePreview();
            }
            
            console.log('✅ Message sending completed, input should be enabled');
        }
    }

    async handleModelChange() {
        const modelSelect = document.getElementById('model-select');
        const selectedModel = modelSelect?.value;
        
        if (selectedModel) {
            this.uiManager.updateCurrentModel(selectedModel);
            this.storageManager.saveSettings({ model: selectedModel });
            this.uiManager.showToast(`Switched to model: ${selectedModel}`, 'info');
        }
    }

    async handleProviderChange() {
        const providerSelect = document.getElementById('provider-select');
        const selectedProvider = providerSelect?.value;
        
        if (selectedProvider && selectedProvider !== this.currentProvider) {
            this.currentProvider = selectedProvider;
            this.apiManager.setCurrentProvider(selectedProvider);
            this.storageManager.saveSettings({ provider: selectedProvider });
            
            // Update global variable for UI
            window.currentProvider = selectedProvider;
            
            this.uiManager.showToast(`Switched to provider: ${selectedProvider}`, 'info');
            
            // Reload models for new provider
            await this.loadAvailableModels();
        }
    }

    handleClearChat() {
        const confirmed = confirm('Are you sure you want to clear the current conversation?');
        if (confirmed) {
            this.chatManager.clearConversation();
            this.uiManager.clearChatDisplay();
            this.storageManager.clearCurrentConversation();
            this.uiManager.showToast('Conversation cleared', 'info');
        }
    }

    handleExportChat() {
        try {
            const data = this.storageManager.exportData();
            if (data) {
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = `ollama_chat_export_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                this.uiManager.showToast('Chat data exported successfully', 'success');
            }
        } catch (error) {
            console.error('Export failed:', error);
            this.uiManager.showError('Failed to export chat data');
        }
    }

    handleImportChat() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const success = this.storageManager.importData(e.target.result);
                        if (success) {
                            this.uiManager.showToast('Chat data imported successfully', 'success');
                            location.reload(); // Reload to apply imported data
                        } else {
                            this.uiManager.showError('Failed to import chat data');
                        }
                    } catch (error) {
                        console.error('Import failed:', error);
                        this.uiManager.showError('Invalid import file format');
                    }
                };
                reader.readAsText(file);
            }
        };
        
        input.click();
    }

    async refreshModels() {
        try {
            this.uiManager.showLoading('Refreshing models...');
            await this.loadAvailableModels();
            this.uiManager.showToast('Models refreshed successfully', 'success');
        } catch (error) {
            console.error('Failed to refresh models:', error);
            this.uiManager.showError('Failed to refresh models');
        } finally {
            this.uiManager.hideLoading();
        }
    }

    async testConnection() {
        try {
            this.uiManager.showLoading('Testing connection...');
            const connected = await this.apiManager.testConnection();
            
            if (connected) {
                this.uiManager.updateServerStatus('connected');
                this.uiManager.showToast('Connection successful', 'success');
            } else {
                this.uiManager.updateServerStatus('disconnected');
                this.uiManager.showError('Connection failed');
            }
        } catch (error) {
            console.error('Connection test failed:', error);
            this.uiManager.updateServerStatus('error');
            this.uiManager.showError('Connection test failed: ' + error.message);
        } finally {
            this.uiManager.hideLoading();
        }
    }

    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + Enter to send message
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            this.handleSendMessage();
        }
        
        // Ctrl/Cmd + K to clear chat
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            this.handleClearChat();
        }
        
        // Escape to close settings panel
        if (e.key === 'Escape') {
            this.uiManager.closeSettingsPanel();
        }
    }

    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    showWelcomeMessage() {
        const stats = this.storageManager.getStorageStats();
        let welcomeMessage = '🚀 Welcome to Ollama Enterprise Chat!';
        
        if (stats.totalConversations > 0) {
            welcomeMessage += `\n\n📊 You have ${stats.totalConversations} saved conversations with ${stats.totalMessages} total messages.`;
        }
        
        welcomeMessage += '\n\nType a message below to get started or use the settings panel to configure your preferences.';
        
        this.uiManager.addSystemMessage(welcomeMessage);
    }

    handleInitializationError(error) {
        console.error('Initialization error:', error);
        
        // Fallback error display
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.innerHTML = `
                <div class="message-group system-group error">
                    <div class="message-avatar">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="message-content">
                        <div class="message-header">
                            <span class="sender-name">System Error</span>
                        </div>
                        <div class="message-text">
                            Failed to initialize the application. Please refresh the page and try again.
                            <br><br>
                            Error details: ${error.message || 'Unknown error'}
                        </div>
                    </div>
                </div>
            `;
        }
    }

    initializeFileUploadListeners() {
        const fileUploadBtn = document.getElementById('file-upload-btn');
        const fileInput = document.getElementById('file-input');
        const clearFilesBtn = document.getElementById('clear-files-btn');
        const chatContainer = document.querySelector('.chat-container');

        // File upload button click
        if (fileUploadBtn && fileInput) {
            fileUploadBtn.addEventListener('click', () => {
                fileInput.click();
            });
        }

        // File input change
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileUpload(e.target.files);
            });
        }

        // Clear files button
        if (clearFilesBtn) {
            clearFilesBtn.addEventListener('click', () => {
                this.handleClearFiles();
            });
        }

        // Drag and drop functionality
        if (chatContainer) {
            chatContainer.addEventListener('dragover', (e) => {
                e.preventDefault();
                this.showDragOverlay();
            });

            chatContainer.addEventListener('dragleave', (e) => {
                // Only hide if leaving the chat container entirely
                if (!chatContainer.contains(e.relatedTarget)) {
                    this.hideDragOverlay();
                }
            });

            chatContainer.addEventListener('drop', (e) => {
                e.preventDefault();
                this.hideDragOverlay();
                const files = Array.from(e.dataTransfer.files);
                this.handleFileUpload(files);
            });
        }
    }

    async handleFileUpload(files) {
        if (!files || files.length === 0) return;

        console.log('📁 Processing', files.length, 'files...');
        
        try {
            const results = await this.fileManager.processFiles(files);
            
            // Update UI with file previews
            this.updateFilePreview();
            
            // Show success message
            const successCount = results.filter(r => r.success).length;
            const errorCount = results.length - successCount;
            
            if (successCount > 0) {
                this.uiManager.showToast(`${successCount} file(s) uploaded successfully`, 'success');
            }
            
            if (errorCount > 0) {
                const errors = results.filter(r => !r.success);
                console.error('File upload errors:', errors);
                this.uiManager.showToast(`${errorCount} file(s) failed to upload`, 'error');
            }
            
        } catch (error) {
            console.error('File upload error:', error);
            this.uiManager.showError('Failed to process files: ' + error.message);
        }
    }

    handleClearFiles() {
        this.fileManager.clearAllFiles();
        this.updateFilePreview();
        this.uiManager.showToast('All files cleared', 'info');
    }

    updateFilePreview() {
        const filePreviewArea = document.getElementById('file-preview-area');
        const filePreviewList = document.getElementById('file-preview-list');
        
        if (!filePreviewArea || !filePreviewList) return;
        
        const files = this.fileManager.getAllFiles();
        
        if (files.length === 0) {
            filePreviewArea.style.display = 'none';
            return;
        }
        
        filePreviewArea.style.display = 'block';
        filePreviewList.innerHTML = '';
        
        files.forEach(file => {
            const fileCard = this.createFilePreviewCard(file);
            filePreviewList.appendChild(fileCard);
        });
    }

    createFilePreviewCard(file) {
        const card = document.createElement('div');
        card.className = 'file-preview-card';
        card.dataset.fileId = file.id;
        
        const icon = this.getFileIcon(file.type);
        const size = (file.size / 1024).toFixed(2);
        
        card.innerHTML = `
            <div class="file-preview-icon">
                <i class="fas ${icon}"></i>
            </div>
            <div class="file-preview-info">
                <div class="file-preview-name" title="${file.name}">${file.name}</div>
                <div class="file-preview-meta">${file.type} • ${size} KB</div>
                <div class="file-preview-content">${file.preview}</div>
            </div>
            <button class="file-preview-remove" data-file-id="${file.id}" title="Remove file">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add remove button listener
        const removeBtn = card.querySelector('.file-preview-remove');
        removeBtn.addEventListener('click', () => {
            this.fileManager.removeFile(file.id);
            this.updateFilePreview();
            this.uiManager.showToast('File removed', 'info');
        });
        
        return card;
    }

    getFileIcon(fileType) {
        const icons = {
            text: 'fa-file-alt',
            image: 'fa-file-image',
            document: 'fa-file-pdf',
            archive: 'fa-file-archive'
        };
        return icons[fileType] || 'fa-file';
    }

    showDragOverlay() {
        const overlay = document.getElementById('drag-drop-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
    }

    hideDragOverlay() {
        const overlay = document.getElementById('drag-drop-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    initializeFileUploadListeners() {
        const fileUploadBtn = document.getElementById('file-upload-btn');
        const fileInput = document.getElementById('file-input');
        const clearFilesBtn = document.getElementById('clear-files-btn');
        const chatContainer = document.querySelector('.chat-container');

        // File upload button click
        if (fileUploadBtn && fileInput) {
            fileUploadBtn.addEventListener('click', () => {
                fileInput.click();
            });
        }

        // File input change
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileUpload(e.target.files);
            });
        }

        // Clear files button
        if (clearFilesBtn) {
            clearFilesBtn.addEventListener('click', () => {
                this.handleClearFiles();
            });
        }

        // Drag and drop functionality
        if (chatContainer) {
            chatContainer.addEventListener('dragover', (e) => {
                e.preventDefault();
                this.showDragOverlay();
            });

            chatContainer.addEventListener('dragleave', (e) => {
                // Only hide if leaving the chat container entirely
                if (!chatContainer.contains(e.relatedTarget)) {
                    this.hideDragOverlay();
                }
            });

            chatContainer.addEventListener('drop', (e) => {
                e.preventDefault();
                this.hideDragOverlay();
                const files = Array.from(e.dataTransfer.files);
                this.handleFileUpload(files);
            });
        }
    }

    async handleFileUpload(files) {
        if (!files || files.length === 0) return;

        console.log('📁 Processing', files.length, 'files...');
        
        try {
            const results = await this.fileManager.processFiles(files);
            
            // Update UI with file previews
            this.updateFilePreview();
            
            // Show success message
            const successCount = results.filter(r => r.success).length;
            const errorCount = results.length - successCount;
            
            if (successCount > 0) {
                this.uiManager.showToast(`${successCount} file(s) uploaded successfully`, 'success');
            }
            
            if (errorCount > 0) {
                const errors = results.filter(r => !r.success);
                console.error('File upload errors:', errors);
                this.uiManager.showToast(`${errorCount} file(s) failed to upload`, 'error');
            }
            
        } catch (error) {
            console.error('File upload error:', error);
            this.uiManager.showError('Failed to process files: ' + error.message);
        }
    }

    handleClearFiles() {
        this.fileManager.clearAllFiles();
        this.updateFilePreview();
        this.uiManager.showToast('All files cleared', 'info');
    }

    updateFilePreview() {
        const filePreviewArea = document.getElementById('file-preview-area');
        const filePreviewList = document.getElementById('file-preview-list');
        
        if (!filePreviewArea || !filePreviewList) return;
        
        const files = this.fileManager.getAllFiles();
        
        if (files.length === 0) {
            filePreviewArea.style.display = 'none';
            return;
        }
        
        filePreviewArea.style.display = 'block';
        filePreviewList.innerHTML = '';
        
        files.forEach(file => {
            const fileCard = this.createFilePreviewCard(file);
            filePreviewList.appendChild(fileCard);
        });
    }

    createFilePreviewCard(file) {
        const card = document.createElement('div');
        card.className = 'file-preview-card';
        card.dataset.fileId = file.id;
        
        const icon = this.getFileIcon(file.type);
        const size = (file.size / 1024).toFixed(2);
        
        card.innerHTML = `
            <div class="file-preview-icon">
                <i class="fas ${icon}"></i>
            </div>
            <div class="file-preview-info">
                <div class="file-preview-name" title="${file.name}">${file.name}</div>
                <div class="file-preview-meta">${file.type} • ${size} KB</div>
                <div class="file-preview-content">${file.preview}</div>
            </div>
            <button class="file-preview-remove" data-file-id="${file.id}" title="Remove file">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add remove button listener
        const removeBtn = card.querySelector('.file-preview-remove');
        removeBtn.addEventListener('click', () => {
            this.fileManager.removeFile(file.id);
            this.updateFilePreview();
            this.uiManager.showToast('File removed', 'info');
        });
        
        return card;
    }

    getFileIcon(fileType) {
        const icons = {
            text: 'fa-file-alt',
            image: 'fa-file-image',
            document: 'fa-file-pdf',
            archive: 'fa-file-archive'
        };
        return icons[fileType] || 'fa-file';
    }

    showDragOverlay() {
        const overlay = document.getElementById('drag-drop-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
    }

    hideDragOverlay() {
        const overlay = document.getElementById('drag-drop-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        window.ollamaApp = new OllamaEnterpriseApp();
        await window.ollamaApp.init();
    } catch (error) {
        console.error('Failed to start application:', error);
    }
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OllamaEnterpriseApp;
}
