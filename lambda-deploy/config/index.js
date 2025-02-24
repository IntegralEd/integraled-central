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
            parameterPath: '/rag-bmore/prod'
        },
        cors: {
            allowedOrigins: [] // Populated from client config
        }
    }
};

module.exports = config;
