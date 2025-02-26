/**
 * Thread Manager for Baltimore Maternal Health Assistant
 * Handles OpenAI thread creation, verification, and message management
 */

const { fetchOpenAI } = require('./api-client');

/**
 * Verify if a thread exists and is accessible
 * @param {string} threadId - OpenAI thread ID to verify
 * @param {string} apiKey - OpenAI API key
 * @param {string} orgId - OpenAI Organization ID
 * @param {string} projectId - OpenAI Project ID
 * @returns {Promise<boolean>} - Whether thread exists and is accessible
 */
async function verifyThread(threadId, apiKey, orgId, projectId) {
    if (!threadId) return false;
    
    try {
        console.log(`🔍 Verifying thread: ${threadId}`);
        await fetchOpenAI(`https://api.openai.com/v1/threads/${threadId}/messages?limit=1`, {
            method: 'GET'
        }, apiKey, orgId, projectId, 2, 5000);
        
        console.log('✅ Thread verified successfully');
        return true;
    } catch (error) {
        console.warn(`⚠️ Thread verification failed: ${error.message}`);
        return false;
    }
}

/**
 * Create a new thread with optional metadata
 * @param {string} apiKey - OpenAI API key
 * @param {string} orgId - OpenAI Organization ID
 * @param {string} projectId - OpenAI Project ID 
 * @param {Object} metadata - Optional metadata (user_id, organization)
 * @returns {Promise<string>} - New thread ID
 */
async function createThread(apiKey, orgId, projectId, metadata = {}) {
    console.log('🆕 Creating new thread with metadata:', metadata);
    
    try {
        const response = await fetchOpenAI('https://api.openai.com/v1/threads', {
            method: 'POST',
            body: JSON.stringify({ metadata })
        }, apiKey, orgId, projectId, 3, 8000);
        
        const data = await response.json();
        console.log('✅ Created new thread:', data.id);
        return data.id;
    } catch (error) {
        console.error('❌ Failed to create thread:', error);
        throw new Error(`Thread creation failed: ${error.message}`);
    }
}

/**
 * Get or create a thread for a user
 * @param {string} threadId - Existing thread ID (optional)
 * @param {string} userId - User ID
 * @param {string} organization - Organization name
 * @param {string} apiKey - OpenAI API key
 * @param {string} orgId - OpenAI Organization ID
 * @param {string} projectId - OpenAI Project ID
 * @returns {Promise<string>} - Thread ID
 */
async function getOrCreateThread(threadId, userId, organization, apiKey, orgId, projectId) {
    // First try to verify the existing thread
    if (threadId && await verifyThread(threadId, apiKey, orgId, projectId)) {
        console.log(`🧵 Using existing thread: ${threadId}`);
        return threadId;
    }
    
    // Create new thread with user metadata
    console.log(`🆕 Creating new thread for user: ${userId}`);
    return await createThread(apiKey, orgId, projectId, {
        user_id: userId,
        organization: organization || 'unknown'
    });
}

/**
 * Add a message to a thread
 * @param {string} threadId - Thread ID
 * @param {string} message - Message content
 * @param {string} apiKey - OpenAI API key
 * @param {string} orgId - OpenAI Organization ID
 * @param {string} projectId - OpenAI Project ID
 * @returns {Promise<Object>} - Message data
 */
async function addMessageToThread(threadId, message, apiKey, orgId, projectId) {
    console.log(`💬 Adding message to thread: ${threadId}`);
    
    try {
        const response = await fetchOpenAI(`https://api.openai.com/v1/threads/${threadId}/messages`, {
            method: 'POST',
            body: JSON.stringify({
                role: 'user',
                content: message
            })
        }, apiKey, orgId, projectId, 3, 8000);
        
        const data = await response.json();
        console.log('✅ Added message to thread');
        return data;
    } catch (error) {
        console.error('❌ Failed to add message:', error);
        throw new Error(`Adding message failed: ${error.message}`);
    }
}

/**
 * Run an assistant on a thread
 * @param {string} threadId - Thread ID
 * @param {string} assistantId - Assistant ID
 * @param {string} apiKey - OpenAI API key
 * @param {string} orgId - OpenAI Organization ID
 * @param {string} projectId - OpenAI Project ID
 * @returns {Promise<string>} - Run ID
 */
async function runThreadWithAssistant(threadId, assistantId, apiKey, orgId, projectId) {
    console.log(`🤖 Running assistant ${assistantId} on thread ${threadId}`);
    
    try {
        const response = await fetchOpenAI(`https://api.openai.com/v1/threads/${threadId}/runs`, {
            method: 'POST',
            body: JSON.stringify({
                assistant_id: assistantId
            })
        }, apiKey, orgId, projectId, 3, 8000);
        
        const data = await response.json();
        console.log(`✅ Started run: ${data.id}`);
        return data.id;
    } catch (error) {
        console.error('❌ Failed to start run:', error);
        throw new Error(`Starting run failed: ${error.message}`);
    }
}

/**
 * Check the status of a run
 * @param {string} threadId - Thread ID
 * @param {string} runId - Run ID
 * @param {string} apiKey - OpenAI API key
 * @param {string} orgId - OpenAI Organization ID
 * @param {string} projectId - OpenAI Project ID
 * @returns {Promise<Object>} - Run data
 */
async function checkRunStatus(threadId, runId, apiKey, orgId, projectId) {
    console.log(`🔄 Checking run status: ${runId}`);
    
    try {
        const response = await fetchOpenAI(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
            method: 'GET'
        }, apiKey, orgId, projectId, 3, 5000);
        
        const data = await response.json();
        console.log(`ℹ️ Run status: ${data.status}`);
        return data;
    } catch (error) {
        console.error('❌ Failed to check run status:', error);
        throw new Error(`Checking run status failed: ${error.message}`);
    }
}

/**
 * Get all messages from a thread
 * @param {string} threadId - Thread ID
 * @param {string} apiKey - OpenAI API key
 * @param {string} orgId - OpenAI Organization ID
 * @param {string} projectId - OpenAI Project ID
 * @param {number} limit - Maximum number of messages to retrieve (default: 100)
 * @returns {Promise<Array>} - Array of messages
 */
async function getThreadMessages(threadId, apiKey, orgId, projectId, limit = 100) {
    console.log(`📃 Getting messages from thread: ${threadId}`);
    
    try {
        const response = await fetchOpenAI(`https://api.openai.com/v1/threads/${threadId}/messages?limit=${limit}`, {
            method: 'GET'
        }, apiKey, orgId, projectId, 3, 8000);
        
        const data = await response.json();
        console.log(`✅ Retrieved ${data.data.length} messages`);
        return data.data;
    } catch (error) {
        console.error('❌ Failed to get messages:', error);
        throw new Error(`Getting messages failed: ${error.message}`);
    }
}

module.exports = {
    verifyThread,
    createThread,
    getOrCreateThread,
    addMessageToThread,
    runThreadWithAssistant,
    checkRunStatus,
    getThreadMessages
}; 