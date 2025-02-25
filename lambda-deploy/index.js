const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const fetch = require('node-fetch');
const { AbortController } = require('node-fetch/externals');
const ssmClient = new SSMClient();
const { sendConversationToMake } = require('./make-integration');

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

exports.handler = async (event) => {
    console.log("🔄 Received event:", event);
    
    // Check if the event has a body property and parse it if it's a string
    let body;
    if (event.body) {
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (error) {
            console.error("❌ Error parsing request body:", error);
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
                },
                body: JSON.stringify({ error: 'Invalid request body' })
            };
        }
    } else {
        // If no body, check if the event itself contains the required fields
        body = event;
    }
    
    // Extract message and user info from the parsed body
    const { message, User_ID, Organization, thread_id } = body;
    
    // Validate required fields
    if (!message) {
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
            },
            body: JSON.stringify({ error: 'Message is required' })
        };
    }
    
    console.log("📝 Processing message:", { message, User_ID, Organization });
    
    try {
        // Get OpenAI parameters from SSM
        console.log("🔑 Retrieving API parameters from SSM...");
        const [openaiKeyParam, assistantIdParam] = await Promise.all([
            ssmClient.send(new GetParameterCommand({
                Name: '/rag-bmore/prod/secrets/OPENAI_API_KEY',
                WithDecryption: true
            })),
            ssmClient.send(new GetParameterCommand({
                Name: '/rag-bmore/prod/config/OPENAI_ASSISTANT_ID',
                WithDecryption: true
            }))
        ]);
        
        const openaiApiKey = openaiKeyParam.Parameter.Value;
        const assistantId = assistantIdParam.Parameter.Value;
        
        console.log("✅ Retrieved API parameters successfully");
        
        // Create or retrieve thread
        let threadId = thread_id;
        
        if (!threadId) {
            console.log("🧵 Creating new thread...");
            const threadResponse = await fetchWithRetry('https://api.openai.com/v1/threads', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openaiApiKey}`,
                    'Content-Type': 'application/json',
                    'OpenAI-Beta': 'assistants=v1'
                },
                body: JSON.stringify({
                    metadata: {
                        user_id: User_ID,
                        organization: Organization
                    }
                })
            }, 3, 10000); // 3 retries, 10 second timeout
            
            const threadData = await threadResponse.json();
            threadId = threadData.id;
            console.log("✅ Created thread:", threadId);
        } else {
            console.log("🧵 Using existing thread:", threadId);
        }
        
        // Add message to thread
        console.log("💬 Adding message to thread...");
        const messageResponse = await fetchWithRetry(`https://api.openai.com/v1/threads/${threadId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiApiKey}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'assistants=v1'
            },
            body: JSON.stringify({
                role: 'user',
                content: message
            })
        }, 3, 10000);
        
        const messageData = await messageResponse.json();
        console.log("✅ Added message:", messageData.id);
        
        // Run the assistant
        console.log("🤖 Running assistant...");
        const runResponse = await fetchWithRetry(`https://api.openai.com/v1/threads/${threadId}/runs`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiApiKey}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'assistants=v1'
            },
            body: JSON.stringify({
                assistant_id: assistantId
            })
        }, 3, 10000);
        
        const runData = await runResponse.json();
        const runId = runData.id;
        console.log("✅ Started run:", runId);
        
        // Check run status
        let runStatus = runData.status;
        let attempts = 0;
        const maxAttempts = 10;
        
        console.log("⏳ Checking run status...");
        while (runStatus !== 'completed' && runStatus !== 'failed' && attempts < maxAttempts) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const statusResponse = await fetchWithRetry(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${openaiApiKey}`,
                    'Content-Type': 'application/json',
                    'OpenAI-Beta': 'assistants=v1'
                }
            }, 3, 8000);
            
            const statusData = await statusResponse.json();
            runStatus = statusData.status;
            console.log(`⏳ Run status (attempt ${attempts}/${maxAttempts}):`, runStatus);
        }
        
        if (runStatus !== 'completed') {
            throw new Error(`Assistant run did not complete. Status: ${runStatus}`);
        }
        
        // Get messages (including assistant's response)
        console.log("📨 Retrieving messages...");
        const messagesResponse = await fetchWithRetry(`https://api.openai.com/v1/threads/${threadId}/messages`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${openaiApiKey}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'assistants=v1'
            }
        }, 3, 8000);
        
        const messagesData = await messagesResponse.json();
        console.log("✅ Retrieved messages:", messagesData.data.length);
        
        // Get the latest assistant message
        const assistantMessages = messagesData.data.filter(msg => msg.role === 'assistant');
        const latestAssistantMessage = assistantMessages[0];
        
        if (!latestAssistantMessage) {
            throw new Error('No assistant response found');
        }
        
        const assistantResponse = latestAssistantMessage.content[0].text.value;
        console.log("🤖 Assistant response:", assistantResponse.substring(0, 100) + "...");
        
        // Get Make webhook URL from environment variable or use default for testing
        const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL || 'https://hook.us1.make.com/3zs7qeg2eaz9iqudi1yooyokq14et2nb';

        // Log conversations to Make for organizational insights
        console.log("💾 Logging conversation to Make...");
        try {
            // Send the entire conversation thread to Make
            await sendConversationToMake(
                event, 
                threadId, 
                messagesData.data, 
                MAKE_WEBHOOK_URL
            );
            console.log("✅ Conversation logged successfully");
        } catch (makeError) {
            // Non-critical error - log but continue
            console.error("⚠️ Error logging conversation:", makeError);
        }
        
        // Return the response
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
            },
            body: JSON.stringify({
                message: assistantResponse,
                thread_id: threadId,
                processing: false
            })
        };
    } catch (error) {
        console.error("❌ Error:", error);
        
        // Return a more detailed error response
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
            },
            body: JSON.stringify({
                error: 'An error occurred processing your request',
                message: error.message,
                code: error.code || 'UNKNOWN_ERROR',
                type: error.type || 'UNKNOWN_TYPE',
                processing: false
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
                'OpenAI-Beta': 'assistants=v1'
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