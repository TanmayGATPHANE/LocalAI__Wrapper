/**
 * Enterprise Configuration Manager
 * Loads and manages configuration from multiple sources
 */
class ConfigManager {
    constructor() {
        this.config = {};
        this.envLoaded = false;
        // Don't call init() in constructor as it's async
        this.loadDefaultConfig(); // Load defaults synchronously
    }

    async init() {
        try {
            await this.loadEnvConfig();
            this.loadLocalStorageConfig();
            this.envLoaded = true;
            console.log('✅ Configuration loaded successfully');
        } catch (error) {
            console.warn('⚠️ Could not load .env file, using defaults:', error);
            this.envLoaded = true;
        }
    }

    async loadEnvConfig() {
        try {
            const response = await fetch('./config.env');
            if (!response.ok) throw new Error('Config file not found');
            
            const envText = await response.text();
            const envLines = envText.split('\n');
            
            envLines.forEach(line => {
                line = line.trim();
                if (line && !line.startsWith('#') && line.includes('=')) {
                    const [key, ...valueParts] = line.split('=');
                    const value = valueParts.join('=').trim();
                    this.setConfigValue(key.trim(), this.parseValue(value));
                }
            });
        } catch (error) {
            console.warn('Could not load config.env:', error);
        }
    }

    loadDefaultConfig() {
        const defaults = {
            // Provider Configuration
            DEFAULT_PROVIDER: 'ollama',
            
            // Ollama
            OLLAMA_SERVER_URL: 'http://localhost:11434',
            OLLAMA_DEFAULT_MODEL: 'llama3.2:1b',
            
            // OpenAI
            OPENAI_API_KEY: '',
            OPENAI_DEFAULT_MODEL: 'gpt-4',
            
            // Anthropic
            ANTHROPIC_API_KEY: '',
            ANTHROPIC_DEFAULT_MODEL: 'claude-3-sonnet',
            
            // Grok
            GROK_API_KEY: '',
            GROK_DEFAULT_MODEL: 'grok-1',
            
            // UI
            THEME: 'dark',
            ENABLE_DEBUGGING: true,
            MAX_CONVERSATION_HISTORY: 100,
            AUTO_SAVE_INTERVAL: 30000,
            
            // Storage
            STORAGE_TYPE: 'localStorage',
            STORAGE_KEY_PREFIX: 'ollama_enterprise_',
            
            // Chat
            MAX_MESSAGE_LENGTH: 8000,
            TYPING_SPEED: 50,
            ENABLE_STREAMING: true,
            CONVERSATION_MEMORY: true,
            
            // Models
            AUTO_DETECT_MODELS: true,
            MODEL_REFRESH_INTERVAL: 60000,
            SHOW_MODEL_INFO: true,
            
            // Features
            ENABLE_VOICE_INPUT: false,
            ENABLE_TEXT_TO_SPEECH: false,
            ENABLE_EXPORT_CHAT: true,
            ENABLE_MULTIPLE_CONVERSATIONS: true
        };

        // Apply defaults only if not already set
        Object.entries(defaults).forEach(([key, value]) => {
            if (this.config[key] === undefined) {
                this.config[key] = value;
            }
        });
    }

    loadLocalStorageConfig() {
        try {
            const userConfig = localStorage.getItem('user_preferences');
            if (userConfig) {
                const parsed = JSON.parse(userConfig);
                Object.assign(this.config, parsed);
            }
        } catch (error) {
            console.warn('Could not load user preferences:', error);
        }
    }

    parseValue(value) {
        // Handle boolean values
        if (value.toLowerCase() === 'true') return true;
        if (value.toLowerCase() === 'false') return false;
        
        // Handle numbers
        if (!isNaN(value) && !isNaN(parseFloat(value))) {
            return parseFloat(value);
        }
        
        // Return as string
        return value;
    }

    setConfigValue(key, value) {
        this.config[key] = value;
    }

    get(key, defaultValue = null) {
        return this.config[key] !== undefined ? this.config[key] : defaultValue;
    }

    set(key, value) {
        this.config[key] = value;
        this.saveUserPreferences();
    }

    saveUserPreferences() {
        try {
            const userPrefs = {
                THEME: this.config.THEME,
                DEFAULT_PROVIDER: this.config.DEFAULT_PROVIDER,
                ENABLE_DEBUGGING: this.config.ENABLE_DEBUGGING
            };
            localStorage.setItem('user_preferences', JSON.stringify(userPrefs));
        } catch (error) {
            console.warn('Could not save user preferences:', error);
        }
    }

    // Provider-specific getters
    getProviderConfig(provider) {
        const configs = {
            ollama: {
                serverUrl: this.get('OLLAMA_SERVER_URL'),
                defaultModel: this.get('OLLAMA_DEFAULT_MODEL'),
                apiKey: null // Ollama doesn't need API key
            },
            openai: {
                serverUrl: 'https://api.openai.com/v1',
                defaultModel: this.get('OPENAI_DEFAULT_MODEL'),
                apiKey: this.get('OPENAI_API_KEY')
            },
            anthropic: {
                serverUrl: 'https://api.anthropic.com/v1',
                defaultModel: this.get('ANTHROPIC_DEFAULT_MODEL'),
                apiKey: this.get('ANTHROPIC_API_KEY')
            },
            grok: {
                serverUrl: 'https://api.x.ai/v1',
                defaultModel: this.get('GROK_DEFAULT_MODEL'),
                apiKey: this.get('GROK_API_KEY')
            }
        };

        return configs[provider] || configs.ollama;
    }

    getUIConfig() {
        return {
            theme: this.get('THEME'),
            enableDebugging: this.get('ENABLE_DEBUGGING'),
            maxConversationHistory: this.get('MAX_CONVERSATION_HISTORY'),
            autoSaveInterval: this.get('AUTO_SAVE_INTERVAL'),
            enableStreaming: this.get('ENABLE_STREAMING'),
            showModelInfo: this.get('SHOW_MODEL_INFO')
        };
    }

    getChatConfig() {
        return {
            maxMessageLength: this.get('MAX_MESSAGE_LENGTH'),
            typingSpeed: this.get('TYPING_SPEED'),
            conversationMemory: this.get('CONVERSATION_MEMORY'),
            enableVoiceInput: this.get('ENABLE_VOICE_INPUT'),
            enableTextToSpeech: this.get('ENABLE_TEXT_TO_SPEECH')
        };
    }

    // Debug method
    dumpConfig() {
        console.table(this.config);
    }
}

// Create global config instance
const Config = new ConfigManager();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfigManager;
}
