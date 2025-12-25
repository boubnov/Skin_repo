import { Platform } from 'react-native';

// Use dynamic require to avoid "Expo SecureStore is not available" crash on web
// when importing it at the top level.
let SecureStore: any;

if (Platform.OS !== 'web') {
    try {
        SecureStore = require('expo-secure-store');
    } catch (e) {
        console.warn("SecureStore required but not found:", e);
    }
}

export const storage = {
    getItem: async (key: string): Promise<string | null> => {
        if (Platform.OS === 'web') {
            if (typeof localStorage !== 'undefined') {
                return localStorage.getItem(key);
            }
            return null;
        }
        return SecureStore ? SecureStore.getItemAsync(key) : null;
    },
    setItem: async (key: string, value: string): Promise<void> => {
        if (Platform.OS === 'web') {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(key, value);
            }
            return;
        }
        if (SecureStore) {
            return SecureStore.setItemAsync(key, value);
        }
    },
    deleteItem: async (key: string): Promise<void> => {
        if (Platform.OS === 'web') {
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem(key);
            }
            return;
        }
        if (SecureStore) {
            return SecureStore.deleteItemAsync(key);
        }
    },
};
