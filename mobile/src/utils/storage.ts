import * as SecureStore from 'expo-secure-store';

export const storage = {
    getItem: async (key: string): Promise<string | null> => {
        return SecureStore.getItemAsync(key);
    },
    setItem: async (key: string, value: string): Promise<void> => {
        return SecureStore.setItemAsync(key, value);
    },
    deleteItem: async (key: string): Promise<void> => {
        return SecureStore.deleteItemAsync(key);
    },
};
