const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const fetch = require('node-fetch');
const ssmClient = new SSMClient();

exports.handler = async (event) => {
    console.log("🔄 Received event:", event);
    
    // Get OpenAI parameters
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

    // Handle CORS preflight
    if (event.requestContext.http.method === 'OPTIONS') {
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
            const userMessage = body.message;  // Expect message, not vector

            // Create thread
            const threadResponse = await fetch('https://api.openai.com/v1/threads', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openaiKeyParam.Parameter.Value}`,
                    'Content-Type': 'application/json',
                    'OpenAI-Beta': 'assistants=v1'
                }
            });

            // ... rest of OpenAI Assistant code ...
        } catch (error) {
            console.error('Error:', error);
            return {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': 'https://integraled.github.io'
                },
                body: JSON.stringify({ 
                    error: 'Failed to process message' 
                })
            };
        }
    }
}; 