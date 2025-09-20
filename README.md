# Ollama Chat - Simple Web Interface

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
