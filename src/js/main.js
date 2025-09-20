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
            
            // Debug function for clearing history (temporary)
            window.clearChatHistory = () => {
                localStorage.removeItem('ollama_enterprise_conversations');
                localStorage.removeItem('ollama_enterprise_messages');
                console.log('🧹 Chat history cleared!');
                location.reload();
            };
            
            console.log('✅ Application initialized successfully');
            console.log('💡 Debug: Use clearChatHistory() in console to clear conversation history');
            
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
            
            // Initialize API Manager
            this.apiManager = new APIManager(this.configManager);
            console.log('✅ API Manager initialized');
            
            // Initialize Chat Manager
            this.chatManager = new ChatManager(this.configManager, this.apiManager, this.uiManager, this.storageManager);
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
            
            // Set default model
            const defaultModel = this.configManager.get('DEFAULT_MODEL');
            const modelSelect = document.getElementById('model-select');
            if (modelSelect && defaultModel) {
                modelSelect.value = defaultModel;
                this.uiManager.updateCurrentModel(defaultModel);
            }
        } catch (error) {
            console.error('Failed to load models:', error);
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
