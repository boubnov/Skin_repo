// Safety Guard Toast Component
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';
import { SafetyConflict } from '../services/api';

interface Props {
    conflict: SafetyConflict | null;
    visible: boolean;
    onDismiss: () => void;
    onViewDetails?: () => void;
}

export default function SafetyGuardToast({ conflict, visible, onDismiss, onViewDetails }: Props) {
    const slideAnim = useRef(new Animated.Value(-150)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible && conflict) {
            // Slide in
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 80,
                    friction: 10,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();

            // Auto-dismiss after 8 seconds for non-critical
            if (conflict.risk_level !== 'CRITICAL') {
                const timer = setTimeout(() => {
                    handleDismiss();
                }, 8000);
                return () => clearTimeout(timer);
            }
        }
    }, [visible, conflict]);

    const handleDismiss = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: -150,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => onDismiss());
    };

    if (!visible || !conflict) return null;

    const getRiskColor = () => {
        switch (conflict.risk_level) {
            case 'CRITICAL': return '#DC2626'; // Red
            case 'WARNING': return '#F59E0B';  // Amber
            case 'ADVICE': return '#3B82F6';   // Blue
            default: return COLORS.primary;
        }
    };

    const getRiskIcon = () => {
        switch (conflict.risk_level) {
            case 'CRITICAL': return '🚨';
            case 'WARNING': return '⚠️';
            case 'ADVICE': return '💡';
            default: return '⚠️';
        }
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [{ translateY: slideAnim }],
                    opacity: opacityAnim,
                    borderLeftColor: getRiskColor(),
                }
            ]}
        >
            <View style={styles.header}>
                <Text style={styles.icon}>{getRiskIcon()}</Text>
                <Text style={[styles.riskLabel, { color: getRiskColor() }]}>
                    {conflict.risk_level}
                </Text>
                <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
                    <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.title}>
                {conflict.ingredient_a} + {conflict.ingredient_b}
            </Text>

            <Text style={styles.reasoning} numberOfLines={2}>
                {conflict.reasoning}
            </Text>

            <View style={styles.footer}>
                <Text style={styles.recommendation} numberOfLines={1}>
                    💊 {conflict.recommended_adjustment}
                </Text>
                {onViewDetails && (
                    <TouchableOpacity onPress={onViewDetails}>
                        <Text style={styles.detailsLink}>Details →</Text>
                    </TouchableOpacity>
                )}
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 20,
        left: 16,
        right: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: RADIUS.m,
        padding: SPACING.m,
        borderLeftWidth: 4,
        ...SHADOWS.medium,
        zIndex: 1000,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.s,
    },
    icon: {
        fontSize: 20,
        marginRight: SPACING.s,
    },
    riskLabel: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        flex: 1,
    },
    closeButton: {
        padding: 4,
    },
    closeText: {
        fontSize: 16,
        color: COLORS.textLight,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: SPACING.xs,
    },
    reasoning: {
        fontSize: 13,
        color: COLORS.textLight,
        lineHeight: 18,
        marginBottom: SPACING.s,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    recommendation: {
        fontSize: 12,
        color: COLORS.primary,
        flex: 1,
    },
    detailsLink: {
        fontSize: 12,
        color: COLORS.primary,
        fontWeight: '600',
    },
});
