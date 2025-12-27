import React, { createContext, useState, useEffect, useContext } from 'react';
import { Platform } from 'react-native';
import { storage } from '../utils/storage';
import { api } from '../services/api';

type AuthContextType = {
    userToken: string | null;
    hasProfile: boolean;
    isLoading: boolean;
    login: (token: string) => Promise<void>;
    logout: () => Promise<void>;
    setHasProfile: (value: boolean) => void;
};

const AuthContext = createContext<AuthContextType>({
    userToken: null,
    hasProfile: false,
    isLoading: true,
    login: async () => { },
    logout: async () => { },
    setHasProfile: () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [userToken, setUserToken] = useState<string | null>(null);
    const [hasProfile, setHasProfile] = useState(false);
    const [isLoading, setIsLoading] = useState(false); // Start false for instant load

    // Check for stored token on app launch
    useEffect(() => {
        const bootstrapAsync = async () => {
            try {
                const storedToken = await storage.getItem('userToken');
                if (storedToken) {
                    setUserToken(storedToken);
                    // Check if user has a profile
                    try {
                        // We need to set the header manually here since interceptor might not pick up state yet?
                        // Actually interceptor reads from storage, so it should work if we stored it.
                        // But let's be safe and wait for the state update or use the token directly if interceptor fails.
                        // The interceptor reads from storage, and we just read from storage.

                        const response = await api.get('/users/me');
                        if (response.data.profile) {
                            setHasProfile(true);
                        }
                    } catch (err) {
                        console.log("Failed to fetch profile on bootstrap", err);
                    }
                }
            } catch (e) {
                console.error('Restoring token failed');
            } finally {
                setIsLoading(false);
            }
        };

        bootstrapAsync();
    }, []);

    const login = async (token: string) => {
        setUserToken(token);
        await storage.setItem('userToken', token);

        // Check profile immediately
        try {
            const response = await api.get('/users/me');
            if (response.data.profile) {
                setHasProfile(true);
            } else {
                setHasProfile(false);
            }
        } catch (e) {
            console.error("Failed to check profile on login", e);
        }
    };

    const logout = async () => {
        setUserToken(null);
        setHasProfile(false);
        await storage.deleteItem('userToken');
    };

    return (
        <AuthContext.Provider value={{ userToken, hasProfile, isLoading, login, logout, setHasProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
