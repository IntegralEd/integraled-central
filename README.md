# IntegralEd Core Platform

## Overview
IntegralEd Core is a multi-tenant platform that provides AI-powered educational support and learning management capabilities. The platform is designed to be embedded within Softr sites while maintaining consistent branding and functionality across different educational institutions.

## Key Features

### 1. RAG Chat System
- Contextual AI chat powered by domain-specific knowledge bases
- Tenant-specific agents with specialized knowledge
- Real-time learning support and guidance
- Preview mode for content testing and feedback

### 2. Support System
- Universal entry point for technical support
- Automated ticket creation and routing
- Context-aware issue resolution
- Integration with existing support workflows

### 3. Learning Management
- Course progress tracking
- Achievement system
- Learning record store (LRS) integration
- SCORM/xAPI compatibility

## Architecture

### Components
1. **Core Assets**
   - CSS Variables and Base Styles
   - JavaScript Utilities
   - Agent Configuration System
   - Event Logging Framework

2. **Tenant System**
   - Multi-tenant Support
   - Branding Configuration
   - Feature Flags
   - Agent Assignment

3. **Integration Layer**
   - Make.com Webhooks
   - LMS Connectors
   - Analytics Integration
   - Support Ticket System

## Implementation Guide

### 1. Basic Setup
1. Add the pre-header code block to your Softr site:
   ```html
   <!-- Copy from public/softr/pre-header.html -->
   ```

2. Create a chat page using:
   ```html
   <!-- Copy from public/softr/chat-page.html -->
   ```

### 2. Configuration
1. Set up tenant configuration in the admin panel
2. Configure agents and their capabilities
3. Customize branding and styling
4. Enable/disable features as needed

### 3. Testing
1. Use preview mode for testing new content
2. Add feedback notes for improvements
3. Monitor event logs for issues
4. Test different user scenarios

## Security & Compliance

### Data Protection
- HIPAA compliance for health data
- PII protection measures
- Secure data transmission
- Audit logging

### Access Control
- Role-based access
- Tenant isolation
- API key management
- Session security

## Development

### Local Setup
1. Clone the repository
2. Install dependencies
3. Configure environment variables
4. Start development server

### Contributing
1. Follow coding standards
2. Use conventional commits
3. Submit pull requests
4. Update documentation

## Support & Resources

