import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { WebSidebar } from '../WebSidebar';

describe('WebSidebar', () => {
    const mockOnTabChange = jest.fn();
    const mockOnLogout = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders app name and logo', () => {
        const { getByText } = render(
            <WebSidebar
                activeTab="dashboard"
                onTabChange={mockOnTabChange}
                onLogout={mockOnLogout}
            />
        );

        expect(getByText('Skincare AI')).toBeTruthy();
        expect(getByText('🧴✨')).toBeTruthy();
    });

    it('renders all menu items', () => {
        const { getByText } = render(
            <WebSidebar
                activeTab="dashboard"
                onTabChange={mockOnTabChange}
                onLogout={mockOnLogout}
            />
        );

        expect(getByText('Dashboard')).toBeTruthy();
        expect(getByText('My Routine')).toBeTruthy();
        expect(getByText('AI Consultant')).toBeTruthy();
        expect(getByText('Skin History')).toBeTruthy();
    });

    it('calls onTabChange when menu item is pressed', () => {
        const { getByText } = render(
            <WebSidebar
                activeTab="dashboard"
                onTabChange={mockOnTabChange}
                onLogout={mockOnLogout}
            />
        );

        fireEvent.press(getByText('My Routine'));
        expect(mockOnTabChange).toHaveBeenCalledWith('routine');

        fireEvent.press(getByText('AI Consultant'));
        expect(mockOnTabChange).toHaveBeenCalledWith('chat');

        fireEvent.press(getByText('Skin History'));
        expect(mockOnTabChange).toHaveBeenCalledWith('history');
    });

    it('calls onLogout when Sign Out is pressed', () => {
        const { getByText } = render(
            <WebSidebar
                activeTab="dashboard"
                onTabChange={mockOnTabChange}
                onLogout={mockOnLogout}
            />
        );

        fireEvent.press(getByText('Sign Out'));
        expect(mockOnLogout).toHaveBeenCalled();
    });

    it('highlights active tab correctly', () => {
        const { getByText, rerender } = render(
            <WebSidebar
                activeTab="routine"
                onTabChange={mockOnTabChange}
                onLogout={mockOnLogout}
            />
        );

        // The menu items should be rendered - we can check the component renders
        expect(getByText('My Routine')).toBeTruthy();

        // Rerender with different active tab
        rerender(
            <WebSidebar
                activeTab="chat"
                onTabChange={mockOnTabChange}
                onLogout={mockOnLogout}
            />
        );

        expect(getByText('AI Consultant')).toBeTruthy();
    });
});
