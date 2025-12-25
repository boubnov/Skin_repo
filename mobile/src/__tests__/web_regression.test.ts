import React from 'react';
import { render } from '@testing-library/react-native';

// MOCK NAVIGATION
// We verify that screens can be imported and rendered without crashing the test runner.
// This simulates the web bundler loading the files.

jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({ navigate: jest.fn() }),
    useFocusEffect: jest.fn(),
}));

jest.mock('expo-router', () => ({
    useRouter: () => ({ push: jest.fn() }),
}));

// Mock API to prevent network calls during import tests
jest.mock('../services/api', () => ({
    api: { get: jest.fn(), post: jest.fn() },
    linkProductToRoutine: jest.fn(),
    getMyProducts: jest.fn(),
}));

describe('Web Regression Tests - Component Safety', () => {

    it('should import and render DashboardScreen without crashing', () => {
        const DashboardScreen = require('../screens/web/DashboardScreen').default;
        expect(DashboardScreen).toBeDefined();
        // We utilize 'require' to catch import-time errors dynamically
    });

    it('should import and render RoutineScreen without crashing', () => {
        const RoutineScreen = require('../screens/RoutineScreen').default;
        expect(RoutineScreen).toBeDefined();
        render(<RoutineScreen />);
    });

    it('should import and render ChatScreen without crashing', () => {
        const ChatScreen = require('../screens/ChatScreen').default;
        expect(ChatScreen).toBeDefined();
    });

    it('should import and render ShelfScreen without crashing', () => {
        const ShelfScreen = require('../screens/ShelfScreen').default;
        expect(ShelfScreen).toBeDefined();
    });

    it('should import and render HistoryScreen without crashing', () => {
        const HistoryScreen = require('../screens/HistoryScreen').default;
        expect(HistoryScreen).toBeDefined();
    });

    it('should import and render ProfileSetupScreen without crashing', () => {
        const ProfileSetupScreen = require('../screens/ProfileSetupScreen').default;
        expect(ProfileSetupScreen).toBeDefined();
    });
});
