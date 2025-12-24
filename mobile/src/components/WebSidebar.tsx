import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../theme';

type WebSidebarProps = {
    activeTab: string;
    onTabChange: (tab: string) => void;
    onLogout: () => void;
};

const MENU_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'routine', label: 'My Routine', icon: '✅' },
    { id: 'chat', label: 'AI Consultant', icon: '💬' },
    { id: 'history', label: 'Skin History', icon: '📜' },
];

export const WebSidebar = ({ activeTab, onTabChange, onLogout }: WebSidebarProps) => {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.logo}>🧴✨</Text>
                <Text style={styles.appName}>Skincare AI</Text>
            </View>

            <View style={styles.menu}>
                {MENU_ITEMS.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        style={[
                            styles.menuItem,
                            activeTab === item.id && styles.activeMenuItem
                        ]}
                        onPress={() => onTabChange(item.id)}
                    >
                        <Text style={styles.icon}>{item.icon}</Text>
                        <Text style={[
                            styles.label,
                            activeTab === item.id && styles.activeLabel
                        ]}>
                            {item.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
                <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 250,
        height: '100%',
        backgroundColor: '#0F172A', // Dark Slate for Sidebar
        paddingVertical: SPACING.xl,
        paddingHorizontal: SPACING.m,
        justifyContent: 'space-between'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xxl,
        paddingHorizontal: SPACING.s
    },
    logo: {
        fontSize: 24,
        marginRight: SPACING.s
    },
    appName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        letterSpacing: 0.5
    },
    menu: {
        flex: 1,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: RADIUS.m,
        marginBottom: SPACING.s,
    },
    activeMenuItem: {
        backgroundColor: COLORS.primary,
    },
    icon: {
        fontSize: 18,
        marginRight: 12,
    },
    label: {
        fontSize: 15,
        color: '#94A3B8', // Slate 400
        fontWeight: '500'
    },
    activeLabel: {
        color: '#fff',
        fontWeight: 'bold'
    },
    logoutButton: {
        padding: SPACING.m,
        borderTopWidth: 1,
        borderTopColor: '#334155',
    },
    logoutText: {
        color: '#F87171', // Red 400
        fontWeight: '600',
        textAlign: 'center'
    }
});
