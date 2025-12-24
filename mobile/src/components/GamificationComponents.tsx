import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SHADOWS, RADIUS, SPACING } from '../theme';

// --- Stat Card (e.g. Streak, XP) ---
export const StatCard = ({ label, value, icon, color }: { label: string, value: string | number, icon: string, color?: string }) => (
    <View style={styles.statCard}>
        <View style={[styles.iconContainer, { backgroundColor: color || COLORS.primaryBG }]}>
            <Text style={styles.icon}>{icon}</Text>
        </View>
        <View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    </View>
);

// --- Badge (e.g. "Early Bird") ---
export const Badge = ({ label, icon }: { label: string, icon: string }) => (
    <View style={styles.badge}>
        <Text style={styles.badgeIcon}>{icon}</Text>
        <Text style={styles.badgeLabel}>{label}</Text>
    </View>
);

// --- Progress Block (Linear for now, easier than SVG ring without libs) ---
export const ProgressBlock = ({ percentage }: { percentage: number }) => (
    <View style={styles.progressContainer}>
        <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
        </View>
        <Text style={styles.progressText}>{Math.round(percentage)}% Complete Today</Text>
    </View>
);

const styles = StyleSheet.create({
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: RADIUS.l,
        padding: SPACING.m,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: SPACING.m,
        ...SHADOWS.small,
        minWidth: 140
    },
    iconContainer: {
        width: 40, height: 40, borderRadius: 20,
        justifyContent: 'center', alignItems: 'center', marginRight: SPACING.m
    },
    icon: { fontSize: 20 },
    statValue: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
    statLabel: { fontSize: 12, color: COLORS.textLight },

    badge: {
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.full,
        paddingVertical: 6,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        marginRight: 8,
        marginBottom: 8
    },
    badgeIcon: { fontSize: 14, marginRight: 4 },
    badgeLabel: { fontSize: 12, fontWeight: '600', color: COLORS.text },

    progressContainer: { marginTop: SPACING.m },
    progressBarBg: {
        height: 10, backgroundColor: '#E2E8F0', borderRadius: 5, overflow: 'hidden'
    },
    progressBarFill: {
        height: '100%', backgroundColor: COLORS.success, borderRadius: 5
    },
    progressText: {
        marginTop: 6, fontSize: 12, color: COLORS.textLight, textAlign: 'right'
    }
});
