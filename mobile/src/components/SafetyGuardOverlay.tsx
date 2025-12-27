import React from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView
} from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../theme';

export interface SafetyConflict {
    risk_level: 'CRITICAL' | 'WARNING' | 'ADVICE';
    ingredient_a: string;
    ingredient_b: string;
    interaction_type: string;
    reasoning: string;
    recommended_adjustment: string;
    source: string;
}

export interface SafetyWarning {
    has_critical: boolean;
    message: string;
    recommendation: string;
    conflicts: SafetyConflict[];
}

interface SafetyGuardOverlayProps {
    visible: boolean;
    warning: SafetyWarning | null;
    productName?: string;
    onMoveToMorning?: () => void;
    onAddAnyway: () => void;
    onCancel: () => void;
}

export default function SafetyGuardOverlay({
    visible,
    warning,
    productName,
    onMoveToMorning,
    onAddAnyway,
    onCancel
}: SafetyGuardOverlayProps) {
    if (!warning) return null;

    const isCritical = warning.has_critical;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <View style={[
                    styles.container,
                    isCritical && styles.containerCritical
                ]}>
                    {/* Header */}
                    <View style={[
                        styles.header,
                        isCritical ? styles.headerCritical : styles.headerWarning
                    ]}>
                        <Text style={styles.headerIcon}>
                            {isCritical ? '⚠️' : '⚡'}
                        </Text>
                        <Text style={styles.headerTitle}>
                            {isCritical ? 'Safety Alert' : 'Ingredient Notice'}
                        </Text>
                    </View>

                    {/* Content */}
                    <ScrollView style={styles.content}>
                        <Text style={styles.message}>
                            {warning.message}
                        </Text>

                        {/* Conflict Details */}
                        {warning.conflicts.map((conflict, idx) => (
                            <View key={idx} style={[
                                styles.conflictCard,
                                conflict.risk_level === 'CRITICAL' && styles.conflictCritical,
                                conflict.risk_level === 'WARNING' && styles.conflictWarning,
                                conflict.risk_level === 'ADVICE' && styles.conflictAdvice
                            ]}>
                                <View style={styles.conflictHeader}>
                                    <Text style={styles.conflictIngredients}>
                                        {conflict.ingredient_a} ↔ {conflict.ingredient_b}
                                    </Text>
                                    <Text style={[
                                        styles.riskBadge,
                                        conflict.risk_level === 'CRITICAL' && styles.riskCritical,
                                        conflict.risk_level === 'WARNING' && styles.riskWarning,
                                        conflict.risk_level === 'ADVICE' && styles.riskAdvice
                                    ]}>
                                        {conflict.risk_level}
                                    </Text>
                                </View>
                                <Text style={styles.conflictReasoning}>
                                    {conflict.reasoning}
                                </Text>
                                <Text style={styles.conflictSource}>
                                    Source: {conflict.source}
                                </Text>
                            </View>
                        ))}

                        {/* Recommendation */}
                        <View style={styles.recommendation}>
                            <Text style={styles.recommendationLabel}>💡 Recommendation</Text>
                            <Text style={styles.recommendationText}>
                                {warning.recommendation}
                            </Text>
                        </View>
                    </ScrollView>

                    {/* Actions */}
                    <View style={styles.actions}>
                        {onMoveToMorning && (
                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={onMoveToMorning}
                            >
                                <Text style={styles.primaryButtonText}>
                                    ☀️ Move to Morning
                                </Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[
                                styles.secondaryButton,
                                isCritical && styles.dangerButton
                            ]}
                            onPress={onAddAnyway}
                        >
                            <Text style={[
                                styles.secondaryButtonText,
                                isCritical && styles.dangerButtonText
                            ]}>
                                {isCritical ? '⚠️ Add Anyway (Not Recommended)' : 'Add Anyway'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={onCancel}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.l,
    },
    container: {
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.l,
        maxWidth: 500,
        width: '100%',
        maxHeight: '80%',
        ...SHADOWS.large,
    },
    containerCritical: {
        borderWidth: 2,
        borderColor: '#FF5252',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.l,
        borderTopLeftRadius: RADIUS.l,
        borderTopRightRadius: RADIUS.l,
    },
    headerCritical: {
        backgroundColor: '#FFEBEE',
    },
    headerWarning: {
        backgroundColor: '#FFF8E1',
    },
    headerIcon: {
        fontSize: 24,
        marginRight: SPACING.s,
    },
    headerTitle: {
        ...TYPOGRAPHY.h2,
        color: COLORS.text,
    },
    content: {
        padding: SPACING.l,
        maxHeight: 300,
    },
    message: {
        ...TYPOGRAPHY.body,
        color: COLORS.text,
        marginBottom: SPACING.m,
        lineHeight: 22,
    },
    conflictCard: {
        backgroundColor: COLORS.background,
        padding: SPACING.m,
        borderRadius: RADIUS.m,
        marginBottom: SPACING.s,
        borderLeftWidth: 4,
    },
    conflictCritical: {
        borderLeftColor: '#FF5252',
    },
    conflictWarning: {
        borderLeftColor: '#FFB300',
    },
    conflictAdvice: {
        borderLeftColor: COLORS.primary,
    },
    conflictHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    conflictIngredients: {
        ...TYPOGRAPHY.h3,
        color: COLORS.text,
        flex: 1,
        fontSize: 14,
    },
    riskBadge: {
        fontSize: 10,
        fontWeight: 'bold',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: RADIUS.s,
        overflow: 'hidden',
    },
    riskCritical: {
        backgroundColor: '#FF5252',
        color: '#fff',
    },
    riskWarning: {
        backgroundColor: '#FFB300',
        color: '#000',
    },
    riskAdvice: {
        backgroundColor: COLORS.primary,
        color: '#fff',
    },
    conflictReasoning: {
        ...TYPOGRAPHY.bodySmall,
        color: COLORS.textLight,
        marginBottom: 4,
    },
    conflictSource: {
        ...TYPOGRAPHY.label,
        color: COLORS.secondaryText,
        fontStyle: 'italic',
    },
    recommendation: {
        backgroundColor: '#E3F2FD',
        padding: SPACING.m,
        borderRadius: RADIUS.m,
        marginTop: SPACING.m,
    },
    recommendationLabel: {
        ...TYPOGRAPHY.label,
        color: COLORS.primary,
        marginBottom: 4,
    },
    recommendationText: {
        ...TYPOGRAPHY.body,
        color: COLORS.text,
    },
    actions: {
        padding: SPACING.l,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    primaryButton: {
        backgroundColor: COLORS.primary,
        padding: SPACING.m,
        borderRadius: RADIUS.m,
        alignItems: 'center',
        marginBottom: SPACING.s,
        ...SHADOWS.small,
    },
    primaryButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    secondaryButton: {
        backgroundColor: COLORS.background,
        padding: SPACING.m,
        borderRadius: RADIUS.m,
        alignItems: 'center',
        marginBottom: SPACING.s,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    secondaryButtonText: {
        color: COLORS.text,
        fontWeight: '600',
    },
    dangerButton: {
        borderColor: '#FF5252',
    },
    dangerButtonText: {
        color: '#FF5252',
    },
    cancelButton: {
        padding: SPACING.s,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: COLORS.textLight,
        fontWeight: '500',
    },
});
