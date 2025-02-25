/**
 * Enhanced OpenAI API client for the Baltimore Maternal Health Assistant
 * Handles authentication, retries, timeouts, and error logging
 */

const fetch = require('node-fetch');
const { AbortController } = global;

/**
 * Enhanced fetch with proper OpenAI headers, timeout handling, and retries
 * @param {string} url - OpenAI API endpoint
 * @param {Object} options - Fetch options (method, body, etc.)
 * @param {string} apiKey - OpenAI API key
 * @param {string} orgId - OpenAI Organization ID
 * @param {string} projectId - OpenAI Project ID
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} timeoutMs - Request timeout in milliseconds (default: 8000)
 * @returns {Promise<Response>} - Fetch response
 */
async function fetchOpenAI(url, options = {}, apiKey, orgId, projectId, maxRetries = 3, timeoutMs = 8000) {
    if (!apiKey) {
        throw new Error('OpenAI API key is required');
    }
    
    // Prepare OpenAI headers
    const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v1'
    };
    
    // Add organization header if available
    if (orgId) {
        console.log(`🏢 Using OpenAI Organization ID: ${orgId}`);
        headers['OpenAI-Organization'] = orgId;
    }
    
    // Add project header if available
    if (projectId) {
        console.log(`📂 Using OpenAI Project ID: ${projectId}`);
        headers['OpenAI-Project'] = projectId;
    }
    
    // Merge with any headers provided in options
    const mergedHeaders = {
        ...headers,
        ...(options.headers || {})
    };
    
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 OpenAI API call attempt ${attempt}/${maxRetries} to ${url}`);
            
            const controller = new AbortController();
            const signal = options.signal || controller.signal;
            
            const timeoutId = setTimeout(() => {
                console.log(`⏱️ Request to ${url} timed out after ${timeoutMs}ms`);
                controller.abort();
            }, timeoutMs);
            
            const response = await fetch(url, {
                ...options,
                headers: mergedHeaders,
                signal
            });
            
            clearTimeout(timeoutId);
            console.log(`📥 Response from ${url}: Status ${response.status}`);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
                const errorMessage = errorData.error?.message || response.statusText;
                
                console.error(`❌ OpenAI API error (${response.status}): ${errorMessage}`);
                
                // Check if error is related to authentication or organization/project
                if (
                    errorMessage.includes('organization') || 
                    errorMessage.includes('project') ||
                    errorMessage.includes('authentication') ||
                    errorMessage.includes('invalid_api_key')
                ) {
                    console.error('🔐 Authentication error detected - check your API key, Organization ID, and Project ID');
                    throw new Error(`Authentication error: ${errorMessage}`);
                }
                
                // Rate limit errors - always retry with exponential backoff
                if (response.status === 429) {
                    console.warn('⚠️ Rate limit hit, will retry with backoff');
                    const backoff = Math.min(1000 * Math.pow(3, attempt - 1), 15000);
                    await new Promise(resolve => setTimeout(resolve, backoff));
                    continue;
                }
                
                throw new Error(`API error (${response.status}): ${errorMessage}`);
            }
            
            return response;
        } catch (error) {
            lastError = error;
            
            // Don't retry authentication errors
            if (error.message.includes('Authentication error:')) {
                console.error('🚫 Authentication error, not retrying');
                throw error;
            }
            
            // Determine if error is retryable
            const isTimeout = error.name === 'AbortError' || error.code === 'ETIMEDOUT' || error.message.includes('timeout');
            const isNetworkError = error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED' || error.message.includes('network');
            const isServerError = error.message.includes('500') || error.message.includes('503');
            const isRetryable = isTimeout || isNetworkError || isServerError;
            
            if (isRetryable && attempt < maxRetries) {
                const backoff = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                console.warn(`⚠️ Retryable error: ${error.message}`);
                console.log(`⏳ Backing off for ${backoff}ms before retry ${attempt + 1}/${maxRetries}`);
                await new Promise(resolve => setTimeout(resolve, backoff));
                continue;
            }
            
            // We've exhausted retries or hit a non-retryable error
            console.error(`❌ Error in OpenAI API call to ${url}: ${error.message}`);
            throw error;
        }
    }
}

/**
 * Simple diagnostic function to check OpenAI API connectivity
 * @param {string} apiKey - OpenAI API key
 * @param {string} orgId - OpenAI Organization ID
 * @param {string} projectId - OpenAI Project ID
 * @returns {Promise<Object>} - Test results
 */
async function testOpenAIConnection(apiKey, orgId, projectId) {
    console.log('🧪 Running OpenAI API connection test...');
    
    try {
        const response = await fetchOpenAI('https://api.openai.com/v1/models', {
            method: 'GET'
        }, apiKey, orgId, projectId, 1, 5000);
        
        const data = await response.json();
        const modelCount = data.data?.length || 0;
        
        console.log(`✅ Successfully connected to OpenAI API. Found ${modelCount} models.`);
        return {
            success: true,
            modelCount,
            usedOrgId: !!orgId,
            usedProjectId: !!projectId
        };
    } catch (error) {
        console.error('❌ OpenAI API connection test failed:', error.message);
        return {
            success: false,
            error: error.message,
            usedOrgId: !!orgId,
            usedProjectId: !!projectId
        };
    }
}

module.exports = {
    fetchOpenAI,
    testOpenAIConnection
}; 