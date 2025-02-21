import { getConfig } from './config';

export const queryPinecone = async (query, userNamespace) => {
  try {
    const config = await getConfig();
    const pineconeUrl = `${config.pinecone_url.trim()}/query`;
    
    // Query both default and user namespaces
    const [defaultResults, userResults] = await Promise.all([
      // Query default namespace
      fetch(pineconeUrl, {
        method: 'POST',
        headers: {
          'Api-Key': config.PINECONE_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          namespace: 'default',
          topK: 3,
          includeMetadata: true,
          vector: query,
        })
      }).then(res => res.json()),
      
      // Query user namespace
      fetch(pineconeUrl, {
        method: 'POST',
        headers: {
          'Api-Key': config.PINECONE_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          namespace: userNamespace,
          topK: 2,  // Fewer results from personal namespace
          includeMetadata: true,
          vector: query,
        })
      }).then(res => res.json()).catch(() => ({ matches: [] })) // Gracefully handle missing namespace
    ]);

    // Combine and deduplicate results
    const allMatches = [
      ...(defaultResults.matches || []),
      ...(userResults.matches || [])
    ];

    return {
      matches: allMatches,
      namespaces: {
        default: defaultResults.matches?.length || 0,
        user: userResults.matches?.length || 0
      }
    };

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
    
    // Store only in user namespace
    const response = await fetch(pineconeUrl, {
      method: 'POST',
      headers: {
        'Api-Key': config.PINECONE_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        namespace: userNamespace,
        vectors: [{
          id: `chat-${Date.now()}`,
          values: vector,
          metadata: {
            text: message,
            timestamp: new Date().toISOString(),
            type: 'chat_history'
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