### Documentation
- [API Reference](https://docs.integral-ed.com/api-reference.html)
- [Integration Guide](https://docs.integral-ed.com/integration-guide.html)
- [Agent Documentation](https://docs.integral-ed.com/agent-readme.json)

### Contact
- Technical Support: support@integral-ed.com
- Documentation: docs@integral-ed.com
- Security: security@integral-ed.com

## License
Copyright © 2024 IntegralEd. All rights reserved.

# RAG Document Application

An end-to-end RAG application (from scratch) based on FastAPI that processes PDFs, images, and web pages to obtain OCR data, generates embeddings using OpenAI's embedding models, and utilizes Pinecone as a vector database for search. It answers questions based on search results using OpenAI Chat Completion!

<img src="assets/architecture.gif" width=80%>

## Contents
- [Checklist](#checklist)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Endpoints](#endpoints)

## Checklist
- [x] Basic API authentication
- [ ] End-2-End API authentication/authorization (coming)
- [x] Rate limiting to prevent abuse.
- [x] Asynchronous processing.
- [x] File uploading (AWS S3) including validation and sanitization.
- [x] OCR processing (from mock files), Embedding generation using OpenAI.
- [ ] End-2-End OCR (Model Serving) and Google APIs, Mathpix API Integrations
- [x] processes PDFs, Images
- [ ] processes Web Pages
- [x] Storage and search of embeddings with Pinecone.
- [x] Search from the document
- [x] Applied Tokenizers for better search performance. 
- [x] Talk to your data! Chat and generate the answer from the search results using OpenAI's chat completions.
- [ ] OpenAPI chat completion streaming support
- [x] Dockerize App.
- [x] Implemented Redis for caching and frequent queries.
- [x] The detailed comments, docstrings, lint checks, pip8. 
- [ ] CD (GitHub actions)
- [ ] CI & PyTest codes
- [ ] Chat Interface 


## Prerequisites
- Python 3.11 
- Docker
- Docker Compose (v2.20.2)
- AWS S3 Credentials (API-Keys)
- OpenAI API-Key
- Pinecone API-Key
- Prepare your .env file, learn in [Configuration](#configuration)


## Installation

 ```bash
 git clone https://github.com/teamunitlab/rag-document-app.git
 cd rag-document-app/
 docker-compose up -d --build
 ```


## Configuration
1. Fill a `.env` file in the root directory and add the following environment variables:
    ```env
    API_KEY=your_api_key_here
    OPENAI_API_KEY=your_openai_api_key_here
    PINECONE_API_KEY=your_pinecone_api_key_here
    PINECONE_INDEX_NAME=your_pinecone_index_name
    AWS_ACCESS_KEY_ID=your_aws_access_key_id
    AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
    AWS_DEFAULT_REGION=your_aws_region
    BUCKET_NAME=your_s3_bucket_name
    ```

2. Ensure AWS credentials and bucket policies are correctly configured to allow S3 access.

## Usage
1. Run the FastAPI application:
    ```bash
    docker-compose up -d
    ```

2. Access the API documentation at `http://localhost:8000/docs`.

## Endpoints
### Upload File
- **URL**: `/upload`
- **Method**: `POST`
- **Description**: Upload files to S3. Limited to 10 requests per minute.
- **Request**:
    - `files`: List of files to upload.
    - `API-Key`: Header for API key authentication.
- **Response**: JSON containing file IDs and URLs.

### Process OCR
- **URL**: `/ocr`
- **Method**: `POST`
- **Description**: Process OCR for a given file URL. Limited to 10 requests per minute.
- **Request**:
    - `url`: URL of the file to process, it is obtained during file (ducument) uploading.
    - `API-Key`: Header for API key authentication.
- **Response**: JSON containing information about the processing status.

### Extract Data
- **URL**: `/extract`
- **Method**: `POST`
- **Description**: Reply to a query using OpenAI chat completions and search based on the given File ID from Pinecone, Limited to 10 requests per minute.
- **Request**:
    - `file_id`: The file ID, it is obtained during file (ducument) uploading.
    - `query`: Ask a question from your document!
    - `API-Key`: Header for API key authentication.
- **Response**: JSON containing information about a reply to the question and the three top search results. 

### References
1. http://unitlab.ai/
2. https://blog.unitlab.ai/unitlab-ai-data-collection-and-annotation-for-llms-and-generative-ai/
3. https://docs.unitlab.ai/ai-models/model-integration
4. https://blog.unitlab.ai/

## Recent Updates

### GitHub Pages Integration
- Deployed chat interface to GitHub Pages at `https://integraled.github.io/rag-bmore-app/`
- Configured CORS in Lambda URL settings to allow both:
  - Softr app domain (`https://bmore.softr.app`)
  - GitHub Pages domain (`https://integraled.github.io`)
- Simplified Lambda function by removing redundant CORS headers
- Moved index.html to root for proper GitHub Pages serving

### Lambda Configuration
- Function: `get-pinecone-config`
- Region: `us-east-2`
- Runtime: `nodejs18.x`
- CORS handling: Managed via Lambda URL configuration
## Architecture Flow

┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────┐
│ Softr App   │────▶│ GitHub Pages    │────▶│ AWS Lambda API  │────▶│ OpenAI API  │
│ Storyline   │     │ (HTML/JS)       │     │ (Node.js 18)    │     │ (Assistant) │
└─────────────┘     └─────────────────┘     └─────────────────┘     └─────────────┘
    │                        │                        │                      │
    │                        │                        │                      │
    │                        │                        │                      │
    ▼                        ▼                        ▼                      │
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐            │
│ User_ID &   │────▶│ URL Parameters  │────▶│ User Permission │            │
│ Organization│     │ (Authentication)│     │ & Save Settings │            │
└─────────────┘     └─────────────────┘     └─────────────────┘            │
                                                    │                       │
                                                    ▼                       │
                                            ┌─────────────────┐            │
                                            │ Make Integration │◀───────────┘
                                            │ (Webhook)        │
                                            └────────┬────────┘
                                                    │
                                                    ▼
                                            ┌─────────────────┐
                                            │ Airtable        │
                                            │ (Data Storage)  │
                                            └────────┬────────┘
                                                    │
                                            ┌───────┴────────┐
                                            │ Template Output │
                                            │ ┌────────────┐ │
                                            │ │Google Drive │ │
                                            │ │  - Slides  │ │
                                            │ │  - PDFs    │ │
                                            │ └────────────┘ │
                                            └───────┬────────┘
                                                   │
                                            ┌──────┴───────┐
                                            │   Future:    │
                                            │  Pinecone    │
                                            │   Vector     │
                                            │   Storage    │
                                            └──────────────┘

## Custom GPT Integration with Softr

### Overview
This project embeds a custom GPT-powered chat interface directly in Softr applications with conversation logging via Make to Airtable, preserving user privacy through ID-based identification.

### Key Components
1. **Lambda Function**: Handles communication with OpenAI's Assistants API
2. **GitHub Pages**: Hosts static assets for the chat interface
3. **Softr Integration**: Embeds the chat interface via HTML component
4. **Make Integration**: Routes conversations to Airtable based on user permissions
5. **Airtable**: Stores conversations and user preferences for future retrieval

### Data Flow & Privacy
- **User Identification**: System uses `User_ID` and `Organization` as primary keys across all components
- **Permission Levels**: Teacher/admin conversations automatically save; student conversations only save with explicit permission
- **Privacy First**: Production environments avoid passing email addresses, especially in educational settings with minors
- **Future Integration**: Airtable `User_Table` will store user preferences (grade level, subject, etc.) that guide prompt inputs

### Setup
1. Deploy the Lambda function with proper environment variables
2. Add the chat interface HTML to a Softr HTML component
3. Pass Softr user context to maintain conversation history
4. Configure Make webhook for conversation routing to Airtable
5. Create appropriate Airtable tables for user data and conversation storage

### User Experience
- Each user gets a persistent conversation thread
- Chat history is maintained between sessions
- The interface is fully embedded in your Softr application
- Conversations are stored anonymously using `User_ID` rather than personally identifiable information
- Future enhancements will personalize responses based on user preferences stored in Airtable

# IntegralEd Central

## Feature Manifest

### MVP Features (Demo Ready)
- [ ] Context-Aware Chat
  - [x] Basic chat interface
  - [x] URL parameter parsing
  - [ ] Document context integration
  - [ ] User recognition

- [ ] Document Upload
  - [ ] Basic file upload
  - [ ] CSV/spreadsheet parsing
  - [ ] Document context extraction

- [ ] User Management
  - [x] URL-based user context
  - [ ] Basic login flow
  - [ ] Organization context

### Future Features
- [ ] Module Directory
  - [ ] Recipe table integration
  - [ ] Dynamic prompt loading
  - [ ] Context override system

- [ ] Integration Tools
  - [ ] Airtable API integration
  - [ ] Make.com CLI support
  - [ ] Webhook management system

### Development Tools
- [ ] CLI Integrations
  - [ ] Airtable data sync
  - [ ] Make.com scenario management
  - [ ] Webhook testing suite

## Dynamic URL Construction and Endpoint Management

### URL Construction Logic

1. **Base Architecture**:
   - The system uses a Lambda endpoint (`https://ctgzczpglrpxybze2jz7iewmjq0wfhcp.lambda-url.us-east-2.on.aws/`) as the central communication point.
   - Each chat interface constructs URLs with specific parameters based on user context.

2. **Parameter Construction**:
   - Core parameters used across all interfaces:
     - `User_ID`: Unique identifier for the user (from Airtable/Softr/anonymous).
     - `Organization`: User's organization or default value.
     - `thread_id`: Chat thread identifier (if exists).

3. **Context Sources**:
   - **Softr Embed**: Gets user data from `Softr.user.get()`.
   - **Direct URL**: Uses URL parameters if provided.
   - **Anonymous Mode**: Falls back to 'anonymous' user if no context.

### JSON Payload Structure

1. **Standard Chat Message**:
   ```json
   {
       "user_id": "string",
       "thread_id": "string|null",
       "organization": "string",
       "timestamp": "ISO-8601 string",
       "metadata": {
           "thread_status": "active|closed",
           "last_interaction": "ISO-8601 string"
       }
   }
   ```

2. **Feedback Message**:
   ```json
   {
       "type": "chat_feedback",
       "message": "string",
       "tenant": "string",
       "domain": "string",
       "source": "URL string",
       "preview": "boolean"
   }
   ```

### Data Detection Points for Make

1. **Entry Points**:
   - New chat initiation.
   - Message sending.
   - Feedback submission.
   - Thread status changes.

2. **Trigger Fields**:
   ```json
   {
     "type": ["chat_message", "chat_feedback"],
     "thread_status": ["active", "closed"],
     "organization": ["Bmore", "Softr", "default"],
     "preview": [true, false]
   }
   ```

3. **State Management**:
   - Thread IDs are stored in `localStorage` with key pattern: `chat_thread_${userId}`.
   - Session persistence handled through browser storage.
   - Server-side state managed through `thread_id` tracking.

This architecture allows for:
- Seamless switching between authenticated and anonymous users.
- Organization-specific routing.
- Preview/production environment separation.
- Centralized webhook handling.
- Flexible feedback collection.
- Thread persistence across sessions.

### Endpoint Management

- The current Lambda endpoint is `https://ctgzczpglrpxybze2jz7iewmjq0wfhcp.lambda-url.us-east-2.on.aws/`.
- All chat interfaces and feedback mechanisms are routed through this endpoint.
- The endpoint is designed to handle both authenticated and anonymous requests, with fallback mechanisms for public access.

### Temporary Public Access Keys

- Consider using a public data store or rotated unlisted invisible table to house "temp public access keys".
- These keys can be offered to users who want to save threads but not identify by email.
- This approach ensures secure and temporary access without compromising user privacy.




