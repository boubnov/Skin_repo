import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../theme';

type WebSidebarProps = {
    activeTab: string;
    onTabChange: (tab: string) => void;
    onLogout: () => void;
};

// Clean, professional menu items - no emojis
const MENU_ITEMS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'routine', label: 'My Routine' },
    { id: 'chat', label: 'AI Consultant' },
    { id: 'history', label: 'Skin History' },
];

export const WebSidebar = ({ activeTab, onTabChange, onLogout }: WebSidebarProps) => {
    return (
        <View style={styles.container}>
            {/* Clean text logo */}
            <View style={styles.header}>
                <Text style={styles.brandName}>Skincare</Text>
                <Text style={styles.brandAccent}>AI</Text>
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
                <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
                    <Text style={styles.logoutText}>Sign Out</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 220,
        height: '100%',
        backgroundColor: '#3D3630', // Warm dark charcoal
        paddingVertical: SPACING.xl,
        paddingHorizontal: 0,
        justifyContent: 'flex-start',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'baseline',
        paddingHorizontal: SPACING.l,
        marginBottom: SPACING.xxl,
    },
    brandName: {
        fontSize: 22,
        fontWeight: '300',
        color: '#FFFFFF',
        letterSpacing: 1,
    },
    brandAccent: {
        fontSize: 22,
        fontWeight: '600',
        color: COLORS.primaryLight,
        marginLeft: 4,
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
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    activeIndicator: {
        position: 'absolute',
        left: 0,
        top: 8,
        bottom: 8,
        width: 3,
        backgroundColor: COLORS.primaryLight,
        borderTopRightRadius: 2,
        borderBottomRightRadius: 2,
    },
    label: {
        fontSize: 15,
        color: '#9A9590', // Warm gray
        fontWeight: '400',
        letterSpacing: 0.3,
    },
    activeLabel: {
        color: '#FFFFFF',
        fontWeight: '500',
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.08)',
        paddingTop: SPACING.m,
        paddingHorizontal: SPACING.l,
    },
    logoutButton: {
        paddingVertical: SPACING.s,
    },
    logoutText: {
        color: '#9A9590',
        fontSize: 14,
        fontWeight: '400',
    },
});
