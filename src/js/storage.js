/**
 * Enterprise Storage Manager
 * Handles all data persistence and conversation management
 */
class StorageManager {
    constructor(config) {
        this.config = config;
        this.storagePrefix = this.config.get('STORAGE_PREFIX', 'ollama_chat_');
        this.conversationKey = `${this.storagePrefix}conversations`;
        this.currentConversationKey = `${this.storagePrefix}current_conversation`;
        this.settingsKey = `${this.storagePrefix}settings`;
        this.maxConversations = this.config.get('MAX_CONVERSATIONS', 50);
        this.maxMessagesPerConversation = this.config.get('MAX_MESSAGES_PER_CONVERSATION', 100);
    }

    // Message Management (for individual message saving)
    saveMessage(message) {
        try {
            // For now, just add to current conversation
            const current = this.loadCurrentConversation();
            if (current) {
                current.messages.push(message);
                this.saveCurrentConversation(current.messages);
            } else {
                this.saveCurrentConversation([message]);
            }
            return true;
        } catch (error) {
            console.error('Failed to save message:', error);
            return false;
        }
    }

    // Conversation Management
    saveCurrentConversation(messages) {
        try {
            const conversation = {
                id: this.getCurrentConversationId(),
                timestamp: Date.now(),
                messages: messages.slice(-this.maxMessagesPerConversation), // Limit messages
                messageCount: messages.length
            };
            
            localStorage.setItem(this.currentConversationKey, JSON.stringify(conversation));
            return true;
        } catch (error) {
            console.error('Failed to save current conversation:', error);
            this.handleStorageError('save', error);
            return false;
        }
    }

    loadCurrentConversation() {
        try {
            const data = localStorage.getItem(this.currentConversationKey);
            if (data) {
                const conversation = JSON.parse(data);
                return this.validateConversation(conversation) ? conversation : null;
            }
            return null;
        } catch (error) {
            console.error('Failed to load current conversation:', error);
            this.handleStorageError('load', error);
            return null;
        }
    }

    clearCurrentConversation() {
        try {
            localStorage.removeItem(this.currentConversationKey);
            return true;
        } catch (error) {
            console.error('Failed to clear current conversation:', error);
            return false;
        }
    }

    // Get conversation history by ID (for chat manager)
    getConversationHistory(conversationId) {
        const current = this.loadCurrentConversation();
        return current ? current.messages : [];
    }

    // Conversation History Management
    saveConversationToHistory(messages, title = null) {
        try {
            const conversations = this.loadConversationHistory();
            const conversationId = this.generateConversationId();
            
            const conversation = {
                id: conversationId,
                title: title || this.generateConversationTitle(messages),
                timestamp: Date.now(),
                messages: messages.slice(-this.maxMessagesPerConversation),
                messageCount: messages.length
            };

            conversations.unshift(conversation);
            
            // Limit total conversations
            if (conversations.length > this.maxConversations) {
                conversations.splice(this.maxConversations);
            }

            localStorage.setItem(this.conversationKey, JSON.stringify(conversations));
            return conversationId;
        } catch (error) {
            console.error('Failed to save conversation to history:', error);
            this.handleStorageError('save', error);
            return null;
        }
    }

    loadConversationHistory() {
        try {
            const data = localStorage.getItem(this.conversationKey);
            if (data) {
                const conversations = JSON.parse(data);
                return Array.isArray(conversations) ? conversations.filter(this.validateConversation) : [];
            }
            return [];
        } catch (error) {
            console.error('Failed to load conversation history:', error);
            this.handleStorageError('load', error);
            return [];
        }
    }

    loadConversationById(conversationId) {
        try {
            const conversations = this.loadConversationHistory();
            return conversations.find(conv => conv.id === conversationId) || null;
        } catch (error) {
            console.error('Failed to load conversation by ID:', error);
            return null;
        }
    }

