const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const fetch = require('node-fetch');
const ssmClient = new SSMClient();

exports.handler = async (event) => {
    console.log("🔄 Received event:", event);
    
    // Get only the OpenAI parameters we need
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

            // Process with OpenAI Assistant
            // ... rest of the OpenAI Assistant code stays the same ...
        } catch (error) {
            console.error('Lambda error:', error);
            return {
                statusCode: error.name === 'AbortError' ? 504 : 502,
                body: JSON.stringify({ error: error.message })
            };
        }
    }
}; 