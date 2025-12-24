import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { api } from '../services/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';

type RoutineItem = {
    id: number;
    name: string;
    period: 'am' | 'pm';
    is_completed: boolean;
};

type RoutineData = {
    am: RoutineItem[];
    pm: RoutineItem[];
    streak: number;
};

export default function RoutineScreen() {
    const [routine, setRoutine] = useState<RoutineData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchRoutine = async () => {
        try {
            const res = await api.get('/routine/');
            setRoutine(res.data);
        } catch (error) {
            Alert.alert("Error", "Failed to load routine");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRoutine();
    }, []);

    const toggleItem = async (id: number) => {
        // Optimistic UI Update
        if (!routine) return;

        const updateList = (list: RoutineItem[]) =>
            list.map(i => i.id === id ? { ...i, is_completed: !i.is_completed } : i);

        setRoutine(prev => prev ? ({
            ...prev,
            am: updateList(prev.am),
            pm: updateList(prev.pm)
        }) : null);

        try {
            await api.post(`/routine/toggle/${id}`);
            // Background re-fetch to sync streak details if needed
            // const res = await api.get('/routine/'); setRoutine(res.data);
        } catch (error) {
            Alert.alert("Error", "Failed to update routine");
            fetchRoutine(); // Revert on error
        }
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.streakContainer}>
                <Text style={styles.streakNumber}>{routine?.streak || 0}</Text>
                <Text style={styles.streakLabel}>Day Streak</Text>
            </View>
            <Text style={styles.subHeader}>Consistency is key to clear skin.</Text>
        </View>
    );

    const renderItem = ({ item }: { item: RoutineItem }) => (
        <TouchableOpacity
            style={[styles.card, item.is_completed && styles.cardCompleted]}
            onPress={() => toggleItem(item.id)}
        >
            <View style={styles.checkCircle}>
                {item.is_completed && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.itemText, item.is_completed && styles.itemTextCompleted]}>{item.name}</Text>
        </TouchableOpacity>
    );

    if (isLoading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;

    return (
        <View style={styles.container}>
            {renderHeader()}

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>☀️ Morning</Text>
                <FlatList
                    data={routine?.am}
                    keyExtractor={i => i.id.toString()}
                    renderItem={renderItem}
                    scrollEnabled={false}
                />
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>🌙 Evening</Text>
                <FlatList
                    data={routine?.pm}
                    keyExtractor={i => i.id.toString()}
                    renderItem={renderItem}
                    scrollEnabled={false}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.m },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: {
        alignItems: 'center',
        marginBottom: SPACING.l,
        marginTop: SPACING.m,
        backgroundColor: COLORS.card,
        padding: SPACING.m,
        borderRadius: RADIUS.l,
        ...SHADOWS.medium
    },
    streakContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    streakNumber: { fontSize: 32, fontWeight: 'bold', color: COLORS.primary, marginRight: 8 },
    streakLabel: { fontSize: 16, color: COLORS.textLight, fontWeight: '600', textTransform: 'uppercase' },
    subHeader: { color: COLORS.secondaryText, fontSize: 13 },

    section: { marginBottom: SPACING.l },
    sectionTitle: {
        fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.s,
        marginLeft: 4
    },

    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        padding: SPACING.m,
        borderRadius: RADIUS.m,
        marginBottom: SPACING.s,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.small
    },
    cardCompleted: {
        backgroundColor: COLORS.successBG,
        borderColor: COLORS.successBG
    },
    checkCircle: {
        width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: COLORS.primaryLight,
        marginRight: SPACING.m, justifyContent: 'center', alignItems: 'center'
    },
    checkmark: { color: COLORS.success, fontWeight: 'bold', fontSize: 14 },

    itemText: { fontSize: 16, color: COLORS.text, fontWeight: '500' },
    itemTextCompleted: { color: COLORS.secondaryText, textDecorationLine: 'line-through' }
});