    deleteConversation(conversationId) {
        try {
            const conversations = this.loadConversationHistory();
            const updatedConversations = conversations.filter(conv => conv.id !== conversationId);
            localStorage.setItem(this.conversationKey, JSON.stringify(updatedConversations));
            return true;
        } catch (error) {
            console.error('Failed to delete conversation:', error);
            return false;
        }
    }

    clearAllConversations() {
        try {
            localStorage.removeItem(this.conversationKey);
            localStorage.removeItem(this.currentConversationKey);
            return true;
        } catch (error) {
            console.error('Failed to clear all conversations:', error);
            return false;
        }
    }

    // Settings Management
    saveSettings(settings) {
        try {
            const currentSettings = this.loadSettings();
            const updatedSettings = { ...currentSettings, ...settings };
            localStorage.setItem(this.settingsKey, JSON.stringify(updatedSettings));
            return true;
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.handleStorageError('save', error);
            return false;
        }
    }

    loadSettings() {
        try {
            const data = localStorage.getItem(this.settingsKey);
            if (data) {
                const settings = JSON.parse(data);
                return this.validateSettings(settings) ? settings : this.getDefaultSettings();
            }
            return this.getDefaultSettings();
        } catch (error) {
            console.error('Failed to load settings:', error);
            this.handleStorageError('load', error);
            return this.getDefaultSettings();
        }
    }

    getDefaultSettings() {
        return {
            theme: this.config.get('THEME', 'dark'),
            model: this.config.get('DEFAULT_MODEL', 'llama3.2:1b'),
            provider: this.config.get('DEFAULT_PROVIDER', 'ollama'),
            temperature: this.config.get('DEFAULT_TEMPERATURE', 0.7),
            maxTokens: this.config.get('DEFAULT_MAX_TOKENS', 1000),
            conversationMemory: this.config.get('CONVERSATION_MEMORY_ENABLED', true),
            autoSave: this.config.get('AUTO_SAVE_ENABLED', true),
            streamingEnabled: this.config.get('STREAMING_ENABLED', true)
        };
    }

    // Cache Management
    saveToCache(key, data, ttl = null) {
        try {
            const cacheItem = {
                data: data,
                timestamp: Date.now(),
                ttl: ttl
            };
            
            const cacheKey = `${this.storagePrefix}cache_${key}`;
            localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
            return true;
        } catch (error) {
            console.error('Failed to save to cache:', error);
            return false;
        }
    }

    loadFromCache(key) {
        try {
            const cacheKey = `${this.storagePrefix}cache_${key}`;
            const data = localStorage.getItem(cacheKey);
            
            if (data) {
                const cacheItem = JSON.parse(data);
                
                // Check if cache has expired
                if (cacheItem.ttl && Date.now() - cacheItem.timestamp > cacheItem.ttl) {
                    this.removeFromCache(key);
                    return null;
                }
                
                return cacheItem.data;
            }
            return null;
        } catch (error) {
            console.error('Failed to load from cache:', error);
            return null;
        }
    }

    removeFromCache(key) {
        try {
            const cacheKey = `${this.storagePrefix}cache_${key}`;
            localStorage.removeItem(cacheKey);
            return true;
        } catch (error) {
            console.error('Failed to remove from cache:', error);
            return false;
        }
    }

    clearCache() {
        try {
            const keys = Object.keys(localStorage);
            const cacheKeys = keys.filter(key => key.startsWith(`${this.storagePrefix}cache_`));
            
            cacheKeys.forEach(key => localStorage.removeItem(key));
            return true;
        } catch (error) {
            console.error('Failed to clear cache:', error);
            return false;
        }
    }

