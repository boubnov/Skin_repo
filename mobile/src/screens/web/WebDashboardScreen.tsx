import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { WebSidebar } from '../../components/WebSidebar';
import HomeScreen from '../HomeScreen';
import RoutineScreen from '../RoutineScreen';
import HistoryScreen from '../HistoryScreen';
import ChatScreen from '../ChatScreen';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../../theme';
import { api } from '../../services/api';

// Get time-based greeting
const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
};

export default function WebDashboardScreen() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const { logout } = useAuth();
    const [streak, setStreak] = useState(0);

    useEffect(() => {
        api.get('/routine/').then(res => setStreak(res.data.streak)).catch(() => { });
    }, []);

    const renderDashboard = () => (
        <ScrollView style={styles.dashboardScroll} showsVerticalScrollIndicator={false}>
            {/* Professional Header */}
            <View style={styles.header}>
                <Text style={styles.greeting}>{getGreeting()}</Text>
                <Text style={styles.subtitle}>
                    {streak > 0
                        ? `You've maintained your routine for ${streak} consecutive days.`
                        : 'Start your skincare journey today.'
                    }
                </Text>
            </View>

            {/* Main Content Grid */}
            <View style={styles.gridContainer}>
                {/* Left Column: Routine */}
                <View style={styles.leftColumn}>
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Today's Routine</Text>
                            {streak > 0 && (
                                <View style={styles.streakBadge}>
                                    <Text style={styles.streakText}>{streak} day streak</Text>
                                </View>
                            )}
                        </View>
                        <RoutineScreen />
                    </View>
                </View>

                {/* Right Column: AI Consultant (Chat) */}
                <View style={styles.rightColumn}>
                    <View style={[styles.card, styles.chatCard]}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>AI Skin Consultant</Text>
                            <Text style={styles.cardSubtitle}>Get personalized advice</Text>
                        </View>
                        <View style={styles.chatContainer}>
                            <ChatScreen />
                        </View>
                    </View>
                </View>
            </View>
        </ScrollView>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return renderDashboard();
            case 'routine': return <RoutineScreen />;
            case 'chat': return <ChatScreen />;
            case 'history': return <HistoryScreen />;
            default: return renderDashboard();
        }
    };

    return (
        <View style={styles.container}>
            <WebSidebar activeTab={activeTab} onTabChange={setActiveTab} onLogout={logout} />
            <View style={styles.contentArea}>
                {renderContent()}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: COLORS.background
    },
    contentArea: {
        flex: 1,
        padding: 0
    },
    dashboardScroll: {
        flex: 1,
        padding: SPACING.xl
    },

    // Header
    header: {
        marginBottom: SPACING.xl
    },
    greeting: {
        fontSize: 28,
        fontWeight: '300',
        color: COLORS.text,
        marginBottom: SPACING.xs,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 15,
        color: COLORS.textLight,
        fontWeight: '400',
    },

    // Grid Layout
    gridContainer: {
        flexDirection: 'row',
        gap: SPACING.l,
    },
    leftColumn: {
        flex: 1,
    },
    rightColumn: {
        flex: 1,
    },

    // Cards
    card: {
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.l,
        padding: SPACING.l,
        ...SHADOWS.medium,
    },
    chatCard: {
        flex: 1,
        minHeight: 500,
    },
    cardHeader: {
        marginBottom: SPACING.m,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        letterSpacing: 0.2,
    },
    cardSubtitle: {
        fontSize: 13,
        color: COLORS.textLight,
        marginTop: 2,
    },

    // Streak Badge
    streakBadge: {
        backgroundColor: COLORS.primaryBG,
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.s,
        borderRadius: RADIUS.full,
    },
    streakText: {
        fontSize: 12,
        color: COLORS.primary,
        fontWeight: '500',
    },

    // Chat Container
    chatContainer: {
        flex: 1,
        minHeight: 400,
    },
});
