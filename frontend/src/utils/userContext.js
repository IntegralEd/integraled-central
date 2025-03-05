import React, { useState, useEffect } from 'react';

const UserContext = React.createContext(null);

const UserContextProvider = ({ children }) => {
    const [userContext, setUserContext] = useState(null);

    useEffect(() => {
        // Generic Softr user detection
        if (window.Softr) {
            window.Softr.user.getUser().then(user => {
                setUserContext({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    clientId: window.CLIENT_CONFIG.name // From config
                });
            });
        }
    }, []);

    return (
        <UserContext.Provider value={userContext}>
            {children}
        </UserContext.Provider>
    );
};

export default UserContextProvider;
