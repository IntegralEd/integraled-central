async function getTableSchema() {
    try {
        // Get the Airtable API key from SSM
        const ssmClient = new SSMClient({ region: "us-east-2" });
        const airtableKeyParam = await ssmClient.send(new GetParameterCommand({
            Name: '/rag-bmore/prod/secrets/Bmore_AirTable_Token',
            WithDecryption: true
        }));
        
        const airtableApiKey = airtableKeyParam.Parameter.Value;
        const baseId = 'app2mrWnzQe4IqebN';
        const tableId = 'tblvyc6ltQIO5bwlI';

        const response = await fetch(
            `https://api.airtable.com/v0/meta/bases/${baseId}/tables`,
            {
                headers: {
                    'Authorization': `Bearer ${airtableApiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Airtable API error: ${response.status}`);
        }

        const schema = await response.json();
        console.log('Table Schema:', JSON.stringify(schema, null, 2));
        return schema;
    } catch (error) {
        console.error('Failed to fetch table schema:', error);
        throw error;
    }
} 