const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const fetch = require('node-fetch');

const ssmClient = new SSMClient({ region: 'us-east-2' });

exports.handler = async (event) => {
    console.log("🔄 Received event:", event);
    
    // Configure AWS SDK
    AWS.config.update({
        region: 'us-east-2'
    });

    // Handle OPTIONS for CORS preflight
    if (event.requestContext.http.method === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': 'https://integraled.github.io',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({})
        };
    }

    try {
        // Get all config parameters regardless of request type
        const [urlParam, apiKeyParam, indexNameParam, openaiKeyParam, openaiOrgParam, openaiProjParam] = await Promise.all([
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

        // If GET request, return config
        if (event.requestContext.http.method === 'GET') {
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    pinecone_url: urlParam.Parameter.Value,
                    pinecone_api_key: apiKeyParam.Parameter.Value,
                    pinecone_index: indexNameParam.Parameter.Value,
                    openai_api_key: openaiKeyParam.Parameter.Value,
                    openai_org_id: openaiOrgParam.Parameter.Value,
                    openai_project_id: openaiProjParam.Parameter.Value
                })
            };
        }
        
        // If POST request, proxy to Pinecone
        if (event.requestContext.http.method === 'POST') {
            const body = JSON.parse(event.body || '{}');
            
            const pineconeResponse = await fetch(`${urlParam.Parameter.Value}/vectors/query`, {
                method: 'POST',
                headers: {
                    'Api-Key': apiKeyParam.Parameter.Value,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            
            if (!pineconeResponse.ok) {
                throw new Error(`Pinecone query failed: ${pineconeResponse.status}`);
            }
            
            const data = await pineconeResponse.json();
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            };
        }

    } catch (error) {
        console.error('❌ Lambda error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                error: 'Request failed',
                details: error.message,
                type: error.name
            })
        };
    }
}; 