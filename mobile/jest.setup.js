
// Mock Expo Secure Store globally
jest.mock('expo-secure-store', () => ({
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
}));

// Mock Expo package itself to avoid Winter runtime loading
jest.mock('expo', () => ({
    // Add exports as needed
}));

// Mock Expo Location
jest.mock('expo-location', () => ({
    requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
    getCurrentPositionAsync: jest.fn(() => Promise.resolve({ coords: { latitude: 37.77, longitude: -122.41 } })),
}));

// Mock Expo Image Picker
jest.mock('expo-image-picker', () => ({
    requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
    launchCameraAsync: jest.fn(() => Promise.resolve({
        canceled: false,
        assets: [{ uri: 'file://mock_image.jpg' }]
    })),
}));

// Mock Axios (for API calls)
jest.mock('axios', () => ({
    create: jest.fn(() => ({
        post: jest.fn(() => Promise.resolve({ data: { response: 'Mock AI Response', products: [] } })),
        get: jest.fn(() => Promise.resolve({ data: {} })),
        defaults: { headers: { common: {} } },
        interceptors: { request: { use: jest.fn() } }
    }))
}));
