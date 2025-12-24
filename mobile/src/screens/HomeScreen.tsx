import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';

// Get time-based greeting
const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good Morning', emoji: '☀️' };
    if (hour < 17) return { text: 'Good Afternoon', emoji: '🌤️' };
    return { text: 'Good Evening', emoji: '🌙' };
};

// Action card data
const QUICK_ACTIONS = [
    { id: 'chat', title: 'AI Consultant', subtitle: 'Get personalized advice', icon: '💬', route: 'Chat', color: '#DBEAFE' },
    { id: 'routine', title: 'Daily Routine', subtitle: 'Track your skincare', icon: '✅', route: 'Routine', color: '#D1FAE5' },
    { id: 'history', title: 'Skin History', subtitle: 'View your progress', icon: '📊', route: 'HistoryTab', color: '#FEF3C7' },
    { id: 'settings', title: 'Settings', subtitle: 'Manage your account', icon: '⚙️', route: 'SettingsTab', color: '#F3E8FF' },
];

export default function HomeScreen({ navigation }: any) {
    const { logout } = useAuth();
    const [streak, setStreak] = useState(0);
    const [loading, setLoading] = useState(true);
    const greeting = getGreeting();

    useEffect(() => {
        api.get('/routine/')
            .then(res => setStreak(res.data.streak || 0))
            .catch(() => setStreak(0))
            .finally(() => setLoading(false));
    }, []);

    const ActionCard = ({ item }: { item: typeof QUICK_ACTIONS[0] }) => (
        <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: item.color }]}
            onPress={() => navigation.navigate(item.route)}
            activeOpacity={0.7}
        >
            <Text style={styles.actionIcon}>{item.icon}</Text>
            <Text style={styles.actionTitle}>{item.title}</Text>
            <Text style={styles.actionSubtitle}>{item.subtitle}</Text>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Hero Section */}
            <View style={styles.heroSection}>
                <Text style={styles.greeting}>{greeting.emoji} {greeting.text}</Text>
                <Text style={styles.welcomeText}>Ready for your skincare routine?</Text>
            </View>

            {/* Streak Card */}
            <View style={styles.streakCard}>
                <View style={styles.streakLeft}>
                    <Text style={styles.streakEmoji}>🔥</Text>
                    <View>
                        <Text style={styles.streakNumber}>{streak}</Text>
                        <Text style={styles.streakLabel}>Day Streak</Text>
                    </View>
                </View>
                <View style={styles.streakRight}>
                    <Text style={styles.streakMotivation}>
                        {streak === 0 ? 'Start your streak today!' :
                            streak < 7 ? 'Keep it up!' :
                                streak < 30 ? 'You\'re on fire! 🎉' : 'Skincare champion! 🏆'}
                    </Text>
                </View>
            </View>

            {/* Quick Actions Grid */}
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
                {QUICK_ACTIONS.map(item => (
                    <ActionCard key={item.id} item={item} />
                ))}
            </View>

            {/* Tip of the Day */}
            <View style={styles.tipCard}>
                <Text style={styles.tipLabel}>💡 Tip of the Day</Text>
                <Text style={styles.tipText}>
                    Always apply sunscreen as the last step of your morning routine, even on cloudy days!
                </Text>
            </View>

            {/* Logout Button */}
            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>

            <View style={{ height: SPACING.xxl }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        padding: SPACING.m,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },

    // Hero
    heroSection: {
        marginTop: SPACING.m,
        marginBottom: SPACING.l,
    },
    greeting: {
        fontSize: 28,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: SPACING.xs,
    },
    welcomeText: {
        fontSize: 16,
        color: COLORS.textLight,
    },

    // Streak Card
    streakCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.l,
        padding: SPACING.l,
        marginBottom: SPACING.l,
        alignItems: 'center',
        justifyContent: 'space-between',
        ...SHADOWS.medium,
    },
    streakLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    streakEmoji: {
        fontSize: 40,
        marginRight: SPACING.m,
    },
    streakNumber: {
        fontSize: 36,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    streakLabel: {
        fontSize: 14,
        color: COLORS.textLight,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    streakRight: {
        flex: 1,
        alignItems: 'flex-end',
    },
    streakMotivation: {
        fontSize: 14,
        color: COLORS.secondaryText,
        textAlign: 'right',
        fontWeight: '500',
    },

    // Section Title
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: SPACING.m,
    },

    // Actions Grid
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: SPACING.l,
    },
    actionCard: {
        width: '48%',
        borderRadius: RADIUS.l,
        padding: SPACING.m,
        marginBottom: SPACING.m,
        ...SHADOWS.small,
    },
    actionIcon: {
        fontSize: 32,
        marginBottom: SPACING.s,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 2,
    },
    actionSubtitle: {
        fontSize: 12,
        color: COLORS.textLight,
    },

    // Tip Card
    tipCard: {
        backgroundColor: COLORS.primaryBG,
        borderRadius: RADIUS.l,
        padding: SPACING.m,
        marginBottom: SPACING.l,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
    },
    tipLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.primary,
        marginBottom: SPACING.xs,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    tipText: {
        fontSize: 14,
        color: COLORS.text,
        lineHeight: 20,
    },

    // Logout
    logoutButton: {
        paddingVertical: SPACING.m,
        alignItems: 'center',
    },
    logoutText: {
        color: COLORS.error,
        fontWeight: '600',
        fontSize: 14,
    },
});
