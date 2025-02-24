const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const fetch = require('node-fetch');
const ssmClient = new SSMClient();

async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries} for ${url}`);
      return await fetch(url, options);
    } catch (error) {
      console.log(`Attempt ${attempt} failed: ${error.message}`);
      
      if (attempt < maxRetries) {
        const delay = Math.min(500 * Math.pow(2, attempt - 1), 3000);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error; // Rethrow if all retries failed
      }
    }
  }
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
            console.error("Error parsing request body:", error);
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json'
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
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Message is required' })
        };
    }
    
    console.log("📝 Processing message:", { message, User_ID, Organization });
    
    // Get OpenAI parameters from SSM
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

    // Check if this is a direct invocation or an HTTP request
    const requestMethod = getRequestMethod(event);
    const isPostRequest = requestMethod === 'POST';
    const isDirectInvocation = requestMethod === 'DIRECT' || !isHttpRequest(event);

    // Process if it's either a direct invocation or a POST request
    if (isDirectInvocation || isPostRequest) {
        try {
            // Create thread with metadata
            const threadResponse = await fetch('https://api.openai.com/v1/threads', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openaiKeyParam.Parameter.Value}`,
                    'Content-Type': 'application/json',
                    'OpenAI-Beta': 'assistants=v1'
                },
                body: JSON.stringify({
                    metadata: {
                        user_id: User_ID,
                        organization: Organization
                    }
                })
            });
            
            const thread = await threadResponse.json();
            console.log("🧵 Thread created:", thread.id);
            
            // Add message to thread
            await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openaiKeyParam.Parameter.Value}`,
                    'Content-Type': 'application/json',
                    'OpenAI-Beta': 'assistants=v1'
                },
                body: JSON.stringify({
                    role: 'user',
                    content: message
                })
            });
            
            // Run the assistant
            const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openaiKeyParam.Parameter.Value}`,
                    'Content-Type': 'application/json',
                    'OpenAI-Beta': 'assistants=v1'
                },
                body: JSON.stringify({
                    assistant_id: assistantIdParam.Parameter.Value
                })
            });
            
            const run = await runResponse.json();
            console.log("🏃 Run created:", run.id);
            
            // Set a timeout for polling
            const startTime = Date.now();
            const TIMEOUT_THRESHOLD = 8000; // 8 seconds (2s buffer for Lambda)
            
            // Poll for completion with timeout
            let status = 'queued';
            let timeoutReached = false;
            
            while (status !== 'completed' && status !== 'failed' && !timeoutReached) {
                console.log(`⏳ Run status: ${status}`);
                
                // Check if we're approaching timeout
                if (Date.now() - startTime > TIMEOUT_THRESHOLD) {
                    console.log("⚠️ Approaching Lambda timeout, returning early");
                    timeoutReached = true;
                    break;
                }
                
                // Wait 1 second between polls
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const response = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
                    headers: {
                        'Authorization': `Bearer ${openaiKeyParam.Parameter.Value}`,
                        'Content-Type': 'application/json',
                        'OpenAI-Beta': 'assistants=v1'
                    }
                });
                
                const runStatus = await response.json();
                status = runStatus.status;
            }
            
            // If we reached timeout, return a processing message
            if (timeoutReached) {
                return {
                    statusCode: 202, // Accepted but processing
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: "I'm processing your request. This might take a moment. Please try asking again in a few seconds.",
                        thread_id: thread.id,
                        processing: true
                    })
                };
            }
            
            // Get messages
            const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
                headers: {
                    'Authorization': `Bearer ${openaiKeyParam.Parameter.Value}`,
                    'Content-Type': 'application/json',
                    'OpenAI-Beta': 'assistants=v1'
                }
            });
            
            const messages = await messagesResponse.json();
            const assistantMessage = messages.data.find(m => m.role === 'assistant');
            
            console.log("💬 Assistant response:", assistantMessage.content[0].text.value.substring(0, 50) + "...");
            
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: assistantMessage.content[0].text.value,
                    thread_id: thread.id
                })
            };
        } catch (error) {
            console.error("❌ Error:", error);
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    error: 'An error occurred processing your request',
                    details: error.message
                })
            };
        }
    }
    
    // Return 405 Method Not Allowed for non-POST requests
    return {
        statusCode: 405,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Method not allowed' })
    };
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