    // Storage Analytics
    getStorageStats() {
        try {
            const conversations = this.loadConversationHistory();
            const settings = this.loadSettings();
            const currentConversation = this.loadCurrentConversation();
            
            let totalMessages = 0;
            let totalSize = 0;
            
            conversations.forEach(conv => {
                totalMessages += conv.messageCount || conv.messages?.length || 0;
                totalSize += this.calculateObjectSize(conv);
            });
            
            if (currentConversation) {
                totalMessages += currentConversation.messageCount || 0;
                totalSize += this.calculateObjectSize(currentConversation);
            }
            
            totalSize += this.calculateObjectSize(settings);
            
            return {
                totalConversations: conversations.length,
                totalMessages: totalMessages,
                totalSize: totalSize,
                hasCurrentConversation: !!currentConversation,
                storageUsed: this.getStorageUsage(),
                cacheSize: this.getCacheSize()
            };
        } catch (error) {
            console.error('Failed to get storage stats:', error);
            return {
                totalConversations: 0,
                totalMessages: 0,
                totalSize: 0,
                hasCurrentConversation: false,
                storageUsed: 0,
                cacheSize: 0
            };
        }
    }

    // Utility Methods
    getCurrentConversationId() {
        const current = this.loadCurrentConversation();
        return current?.id || this.generateConversationId();
    }

    generateConversationId() {
        return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateConversationTitle(messages) {
        if (!messages || messages.length === 0) {
            return 'New Conversation';
        }
        
        // Use first user message as title (truncated)
        const firstUserMessage = messages.find(msg => msg.role === 'user');
        if (firstUserMessage) {
            const title = firstUserMessage.content.trim();
            return title.length > 50 ? title.substring(0, 47) + '...' : title;
        }
        
        return `Conversation ${new Date().toLocaleDateString()}`;
    }

    validateConversation(conversation) {
        return conversation && 
               conversation.id && 
               conversation.timestamp && 
               Array.isArray(conversation.messages);
    }

    validateSettings(settings) {
        return settings && typeof settings === 'object';
    }

    calculateObjectSize(obj) {
        try {
            return new Blob([JSON.stringify(obj)]).size;
        } catch (error) {
            return 0;
        }
    }

    getStorageUsage() {
        try {
            let total = 0;
            for (let key in localStorage) {
                if (key.startsWith(this.storagePrefix)) {
                    total += localStorage[key].length;
                }
            }
            return total;
        } catch (error) {
            return 0;
        }
    }

    getCacheSize() {
        try {
            let total = 0;
            for (let key in localStorage) {
                if (key.startsWith(`${this.storagePrefix}cache_`)) {
                    total += localStorage[key].length;
                }
            }
            return total;
        } catch (error) {
            return 0;
        }
    }

    handleStorageError(operation, error) {
        console.error(`Storage ${operation} error:`, error);
        
        if (error.name === 'QuotaExceededError') {
            // Storage quota exceeded - clean up old data
            this.cleanupOldData();
        }
    }

    cleanupOldData() {
        try {
            const conversations = this.loadConversationHistory();
            
            // Keep only the most recent 25 conversations
            if (conversations.length > 25) {
                const recentConversations = conversations.slice(0, 25);
                localStorage.setItem(this.conversationKey, JSON.stringify(recentConversations));
            }
            
            // Clear cache
            this.clearCache();
            
            console.log('Cleaned up old data due to storage quota exceeded');
        } catch (error) {
            console.error('Failed to cleanup old data:', error);
        }
    }

    // Export/Import functionality
    exportData() {
        try {
            const data = {
                conversations: this.loadConversationHistory(),
                currentConversation: this.loadCurrentConversation(),
                settings: this.loadSettings(),
                exportDate: new Date().toISOString(),
                version: '1.0'
            };
            
            return JSON.stringify(data, null, 2);
        } catch (error) {
            console.error('Failed to export data:', error);
            return null;
        }
    }

    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            if (data.conversations && Array.isArray(data.conversations)) {
                localStorage.setItem(this.conversationKey, JSON.stringify(data.conversations));
            }
            
            if (data.currentConversation) {
                localStorage.setItem(this.currentConversationKey, JSON.stringify(data.currentConversation));
            }
            
            if (data.settings) {
                localStorage.setItem(this.settingsKey, JSON.stringify(data.settings));
            }
            
            return true;
        } catch (error) {
            console.error('Failed to import data:', error);
            return false;
        }
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
}
