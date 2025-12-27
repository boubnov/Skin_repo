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
    // Intelligent Shelf Fields
    verification_status?: 'pending' | 'ready' | 'failed';
    is_analyzing?: boolean;
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

// ===== Safety Guard API =====
export interface SafetyConflict {
    risk_level: 'CRITICAL' | 'WARNING' | 'ADVICE';
    ingredient_a: string;
    ingredient_b: string;
    interaction_type: string;
    reasoning: string;
    recommended_adjustment: string;
    source: string;
}

export interface CheckConflictsResponse {
    has_conflicts: boolean;
    has_critical: boolean;
    conflicts: SafetyConflict[];
    message: string;
}

export const checkRoutineConflicts = async (
    productIngredients: string[],
    routineIngredients: string[]
): Promise<CheckConflictsResponse> => {
    const res = await api.post<CheckConflictsResponse>('/safety/check-routine', {
        product_ingredients: productIngredients,
        routine_ingredients: routineIngredients
    });
    return res.data;
};

export const getKnownConflicts = async () => {
    const res = await api.get('/safety/known-conflicts');
    return res.data;
};

// ===== Vision Scan API =====
export interface ScanJobResponse {
    job_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
    message: string;
    user_product_id?: number;
}

export interface ExtractionResult {
    brand?: string;
    product_name?: string;
    category?: string;
    ingredients_raw?: string;
    ingredients_parsed: string[];
    confidence_score: number;
    extraction_notes?: string;
}

export interface ScanJobResult {
    job_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
    user_product_id?: number;
    extraction?: ExtractionResult;
    error_message?: string;
    needs_manual_review: boolean;
}

export const startScanJob = async (imageUri: string): Promise<ScanJobResponse> => {
    const formData = new FormData();

    // Create file object from URI
    const filename = imageUri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', {
        uri: imageUri,
        name: filename,
        type: type,
    } as any);

    const res = await api.post<ScanJobResponse>('/vision/scan', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30s for upload
    });
    return res.data;
};

export const getScanJobStatus = async (jobId: string): Promise<ScanJobResult> => {
    const res = await api.get<ScanJobResult>(`/vision/scan/${jobId}`);
    return res.data;
};

export const completeScanManually = async (
    jobId: string,
    data: { brand?: string; product_name?: string; category?: string; ingredients?: string }
): Promise<{ message: string; product_id: number }> => {
    const res = await api.post(`/vision/scan/${jobId}/manual-complete`, null, {
        params: data
    });
    return res.data;
};

// Helper: Poll for scan completion
export const pollScanJob = async (
    jobId: string,
    onProgress?: (status: string) => void,
    maxAttempts = 30,
    intervalMs = 1000
): Promise<ScanJobResult> => {
    for (let i = 0; i < maxAttempts; i++) {
        const result = await getScanJobStatus(jobId);

        if (onProgress) {
            onProgress(result.status);
        }

        if (result.status === 'completed' || result.status === 'failed' || result.status === 'partial') {
            return result;
        }

        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error('Scan timed out');
};
