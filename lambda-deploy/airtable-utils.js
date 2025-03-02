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

// Example function to create a new record with additional fields:
// User_ID, Org_ID, Action_ID, Thread_ID, status="Ignore", First_Name="klsdjfldskj test"
async function createUserRecord(baseId, tableName, userId, orgId, actionId, threadId) {
    const airtableApiKey = await getAirtableApiKey(); // or your existing key-fetch approach
    const createUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;

    const bodyData = {
        fields: {
            User_ID: userId,
            Org_ID: orgId,
            Action_ID: actionId,
            Thread_ID: threadId,
            status: "Ignore",
            First_Name: "klsdjfldskj test"
        }
    };

    const response = await fetch(createUrl, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${airtableApiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyData)
    });

    if (!response.ok) {
        throw new Error(`Failed to create record: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log("✅ Created new record (status=Ignore):", result);
    return result;
}

// Example function to patch the single-select field to add the new option "Synthetic"
// NOTE: This uses the Airtable Metadata API (still in beta). Adjust if needed.
async function addOptionToSingleSelect(baseId, tableId, fieldId) {
    // fieldId is the internal ID for your single-select field "status"
    // tableId might be something like "tblXYZ" from your schema
    const airtableApiKey = await getAirtableApiKey();

    // This is how you patch the field's options to include "Synthetic" if it's not there
    const patchUrl = `https://api.airtable.com/v0/meta/bases/${baseId}/tables/${tableId}/fields/${fieldId}`;

    const response = await fetch(patchUrl, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${airtableApiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            type: "singleSelect",
            options: {
                choices: [
                    // Include all existing choices here
                    { name: "Ignore" },
                    { name: "Testing" },
                    // Add your new option
                    { name: "Synthetic" }
                ]
            }
        })
    });

    if (!response.ok) {
        throw new Error(`Failed to add single-select option: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log("✅ Added single-select option 'Synthetic':", JSON.stringify(result, null, 2));
    return result;
}

// Example function to update a record's status to "Synthetic" and rename the user
async function updateUserRecord(baseId, tableName, recordId) {
    const airtableApiKey = await getAirtableApiKey();
    const updateUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}/${recordId}`;

    const bodyData = {
        fields: {
            status: "Synthetic",
            First_Name: "Nestor Quinton"
        }
    };

    const response = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${airtableApiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyData)
    });

    if (!response.ok) {
        throw new Error(`Failed to update record: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log("✅ Updated record to status=Synthetic and name='Nestor Quinton':", result);
    return result;
}

// Example main function that ties it all together for testing
async function testAirtableEdits() {
    try {
        // Provide your actual Base ID, Table Name, Table ID, Field ID
        const baseId = "app2mrWnzQe4IqebN";
        const tableName = "User_Table";
        const tableId = "tblvyc6ltQIO5bwlI"; 
        const fieldId = "fldXXXXXXXXXXXX";  // The field ID for the "status" single-select

        // 1) Create new row => status="Ignore", name="klsdjfldskj test", plus user/org/action/thread
        const created = await createUserRecord(
            baseId,
            tableName,
            "User123",  // example userId
            "OrgABC",   // example orgId
            "ActionXYZ",
            "Thread789"
        );
        const recordId = created.id;

        // 2) Add "Synthetic" to single-select field options (if not already present)
        await addOptionToSingleSelect(baseId, tableId, fieldId);

        // 3) Update row => status="Synthetic", name="Nestor Quinton"
        await updateUserRecord(baseId, tableName, recordId);

    } catch (error) {
        console.error("❌ Error running testAirtableEdits:", error);
    }
}

/**
 * Renames a table using the Airtable Metadata API.
 * @param {string} baseId - e.g. "app2mrWnzQe4IqebN"
 * @param {string} tableId - e.g. "tblno4T76OIfvlXTq" (the old table ID you're renaming)
 * @param {string} newName - e.g. "IE_Permissions"
 */
async function renameTable(baseId, tableId, newName) {
    const airtableApiKey = await getAirtableApiKey(); // or your existing key-fetch approach
    const patchUrl = `https://api.airtable.com/v0/meta/bases/${baseId}/tables/${tableId}`;

    const bodyData = {
        name: newName, // The new table name
    };

    const response = await fetch(patchUrl, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${airtableApiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(bodyData)
    });

    if (!response.ok) {
        throw new Error(`Failed to rename table: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`✅ Renamed table ${tableId} to '${newName}':`, result);
    return result;
}

// Example usage:
async function renamePermissionsAndRoles() {
    try {
        const baseId = "app2mrWnzQe4IqebN"; // your actual base ID
        // 1) Rename old "tblno4T76OIfvlXTq" => "IE_Permissions"
        await renameTable(baseId, "tblno4T76OIfvlXTq", "IE_Permissions");
        
        // 2) Rename old "tblhxqVkKjygDzkT1" => "IE_Roles"
        await renameTable(baseId, "tblhxqVkKjygDzkT1", "IE_Roles");
        
    } catch (error) {
        console.error("❌ Error renaming tables:", error);
    }
}

async function addSyntheticUser(baseId, tableName) {
    const airtableApiKey = await getAirtableApiKey();
    const createUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;

    const bodyData = {
        fields: {
            First_Name: "Synthetic Tester",
            Last_Name: "AutoGen",
            User_ID: "synthetic_user_001",
            role: "Public",
            status: "Active"
        }
    };

    const response = await fetch(createUrl, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${airtableApiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyData)
    });

    if (!response.ok) {
        throw new Error(`Failed to create synthetic user: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log("✅ Created synthetic user record:", result);
    return result;
}

// Example usage:
async function testAddSyntheticUser() {
    try {
        const baseId = "app2mrWnzQe4IqebN";
        const userTableName = "User_Table"; // or new name after your rename
        await addSyntheticUser(baseId, userTableName);
    } catch (error) {
        console.error("❌ Error creating synthetic user:", error);
    }
}

// Test synthetic user creation with correct table references
async function testSyntheticUser() {
    const baseId = "appqFjYLZiRlgZQDM";
    const userTable = "IE_All_Users"; // Confirm this is correct table name
    
    const syntheticUser = {
        First_Name: "Nestor",
        Last_Name: "Quinton",
        Type: "Synthetic", // Verify this matches dropdown options
        Default_Access: "Read-Only",
        Org_Type: "School" // Based on roles table structure
    };
    
    // Create test record
    return await createUserRecord(baseId, userTable, syntheticUser);
} 