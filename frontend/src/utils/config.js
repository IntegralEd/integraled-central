// AWS Parameter Store configuration
export const getConfig = async () => {
  try {
    // AWS Parameter Store ARNs
    const parameterPaths = {
      pinecone_url: '/rag-bmore/prod/config/pinecone_url',
      PINECONE_API_KEY: '/rag-bmore/prod/secrets/PINECONE_API_KEY'
    };

    // Fetch from AWS Parameter Store
    const response = await fetch('/api/aws/parameters', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ paths: Object.values(parameterPaths) })
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch config from AWS Parameter Store');
    }

    const parameters = await response.json();
    return {
      pinecone_url: parameters[parameterPaths.pinecone_url],
      PINECONE_API_KEY: parameters[parameterPaths.PINECONE_API_KEY]
    };
  } catch (error) {
    console.error('Failed to get config:', error);
    throw error;
  }
}; 