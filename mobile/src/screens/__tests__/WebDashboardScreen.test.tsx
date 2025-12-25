import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
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
        userToken: 'dummy-token', // Fix: Component checks !!userToken
        isLoading: false,
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
        const { UNSAFE_root } = render(
            <NavigationContainer>
                <WebDashboardScreen />
            </NavigationContainer>
        );
        expect(UNSAFE_root).toBeTruthy();
    });

    it('fetches streak data on mount', async () => {
        const { api } = require('../../services/api');

        render(
            <NavigationContainer>
                <WebDashboardScreen />
            </NavigationContainer>
        );

        await waitFor(() => {
            expect(api.get).toHaveBeenCalledWith('/routine/');
        });
    });

    it('displays greeting text', async () => {
        const { findByText } = render(
            <NavigationContainer>
                <WebDashboardScreen />
            </NavigationContainer>
        );

        // Dashboard shows greeting on initial render
        // Note: The greeting logic relies on time of day. Testing "Good Evening" specifically might be flaky if test runs in morning.
        // It's safer to just check for "Good" or mock Date. 
        // For now, let's assume it renders *something*
        // But the original test looked for "Good Evening, Skin Star!", let's see current impl.
        // Current impl: getGreeting() -> "Good morning" / "Good afternoon" / "Good evening"
        // And subtitle. 
        // It doesn't show "Skin Star" in the code I read earlier. It shows "Good morning" etc.
        // Let's broaden the matcher or mock Date? 
        // Actually, let's just use a regex for "Good"
        const greeting = await findByText(/Good (morning|afternoon|evening)/);
        expect(greeting).toBeTruthy();
    });

    it('displays streak information', async () => {
        const { findByText } = render(
            <NavigationContainer>
                <WebDashboardScreen />
            </NavigationContainer>
        );

        // Wait for streak to be fetched and displayed
        await waitFor(async () => {
            // The sub-greeting includes streak count
            const subGreeting = await findByText(/streak/i);
            expect(subGreeting).toBeTruthy();
        });
    });
});
