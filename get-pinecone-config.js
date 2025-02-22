exports.handler = async (event) => {
    try {
        const ssm = new AWS.SSM();
        const [urlParam, apiKeyParam] = await Promise.all([
            ssm.getParameter({
                Name: '/rag-bmore/prod/config/pinecone_url',
                WithDecryption: false
            }).promise(),
            ssm.getParameter({
                Name: '/rag-bmore/prod/secrets/PINECONE_API_KEY',
                WithDecryption: true
            }).promise()
        ]);

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "https://app.softr.io", // Your Softr domain
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: JSON.stringify({
                pinecone_url: urlParam.Parameter.Value,
                pinecone_api_key: apiKeyParam.Parameter.Value
            })
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch configuration' })
        };
    }
}; 