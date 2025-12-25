import axios from 'axios';
import { Platform } from 'react-native';
import { storage } from '../utils/storage';

// "localhost" works for iOS Simulator. 
// For Android Emulator use "10.0.2.2".
// For Physical Device use your LAN IP (e.g. 192.168.1.x).
export const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://127.0.0.1:8000';


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
// Types
export interface UserProduct {
    id: number;
    product_name: string;
    brand?: string;
    category?: string;
    status: 'active' | 'archived' | 'wishlist';
    notes?: string;
    rating?: number;
    date_opened?: string;
}

export interface UserProductCreate {
    product_name: string;
    brand?: string;
    category?: string;
    status?: 'active' | 'archived' | 'wishlist';
    notes?: string;
    rating?: number;
}

// API Methods
export const getMyProducts = async () => {
    const res = await api.get<UserProduct[]>('/products/');
    return res.data;
};

export const addProduct = async (data: UserProductCreate) => {
    const res = await api.post<UserProduct>('/products/', data);
    return res.data;
};

export const updateProduct = async (id: number, data: Partial<UserProductCreate>) => {
    const res = await api.put<UserProduct>(`/products/${id}`, data);
    return res.data;
};

export const deleteProduct = async (id: number) => {
    const res = await api.delete(`/products/${id}`);
    return res.data;
};

export const linkProductToRoutine = async (itemId: number, productId: number) => {
    const res = await api.put(`/routine/item/${itemId}`, { user_product_id: productId });
    return res.data;
};
