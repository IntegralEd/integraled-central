/**
 * Thread Manager for Baltimore Maternal Health Assistant
 * Handles OpenAI thread creation, verification, and message management
 */

const { fetchOpenAI } = require('./api-client');
const { logChatInteraction } = require('../make-integration');

/**
 * Verify if a thread exists and is accessible across platforms
 * @param {Object} threadInfo - Thread information
 * @param {string} threadInfo.openai_thread - OpenAI thread ID
 * @param {string} threadInfo.storyline_state - Storyline state ID
 * @param {Object} config - API configuration
 * @returns {Promise<Object>} - Thread verification status
 */
async function verifyThreads(threadInfo, config) {
    const results = {
        openai: false,
        storyline: false,
        context: null
    };
    
    try {
        // Verify OpenAI thread
        if (threadInfo.openai_thread) {
            results.openai = await verifyOpenAIThread(
                threadInfo.openai_thread, 
                config.apiKey, 
                config.orgId, 
                config.projectId
            );
        }
        
        // Verify Storyline state (if applicable)
        if (threadInfo.storyline_state) {
            results.storyline = true; // Storyline states are always valid
        }
        
        // Get latest context from interaction log
        if (results.openai || results.storyline) {
            const contextResponse = await logChatInteraction({
                interaction_type: 'context_fetch',
                Thread_ID: threadInfo.openai_thread || threadInfo.storyline_state,
                source_platform: threadInfo.openai_thread ? 'openai' : 'storyline'
            });
            results.context = contextResponse.thread_context;
        }
        
        return results;
    } catch (error) {
        console.warn(`⚠️ Thread verification failed: ${error.message}`);
        return results;
    }
}

/**
 * Verify OpenAI thread existence
 */
async function verifyOpenAIThread(threadId, apiKey, orgId, projectId) {
    if (!threadId) return false;
    
    try {
        console.log(`🔍 Verifying OpenAI thread: ${threadId}`);
        await fetchOpenAI(`https://api.openai.com/v1/threads/${threadId}/messages?limit=1`, {
            method: 'GET'
        }, apiKey, orgId, projectId, 2, 5000);
        
        console.log('✅ OpenAI thread verified successfully');
        return true;
    } catch (error) {
        console.warn(`⚠️ OpenAI thread verification failed: ${error.message}`);
        return false;
    }
}

/**
 * Create a new unified thread across platforms
 * @param {Object} config - Configuration options
 * @param {Object} metadata - Thread metadata
 * @returns {Promise<Object>} - Created thread IDs and context
 */
async function createUnifiedThread(config, metadata = {}) {
    console.log('🆕 Creating unified thread with metadata:', metadata);
    
    try {
        // Create OpenAI thread
        const openaiThread = await createOpenAIThread(
            config.apiKey, 
            config.orgId, 
            config.projectId, 
            metadata
        );
        
        // Log thread creation in interaction log
        const logResponse = await logChatInteraction({
            interaction_type: 'thread_create',
            Thread_ID: openaiThread,
            source_platform: 'openai',
            metadata: {
                ...metadata,
                platform_specific: {
                    openai_thread: openaiThread
                }
            }
        });
        
        return {
            thread_ids: {
                openai: openaiThread,
                storyline: null // Will be set when Storyline interaction begins
            },
            context: logResponse.thread_context
        };
    } catch (error) {
        console.error('❌ Failed to create unified thread:', error);
        throw new Error(`Unified thread creation failed: ${error.message}`);
    }
}

/**
 * Create OpenAI thread
 */
async function createOpenAIThread(apiKey, orgId, projectId, metadata = {}) {
    const response = await fetchOpenAI('https://api.openai.com/v1/threads', {
        method: 'POST',
        body: JSON.stringify({ metadata })
    }, apiKey, orgId, projectId, 3, 8000);
    
    const data = await response.json();
    console.log('✅ Created OpenAI thread:', data.id);
    return data.id;
}

/**
 * Get or create a unified thread
 * @param {Object} threadInfo - Existing thread information
 * @param {Object} config - Configuration options
 * @returns {Promise<Object>} - Thread IDs and context
 */
async function getOrCreateUnifiedThread(threadInfo, config) {
    // First verify existing threads
    const verificationResult = await verifyThreads(threadInfo, config);
    
    if (verificationResult.openai || verificationResult.storyline) {
        console.log(`🧵 Using existing thread(s):`, threadInfo);
        return {
            thread_ids: {
                openai: threadInfo.openai_thread,
                storyline: threadInfo.storyline_state
            },
            context: verificationResult.context
        };
    }
    
    // Create new unified thread
    return await createUnifiedThread(config, {
        user_id: config.userId,
        organization: config.organization
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

// Export the enhanced functions
module.exports = {
    verifyThreads,
    createUnifiedThread,
    getOrCreateUnifiedThread,
    addMessageToThread,
    getThreadMessages,
    runThreadWithAssistant,
    checkRunStatus
}; 