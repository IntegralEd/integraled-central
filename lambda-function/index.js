const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const fetch = require('node-fetch');
const ssmClient = new SSMClient();

exports.handler = async (event) => {
    console.log("🔄 Received event:", event);
    
    // Get all config parameters at the start
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

    if (event.requestContext.http.method === 'GET') {
        try {
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
            
            const pineconeEndpoint = `${urlParam.Parameter.Value}/query`;
            const pineconeBody = {
                namespace: body.namespace,
                topK: body.topK || 3,
                includeMetadata: body.includeMetadata || true,
                vector: body.vector
            };

            const response = await fetch(pineconeEndpoint, {
                method: 'POST',
                headers: {
                    'Api-Key': apiKeyParam.Parameter.Value,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(pineconeBody)
            });
            
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
                body: JSON.stringify({ error: error.message })
            };
        }
    }
}; 