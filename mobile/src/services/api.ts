import axios from 'axios';
import { Platform } from 'react-native';
import { storage } from '../utils/storage';

// "localhost" works for iOS Simulator. 
// For Android Emulator use "10.0.2.2".
// For Physical Device use your LAN IP (e.g. 192.168.1.x).
export const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

// Cross-platform storage helper
const getStoredToken = async (): Promise<string | null> => {
    return storage.getItem('userToken');
};

export const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add Token to every request
api.interceptors.request.use(async (config) => {
    const token = await getStoredToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
