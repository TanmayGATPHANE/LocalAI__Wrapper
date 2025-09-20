/**
 * Enterprise Chat Manager
 * Handles chat functionality with conversation memory
 */
class ChatManager {
    constructor(config, apiManager, uiManager, storageManager, fileManager) {
        this.config = config;
        this.apiManager = apiManager;
        this.uiManager = uiManager;
        this.storageManager = storageManager;
        this.fileManager = fileManager;
        
        this.isGenerating = false;
        this.messageCount = 0;
        this.currentConversationId = 'default';
        
        this.init();
    }

    init() {
        // Event listeners will be handled by main.js
        this.loadConversationHistory();
    }

    async sendMessage(message) {
        if (!message || this.isGenerating) return;
        
        try {
            // Get attached files before sending
            const attachedFiles = this.fileManager ? this.fileManager.getAllFiles() : [];
            
            // Add user message to UI with file attachments
            this.uiManager.addUserMessage(message, attachedFiles);
            
            // Save user message to storage
            await this.storageManager.saveMessage({
                type: 'user',
                content: message,
                timestamp: new Date().toISOString(),
                conversationId: this.currentConversationId,
                attachments: attachedFiles.map(f => ({ name: f.name, type: f.type, size: f.size }))
            });
            
            this.isGenerating = true;
            this.uiManager.updateGeneratingState(true);
            
            // Create bot message placeholder
            const botMessageId = this.uiManager.addBotMessage('', true);
            
            // Small delay to ensure message saving completes
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Generate response with conversation context
            const contextualPrompt = await this.buildConversationContext(message);
            const currentModel = this.getCurrentModel();
            
            console.log('🔄 DEBUG: Full prompt being sent to Ollama:');
            console.log('📝 PROMPT LENGTH:', contextualPrompt.length, 'characters');
            console.log('📝 PROMPT PREVIEW (first 500 chars):', contextualPrompt.substring(0, 500));
            console.log('🤖 MODEL:', currentModel);
            console.log('💬 ORIGINAL MESSAGE:', message);
            console.log('📁 ATTACHED FILES:', attachedFiles.length);
            
            // Debug: Log file contents being sent
            if (attachedFiles.length > 0) {
                console.log('📄 FILES CONTENT PREVIEW:');
                attachedFiles.forEach((file, idx) => {
                    console.log(`File ${idx + 1}: ${file.name} (${file.type})`);
                    if (file.content) {
                        const preview = file.content.length > 200 ? 
                            file.content.substring(0, 200) + '...' : 
                            file.content;
                        console.log(`Content preview: ${preview}`);
                    }
                });
            }
            
            if (this.config.get('ENABLE_STREAMING', true)) {
                await this.streamResponse(contextualPrompt, currentModel, botMessageId);
            } else {
                await this.generateSingleResponse(contextualPrompt, currentModel, botMessageId);
            }
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.uiManager.showError(`Failed to generate response: ${error.message}`);
        } finally {
            this.isGenerating = false;
            this.uiManager.updateGeneratingState(false);
        }
    }

    async streamResponse(prompt, model, messageId) {
        let accumulatedResponse = '';
        
        try {
            await this.apiManager.streamResponse(
                prompt,
                model,
                (chunk, isComplete) => {
                    if (!isComplete && chunk) {
                        accumulatedResponse += chunk;
                        this.uiManager.updateMessage(messageId, accumulatedResponse, false);
                    }
                },
                {
                    temperature: 0.7,
                    top_p: 0.9,
                    context_length: 4096
                }
            );
            
            // Mark message as complete when streaming finishes
            this.uiManager.updateMessage(messageId, accumulatedResponse, true);
            
            // Save complete response
            await this.saveCompleteResponse(accumulatedResponse, messageId);
            
        } catch (error) {
            this.uiManager.updateMessage(messageId, `❌ Error: ${error.message}`, true);
            throw error;
        }
    }

    async generateSingleResponse(prompt, model, messageId) {
        try {
            const response = await this.apiManager.generateResponse(prompt, model, {
                temperature: 0.7,
                top_p: 0.9,
                context_length: 4096
            });
            
            this.uiManager.updateMessage(messageId, response, true);
            this.saveCompleteResponse(response, messageId);
            
        } catch (error) {
            this.uiManager.updateMessage(messageId, `❌ Error: ${error.message}`, true);
            throw error;
        }
    }

    async saveCompleteResponse(content, messageId) {
        try {
            await this.storageManager.saveMessage({
                type: 'assistant',
                content: content,
                timestamp: new Date().toISOString(),
                conversationId: this.currentConversationId,
                model: this.getCurrentModel(),
                provider: this.apiManager.getCurrentProvider()?.name
            });
        } catch (error) {
            console.warn('Failed to save response to storage:', error);
        }
    }

