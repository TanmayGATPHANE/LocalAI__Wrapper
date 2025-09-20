/**
 * Enterprise API Manager
 * Handles multiple AI providers (Ollama, OpenAI, Anthropic, Grok, etc.)
 */
class APIManager {
    constructor(config) {
        this.config = config;
        this.currentProvider = null;
        this.providers = {};
        this.initializeProviders();
    }

    initializeProviders() {
        this.providers = {
            ollama: new OllamaProvider(this.config),
            openai: new OpenAIProvider(this.config),
            anthropic: new AnthropicProvider(this.config),
            grok: new GrokProvider(this.config)
        };
        
        const defaultProvider = this.config.get('DEFAULT_PROVIDER', 'ollama');
        this.setProvider(defaultProvider);
    }

    setProvider(providerName) {
        if (this.providers[providerName]) {
            this.currentProvider = this.providers[providerName];
            console.log(`✅ Switched to provider: ${providerName}`);
            return true;
        }
        console.error(`❌ Provider not found: ${providerName}`);
        return false;
    }

    setCurrentProvider(providerName) {
        return this.setProvider(providerName);
    }

    getCurrentProvider() {
        return this.currentProvider;
    }

    async testConnection() {
        if (!this.currentProvider) {
            throw new Error('No provider selected');
        }
        return await this.currentProvider.testConnection();
    }

    async getAvailableModels() {
        if (!this.currentProvider) {
            throw new Error('No provider selected');
        }
        return await this.currentProvider.getAvailableModels();
    }

    async generateResponse(prompt, model, options = {}) {
        if (!this.currentProvider) {
            throw new Error('No provider selected');
        }
        return await this.currentProvider.generateResponse(prompt, model, options);
    }

    async streamResponse(prompt, model, onChunk, options = {}) {
        if (!this.currentProvider) {
            throw new Error('No provider selected');
        }
        return await this.currentProvider.streamResponse(prompt, model, onChunk, options);
    }
}

/**
 * Base Provider Class
 */
class BaseProvider {
    constructor(config) {
        this.config = config;
        this.name = 'base';
        this.supportsStreaming = false;
    }

    async testConnection() {
        throw new Error('testConnection not implemented');
    }

    async getAvailableModels() {
        throw new Error('getAvailableModels not implemented');
    }

    async generateResponse(prompt, model, options = {}) {
        throw new Error('generateResponse not implemented');
    }

    async streamResponse(prompt, model, onChunk, options = {}) {
        if (!this.supportsStreaming) {
            throw new Error('Streaming not supported by this provider');
        }
        throw new Error('streamResponse not implemented');
    }

    formatModel(modelData) {
        return {
            id: modelData.name || modelData.id,
            name: modelData.name || modelData.id,
            size: modelData.size || 'Unknown',
            modified: modelData.modified_at || modelData.created,
            provider: this.name
        };
    }
}

/**
 * Ollama Provider
 */
class OllamaProvider extends BaseProvider {
    constructor(config) {
        super(config);
        this.name = 'ollama';
        this.supportsStreaming = true;
        this.serverUrl = this.config.getProviderConfig('ollama').serverUrl;
    }

    async testConnection() {
        try {
            const response = await fetch(`${this.serverUrl}/api/tags`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async getAvailableModels() {
        try {
            const response = await fetch(`${this.serverUrl}/api/tags`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            return (data.models || []).map(model => this.formatModel(model));
        } catch (error) {
            console.error('Ollama - Error fetching models:', error);
            return [];
        }
    }

    async generateResponse(prompt, model, options = {}) {
        try {
            const response = await fetch(`${this.serverUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: model,
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: options.temperature || 0.7,
                        top_p: options.top_p || 0.9,
                        num_ctx: options.context_length || 4096
                    }
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            return data.response;
        } catch (error) {
            throw new Error(`Ollama generation failed: ${error.message}`);
        }
    }

    async streamResponse(prompt, model, onChunk, options = {}) {
        try {
            const response = await fetch(`${this.serverUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: model,
                    prompt: prompt,
                    stream: true,
                    options: {
                        temperature: options.temperature || 0.7,
                        top_p: options.top_p || 0.9,
                        num_ctx: options.context_length || 4096
                    }
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim());
                
                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        if (data.response) {
                            onChunk(data.response, false);
                        }
                        if (data.done) {
                            onChunk('', true);
                            return;
                        }
                    } catch (e) {
                        continue;
                    }
                }
            }
        } catch (error) {
            throw new Error(`Ollama streaming failed: ${error.message}`);
        }
    }
}

/**
 * OpenAI Provider
 */
class OpenAIProvider extends BaseProvider {
    constructor(config) {
        super(config);
        this.name = 'openai';
        this.supportsStreaming = true;
        this.providerConfig = this.config.getProviderConfig('openai');
    }

    async testConnection() {
        if (!this.providerConfig.apiKey) {
            return false;
        }
        
        try {
            const response = await fetch(`${this.providerConfig.serverUrl}/models`, {
                headers: {
                    'Authorization': `Bearer ${this.providerConfig.apiKey}`
                }
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async getAvailableModels() {
        try {
            const response = await fetch(`${this.providerConfig.serverUrl}/models`, {
                headers: {
                    'Authorization': `Bearer ${this.providerConfig.apiKey}`
                }
            });
            
            const data = await response.json();
            return (data.data || []).map(model => this.formatModel(model));
        } catch (error) {
            console.error('OpenAI - Error fetching models:', error);
            return [];
        }
    }

    async generateResponse(prompt, model, options = {}) {
        try {
            const response = await fetch(`${this.providerConfig.serverUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.providerConfig.apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: options.temperature || 0.7,
                    max_tokens: options.max_tokens || 1000
                })
            });
            
            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            throw new Error(`OpenAI generation failed: ${error.message}`);
        }
    }

    // Streaming implementation for OpenAI would go here
}

/**
 * Anthropic Provider
 */
class AnthropicProvider extends BaseProvider {
    constructor(config) {
        super(config);
        this.name = 'anthropic';
        this.supportsStreaming = true;
        this.providerConfig = this.config.getProviderConfig('anthropic');
    }

    async testConnection() {
        // Implementation for Anthropic
        return false; // Placeholder
    }

    async getAvailableModels() {
        // Anthropic has fixed models
        return [
            { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'anthropic' },
            { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'anthropic' },
            { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'anthropic' }
        ];
    }
}

/**
 * Grok Provider
 */
class GrokProvider extends BaseProvider {
    constructor(config) {
        super(config);
        this.name = 'grok';
        this.supportsStreaming = true;
        this.providerConfig = this.config.getProviderConfig('grok');
    }

    async testConnection() {
        // Implementation for Grok
        return false; // Placeholder
    }

    async getAvailableModels() {
        // Grok models
        return [
            { id: 'grok-1', name: 'Grok-1', provider: 'grok' },
            { id: 'grok-1.5', name: 'Grok-1.5', provider: 'grok' }
        ];
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { APIManager, BaseProvider, OllamaProvider, OpenAIProvider, AnthropicProvider, GrokProvider };
}
