import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebSidebar } from '../../components/WebSidebar';
import HomeScreen from '../HomeScreen';
import RoutineScreen from '../RoutineScreen';

import HistoryScreen from '../HistoryScreen';
import ShelfScreen from '../ShelfScreen';
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

import { useNavigation } from '@react-navigation/native';

// STUB WITH IMPORTS
// STUB WITH IMPORTS + HOOKS + SIDEBAR
export default function DashboardScreen() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const { logout, userToken } = useAuth(); // Use userToken to check auth status
    const [streak, setStreak] = useState(0);
    const navigation = useNavigation<any>();

    const isLoggedIn = !!userToken;

    useEffect(() => {
        if (isLoggedIn) {
            api.get('/routine/').then(res => setStreak(res.data.streak)).catch(() => { });
        }
    }, [isLoggedIn]);

    const handleLogin = () => {
        navigation.navigate('Login');
    };

    // RESTORED DASHBOARD STRUCTURE (CHILDREN DISABLED)
    const renderDashboard = () => (
        <ScrollView style={styles.dashboardScroll} showsVerticalScrollIndicator={false}>
            {/* Professional Header with Top Right Actions */}
            <View style={styles.headerContainer}>
                <View>
                    <Text style={styles.greeting}>{getGreeting()}</Text>
                    <Text style={styles.subtitle}>
                        {isLoggedIn && streak > 0
                            ? `You've maintained your routine for ${streak} consecutive days.`
                            : 'Start your skincare journey today.'
                        }
                    </Text>
                </View>

                {/* Top Right Actions */}
                <View style={styles.headerActions}>
                    {!isLoggedIn ? (
                        <TouchableOpacity
                            style={styles.headerButtonPrimary}
                            onPress={handleLogin}
                        >
                            <Text style={styles.headerButtonTextPrimary}>Log In / Sign Up</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.userInfo}>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('Scanner')}
                                style={{
                                    backgroundColor: COLORS.secondaryButton || '#E0E0E0',
                                    paddingVertical: 8,
                                    paddingHorizontal: 15,
                                    borderRadius: RADIUS.m,
                                    marginRight: 10,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                            >
                                <Ionicons name="barcode-outline" size={20} color={COLORS.primary} />
                                <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Scan / Link</Text>
                            </TouchableOpacity>
                            <View style={styles.userAvatar}>
                                <Text style={styles.userAvatarText}>U</Text>
                            </View>
                        </View>
                    )}
                </View>
            </View>

            {/* Main Content Grid */}
            <View style={styles.gridContainer}>
                {/* Left Column: Routine */}
                <View style={styles.leftColumn}>
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Today's Routine</Text>
                            {isLoggedIn && streak > 0 && (
                                <View style={styles.streakBadge}>
                                    <Text style={styles.streakText}>{streak} day streak</Text>
                                </View>
                            )}
                        </View>
                        {isLoggedIn ? (
                            // <Text style={{ padding: 20 }}>ROUTINE SCREEN DISABLED (CRASH SOURCE)</Text>
                            <RoutineScreen />
                        ) : (
                            <View style={{ padding: 20, alignItems: 'center' }}>
                                <Text style={{ color: COLORS.textLight, marginBottom: 15 }}>Log in to view and track your personalized routine.</Text>
                                <TouchableOpacity style={{ backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 }} onPress={handleLogin}>
                                    <Text style={{ color: '#FFF', fontWeight: '600' }}>Log In</Text>
                                </TouchableOpacity>
                            </View>
                        )}
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
        if (!isLoggedIn && activeTab !== 'dashboard' && activeTab !== 'chat') {
            return (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, color: COLORS.text, marginBottom: 20 }}>Please log in to access this feature.</Text>
                    <TouchableOpacity style={{ backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 }} onPress={handleLogin}>
                        <Text style={{ color: '#FFF', fontWeight: '600' }}>Log In</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        switch (activeTab) {
            case 'dashboard': return renderDashboard();
            case 'routine': return <RoutineScreen />;
            case 'shelf': return <ShelfScreen />;
            case 'chat': return <ChatScreen />;
            case 'history': return <HistoryScreen />;
            default: return renderDashboard();
        }

    };

    return (
        <View style={styles.container}>
            <WebSidebar
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onLogout={logout}
                isLoggedIn={isLoggedIn}
                onLogin={handleLogin}
            />
            <View style={styles.contentArea}>
                {renderContent()}
            </View>
        </View>
    );
}

/*
export default function DashboardScreen() {
    const [activeTab, setActiveTab] = useState('dashboard');
    ...
}
*/

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
    headerContainer: {
        marginBottom: SPACING.xl,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerButtonPrimary: {
        backgroundColor: COLORS.primary,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: RADIUS.m,
        ...SHADOWS.small,
    },
    headerButtonTextPrimary: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primaryBG,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    userAvatarText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.primary,
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

    // Streak Badge - Subtle warm glow for premium feel
    streakBadge: {
        backgroundColor: COLORS.success, // Sage green for active streak
        paddingVertical: SPACING.xs + 2,
        paddingHorizontal: SPACING.m,
        borderRadius: RADIUS.full,
        // Subtle glow effect
        shadowColor: COLORS.success,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 4,
    },
    streakText: {
        fontSize: 12,
        color: '#FFFFFF',
        fontWeight: '600',
        letterSpacing: 0.5,
    },

    // Chat Container
    chatContainer: {
        flex: 1,
        minHeight: 400,
    },
});
