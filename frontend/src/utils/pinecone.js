import { getConfig } from './config';

export const queryPinecone = async (vector, namespace = 'ns1') => {
    try {
        const response = await fetch('https://lfx6tvyrslqyrpmhphy3bkbrza0clbxv.lambda-url.us-east-2.on.aws/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            mode: 'cors',
            body: JSON.stringify({
                namespace: namespace,
                topK: 3,
                includeMetadata: true,
                vector: vector
            })
        });

        if (!response.ok) {
            throw new Error(`Pinecone query failed: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('🚨 Pinecone query failed:', error);
        throw error;
    }
};

// New function to store chat in user namespace
export const storeChatInPinecone = async (message, vector, userNamespace) => {
    try {
        const response = await fetch('https://lfx6tvyrslqyrpmhphy3bkbrza0clbxv.lambda-url.us-east-2.on.aws/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            mode: 'cors',
            body: JSON.stringify({
                action: 'upsert',
                namespace: userNamespace,
                vector: vector,
                message: message
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to store chat: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to store chat:', error);
        throw error;
    }
}; 