    async buildConversationContext(currentPrompt) {
        console.log('🧠 Building conversation context for:', currentPrompt);
        
        if (!this.config.get('CONVERSATION_MEMORY', true)) {
            console.log('💭 Memory disabled, returning current prompt only');
            return currentPrompt;
        }

        try {
            console.log('📚 Getting conversation history...');
            const conversationHistory = await this.storageManager.getConversationHistory(
                this.currentConversationId,
                10 // Last 10 messages
            );
            
            console.log('📝 Raw history:', conversationHistory);

            if (!conversationHistory || conversationHistory.length === 0) {
                return currentPrompt;
            }

            // Filter and format recent messages
            const recentMessages = conversationHistory
                .filter(msg => msg.content && msg.content.trim() && msg.content !== currentPrompt)
                .filter(msg => !msg.content.includes('Chat history cleared'))
                .map(msg => {
                    const role = msg.type === 'user' ? 'Human' : 'Assistant';
                    const content = msg.content.length > 500 
                        ? msg.content.substring(0, 500) + '...' 
                        : msg.content;
                    return `${role}: ${content}`;
                });

            if (recentMessages.length === 0) {
                return currentPrompt;
            }

            // Build context string
            const filesContext = this.fileManager ? this.fileManager.getFilesContext() : '';
            const hasFiles = filesContext.trim().length > 0;
            
            let systemPrompt = 'You are a helpful AI assistant.';
            if (hasFiles) {
                systemPrompt += ' The user has uploaded files for legitimate analysis and assistance. This is a normal file processing request. Please examine the file contents carefully and provide helpful, detailed insights based on what you find. There are no privacy or safety concerns with analyzing user-uploaded files in this context.';
            }
            
            const contextString = `${systemPrompt} Below is our conversation history and the current message.${filesContext}

CONVERSATION HISTORY:
${recentMessages.join('\n')}

USER: ${currentPrompt}

${hasFiles ? 'The user has attached files above. Please analyze the file contents and respond based on what you find in the files.' : 'Please respond naturally and helpfully.'}`;

            const maxLength = this.config.get('MAX_MESSAGE_LENGTH', 8000);
            if (contextString.length > maxLength) {
                const truncatePoint = maxLength - 300;
                return contextString.substring(0, truncatePoint) + 
                    `\n\n[Context truncated due to length limits]\n\nCURRENT USER MESSAGE: ${currentPrompt}\n\nRemember: You can freely reference any information the user has shared in this conversation.`;
            }

            return contextString;

        } catch (error) {
            console.warn('Error building conversation context:', error);
            return currentPrompt;
        }
    }

    getCurrentModel() {
        const modelSelect = document.getElementById('model-select');
        return modelSelect?.value || this.config.getProviderConfig(this.config.get('DEFAULT_PROVIDER')).defaultModel;
    }

    async clearChat() {
        if (confirm('Are you sure you want to clear all messages? This will permanently delete your conversation history.')) {
            try {
                await this.storageManager.clearConversation(this.currentConversationId);
                this.uiManager.clearChatDisplay();
                this.messageCount = 0;
                this.uiManager.addSystemMessage('💬 Chat history cleared. Starting fresh conversation!');
                this.uiManager.showToast('Chat history permanently deleted', 'info');
            } catch (error) {
                console.error('Error clearing chat:', error);
                this.uiManager.showError('Failed to clear chat history');
            }
        }
    }

    async loadConversationHistory() {
        try {
            const history = await this.storageManager.getConversationHistory(this.currentConversationId);
            
            if (history && history.length > 0) {
                history.forEach(message => {
                    if (message.type === 'user') {
                        this.uiManager.addUserMessageFromHistory(message.content, message.timestamp);
                    } else if (message.type === 'assistant') {
                        this.uiManager.addBotMessageFromHistory(message.content, message.timestamp);
                    } else if (message.type === 'system') {
                        this.uiManager.addSystemMessage(message.content);
                    }
                });
                
                this.messageCount = history.length;
                this.uiManager.updateMessageCount(this.messageCount);
            }
        } catch (error) {
            console.warn('Error loading conversation history:', error);
        }
    }

    autoResizeTextarea(textarea) {
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
        }
    }

    // Public methods for external control
    async switchConversation(conversationId) {
        this.currentConversationId = conversationId;
        this.uiManager.clearChatDisplay();
        await this.loadConversationHistory();
    }

    async exportConversation(format = 'json') {
        try {
            const history = await this.storageManager.getConversationHistory(this.currentConversationId);
            
            if (format === 'json') {
                return JSON.stringify(history, null, 2);
            } else if (format === 'markdown') {
                return this.formatAsMarkdown(history);
            }
            
            return history;
        } catch (error) {
            console.error('Error exporting conversation:', error);
            throw error;
        }
    }

    formatAsMarkdown(history) {
        let markdown = `# Conversation Export\n\n`;
        markdown += `**Date:** ${new Date().toISOString()}\n`;
        markdown += `**Provider:** ${this.apiManager.getCurrentProvider()?.name || 'Unknown'}\n\n`;
        
        history.forEach(message => {
            if (message.type === 'user') {
                markdown += `## You\n${message.content}\n\n`;
            } else if (message.type === 'assistant') {
                markdown += `## AI Assistant\n${message.content}\n\n`;
            }
        });
        
        return markdown;
    }

    clearConversation() {
        this.conversationHistory = [];
        this.currentConversationId = this.generateConversationId();
    }

    generateConversationId() {
        return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getCurrentModel() {
        const modelSelect = document.getElementById('model-select');
        return modelSelect?.value || this.config.get('DEFAULT_MODEL', 'llama3.2:1b');
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatManager;
}
