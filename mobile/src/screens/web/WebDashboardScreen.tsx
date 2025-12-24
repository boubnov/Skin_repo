import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { WebSidebar } from '../../components/WebSidebar';
import { StatCard, Badge, ProgressBlock } from '../../components/GamificationComponents';
import HomeScreen from '../HomeScreen';
import RoutineScreen from '../RoutineScreen';
import HistoryScreen from '../HistoryScreen';
import ChatScreen from '../ChatScreen';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../theme';
import { api } from '../../services/api';

export default function WebDashboardScreen() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const { logout } = useAuth();
    const [streak, setStreak] = useState(0);

    // Fetch streak for gamification display
    useEffect(() => {
        api.get('/routine/').then(res => setStreak(res.data.streak)).catch(() => { });
    }, []);

    const renderDashboard = () => (
        <ScrollView style={styles.dashboardScroll}>
            {/* Header */}
            <View style={styles.heroSection}>
                <Text style={styles.greeting}>Good Evening, Skin Star! ✨</Text>
                <Text style={styles.subGreeting}>You are on a {streak} day streak. Keep glowing!</Text>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
                <StatCard label="Day Streak" value={streak} icon="🔥" color="#FEF3C7" />
                <StatCard label="Skin XP" value={streak * 150} icon="⚡" color="#DBEAFE" />
                <StatCard label="League" value="Silver" icon="🏆" color="#E0E7FF" />
            </View>

            <View style={styles.gridContainer}>
                {/* Main Column: User's Actual Content */}
                <View style={styles.mainCol}>
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Today's Quest 🛡️</Text>
                        <RoutineScreen />
                    </View>
                </View>

                {/* Side Column: Badges & Extras */}
                <View style={styles.sideCol}>
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Achievements 🏅</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
                            <Badge label="Early Bird" icon="🌅" />
                            <Badge label="Hydrated" icon="💧" />
                            <Badge label="Scholar" icon="📚" />
                        </View>
                    </View>

                    <View style={[styles.card, { flex: 1, minHeight: 300 }]}>
                        <Text style={styles.cardTitle}>Quick Consult 💬</Text>
                        <ChatScreen />
                    </View>
                </View>
            </View>
        </ScrollView>
    );

    const renderContent = () => {
        // If Dashboard tab, show the special Gamified View
        if (activeTab === 'dashboard') return renderDashboard();

        // Otherwise show legacy full screens
        switch (activeTab) {
            case 'routine': return <RoutineScreen />;
            case 'chat': return <ChatScreen />;
            case 'history': return <HistoryScreen />;
            default: return <HomeScreen />;
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
    container: { flex: 1, flexDirection: 'row', backgroundColor: '#F8FAFC' },
    contentArea: { flex: 1, padding: 0 },

    dashboardScroll: { flex: 1, padding: 32 },

    heroSection: { marginBottom: 32 },
    greeting: { fontSize: 32, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
    subGreeting: { fontSize: 18, color: '#64748B' },

    statsRow: { flexDirection: 'row', marginBottom: 32 },

    gridContainer: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' },
    mainCol: { flex: 2 },
    sideCol: { flex: 1, gap: 24 },

    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        ...SHADOWS.small,
        marginBottom: 24,
        overflow: 'hidden'
    },
    cardTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 16 }
});


