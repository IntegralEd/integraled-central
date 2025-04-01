const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const fetch = require('node-fetch');
const { AbortController } = global;
const ssmClient = new SSMClient({ region: "us-east-2" });
const { addMessageToThread, verifyThreadExists } = require('./modules/thread-manager');
const { getTableSchema } = require('./airtable-utils');
const { streamResponse, fetchWithTimeout, fetchWithRetry } = require('./modules/streaming');
const { createActionButton } = require('./modules/actions');
const { MessageFormatter, formatResponse, formatError } = require('./modules/formatter');
const { sendToMake } = require('./make-integration');
const config = require('./config');
const { getAgentParameters } = require('./api-client');
const { v4: uuidv4 } = require('uuid');

function isHttpRequest(event) {
    return event.requestContext && event.requestContext.http;
}

function getRequestMethod(event) {
    return isHttpRequest(event) ? event.requestContext.http.method : 'DIRECT';
}

function getRequestOrigin(event) {
    return isHttpRequest(event) ? (event.headers?.origin || 'unknown') : 'direct-invocation';
}

// CORS Headers
const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://bmore.softr.app',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400', // 24 hours
    'Content-Type': 'application/json'
};

async function handleOptions(event) {
    // Log the preflight request
    console.log('Preflight Request:', {
        method: getRequestMethod(event),
        headers: event.headers
    });

    return {
        statusCode: 200,
        headers: {
            ...corsHeaders,
            'Access-Control-Allow-Origin': event.headers?.origin || corsHeaders['Access-Control-Allow-Origin']
        },
        body: ''
    };
}

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

async function handleChat(event) {
    try {
        const body = JSON.parse(event.body);
        const { message, Assistant_ID, User_ID, Thread_ID } = body;

        if (!message || !Assistant_ID) {
            return formatError(400, 'Missing required fields: message and Assistant_ID');
        }

        // Get OpenAI key from SSM
        const { openai_key } = await getAgentParameters();

        // Add message to thread
        const messageResponse = await fetchWithRetry('https://api.openai.com/v1/threads/messages', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openai_key}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'assistants=v1'
            },
            body: JSON.stringify({
                thread_id: Thread_ID,
                role: 'user',
                content: message
            })
        });

        if (!messageResponse.ok) {
            throw new Error(`Failed to add message: ${messageResponse.statusText}`);
        }

        // Use provided thread_id or create new one
        let effectiveThreadId = Thread_ID;
        
        if (effectiveThreadId) {
            const isValid = await verifyThreadExists(effectiveThreadId, openai_key);
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
            apiKey: openai_key,
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
}

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

async function handleThreadStatus(event) {
    const { thread_id } = event.body ? JSON.parse(event.body) : {};
    
    if (!thread_id) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Thread ID is required" })
        };
    }
    
    try {
        const { openai_key } = await getAgentParameters();
        const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread_id}/runs`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${openai_key}`,
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
            headers: corsHeaders,
            body: JSON.stringify({
                thread_exists: true,
                active_runs: activeRuns.length,
                status: activeRuns[0]?.status || 'completed'
            })
        };
    } catch (error) {
        console.error("❌ Error checking thread status:", error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: "Internal server error",
                message: error.message
            })
        };
    }
}

async function handleGenerateUrl(event) {
    const { User_ID, Latest_Chat_Thread_ID, Intake_Tags_Txt } = event.body ? JSON.parse(event.body) : {};
    
    if (!User_ID) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: "User_ID is required" })
        };
    }
    
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
            headers: corsHeaders,
            body: JSON.stringify({ url })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: corsHeaders,
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

exports.handler = async (event) => {
    console.log('Lambda Request:', {
        method: getRequestMethod(event),
        headers: event.headers,
        body: event.body
    });

    try {
        // Handle OPTIONS requests first
        if (getRequestMethod(event) === 'OPTIONS') {
            return handleOptions(event);
        }

        // Handle other requests
        const method = getRequestMethod(event);
        switch (method) {
            case 'GET':
                return handleHandshake(event);
            case 'POST':
                // Check if this is a thread status request
                if (event.rawPath === '/thread-status') {
                    return handleThreadStatus(event);
                }
                // Check if this is a generate-url request
                if (event.rawPath === '/generate-url') {
                    return handleGenerateUrl(event);
                }
                return handleChat(event);
            default:
                return {
                    statusCode: 405,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'Method not allowed' })
                };
        }
    } catch (error) {
        console.error('Lambda Error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};