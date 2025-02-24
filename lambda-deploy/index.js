const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const fetch = require('node-fetch');
const ssmClient = new SSMClient();

exports.handler = async (event) => {
    console.log("🔄 Received event:", event);
    
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

    // Handle request
    if (event.requestContext.http.method === 'POST') {
        try {
            const body = JSON.parse(event.body);
            const { message, User_ID, Organization } = body;  // Match AirTable fields

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

            // ... rest of OpenAI Assistant code ...

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: assistantMessage.content[0].text.value
                })
            };
        } catch (error) {
            console.error('Error:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ 
                    error: 'Failed to process message' 
                })
            };
        }
    }

    // Invalid method
    return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' })
    };
}; 