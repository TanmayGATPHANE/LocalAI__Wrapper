/**
 * Enterprise UI Manager
 * Handles all UI interactions and updates
 */
class UIManager {
    constructor(config) {
        this.config = config;
        this.messageCount = 0;
        this.init();
    }

    init() {
        this.initializeTheme();
        this.attachGlobalEventListeners();
        this.updateMessageCount();
        // Ensure input is enabled by default
        this.enableInput();
    }

    enableInput() {
        const messageInput = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-btn');
        
        if (messageInput) {
            messageInput.disabled = false;
        }
        if (sendBtn) {
            sendBtn.disabled = false;
        }
    }

    initializeTheme() {
        const theme = this.config.get('THEME', 'dark');
        document.body.className = `theme-${theme}`;
    }

    attachGlobalEventListeners() {
        // Settings panel toggle
        const settingsToggle = document.getElementById('settings-toggle');
        const settingsPanel = document.getElementById('settings-panel');
        const settingsClose = document.getElementById('settings-close');

        if (settingsToggle && settingsPanel) {
            settingsToggle.addEventListener('click', () => this.openSettingsPanel());
        }

        if (settingsClose) {
            settingsClose.addEventListener('click', () => this.closeSettingsPanel());
        }

        // Click outside to close settings
        document.addEventListener('click', (e) => {
            if (settingsPanel && !settingsPanel.contains(e.target) && !settingsToggle?.contains(e.target)) {
                this.closeSettingsPanel();
            }
        });

        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
    }

    openSettingsPanel() {
        const panel = document.getElementById('settings-panel');
        if (panel) {
            panel.classList.add('open');
        }
    }

    closeSettingsPanel() {
        const panel = document.getElementById('settings-panel');
        if (panel) {
            panel.classList.remove('open');
        }
    }

    toggleTheme() {
        const currentTheme = this.config.get('THEME');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        this.config.set('THEME', newTheme);
        document.body.className = `theme-${newTheme}`;
        
        this.showToast(`Switched to ${newTheme} theme`, 'info');
    }

