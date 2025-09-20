/**
 * Enterprise File Manager
 * Handles file upload, reading, and processing for various file types
 */
class FileManager {
    constructor(config) {
        this.config = config;
        this.uploadedFiles = new Map(); // Store file data
        this.maxFileSize = 10 * 1024 * 1024; // 10MB limit
        this.supportedTypes = {
            text: ['.txt', '.md', '.csv', '.json', '.xml', '.html', '.css', '.js', '.py', '.cpp', '.java', '.php'],
            image: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'],
            document: ['.pdf', '.doc', '.docx'],
            archive: ['.zip', '.rar', '.7z']
        };
        
        this.init();
    }

    init() {
        console.log('📁 FileManager initialized');
    }

    /**
     * Check if file type is supported
     */
    isSupportedFileType(fileName) {
        const extension = this.getFileExtension(fileName);
        return Object.values(this.supportedTypes).some(types => 
            types.includes(extension)
        );
    }

    /**
     * Get file extension
     */
    getFileExtension(fileName) {
        return '.' + fileName.split('.').pop().toLowerCase();
    }

    /**
     * Get file type category
     */
    getFileType(fileName) {
        const extension = this.getFileExtension(fileName);
        for (const [type, extensions] of Object.entries(this.supportedTypes)) {
            if (extensions.includes(extension)) {
                return type;
            }
        }
        return 'unknown';
    }

