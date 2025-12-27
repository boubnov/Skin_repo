import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../theme';

type WebSidebarProps = {
    activeTab: string;
    onTabChange: (tab: string) => void;
    onLogout: () => void;
};

// Clean, professional menu items - no emojis
const MENU_ITEMS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'shelf', label: 'My Shelf' },
    { id: 'routine', label: 'My Routine' },
    { id: 'chat', label: 'AI Consultant' },
    { id: 'history', label: 'The Skin Journey' },
];

export const WebSidebar = ({ activeTab, onTabChange, onLogout, isLoggedIn = true, onLogin }: WebSidebarProps & { isLoggedIn?: boolean, onLogin?: () => void }) => {
    return (
        <View style={styles.container}>
            {/* Clean text logo */}
            {/* Premium Circuitry Logo */}
            <View style={styles.header}>
                <Image
                    source={require('../../assets/company_logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </View>

            {/* Navigation */}
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
                        {/* Active indicator bar */}
                        {activeTab === item.id && <View style={styles.activeIndicator} />}
                        <Text style={[
                            styles.label,
                            activeTab === item.id && styles.activeLabel
                        ]}>
                            {item.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                {isLoggedIn ? (
                    <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
                        <Text style={styles.logoutText}>Sign Out</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.logoutButton} onPress={onLogin}>
                        <Text style={[styles.logoutText, { color: COLORS.primary }]}>Log In</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 220,
        height: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.7)', // White glassmorphism
        paddingVertical: SPACING.xl,
        paddingHorizontal: 0,
        justifyContent: 'flex-start',
        borderRightWidth: 1,
        borderRightColor: COLORS.border,
        // @ts-ignore - backdropFilter is supported in web
        backdropFilter: 'blur(20px)',
        // @ts-ignore
        webkitBackdropFilter: 'blur(20px)',
    },
    header: {
        paddingHorizontal: SPACING.l,
        marginBottom: SPACING.xxl,
        height: 60,
        justifyContent: 'center',
    },
    logo: {
        height: 100,
        width: 200,
    },
    menu: {
        flex: 1,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: SPACING.l,
        position: 'relative',
    },
    activeMenuItem: {
        backgroundColor: 'rgba(0, 210, 255, 0.08)', // Faded cyan
    },
    activeIndicator: {
        position: 'absolute',
        left: 0,
        top: 8,
        bottom: 8,
        width: 4,
        backgroundColor: COLORS.primary,
        borderTopRightRadius: 2,
        borderBottomRightRadius: 2,
    },
    label: {
        fontSize: 15,
        color: COLORS.textLight, // Slate Grey
        fontWeight: '400',
        letterSpacing: 0.3,
    },
    activeLabel: {
        color: COLORS.primaryAccent,
        fontWeight: '600',
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: SPACING.m,
        paddingHorizontal: SPACING.l,
    },
    logoutButton: {
        paddingVertical: SPACING.s,
    },
    logoutText: {
        color: COLORS.textLight,
        fontSize: 14,
        fontWeight: '400',
    },
});
