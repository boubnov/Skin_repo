import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { useChat } from '../../hooks/useChat';
import ChatScreen from '../ChatScreen';

// Mock the API and hook
jest.mock('../../services/api', () => ({
    BASE_URL: 'http://localhost:8000',
    api: {
        get: jest.fn(),
        post: jest.fn(),
    }
}));

// Mock hook to control return values
const mockSendMessage = jest.fn();
jest.mock('../../hooks/useChat', () => ({
    useChat: jest.fn(() => ({
        messages: [{ id: '1', role: 'model', content: 'Hello!' }],
        isLoading: false,
        sendMessage: mockSendMessage,
        isReady: true
    }))
}));

jest.mock('@expo/vector-icons', () => ({
    Ionicons: ''
}), { virtual: true });

describe('ChatIntegration', () => {
    it('calls sendMessage when user submits text', async () => {
        const { getByPlaceholderText, getByText } = render(<ChatScreen />);

        const input = getByPlaceholderText('Ask about skincare...');
        fireEvent.changeText(input, 'Hello Gemini');

        const sendButton = getByText('Send');
        fireEvent.press(sendButton);

        expect(mockSendMessage).toHaveBeenCalledWith('Hello Gemini', undefined);
    });
});