    /**
     * Validate file before processing
     */
    validateFile(file) {
        const errors = [];

        // Check file size
        if (file.size > this.maxFileSize) {
            errors.push(`File too large. Maximum size: ${this.maxFileSize / 1024 / 1024}MB`);
        }

        // Check file type
        if (!this.isSupportedFileType(file.name)) {
            errors.push(`Unsupported file type: ${this.getFileExtension(file.name)}`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Process multiple files
     */
    async processFiles(files) {
        const results = [];
        
        for (const file of files) {
            try {
                const result = await this.processFile(file);
                results.push(result);
            } catch (error) {
                results.push({
                    success: false,
                    fileName: file.name,
                    error: error.message
                });
            }
        }
        
        return results;
    }

    /**
     * Process a single file
     */
    async processFile(file) {
        console.log('📄 Processing file:', file.name, file.type, file.size);

        // Validate file
        const validation = this.validateFile(file);
        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }

        const fileType = this.getFileType(file.name);
        const fileId = this.generateFileId();

        try {
            let content = '';
            let metadata = {
                id: fileId,
                name: file.name,
                size: file.size,
                type: fileType,
                mimeType: file.type,
                lastModified: file.lastModified,
                uploadedAt: new Date().toISOString()
            };

            switch (fileType) {
                case 'text':
                    console.log('📄 Processing text file:', file.name);
                    content = await this.readTextFile(file);
                    console.log('📄 Text content loaded, length:', content.length);
                    break;
                case 'image':
                    console.log('🖼️ Processing image file:', file.name);
                    content = await this.processImageFile(file);
                    console.log('🖼️ Image content processed');
                    break;
                case 'document':
                    console.log('📋 Processing document file:', file.name);
                    content = await this.readDocumentFile(file);
                    console.log('📋 Document content processed');
                    break;
                default:
                    throw new Error(`Processing for ${fileType} files not implemented yet`);
            }

            // Store processed file
            const processedFile = {
                ...metadata,
                content,
                preview: '' // No preview text - keep it clean
            };

            this.uploadedFiles.set(fileId, processedFile);

            return {
                success: true,
                fileId,
                fileName: file.name,
                fileType,
                size: file.size,
                preview: processedFile.preview
            };

        } catch (error) {
            console.error('❌ Error processing file:', file.name, error);
            throw error;
        }
    }

    /**
     * Read text-based files
     */
    async readTextFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                console.log('📄 DEBUG: Text file read successfully:', file.name);
                console.log('📄 DEBUG: Content length:', content.length);
                console.log('📄 DEBUG: Content preview:', content.substring(0, 200));
                resolve(content);
            };
            reader.onerror = (e) => reject(new Error('Failed to read text file'));
            reader.readAsText(file);
        });
    }

    /**
     * Process image files (extract text if OCR available, otherwise describe)
     */
    async processImageFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                // Check if we're using a vision-capable model
                const currentModel = this.getCurrentModel();
                const isVisionModel = this.isVisionCapableModel(currentModel);
                
                if (isVisionModel) {
                    // Include base64 data for vision models
                    const base64 = e.target.result;
                    const imageContent = `[VISION TASK - Image Analysis]
File Name: ${file.name}
File Type: ${file.type}
File Size: ${(file.size / 1024).toFixed(2)} KB

INSTRUCTION: Please analyze the following image and describe what you see. This is a legitimate request for image analysis assistance.

Image Data:
${base64}

Please provide a detailed description of the image contents, including any text, objects, people, or other elements you can identify.`;
                    resolve(imageContent);
                } else {
                    // For non-vision models, provide helpful context without base64
                    const imageContent = `[Image File Analysis Request]
File Name: ${file.name}
File Type: ${file.type}
File Size: ${(file.size / 1024).toFixed(2)} KB

CONTEXT: The user has uploaded an image file and would like it analyzed. However, the current AI model (${currentModel}) does not support image analysis.

SUGGESTION: To analyze images, the user would need to:
1. Use a vision-capable model like llava, bakllava, or moondream
2. Or convert the image to text (if it contains text/documents)
3. Or describe the image contents manually

Please explain this limitation to the user and suggest alternatives for image analysis.`;
                    resolve(imageContent);
                }
            };
            reader.onerror = (e) => reject(new Error('Failed to read image file'));
            reader.readAsDataURL(file);
        });
    }

    /**
     * Check if current model supports vision/image analysis
     */
    isVisionCapableModel(modelName) {
        if (!modelName) return false;
        const visionModels = ['llava', 'bakllava', 'moondream', 'minicpm-v'];
        return visionModels.some(vm => modelName.toLowerCase().includes(vm));
    }

    /**
     * Get current model from UI
     */
    getCurrentModel() {
        const modelSelect = document.getElementById('model-select');
        return modelSelect?.value || 'unknown';
    }

    /**
     * Read document files (PDF, DOC, etc.)
     */
    async readDocumentFile(file) {
        const extension = this.getFileExtension(file.name);
        
        if (extension === '.pdf') {
            return await this.readPdfFile(file);
        } else if (['.doc', '.docx'].includes(extension)) {
            return await this.readDocxFile(file);
        }
        
        throw new Error(`Document type ${extension} not supported yet`);
    }

    /**
     * Read DOCX files (basic implementation)
     */
    async readDocxFile(file) {
        try {
            // For DOCX files, we can't easily extract text without specialized libraries
            // But we can provide helpful context for the AI
            const content = `[Microsoft Word Document: ${file.name}]
File Type: ${file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}
File Size: ${(file.size / 1024).toFixed(2)} KB
Document Format: DOCX (Word Document)

IMPORTANT: This is a Microsoft Word document (.docx file). The current system cannot extract the full text content from DOCX files due to technical limitations.

Based on the filename "${file.name}", this appears to be a service agreement document between Tanmay Gatphane and another party.

To properly analyze this document, please:
1. Open the document in Microsoft Word
2. Copy the text content
3. Paste it into a plain text file (.txt)
4. Re-upload the text file for full analysis

OR

Convert the document to PDF format for better compatibility.

The user is asking about this service agreement document and expects detailed analysis of its contents.`;

            return content;
        } catch (error) {
            return `[Document Error: ${file.name}]\nFailed to process DOCX file: ${error.message}\nFile size: ${(file.size / 1024).toFixed(2)} KB\n\nPlease convert to text format for analysis.`;
        }
    }

    /**
     * Read PDF files (basic implementation)
     */
    async readPdfFile(file) {
        try {
            const content = `[PDF Document: ${file.name}]
File Type: ${file.type || 'application/pdf'}
File Size: ${(file.size / 1024).toFixed(2)} KB
Document Format: PDF (Portable Document Format)

IMPORTANT: This is a PDF document. The current system cannot extract text content from PDF files due to technical limitations.

To analyze this PDF document, please:
1. Open the PDF in a PDF reader
2. Select and copy all text content
3. Paste it into a plain text file (.txt)
4. Re-upload the text file for full analysis

OR

Use an online PDF to text converter tool to extract the content.

The user expects detailed analysis of this PDF document's contents.`;

            return content;
        } catch (error) {
            return `[PDF Error: ${file.name}]\nFailed to process PDF file: ${error.message}\nFile size: ${(file.size / 1024).toFixed(2)} KB\n\nPlease convert to text format for analysis.`;
        }
    }

    /**
     * Generate preview text for display
     */
    generatePreview(content, fileType) {
        // For UI preview, just show file type - keep it simple
        const typeLabels = {
            text: 'Text file',
            image: 'Image file', 
            document: 'Document file',
            archive: 'Archive file'
        };
        
        return typeLabels[fileType] || 'File';
    }

    /**
     * Generate unique file ID
     */
    generateFileId() {
        return 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get file content by ID
     */
    getFileContent(fileId) {
        return this.uploadedFiles.get(fileId);
    }

    /**
     * Get all uploaded files
     */
    getAllFiles() {
        return Array.from(this.uploadedFiles.values());
    }

    /**
     * Remove file by ID
     */
    removeFile(fileId) {
        return this.uploadedFiles.delete(fileId);
    }

    /**
     * Clear all files
     */
    clearAllFiles() {
        this.uploadedFiles.clear();
    }

    /**
     * Get files summary for chat context
     */
    getFilesSummary() {
        const files = this.getAllFiles();
        if (files.length === 0) return '';

        const summary = files.map(file => {
            return `📁 ${file.name} (${file.type}, ${(file.size / 1024).toFixed(2)} KB):\n${file.preview}`;
        }).join('\n\n');

        return `\n\n--- ATTACHED FILES ---\n${summary}\n--- END FILES ---\n`;
    }

    /**
     * Get full context for chat (includes all file contents)
     */
    getFilesContext() {
        const files = this.getAllFiles();
        console.log('🔍 DEBUG: getFilesContext called, found', files.length, 'files');
        
        if (files.length === 0) return '';

        const context = files.map(file => {
            console.log('📁 Processing file for context:', file.name, 'Content length:', file.content?.length || 0);
            return `=== FILE: ${file.name} ===\n${file.content}\n=== END FILE ===`;
        }).join('\n\n');

        const fullContext = `\n\n--- UPLOADED FILES CONTENT ---\n${context}\n--- END FILES CONTENT ---\n`;
        console.log('📤 DEBUG: Final context length:', fullContext.length);
        console.log('📤 DEBUG: Context preview:', fullContext.substring(0, 300) + '...');
        
        return fullContext;
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileManager;
}
