import { createContext, useContext } from 'react';

// Create the Auth Context
export const AuthContext = createContext();

// Hook to use Auth Context
export const useAuth = () => useContext(AuthContext);
