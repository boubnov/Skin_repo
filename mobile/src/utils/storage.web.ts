export const storage = {
    getItem: async (key: string): Promise<string | null> => {
        if (typeof window !== 'undefined' && window.localStorage) {
            return localStorage.getItem(key);
        }
        return null;
    },
    setItem: async (key: string, value: string): Promise<void> => {
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem(key, value);
        }
    },
    deleteItem: async (key: string): Promise<void> => {
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.removeItem(key);
        }
    },
};
