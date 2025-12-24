import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import WebDashboardScreen from '../web/WebDashboardScreen';

// Mock child screens to simplify testing
jest.mock('../HomeScreen', () => () => null);
jest.mock('../RoutineScreen', () => () => null);
jest.mock('../HistoryScreen', () => () => null);
jest.mock('../ChatScreen', () => () => null);

// Mock the API
jest.mock('../../services/api', () => ({
    api: {
        get: jest.fn(() => Promise.resolve({ data: { streak: 7 } })),
        post: jest.fn(() => Promise.resolve({ data: {} })),
    }
}));

// Mock AuthContext
jest.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        logout: jest.fn(),
        isAuthenticated: true,
    }),
}));

// Mock GamificationComponents
jest.mock('../../components/GamificationComponents', () => ({
    StatCard: ({ label, value }: { label: string, value: any }) => null,
    Badge: ({ label }: { label: string }) => null,
    ProgressBlock: () => null,
}));

// Mock WebSidebar to track calls
const mockOnTabChange = jest.fn();
jest.mock('../../components/WebSidebar', () => ({
    WebSidebar: ({ activeTab, onTabChange, onLogout }: any) => {
        // Store the callback so tests can trigger it
        mockOnTabChange.mockImplementation(onTabChange);
        return null;
    }
}));

describe('WebDashboardScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders without crashing', async () => {
        const { UNSAFE_root } = render(<WebDashboardScreen />);
        expect(UNSAFE_root).toBeTruthy();
    });

    it('fetches streak data on mount', async () => {
        const { api } = require('../../services/api');

        render(<WebDashboardScreen />);

        await waitFor(() => {
            expect(api.get).toHaveBeenCalledWith('/routine/');
        });
    });

    it('displays greeting text', async () => {
        const { findByText } = render(<WebDashboardScreen />);

        // Dashboard shows greeting on initial render
        const greeting = await findByText(/Good Evening, Skin Star!/);
        expect(greeting).toBeTruthy();
    });

    it('displays streak information', async () => {
        const { findByText } = render(<WebDashboardScreen />);

        // Wait for streak to be fetched and displayed
        await waitFor(async () => {
            // The sub-greeting includes streak count
            const subGreeting = await findByText(/streak/i);
            expect(subGreeting).toBeTruthy();
        });
    });
});
