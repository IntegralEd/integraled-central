const config = {
    // Client-specific settings
    client: {
        name: 'bmore-maternal',
        softrDomain: 'bmore.softr.app',
        githubPages: 'integraled.github.io/rag-bmore-app',
        assistant: {
            id: process.env.OPENAI_ASSISTANT_ID,
            model: 'gpt-4-turbo',
            instructions: './prompts/maternal-health.md'
        }
    },
    
    // Reusable core settings
    core: {
        aws: {
            region: 'us-east-2',
            parameterPath: '/rag-bmore/prod',
            parameterFormat: {
                secrets: {
                    openai: '/secrets/OpenAI_Key_{AGENT_ID}',
                    airtable: '/secrets/Airtable_Token_{AGENT_ID}',
                    make: '/secrets/Make_Webhook_{AGENT_ID}'
                },
                config: {
                    assistant: '/config/Assistant_ID_{AGENT_ID}',
                    organization: '/config/Organization_ID_{AGENT_ID}',
                    project: '/config/Project_ID_{AGENT_ID}'
                }
            }
        },
        cors: {
            allowedOrigins: [] // Populated from client config
        }
    }
};

module.exports = config;
