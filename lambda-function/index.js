const AWS = require('aws-sdk');

exports.handler = async (event) => {
    console.log("🔄 Received event:", event);
    
    // Handle OPTIONS preflight request
    if (event.requestContext.http.method === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': 'https://integraled.github.io',
                'Access-Control-Allow-Methods': 'GET',
                'Access-Control-Allow-Headers': 'Content-Type,Accept'
            },
            body: ''
        };
    }
    
    // Configure AWS SDK
    AWS.config.update({
        region: 'us-east-2'
    });

    try {
        const ssm = new AWS.SSM();
        const [urlParam, apiKeyParam, indexNameParam] = await Promise.all([
            ssm.getParameter({
                Name: '/rag-bmore/prod/config/pinecone_url',
                WithDecryption: false
            }).promise(),
            ssm.getParameter({
                Name: '/rag-bmore/prod/secrets/PINECONE_API_KEY',
                WithDecryption: true
            }).promise(),
            ssm.getParameter({
                Name: '/rag-bmore/prod/config/pinecone_index',
                WithDecryption: false
            }).promise()
        ]);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': 'https://integraled.github.io'
            },
            body: JSON.stringify({
                pinecone_url: urlParam.Parameter.Value,
                pinecone_api_key: apiKeyParam.Parameter.Value,
                pinecone_index: indexNameParam.Parameter.Value
            })
        };
    } catch (error) {
        console.error('❌ Lambda error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                error: 'Failed to fetch configuration',
                details: error.message,
                type: error.name
            })
        };
    }
}; 