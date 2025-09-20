# LocalAI Wrapper - Enterprise Ollama Chatbot

A professional, enterprise-grade single-page application that serves as a wrapper for the Ollama AI platform. This application provides a clean, modern interface for interacting with local AI models with conversation memory and persistent storage.

## Features

- 🤖 **Local AI Integration**: Direct integration with Ollama running on localhost
- 💬 **Conversation Memory**: AI can reference previous messages in the conversation
- 💾 **Persistent Storage**: Conversations are saved locally using browser storage
- 🎨 **Enterprise UI**: Professional, responsive design suitable for business use
- ⚡ **Real-time Streaming**: Live response streaming from AI models
- 🔧 **Model Management**: Easy switching between different AI models
- 📱 **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

## Prerequisites

- [Ollama](https://ollama.ai/) installed and running locally
- A web browser with modern JavaScript support
- Python (for local development server) or any other HTTP server

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/TanmayGATPHANE/LocalAI__Wrapper.git
   cd LocalAI__Wrapper
   ```

2. Install and start Ollama:
   - Download from [https://ollama.ai/](https://ollama.ai/)
   - Install a model (e.g., `ollama pull llama3.2:1b`)
   - Ensure Ollama is running on `localhost:11434`

3. Start a local web server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Or using Node.js
   npx serve .
   
   # Or using any other HTTP server
   ```

4. Open your browser and navigate to `http://localhost:8000`

## Project Structure

```
├── index.html          # Main HTML file with enterprise-grade interface
├── styles.css          # Professional CSS styling with responsive design
├── script.js           # Core JavaScript with Ollama API integration
├── README.md           # Project documentation
└── .github/
    └── copilot-instructions.md  # Development guidelines
```

## Usage

1. **Start Conversation**: Type your message in the input field and press Enter or click Send
2. **Model Selection**: Use the settings panel to switch between different AI models
3. **Conversation History**: Previous conversations are automatically saved and can be referenced by the AI
4. **Clear Storage**: Use the clear button to reset conversation history

## Key Features

### Conversation Memory
The AI can now reference previous messages in your conversation, making interactions more contextual and meaningful.

### Enterprise Design
- Professional color scheme and typography
- Responsive layout that works on all devices
- Intuitive navigation and user experience
- Accessibility-focused design patterns

### Local Storage
- Conversations persist between browser sessions
- No data sent to external servers
- Complete privacy and data control

## API Integration

The application integrates with Ollama's REST API:
- **Endpoint**: `http://localhost:11434/api/generate`
- **Method**: POST with streaming response
- **Models**: Supports all Ollama-compatible models

## Development

The project follows modern web development practices:
- ES6+ JavaScript with classes and async/await
- CSS custom properties for consistent theming
- Modular code structure for maintainability
- Comprehensive error handling and user feedback

## Troubleshooting

### Ollama Connection Issues
- Ensure Ollama is running: `ollama --version`
- Check if models are installed: `ollama list`
- Verify API endpoint: `curl http://localhost:11434/api/tags`

### Model Download Issues
If you encounter network issues while downloading models:
```bash
$env:OLLAMA_HOST="0.0.0.0:11434"
ollama pull llama3.2:1b
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and commit: `git commit -m 'Add feature'`
4. Push to your branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- [Ollama](https://ollama.ai/) for providing the local AI platform
- Font Awesome for icons
- Inter font family for typography Chat - Simple Web Interface

A clean, simple HTML/CSS/JavaScript single-page application that provides a web interface for interacting with Ollama AI models.

## Features

- **Simple & Clean Interface**: Intuitive chat interface with responsive design
- **Real-time Streaming**: Supports Ollama's streaming API for real-time responses
- **Model Selection**: Choose from available Ollama models
- **Connection Management**: Easy connect/disconnect from Ollama server
- **No Dependencies**: Pure HTML, CSS, and JavaScript - no frameworks required

## Prerequisites

- [Ollama](https://ollama.ai/) installed and running on your system
- A web browser with JavaScript enabled

## Quick Start

1. **Start Ollama Server**:
   ```bash
   ollama serve
   ```

2. **Pull a Model** (if you haven't already):
   ```bash
   ollama pull llama2
   ```

3. **Open the Application**:
   - Simply open `index.html` in your web browser
   - Or use a local server for better experience:
     ```bash
     # Using Python 3
     python -m http.server 8000
     
     # Using Node.js (if you have http-server installed)
     npx http-server
     ```

4. **Configure Connection**:
   - Server URL: `http://localhost:11434` (default)
   - Select your preferred model
   - Click "Connect"

5. **Start Chatting**:
   - Type your message in the input field
   - Press Enter or click Send
   - Watch the AI respond in real-time!

## Configuration

### Server Settings
- **Server URL**: Default is `http://localhost:11434`
- **Models**: The app will automatically detect available models when you connect

### Supported Models
The interface supports any model you have installed with Ollama:
- llama2
- codellama
- mistral
- llama2:13b
- And many more...

## File Structure

```
ollama-chat/
├── index.html          # Main HTML file
├── styles.css          # CSS styling
├── script.js           # JavaScript functionality
├── README.md           # This file
└── .github/
    └── copilot-instructions.md
```

## How It Works

1. **Connection**: The app connects to your local Ollama server via HTTP API
2. **Model Detection**: Automatically fetches available models from `/api/tags`
3. **Chat Interface**: Sends messages to `/api/generate` with streaming enabled
4. **Real-time Updates**: Displays AI responses as they're generated

## API Endpoints Used

- `GET /api/tags` - Fetch available models
- `POST /api/generate` - Generate AI responses (with streaming)

## Troubleshooting

### Connection Issues
- Ensure Ollama is running: `ollama serve`
- Check the server URL is correct
- Verify no firewall is blocking the connection

### CORS Issues
If you encounter CORS errors when opening the file directly:
- Use a local web server instead of opening the file directly
- Or start Ollama with CORS headers enabled

### Model Not Found
- Make sure the model is installed: `ollama list`
- Pull the model if needed: `ollama pull <model-name>`

## Browser Compatibility

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

## Security Notes

- This interface is designed for local use only
- Do not expose your Ollama server to the internet without proper security measures
- The default configuration assumes Ollama is running locally

## Customization

Feel free to modify the code to suit your needs:
- **Styling**: Edit `styles.css` to change the appearance
- **Functionality**: Modify `script.js` to add new features
- **Layout**: Update `index.html` to change the structure

## Contributing

This is a simple educational project. Feel free to fork and enhance it with additional features like:
- Message history persistence
- Multiple conversation threads
- File upload support
- Model parameter tuning
- Export conversations

## License

This project is open source and available under the MIT License.
