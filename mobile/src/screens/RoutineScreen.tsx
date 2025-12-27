import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, FlatList, Image } from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { api, linkProductToRoutine, getMyProducts, UserProduct, SafetyConflict, checkRoutineConflicts } from '../services/api';
import SafetyGuardToast from '../components/SafetyGuardToast';
import ConflictBadge from '../components/ConflictBadge';

// MOCK TYPES
type RoutineItem = {

    id: number;
    name: string;
    period: 'am' | 'pm';
    is_completed: boolean;
    user_product_id?: number;
    product_details?: {
        name: string;
        brand?: string;
    };
    // Safety Guard: Track conflicts per item
    conflict?: SafetyConflict;
};

type RoutineData = {
    am: RoutineItem[];
    pm: RoutineItem[];
    streak: number;
};

// MOCK DATA
const MOCK_ROUTINE: RoutineData = {
    streak: 5,
    am: [
        { id: 1, name: 'Cleanser', period: 'am', is_completed: true, product_details: { name: 'Gentle Cleanser', brand: 'CeraVe' } },
        { id: 2, name: 'Vitamin C', period: 'am', is_completed: false, product_details: { name: 'C-Firma', brand: 'Drunk Elephant' } },
        { id: 3, name: 'Moisturizer', period: 'am', is_completed: false },
        { id: 4, name: 'SPF', period: 'am', is_completed: false },
    ],
    pm: [
        { id: 5, name: 'Cleanser', period: 'pm', is_completed: false },
        { id: 6, name: 'Retinol', period: 'pm', is_completed: false },
        { id: 7, name: 'Moisturizer', period: 'pm', is_completed: false },
    ]
};

