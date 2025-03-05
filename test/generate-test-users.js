/**
 * Test User Generator for B'more Health Support
 * Demonstrates context evolution through interaction logs
 */

const { logChatInteraction } = require('../lambda-deploy/make-integration');

// Fixed context definitions (immutable after intake)
const FIXED_CONTEXTS = {
    Context_01: {
        name: "Role",
        description: "Primary user role - locked at intake",
        values: ["student", "parent", "educator", "researcher", "practitioner"]
    },
    Context_02: {
        name: "Organization",
        description: "Primary institutional affiliation",
        values: ["school", "healthcare", "community", "university"]
    },
    Context_03: {
        name: "Access_Level",
        description: "Base permission level",
        values: ["standard", "premium", "research", "admin"]
    }
};

// Evolving context definitions (updated via interaction log)
const EVOLVING_CONTEXTS = {
    Context_04: {
        name: "Interest_Areas",
        description: "Current areas of focus - updated by interaction patterns",
        initial_source: "intake_form.interests",
        update_triggers: ["search_patterns", "content_engagement", "explicit_updates"]
    },
    Context_05: {
        name: "Learning_Stage",
        description: "Progress in learning journey - evolves with interactions",
        initial_source: "intake_form.background",
        update_triggers: ["completion_events", "assessment_results", "time_based"]
    },
    Context_06: {
        name: "Resource_Preferences",
        description: "Preferred content types and formats",
        initial_source: "intake_form.preferences",
        update_triggers: ["engagement_metrics", "explicit_feedback", "usage_patterns"]
    }
};

// Sample intake form fields that seed initial contexts
const INTAKE_FIELDS = {
    required: {
        First_Name: "Mapped to Softr user profile",
        Email: "Mapped to Softr user profile",
        Role: "Maps to Context_01",
        Organization_Type: "Maps to Context_02"
    },
    optional: {
        Background: "Free text for initial Context_05",
        Interests: "Multi-select for initial Context_04",
        Preferences: "Multi-select for initial Context_06"
    }
};

// Test interaction sequence showing context evolution
const TEST_INTERACTION_SEQUENCE = [
    {
        scenario: "Initial Intake",
        profile: {
            // Fixed contexts (immutable)
            Context_01: "student",
            Context_02: "school",
            Context_03: "standard",
            
            // Initial evolving contexts
            Context_04: ["healthcare", "technology"],
            Context_05: "beginner",
            Context_06: ["video", "interactive"],
            
            // Intake form responses
            intake_responses: {
                First_Name: "Jasmine",
                Email: "test.jasmine@student.edu",
                Role: "student",
                Organization_Type: "school",
                Background: "First year pre-med student",
                Interests: ["healthcare", "technology"],
                Preferences: ["video", "interactive"]
            }
        }
    },
    {
        scenario: "After First Learning Module",
        context_updates: {
            // Only evolving contexts can be updated
            Context_04: ["healthcare", "technology", "research_methods"],
            Context_05: "intermediate_healthcare",
            Context_06: ["video", "interactive", "case_studies"]
        },
        trigger: {
            type: "module_completion",
            details: "Completed Introduction to Medical Research"
        }
    },
    {
        scenario: "After Community Engagement",
        context_updates: {
            Context_04: ["healthcare", "technology", "research_methods", "community_health"],
            Context_05: "intermediate_healthcare_engaged",
            Context_06: ["video", "interactive", "case_studies", "community_forums"]
        },
        trigger: {
            type: "engagement_pattern",
            details: "Active in Vietnamese Health Forums"
        }
    }
];

async function generateTestSequence() {
    console.log("🔄 Starting interaction sequence with context evolution...\n");
    
    let currentContext = {};
    
    for (const interaction of TEST_INTERACTION_SEQUENCE) {
        console.log(`📝 Scenario: ${interaction.scenario}`);
        
        try {
            if (interaction.profile) {
                // Initial intake - set fixed and evolving contexts
                currentContext = {
                    fixed: {
                        Context_01: interaction.profile.Context_01,
                        Context_02: interaction.profile.Context_02,
                        Context_03: interaction.profile.Context_03
                    },
                    evolving: {
                        Context_04: interaction.profile.Context_04,
                        Context_05: interaction.profile.Context_05,
                        Context_06: interaction.profile.Context_06
                    }
                };
                
                // Log intake interaction
                await logChatInteraction({
                    interaction_type: 'intake',
                    status: '200',
                    context: currentContext,
                    intake_data: interaction.profile.intake_responses
                });
            } else {
                // Update only evolving contexts
                currentContext.evolving = {
                    ...currentContext.evolving,
                    ...interaction.context_updates
                };
                
                // Log context update interaction
                await logChatInteraction({
                    interaction_type: 'context_update',
                    status: '200',
                    context: currentContext,
                    trigger: interaction.trigger
                });
            }
            
            // Display current context state
            console.log("\n📊 Current Context State:");
            console.log("   Fixed Contexts:");
            Object.entries(currentContext.fixed).forEach(([key, value]) => {
                console.log(`      ${key}: ${value}`);
            });
            console.log("   Evolving Contexts:");
            Object.entries(currentContext.evolving).forEach(([key, value]) => {
                console.log(`      ${key}: ${JSON.stringify(value)}`);
            });
            
            if (interaction.trigger) {
                console.log("\n🔄 Update Trigger:");
                console.log(`   Type: ${interaction.trigger.type}`);
                console.log(`   Details: ${interaction.trigger.details}`);
            }
            
            console.log("\n---\n");
            
        } catch (error) {
            console.error(`❌ Failed at ${interaction.scenario}:`, error);
        }
    }
}

// Run the sequence
generateTestSequence().catch(error => {
    console.error("❌ Generation failed:", error);
}); 