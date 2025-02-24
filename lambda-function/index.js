const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const fetch = require('node-fetch');
const ssmClient = new SSMClient();

exports.handler = async (event) => {
    console.log("🔄 Received event:", event);
    
    // Get all config parameters
    const [openaiKeyParam, assistantIdParam] = await Promise.all([
        ssmClient.send(new GetParameterCommand({
            Name: '/rag-bmore/prod/secrets/OPENAI_API_KEY',
            WithDecryption: true
        })),
        ssmClient.send(new GetParameterCommand({
            Name: '/rag-bmore/prod/config/OPENAI_ASSISTANT_ID',
            WithDecryption: false
        }))
    ]);

    if (event.requestContext.http.method === 'GET') {
        // Return minimal config (no keys)
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': 'https://integraled.github.io',
                'Access-Control-Allow-Methods': 'GET, POST',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({
                openai_assistant_id: assistantIdParam.Parameter.Value
            })
        };
    } else if (event.requestContext.http.method === 'POST') {
        try {
            const body = JSON.parse(event.body);
            const userMessage = body.message;

            // Create thread
            const threadResponse = await fetch('https://api.openai.com/v1/threads', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openaiKeyParam.Parameter.Value}`,
                    'Content-Type': 'application/json',
                    'OpenAI-Beta': 'assistants=v1'
                }
            });

            if (!threadResponse.ok) {
                throw new Error(`Thread creation failed: ${threadResponse.status}`);
            }

            const threadData = await threadResponse.json();

            // Add message to thread
            await fetch(`https://api.openai.com/v1/threads/${threadData.id}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openaiKeyParam.Parameter.Value}`,
                    'Content-Type': 'application/json',
                    'OpenAI-Beta': 'assistants=v1'
                },
                body: JSON.stringify({
                    role: 'user',
                    content: userMessage
                })
            });

            // Run the assistant
            const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadData.id}/runs`, {
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

            const runData = await runResponse.json();

            // Poll for completion
            let completed = false;
            let attempts = 0;
            const maxAttempts = 30;

            while (!completed && attempts < maxAttempts) {
                const statusResponse = await fetch(`https://api.openai.com/v1/threads/${threadData.id}/runs/${runData.id}`, {
                    headers: {
                        'Authorization': `Bearer ${openaiKeyParam.Parameter.Value}`,
                        'OpenAI-Beta': 'assistants=v1'
                    }
                });

                const statusData = await statusResponse.json();
                if (statusData.status === 'completed') {
                    completed = true;
                } else if (statusData.status === 'failed') {
                    throw new Error('Assistant run failed');
                } else {
                    attempts++;
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            // Get messages
            const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadData.id}/messages`, {
                headers: {
                    'Authorization': `Bearer ${openaiKeyParam.Parameter.Value}`,
                    'OpenAI-Beta': 'assistants=v1'
                }
            });

            const messageData = await messagesResponse.json();
            const assistantMessage = messageData.data[0];

            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': 'https://integraled.github.io',
                    'Access-Control-Allow-Methods': 'GET, POST',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                body: JSON.stringify({
                    message: assistantMessage.content[0].text.value
                })
            };

        } catch (error) {
            console.error('Lambda error:', error);
            return {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': 'https://integraled.github.io',
                    'Access-Control-Allow-Methods': 'GET, POST',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                body: JSON.stringify({ error: error.message })
            };
        }
    }
}; 