// Test successful chat log
const testChatLog = {
    User_ID: 'rec9WdT6Ppi9HsZ6J',
    Org_ID: 'recjUGiOT65lwgBtm',
    Thread_ID: 'thread_Krcyy6NIz5gFQHzZc5Uoor2i',
    interaction_type: 'chat',
    status: '200'
};

// Test support ticket creation
const testTicket = {
    User_ID: 'rec9WdT6Ppi9HsZ6J',
    Org_ID: 'recjUGiOT65lwgBtm',
    Thread_ID: 'thread_Krcyy6NIz5gFQHzZc5Uoor2i',
    interaction_type: 'support_ticket',
    status: '130'
};

// Run tests
logChatInteraction(testChatLog);
logChatInteraction(testTicket); 