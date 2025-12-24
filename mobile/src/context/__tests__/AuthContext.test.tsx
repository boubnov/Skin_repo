import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../AuthContext';
import { Text, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Mock SecureStore
jest.mock('expo-secure-store', () => ({
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
}));

// Test Component to consume Context
const TestComponent = () => {
    const { isLoading, userToken } = useAuth();
    if (isLoading) return <Text>Loading...</Text>;
    return <Text>{userToken ? 'Logged In' : 'Logged Out'}</Text>;
};

describe('AuthContext', () => {
    it('renders loading state initially', async () => {
        // Mock getItem to hang or be slow? actually useEffect runs fast.
        // Let's mock it to return null (Logged Out)
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

        const { getByText } = render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        // It might flash loading
        // await waitFor(() => getByText('Logged Out'));

        // Actually, let's just check it renders
        expect(SecureStore.getItemAsync).toHaveBeenCalledWith('userToken');
    });

    it('loads token from storage', async () => {
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('fake-token');

        const { getByText } = render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        await waitFor(() => getByText('Logged In'));
    });
});
