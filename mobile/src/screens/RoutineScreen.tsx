import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, FlatList, Image } from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { api, linkProductToRoutine, getMyProducts, UserProduct } from '../services/api';

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

    const renderRoutineItem = (item: RoutineItem) => (
        <View key={item.id} style={styles.card}>
            <TouchableOpacity
                style={[styles.checkCircle, item.is_completed && styles.checkCircleCompleted]}
                onPress={() => toggleStep(item.id, item.period)}
            >
                {item.is_completed && <Ionicons name="checkmark" size={16} color="#FFF" />}
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
                <Text style={[styles.itemText, item.is_completed && styles.itemTextCompleted]}>
                    {item.name}
                </Text>
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
            {/* Header with Streak */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Your Routine</Text>
                    <Text style={styles.headerSubtitle}>Keep up the glow!</Text>
                </View>
                <View style={styles.streakBadge}>
                    <Ionicons name="flame" size={20} color={COLORS.primary} />
                    <Text style={styles.streakText}>{routine?.streak || 0}</Text>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Morning Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="sunny" size={20} color={COLORS.warning} />
                        <Text style={styles.sectionTitle}>Morning</Text>
                    </View>
                    {routine?.am.map(renderRoutineItem)}
                </View>

                {/* Evening Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="moon" size={20} color={COLORS.primary} />
                        <Text style={styles.sectionTitle}>Evening</Text>
                    </View>
                    {routine?.pm.map(renderRoutineItem)}
                </View>
            </ScrollView>

            {/* Link Product Modal Stub */}
            <Modal visible={linkModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Link Product</Text>
                        <Text>Product linking implementation coming soon.</Text>
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
    container: { flex: 1, backgroundColor: 'transparent' }, // Transparent to blend with dashboard
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: SPACING.l,
    },
    headerTitle: { ...TYPOGRAPHY.h2, color: COLORS.text },
    headerSubtitle: { ...TYPOGRAPHY.body, color: COLORS.textLight },
    streakBadge: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
        paddingHorizontal: SPACING.m, paddingVertical: SPACING.s, borderRadius: RADIUS.l,
        ...SHADOWS.small
    },
    streakText: { marginLeft: 4, fontWeight: 'bold', color: COLORS.text },

    section: { marginBottom: SPACING.xl },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.m },
    sectionTitle: { marginLeft: 8, fontSize: 18, fontWeight: '600', color: COLORS.text },

    card: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
        padding: SPACING.m, borderRadius: RADIUS.m, marginBottom: SPACING.s,
        ...SHADOWS.small
    },
    checkCircle: {
        width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: COLORS.border,
        marginRight: SPACING.m, justifyContent: 'center', alignItems: 'center'
    },
    checkCircleCompleted: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },

    itemText: { fontSize: 16, fontWeight: '500', color: COLORS.text },
    itemTextCompleted: { color: COLORS.textLight, textDecorationLine: 'line-through' },
    brandText: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
    linkText: { fontSize: 12, color: COLORS.primary, marginTop: 2, fontWeight: '600' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: SPACING.l },
    modalContent: { backgroundColor: COLORS.card, borderRadius: RADIUS.l, padding: SPACING.l, ...SHADOWS.large },
    modalTitle: { ...TYPOGRAPHY.h2, textAlign: 'center', marginBottom: SPACING.m },
    closeButton: { marginTop: SPACING.m, alignSelf: 'center', padding: SPACING.s },
    closeButtonText: { color: COLORS.primary, fontWeight: 'bold' }
});

