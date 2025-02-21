import { getConfig } from './config';

export const queryPinecone = async (query, userNamespace) => {
  try {
    const config = await getConfig();
    const pineconeUrl = `${config.pinecone_url.trim()}/query`;
    
    // First try default namespace
    let response = await fetch(pineconeUrl, {
      method: 'POST',
      headers: {
        'Api-Key': config.PINECONE_API_KEY,
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        namespace: 'default',
        topK: 3,
        includeMetadata: true,
        vector: query,
        includeValues: false
      })
    });

    let results = await response.json();
    
    // If no results in default, try user namespace
    if (!results.matches || results.matches.length === 0) {
      console.log('No results in default namespace, trying user namespace:', userNamespace);
      
      response = await fetch(pineconeUrl, {
        method: 'POST',
        headers: {
          'Api-Key': config.PINECONE_API_KEY,
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          namespace: userNamespace,
          topK: 3,
          includeMetadata: true,
          vector: query,
          includeValues: false
        })
      });
      
      results = await response.json();
      
      // If still no results, we might need to create the namespace
      // This will happen naturally when the first chat is stored
      if (!results.matches || results.matches.length === 0) {
        console.log('No results in user namespace either. Namespace will be created with first chat.');
      }
    }

    return results;
  } catch (error) {
    console.error('Pinecone query error:', error);
    throw error;
  }
};

// New function to store chat in user namespace
export const storeChatInPinecone = async (message, vector, userNamespace) => {
  try {
    const config = await getConfig();
    const pineconeUrl = `${config.pinecone_url.trim()}/vectors/upsert`;
    
    const response = await fetch(pineconeUrl, {
      method: 'POST',
      headers: {
        'Api-Key': config.PINECONE_API_KEY,
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        namespace: userNamespace,
        vectors: [{
          id: `chat-${Date.now()}`,
          values: vector,
          metadata: {
            text: message,
            timestamp: new Date().toISOString()
          }
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to store chat: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Failed to store chat:', error);
    throw error;
  }
}; 