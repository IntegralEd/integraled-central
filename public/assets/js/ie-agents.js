// IntegralEd Agent Configuration
window.ieAgents = {
    // Central Agents
    central: {
        businessAnalyst: {
            id: "asst_XWfZuilYGeD8Y4SiHMZ9mY",
            name: "Business Analyst",
            icon: "/assets/icons/business-analyst.png",
            role: "testing_feedback",
            isHelper: true
        },
        supportAgent: {
            id: "asst_support", // Replace with actual ID
            name: "Support Agent",
            icon: "/assets/icons/support-agent.png",
            role: "tech_support"
        }
    },

    // Local Agents (Baltimore)
    bmore: {
        maternalHealth: {
            id: "asst_bmore_mh", // Replace with actual ID
            name: "Baltimore Health Guide",
            icon: "/assets/icons/bmore/health-guide.png",
            role: "rag_chat",
            context: {
                location: "Baltimore",
                domain: "maternal_health"
            }
        }
    },

    // Agent Management
    activeAgents: new Set(),
    
    init(tenant = null) {
        // Load tenant-specific configuration
        if (tenant) {
            this.loadTenantConfig(tenant);
        }
        
        // Initialize helper agents in preview mode
        if (window.location.href.includes('preview')) {
            this.enableHelperAgents();
        }
    },

    async loadTenantConfig(tenant) {
        try {
            const response = await fetch(`/assets/config/${tenant}-agents.json`);
            if (response.ok) {
                const config = await response.json();
                this[tenant] = { ...this[tenant], ...config };
            }
        } catch (error) {
            console.error(`Failed to load tenant config for ${tenant}:`, error);
        }
    },

    enableHelperAgents() {
        Object.values(this.central)
            .filter(agent => agent.isHelper)
            .forEach(agent => this.activeAgents.add(agent.id));
    },

    getAgentById(id) {
        // Search all agent collections
        for (const collection of [this.central, ...Object.values(this)]) {
            const agent = Object.values(collection)
                .find(a => a.id === id);
            if (agent) return agent;
        }
        return null;
    },

    getActiveAgents() {
        return Array.from(this.activeAgents)
            .map(id => this.getAgentById(id))
            .filter(Boolean);
    },

    activateAgent(id) {
        const agent = this.getAgentById(id);
        if (agent) {
            this.activeAgents.add(id);
            this.notifyAgentChange(agent, 'activated');
        }
    },

    deactivateAgent(id) {
        if (this.activeAgents.delete(id)) {
            const agent = this.getAgentById(id);
            if (agent) {
                this.notifyAgentChange(agent, 'deactivated');
            }
        }
    },

    notifyAgentChange(agent, action) {
        window.dispatchEvent(new CustomEvent('ieAgentChange', {
            detail: { agent, action }
        }));
    },

    // Helper method to get agent context
    getAgentContext(id) {
        const agent = this.getAgentById(id);
        return agent ? {
            agent_id: agent.id,
            type: agent.role,
            context: agent.context || {}
        } : null;
    }
};

// Initialize with current tenant if available
const tenantMatch = window.location.pathname.match(/^\/([^/]+)/);
if (tenantMatch && window.ieAgents[tenantMatch[1]]) {
    window.ieAgents.init(tenantMatch[1]);
} else {
    window.ieAgents.init();
} 