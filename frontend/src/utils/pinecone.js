import { getConfig } from './config';

export const queryPinecone = async (query, userNamespace) => {
  try {
    const config = await getConfig();
    const pineconeUrl = `${config.pinecone_url.trim()}/query`;
    console.log('Querying Pinecone at:', pineconeUrl);
    
    // Query both ns1 (default) and user namespaces
    const [defaultResults, userResults] = await Promise.all([
      // Query ns1 namespace (default knowledge base)
      fetch(pineconeUrl, {
        method: 'POST',
        headers: {
          'Api-Key': config.PINECONE_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          namespace: 'ns1',
          query: {
            inputs: { text: query },
            top_k: 3
          },
          fields: ["source_text", "category"]
        })
      }).then(res => res.json()),
      
      // Query user namespace for personal context
      fetch(pineconeUrl, {
        method: 'POST',
        headers: {
          'Api-Key': config.PINECONE_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          namespace: userNamespace,
          query: {
            inputs: { text: query },
            top_k: 2
          },
          fields: ["source_text", "category"]
        })
      }).then(res => res.json()).catch(() => ({ result: { hits: [] } }))
    ]);

    console.log('Default (ns1) results:', defaultResults);
    console.log('User namespace results:', userResults);

    // Format matches from both results
    const allMatches = [
      ...(defaultResults.result?.hits || []).map(hit => ({
        id: hit._id,
        score: hit._score,
        metadata: {
          text: hit.fields.source_text,
          category: hit.fields.category
        }
      })),
      ...(userResults.result?.hits || []).map(hit => ({
        id: hit._id,
        score: hit._score,
        metadata: {
          text: hit.fields.source_text,
          category: hit.fields.category
        }
      }))
    ];

    return {
      matches: allMatches,
      namespaces: {
        default: defaultResults.result?.hits?.length || 0,
        user: userResults.result?.hits?.length || 0
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