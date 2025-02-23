const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const fetch = require('node-fetch');

const ssmClient = new SSMClient({ region: 'us-east-2' });

exports.handler = async (event) => {
    console.log("🔄 Received event:", event);
    
    if (event.requestContext.http.method === 'GET') {
        try {
            // Get all config parameters
            const [urlParam, apiKeyParam, indexParam, openaiKeyParam, openaiOrgParam, openaiProjectParam] = await Promise.all([
                ssmClient.send(new GetParameterCommand({
                    Name: '/rag-bmore/prod/config/pinecone_url',
                    WithDecryption: false
                })),
                ssmClient.send(new GetParameterCommand({
                    Name: '/rag-bmore/prod/secrets/PINECONE_API_KEY',
                    WithDecryption: true
                })),
                ssmClient.send(new GetParameterCommand({
                    Name: '/rag-bmore/prod/config/PINECONE_INDEX_NAME',
                    WithDecryption: false
                })),
                ssmClient.send(new GetParameterCommand({
                    Name: '/rag-bmore/prod/secrets/OPENAI_API_KEY',
                    WithDecryption: true
                })),
                ssmClient.send(new GetParameterCommand({
                    Name: '/rag-bmore/prod/config/OPENAI_ORG_ID',
                    WithDecryption: false
                })),
                ssmClient.send(new GetParameterCommand({
                    Name: '/rag-bmore/prod/config/OPENAI_PROJECT_ID',
                    WithDecryption: false
                }))
            ]);
            
            return {
                statusCode: 200,
                body: JSON.stringify({
                    pinecone_url: urlParam.Parameter.Value,
                    pinecone_api_key: apiKeyParam.Parameter.Value,
                    pinecone_index: indexParam.Parameter.Value,
                    openai_api_key: openaiKeyParam.Parameter.Value,
                    openai_org_id: openaiOrgParam.Parameter.Value,
                    openai_project_id: openaiProjectParam.Parameter.Value
                })
            };
        } catch (error) {
            console.error('Error fetching config:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Failed to fetch configuration' })
            };
        }
    } else if (event.requestContext.http.method === 'POST') {
        try {
            const body = JSON.parse(event.body);
            console.log('Processing vector query:', body.vector?.substring(0, 50));
            
            const controller = new AbortController();
            const timeout = setTimeout(() => {
                controller.abort();
                console.log('Request aborted due to timeout');
            }, 8000);
            
            const response = await fetch(pineconeEndpoint, {
                method: 'POST',
                headers: {
                    'Api-Key': apiKeyParam.Parameter.Value,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(pineconeBody),
                signal: controller.signal
            });
            
            clearTimeout(timeout);
            
            if (!response.ok) {
                throw new Error(`Pinecone request failed: ${response.status}`);
            }
            
            const data = await response.json();
            return {
                statusCode: 200,
                body: JSON.stringify(data)
            };
        } catch (error) {
            console.error('Lambda error:', error);
            return {
                statusCode: error.name === 'AbortError' ? 504 : 502,
                body: JSON.stringify({ 
                    error: error.name === 'AbortError' ? 'Request timed out' : error.message
                })
            };
        }
    }
}; 