    addUserMessage(content, attachedFiles = []) {
        const messageGroup = document.createElement('div');
        messageGroup.className = 'message-group user-group';
        
        let attachmentsHtml = '';
        if (attachedFiles && attachedFiles.length > 0) {
            attachmentsHtml = `
                <div class="message-attachments">
                    ${attachedFiles.map(file => `
                        <div class="attachment-item">
                            <i class="fas ${this.getFileIcon(file.type)}"></i>
                            <span>${file.name}</span>
                            <small>(${(file.size / 1024).toFixed(2)} KB)</small>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        messageGroup.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="sender-name">You</span>
                    <span class="message-time">${this.getCurrentTime()}</span>
                </div>
                ${attachmentsHtml}
                <div class="message-text">${this.escapeHtml(content)}</div>
            </div>
        `;
        
        this.appendMessage(messageGroup);
        this.messageCount++;
        this.updateMessageCount();
        
        return messageGroup.id;
    }

    addBotMessage(content, isLoading = false) {
        const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const messageGroup = document.createElement('div');
        messageGroup.id = messageId;
        messageGroup.className = `message-group bot-group ${isLoading ? 'loading' : ''}`;
        
        const currentProvider = this.getCurrentProviderName();
        const currentModel = this.getCurrentModel();
        
        messageGroup.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="sender-name">AI Assistant</span>
                    <span class="model-tag">${this.getModelIcon(currentModel)} ${currentModel}</span>
                    <span class="provider-tag">${currentProvider}</span>
                    <span class="message-time">${this.getCurrentTime()}</span>
                </div>
                <div class="message-text">${content || (isLoading ? '⏳ Thinking...' : '')}</div>
            </div>
        `;
        
        this.appendMessage(messageGroup);
        this.messageCount++;
        this.updateMessageCount();
        
        return messageId;
    }

    addSystemMessage(content) {
        const messageGroup = document.createElement('div');
        messageGroup.className = 'message-group system-group';
        messageGroup.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-info-circle"></i>
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="sender-name">System</span>
                    <span class="message-time">${this.getCurrentTime()}</span>
                </div>
                <div class="message-text">${content}</div>
            </div>
        `;
        
        this.appendMessage(messageGroup);
    }

    addUserMessageFromHistory(content, timestamp) {
        const messageGroup = document.createElement('div');
        messageGroup.className = 'message-group user-group';
        messageGroup.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="sender-name">You</span>
                    <span class="message-time">${this.formatTimestamp(timestamp)}</span>
                </div>
                <div class="message-text">${this.escapeHtml(content)}</div>
            </div>
        `;
        
        this.appendMessage(messageGroup);
    }

    addBotMessageFromHistory(content, timestamp) {
        const messageGroup = document.createElement('div');
        messageGroup.className = 'message-group bot-group';
        messageGroup.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="sender-name">AI Assistant</span>
                    <span class="message-time">${this.formatTimestamp(timestamp)}</span>
                </div>
                <div class="message-text">${this.escapeHtml(content)}</div>
            </div>
        `;
        
        this.appendMessage(messageGroup);
    }

    updateMessage(messageId, content, isComplete = false) {
        console.log('📝 Updating message:', messageId, 'isComplete:', isComplete);
        
        const messageGroup = document.getElementById(messageId);
        if (messageGroup) {
            const messageText = messageGroup.querySelector('.message-text');
            if (messageText) {
                messageText.textContent = content;
            }
            
            if (isComplete) {
                messageGroup.classList.remove('loading');
                console.log('✅ Message marked as complete, removed loading class');
            }
            
            this.scrollToBottom();
        } else {
            console.warn('⚠️ Message element not found:', messageId);
        }
    }

    appendMessage(messageElement) {
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.appendChild(messageElement);
            this.scrollToBottom();
        }
    }

    clearChatDisplay() {
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.innerHTML = '';
        }
        this.messageCount = 0;
        this.updateMessageCount();
    }

    scrollToBottom() {
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    updateGeneratingState(isGenerating) {
        console.log('🎛️ Updating generating state to:', isGenerating);
        
        const sendBtn = document.getElementById('send-btn');
        const messageInput = document.getElementById('message-input');
        
        if (sendBtn) {
            sendBtn.disabled = isGenerating;
            sendBtn.innerHTML = isGenerating 
                ? '<i class="fas fa-spinner fa-spin"></i>' 
                : '<i class="fas fa-paper-plane"></i>';
            console.log('📤 Send button updated - disabled:', isGenerating);
        }
        
        if (messageInput) {
            messageInput.disabled = isGenerating;
            console.log('💬 Message input updated - disabled:', isGenerating);
        }
    }

    updateMessageCount(count = null) {
        this.messageCount = count !== null ? count : this.messageCount;
        const messageCountEl = document.getElementById('message-count');
        if (messageCountEl) {
            messageCountEl.textContent = this.messageCount;
        }
    }

    updateServerStatus(status) {
        const statusEl = document.getElementById('server-status');
        if (statusEl) {
            statusEl.className = `status ${status}`;
            statusEl.innerHTML = `
                <i class="fas fa-circle"></i>
                <span>${status.charAt(0).toUpperCase() + status.slice(1)}</span>
            `;
        }
    }

    updateCurrentModel(modelName) {
        const modelInfo = document.getElementById('current-model-info');
        if (modelInfo) {
            const icon = this.getModelIcon(modelName);
            modelInfo.innerHTML = `${icon} ${modelName}`;
        }
    }

    showToast(message, type = 'info') {
        // Create toast element if it doesn't exist
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas ${this.getToastIcon(type)}"></i>
            <span>${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        toastContainer.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showLoading(message = 'Loading...') {
        const loadingEl = document.getElementById('loading-overlay');
        if (loadingEl) {
            loadingEl.style.display = 'flex';
            const loadingText = loadingEl.querySelector('.loading-text');
            if (loadingText) {
                loadingText.textContent = message;
            }
        }
    }

    hideLoading() {
        const loadingEl = document.getElementById('loading-overlay');
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }
    }

    // Utility methods
    getCurrentTime() {
        return new Date().toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    formatTimestamp(timestamp) {
        try {
            const date = new Date(timestamp);
            return date.toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } catch (error) {
            return this.getCurrentTime();
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getCurrentProviderName() {
        // This would be injected or retrieved from API manager
        return window.currentProvider || 'ollama';
    }

    getCurrentModel() {
        const modelSelect = document.getElementById('model-select');
        return modelSelect?.value || 'llama3.2:1b';
    }

    getModelIcon(modelName) {
        const name = modelName.toLowerCase();
        if (name.includes('llama')) return '🦙';
        if (name.includes('code')) return '💻';
        if (name.includes('mistral')) return '🧠';
        if (name.includes('phi')) return '🔷';
        if (name.includes('gemma')) return '💎';
        if (name.includes('grok')) return '🚀';
        if (name.includes('claude')) return '🎭';
        if (name.includes('gpt')) return '🧩';
        return '🤖';
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

    getToastIcon(type) {
        const icons = {
            info: 'fa-info-circle',
            success: 'fa-check-circle',
            warning: 'fa-exclamation-triangle',
            error: 'fa-times-circle'
        };
        return icons[type] || icons.info;
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}
