const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const fetch = require('node-fetch');
const { AbortController } = global;
const ssmClient = new SSMClient({ region: "us-east-2" });
const { addMessageToThread, verifyThreadExists } = require('./modules/thread-manager');
const { getTableSchema } = require('./airtable-utils');
const { streamResponse } = require('./modules/streaming');
const { createActionButton } = require('./modules/actions');
const { MessageFormatter } = require('./modules/formatter');
const { sendToMake } = require('./make-integration');
const config = require('./config');
const { getAgentParameters, fetchOpenAI } = require('./api-client');

async function fetchWithTimeout(url, options, timeoutMs = 8000) {
    console.log(`🔄 Starting request to ${url} with ${timeoutMs}ms timeout`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        console.log(`⏱️ Request to ${url} timed out after ${timeoutMs}ms`);
        controller.abort();
    }, timeoutMs);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        console.log(`✅ Response received from ${url}: ${response.status}`);
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
            console.error(`⏱️ Request to ${url} aborted due to timeout`);
            throw new Error(`Request timeout after ${timeoutMs}ms`);
        }
        
        console.error(`❌ Error fetching ${url}:`, error.message);
        throw error;
    }
}

async function fetchWithRetry(url, options, maxRetries = 3, timeoutMs = 8000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 Attempt ${attempt}/${maxRetries} for ${url}`);
            return await fetchWithTimeout(url, options, timeoutMs);
        } catch (error) {
            lastError = error;
            console.error(`❌ Attempt ${attempt} failed:`, error.message);
            
            if (attempt < maxRetries) {
                const delay = Math.min(500 * Math.pow(2, attempt - 1), 3000);
                console.log(`⏳ Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    console.error(`❌ All ${maxRetries} attempts failed for ${url}`);
    throw lastError;
}

function isHttpRequest(event) {
    return event.requestContext && event.requestContext.http;
}

function getRequestMethod(event) {
    return isHttpRequest(event) ? event.requestContext.http.method : 'DIRECT';
}

function getRequestOrigin(event) {
    return isHttpRequest(event) ? (event.headers?.origin || 'unknown') : 'direct-invocation';
}

// When making API calls to OpenAI, add the Project header
async function fetchOpenAI(url, options = {}, apiKey, orgId, projectId) {
    // Prepare OpenAI headers
    const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
    };
    
    // Add organization header if available
    if (orgId) {
        console.log(`🏢 Using OpenAI Organization ID: ${orgId}`);
        headers['OpenAI-Organization'] = orgId;
    }
    
    // Add project header if available - CRITICAL FOR PROJECT API KEYS
    if (projectId) {
        console.log(`📂 Using OpenAI Project ID: ${projectId}`);
        headers['OpenAI-Project'] = projectId;
    }
    
    // ... rest of function
}

