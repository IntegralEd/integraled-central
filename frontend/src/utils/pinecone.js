import { getConfig } from './config';

export const queryPinecone = async (query, namespace) => {
  try {
    // Get config first
    const config = await getConfig();
    
    // Fix URL formatting and add query endpoint
    const pineconeUrl = `${config.pinecone_url.trim()}/query`;
    
    const response = await fetch(pineconeUrl, {
      method: 'POST',
      headers: {
        'Api-Key': config.PINECONE_API_KEY,
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        namespace: namespace,
        topK: 3,
        includeMetadata: true,
        vector: query,
        includeValues: false
      })
    });

    if (!response.ok) {
      throw new Error(`Pinecone API error: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Pinecone query error:', error);
    throw error;
  }
}; 