export default function RoutineScreen() {
    const [routine, setRoutine] = useState<RoutineData | null>(MOCK_ROUTINE);
    const [isLoading, setIsLoading] = useState(false);

    // Product Linking State (Mocked)
    const [linkModalVisible, setLinkModalVisible] = useState(false);
    const [selectedStepId, setSelectedStepId] = useState<number | null>(null);

    // Safety Guard State
    const [activeConflict, setActiveConflict] = useState<SafetyConflict | null>(null);
    const [showToast, setShowToast] = useState(false);

    const toggleStep = (id: number, period: 'am' | 'pm') => {
        if (!routine) return;
        const updatedList = routine[period].map(item =>
            item.id === id ? { ...item, is_completed: !item.is_completed } : item
        );
        setRoutine({ ...routine, [period]: updatedList });
    };

    const handleLinkProduct = (stepId: number) => {
        setSelectedStepId(stepId);
        setLinkModalVisible(true);
    };

    // Progress Calculations
    const amTotal = routine?.am.length || 0;
    const amCompleted = routine?.am.filter(i => i.is_completed).length || 0;
    const pmTotal = routine?.pm.length || 0;
    const pmCompleted = routine?.pm.filter(i => i.is_completed).length || 0;
    const totalSteps = amTotal + pmTotal;
    const completedSteps = amCompleted + pmCompleted;
    const progressPercent = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    const amFinished = amTotal > 0 && amCompleted === amTotal;
    const pmFinished = pmTotal > 0 && pmCompleted === pmTotal;

    const ProgressRing = () => (
        <View style={styles.ringContainer}>
            <View style={[styles.ringOuter, {
                // @ts-ignore - Simulated donut for web
                backgroundImage: `conic-gradient(${COLORS.primary} ${progressPercent}%, rgba(0, 210, 255, 0.1) 0%)`
            }]}>
                <View style={styles.ringInner}>
                    <Text style={styles.ringValue}>{completedSteps}/{totalSteps}</Text>
                    <Text style={styles.ringLabel}>Daily Steps</Text>
                </View>
            </View>
        </View>
    );

    const renderRoutineItem = (item: RoutineItem) => (
        <View key={item.id} style={styles.card}>
            <TouchableOpacity
                style={[
                    styles.radioCircle,
                    item.is_completed && styles.radioCircleActive
                ]}
                onPress={() => toggleStep(item.id, item.period)}
            >
                {item.is_completed && <Ionicons name="checkmark" size={20} color="#FFF" />}
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.itemText, item.is_completed && styles.itemTextCompleted]}>
                        {item.name}
                    </Text>
                    {/* Safety Guard: Conflict Badge */}
                    {item.conflict && (
                        <View style={{ marginLeft: 8 }}>
                            <ConflictBadge
                                riskLevel={item.conflict.risk_level}
                                onPress={() => {
                                    setActiveConflict(item.conflict!);
                                    setShowToast(true);
                                }}
                            />
                        </View>
                    )}
                </View>
                {item.product_details ? (
                    <Text style={styles.brandText}>
                        {item.product_details.brand} • {item.product_details.name}
                    </Text>
                ) : (
                    <TouchableOpacity onPress={() => handleLinkProduct(item.id)}>
                        <Text style={styles.linkText}>+ Link Product</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Safety Guard Toast */}
            <SafetyGuardToast
                conflict={activeConflict}
                visible={showToast}
                onDismiss={() => setShowToast(false)}
            />

            {/* Hero Banner */}
            <View style={styles.heroBanner}>
                <View style={styles.heroTextContent}>
                    <Text style={styles.headerTitle}>Your Journey</Text>
                    <Text style={styles.headerSubtitle}>Keep up the glow!</Text>
                    <View style={styles.streakBadgeMini}>
                        <Ionicons name="flame" size={16} color={COLORS.primaryAccent || COLORS.primary} />
                        <Text style={styles.streakTextMini}>{routine?.streak || 0} Day Streak</Text>
                    </View>
                </View>
                <ProgressRing />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Morning Section */}
                <View style={[styles.sectionCard, amFinished && styles.sectionCardFinished]}>
                    <View style={styles.sectionHeader}>
                        <View style={[styles.iconBox, amFinished && styles.iconBoxGlow]}>
                            <Ionicons
                                name={amFinished ? "sunny" : "sunny-outline"}
                                size={22}
                                color={amFinished ? "#FFF" : COLORS.primary}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.sectionTitle}>Morning Routine</Text>
                            <Text style={styles.sectionCounter}>{amCompleted}/{amTotal} Completed</Text>
                        </View>
                    </View>
                    {routine?.am.map(renderRoutineItem)}
                </View>

                {/* Evening Section */}
                <View style={[styles.sectionCard, pmFinished && styles.sectionCardFinished]}>
                    <View style={styles.sectionHeader}>
                        <View style={[styles.iconBox, pmFinished && styles.iconBoxGlow]}>
                            <Ionicons
                                name={pmFinished ? "moon" : "moon-outline"}
                                size={22}
                                color={pmFinished ? "#FFF" : COLORS.primary}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.sectionTitle}>Evening Routine</Text>
                            <Text style={styles.sectionCounter}>{pmCompleted}/{pmTotal} Completed</Text>
                        </View>
                    </View>
                    {routine?.pm.map(renderRoutineItem)}
                </View>
            </ScrollView>

            {/* Link Product Modal Stub */}
            <Modal visible={linkModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Link Product</Text>
                        <Text style={{ textAlign: 'center', color: COLORS.textLight }}>Product linking implementation coming soon.</Text>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setLinkModalVisible(false)}
                        >
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },

    // Hero Banner
    heroBanner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.l,
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.xl,
        marginBottom: SPACING.xl,
        ...SHADOWS.medium,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    heroTextContent: { flex: 1 },
    headerTitle: { ...TYPOGRAPHY.h1, color: COLORS.text, fontSize: 24, marginBottom: 4 },
    headerSubtitle: { ...TYPOGRAPHY.body, color: COLORS.textLight, marginBottom: 12 },
    streakBadgeMini: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primaryBG,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: RADIUS.full,
        alignSelf: 'flex-start',
    },
    streakTextMini: { marginLeft: 4, fontSize: 12, fontWeight: '700', color: COLORS.primary },

    // Progress Ring
    ringContainer: {
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ringOuter: {
        width: 90,
        height: 90,
        borderRadius: 45,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ringInner: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: COLORS.card,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ringValue: { fontSize: 18, fontWeight: '800', color: COLORS.text },
    ringLabel: { fontSize: 10, color: COLORS.textLight, fontWeight: '600' },

    // Section Styling
    sectionCard: {
        backgroundColor: 'rgba(255,255,255,0.4)',
        borderRadius: RADIUS.xl,
        padding: SPACING.m,
        marginBottom: SPACING.xl,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    sectionCardFinished: {
        backgroundColor: 'rgba(255,255,255,0.6)',
        borderColor: 'rgba(0, 210, 255, 0.2)',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.l,
        paddingHorizontal: SPACING.s,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.l,
        backgroundColor: COLORS.primaryBG,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.m,
        // @ts-ignore
        transition: 'all 0.3s ease-in-out',
    },
    iconBoxGlow: {
        backgroundColor: COLORS.primary,
        // @ts-ignore - Web shadow for glow
        boxShadow: `0 0 20px 5px rgba(0, 210, 255, 0.4)`,
    },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
    sectionCounter: { fontSize: 12, color: COLORS.textLight, fontWeight: '600' },

    // Routine Items (Cards)
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        padding: SPACING.m,
        borderRadius: RADIUS.l,
        marginBottom: SPACING.s,
        ...SHADOWS.small,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    radioCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: COLORS.border,
        marginRight: SPACING.m,
        justifyContent: 'center',
        alignItems: 'center',
        // @ts-ignore
        transition: 'all 0.2s ease',
    },
    radioCircleActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
        // @ts-ignore - Linear gradient for web radio buttons
        backgroundImage: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryAccent || COLORS.primary} 100%)`,
    },

    itemText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
    itemTextCompleted: { color: COLORS.textLight, textDecorationLine: 'line-through', opacity: 0.7 },
    brandText: { fontSize: 12, color: COLORS.textLight, marginTop: 2, fontWeight: '500' },
    linkText: { fontSize: 12, color: COLORS.primary, marginTop: 2, fontWeight: '700' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: SPACING.l },
    modalContent: { backgroundColor: COLORS.card, borderRadius: RADIUS.l, padding: SPACING.l, ...SHADOWS.large },
    modalTitle: { ...TYPOGRAPHY.h2, textAlign: 'center', marginBottom: SPACING.m },
    closeButton: { marginTop: SPACING.m, alignSelf: 'center', padding: SPACING.s },
    closeButtonText: { color: COLORS.primary, fontWeight: 'bold' }
});