async function verifyThreadExists(threadId, openaiApiKey) {
    if (!threadId) return false;
    
    try {
        console.log(`🔍 Verifying thread: ${threadId}`);
        const response = await fetch(`https://api.openai.com/v1/threads/${threadId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${openaiApiKey}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'assistants=v2'
            }
        });
        
        // Return true if thread exists, false otherwise
        return response.ok;
    } catch (error) {
        console.warn(`⚠️ Thread verification failed: ${error.message}`);
        return false;
    }
}

// CORS Headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

async function handleHandshake(event) {
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
            status: 'ok',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            protocol: {
                required_fields: {
                    body: ['message', 'Assistant_ID']
                },
                optional_fields: {
                    body: ['User_ID', 'Thread_ID']
                },
                capabilities: ['chat', 'threads', 'streaming']
            }
        })
    };
}

exports.handler = async (event, context) => {
    console.log("🔄 Received event:", event);

    // Handle OPTIONS request for CORS
    if (event.requestContext?.http?.method === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    // Route to appropriate handler
    if (event.path === '/handshake') {
        return handleHandshake(event);
    }

    // Parse request body
    const body = event.body ? JSON.parse(event.body) : {};
    const { message, Assistant_ID, User_ID, Thread_ID } = body;

    if (!message || !Assistant_ID) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: "Missing required fields",
                required: ["message", "Assistant_ID"]
            })
        };
    }

    try {
        // Get OpenAI key from SSM (single key for all requests)
        console.log('🔑 Retrieving OpenAI key...');
        const openaiKey = await getOpenAIKey();
        
        if (!openaiKey) {
            throw new Error('OpenAI key not found in SSM');
        }
        
        console.log("✅ Retrieved OpenAI key successfully");
        
        // Use provided thread_id or create new one
        let effectiveThreadId = Thread_ID;
        
        if (effectiveThreadId) {
            const isValid = await verifyThreadExists(effectiveThreadId, openaiKey);
            if (!isValid) {
                console.log("⚠️ Provided thread ID is invalid, creating new thread");
                effectiveThreadId = null;
            } else {
                console.log("🧵 Using existing thread:", effectiveThreadId);
            }
        }
        
        // Add message to thread using Assistant_ID from request
        const response = await addMessageToThread({
            message,
            threadId: effectiveThreadId,
            apiKey: openaiKey,
            assistantId: Assistant_ID,
            metadata: {
                user_id: User_ID
            }
        });

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(response)
        };
    } catch (error) {
        console.error("❌ Error processing request:", error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: "Internal server error",
                message: error.message
            })
        };
    }
};

// Helper function to poll run status
async function checkRunStatus(apiKey, threadId, runId) {
    let status = 'queued';
    
    while (status !== 'completed' && status !== 'failed') {
        console.log(`⏳ Run status: ${status}`);
        
        // Wait 1 second between polls
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'assistants=v2'
            }
        });
        
        const run = await response.json();
        status = run.status;
        
        // If we're taking too long, return what we have
        if (['queued', 'in_progress'].includes(status) && 
            (Date.now() - new Date(run.created_at).getTime() > 25000)) {
            console.log("⚠️ Run taking too long, returning early");
            return run;
        }
    }
    
    return status;
}

// Add a new endpoint for checking thread status
if (event.rawPath === '/thread-status') {
    const { thread_id } = event.body ? JSON.parse(event.body) : {};
    
    if (!thread_id) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Thread ID is required" })
        };
    }
    
    try {
        const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread_id}/runs`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${openaiApiKey}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'assistants=v2'
            }
        });
        
        const statusData = await statusResponse.json();
        const activeRuns = statusData.data.filter(run => 
            ['queued', 'in_progress'].includes(run.status)
        );
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                thread_exists: true,
                active_runs: activeRuns.length > 0,
                can_add_message: activeRuns.length === 0
            })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
}

// New endpoint for generating a URL based on the provided conditions
if (event.rawPath === '/generate-url') {
    const { User_ID, Latest_Chat_Thread_ID, Intake_Tags_Txt } = event.body ? JSON.parse(event.body) : {};
    
    if (!User_ID) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "User_ID is required" })
        };
    
    try {
        const url = IF(
            AND(User_ID, Latest_Chat_Thread_ID),
            // Both User_ID and Thread_ID exist - full chat URL
            CONCATENATE(
                "https://integraled.github.io/rag-bmore/?",
                "User_ID=", User_ID,
                "&Organization=", ENCODE_URL_COMPONENT("IntegralEd"),
                "&thread_id=", Latest_Chat_Thread_ID,
                IF(
                    Intake_Tags_Txt,
                    "&tags=" & ENCODE_URL_COMPONENT(Intake_Tags_Txt),
                    ""
                )
            ),
            IF(
                User_ID,
                // Only User_ID exists - new chat URL
                CONCATENATE(
                    "https://integraled.github.io/rag-bmore/?",
                    "User_ID=", User_ID,
                    "&Organization=", ENCODE_URL_COMPONENT("IntegralEd"),
                    IF(
                        Intake_Tags_Txt,
                        "&tags=" & ENCODE_URL_COMPONENT(Intake_Tags_Txt),
                        ""
                    )
                ),
                // No User_ID - return empty or error message
                "User ID required for chat access"
            )
        );
        
        return {
            statusCode: 200,
            body: JSON.stringify({ url })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
}

// Example responses for different scenarios
const responses = {
    newAgentSession: {
        status: "220",
        payload: {
            agent_id: "bmore_health",
            session_id: "sess_123"
        }
    },
    
    continueThread: {
        status: "230",
        payload: {
            thread_id: "thread_456",
            context: "Previous discussion about prenatal care"
        }
    },
    
    triggerAction: {
        status: "300",
        payload: {
            action: "switch_agent",
            params: {
                target_agent: "integral_math",
                reason: "Math question detected"
            }
        }
    }
};