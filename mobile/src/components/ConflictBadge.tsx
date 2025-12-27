// Conflict Badge Component - Shows warning indicator on products with conflicts
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SHADOWS } from '../theme';

interface Props {
    riskLevel: 'CRITICAL' | 'WARNING' | 'ADVICE';
    onPress?: () => void;
}

export default function ConflictBadge({ riskLevel, onPress }: Props) {
    const getColor = () => {
        switch (riskLevel) {
            case 'CRITICAL': return '#DC2626';
            case 'WARNING': return '#F59E0B';
            case 'ADVICE': return '#3B82F6';
            default: return COLORS.primary;
        }
    };

    const getIcon = () => {
        switch (riskLevel) {
            case 'CRITICAL': return '⚠';
            case 'WARNING': return '!';
            case 'ADVICE': return 'i';
            default: return '!';
        }
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            style={[styles.badge, { backgroundColor: getColor() }]}
            activeOpacity={0.8}
        >
            <Text style={styles.icon}>{getIcon()}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    badge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.small,
    },
    icon: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
});
