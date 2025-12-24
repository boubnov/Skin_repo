import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import ChatScreen from '../ChatScreen';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

// Mock Navigation
const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
};

describe('ChatScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('mock-api-key-123');
    });

    it('requests location and API key on mount', async () => {
        render(<ChatScreen navigation={mockNavigation} />);

        await waitFor(() => {
            expect(SecureStore.getItemAsync).toHaveBeenCalledWith('user_google_api_key');
            expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
            expect(Location.getCurrentPositionAsync).toHaveBeenCalled();
        });
    });

    it('launches camera when camera button is pressed', async () => {
        const { getByText, getByPlaceholderText } = render(<ChatScreen navigation={mockNavigation} />);

        // Wait for init
        await waitFor(() => expect(SecureStore.getItemAsync).toHaveBeenCalled());

        // Find Camera Button (it has text "📷")
        const cameraBtn = getByText('📷');
        expect(cameraBtn).toBeTruthy();

        // Press it
        await act(async () => {
            fireEvent.press(cameraBtn);
        });

        // Verify Image Picker calls
        expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled();
        expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();

        // Wait for Mock Analysis (timeout 1500ms in code)
        // We use jest.useFakeTimers to speed this up in real tests, 
        // but for now let's just waitFor. Ideally assume Jest handles async nicely or use real timeout.
        // Actually, 1.5s is long for a unit test. I should probably use fake timers.
    });

    it('fills input text after mock analysis', async () => {
        jest.useFakeTimers();
        const { getByText, getByPlaceholderText } = render(<ChatScreen navigation={mockNavigation} />);

        // Wait for mount effects
        await waitFor(() => expect(Location.getCurrentPositionAsync).toHaveBeenCalled());

        // Press Camera
        const cameraBtn = getByText('📷');
        await act(async () => {
            fireEvent.press(cameraBtn);
        });

        // Wait for Promise to resolve
        await waitFor(() => expect(ImagePicker.launchCameraAsync).toHaveBeenCalled());

        // Advance Timer
        act(() => {
            jest.runAllTimers();
        });

        const input = getByPlaceholderText('Ask about skincare...');
        expect(input.props.value).toContain('[Selfie Analysis]');

        jest.useRealTimers();
    });
});
