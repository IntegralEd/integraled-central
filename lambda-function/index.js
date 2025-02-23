const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const fetch = require('node-fetch');

const ssmClient = new SSMClient({ region: 'us-east-2' });

exports.handler = async (event) => {
    console.log("🔄 Received event:", event);
    
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
        // Get all config parameters
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

        // Handle GET request for config
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

        // Handle POST request for Pinecone operations
        if (event.requestContext.http.method === 'POST') {
            try {
                const body = JSON.parse(event.body);
                const action = body.action || 'query';
                
                let pineconeEndpoint;
                let pineconeBody;
                
                if (action === 'query') {
                    pineconeEndpoint = `${urlParam.Parameter.Value}/vectors/query`;
                    pineconeBody = {
                        namespace: body.namespace,
                        topK: body.topK || 3,
                        includeMetadata: body.includeMetadata || true,
                        vector: body.vector
                    };
                } else if (action === 'upsert') {
                    pineconeEndpoint = `${urlParam.Parameter.Value}/vectors/upsert`;
                    pineconeBody = {
                        namespace: body.namespace,
                        vectors: [{
                            id: `chat-${Date.now()}`,
                            values: body.vector,
                            metadata: {
                                text: body.message,
                                timestamp: new Date().toISOString(),
                                type: 'chat_history'
                            }
                        }]
                    };
                }

                // Add timeout to fetch
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 8000);
                
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
                    throw new Error(`Pinecone ${action} failed: ${response.status}`);
                }

                const data = await response.json();
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': 'https://integraled.github.io',
                        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type'
                    },
                    body: JSON.stringify(data)
                };
            } catch (error) {
                console.error('Lambda error:', error);
                return {
                    statusCode: error.name === 'AbortError' ? 504 : 502,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': 'https://integraled.github.io',
                        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type'
                    },
                    body: JSON.stringify({ 
                        error: error.name === 'AbortError' 
                            ? 'Request timed out' 
                            : 'Internal server error'
                    })
                };
            }
        }

        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Invalid request method' })
        };

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