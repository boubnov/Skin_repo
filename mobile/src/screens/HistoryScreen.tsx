import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Modal, TextInput, Alert, ActivityIndicator, Image, Platform
} from 'react-native';
import { api } from '../services/api';
import { COLORS, SPACING, SHADOWS, RADIUS, TYPOGRAPHY } from '../theme';

type JournalEntry = {
    id: number;
    date: string; // ISO String
    overall_condition: number;
    notes?: string;
    photo_url?: string;
    tags?: string[];
};

export default function HistoryScreen() {
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);

    // Check-in State
    const [condition, setCondition] = useState(3);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        fetchJournal();
    }, []);

    const fetchJournal = async () => {
        try {
            setLoading(true);
            const res = await api.get('/journal/');
            setEntries(res.data);
        } catch (error) {
            console.error(error);
            // Alert.alert("Error", "Failed to load journal");
        } finally {
            setLoading(false);
        }
    };

    const handleCheckIn = async () => {
        try {
            const payload = {
                overall_condition: condition,
                notes: notes,
                tags: [] // Future: Add tags UI
            };
            await api.post('/journal/', payload);
            setModalVisible(false);
            setNotes(''); setCondition(3);
            fetchJournal();
        } catch (error) {
            Alert.alert("Error", "Failed to save check-in");
        }
    };

    const handleDelete = async (id: number) => {
        Alert.alert("Delete Entry", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    await api.delete(`/journal/${id}`);
                    fetchJournal();
                }
            }
        ]);
    };

    const getConditionLabel = (val: number) => {
        switch (val) {
            case 1: return "Poor";
            case 2: return "Fair";
            case 3: return "Okay";
            case 4: return "Good";
            case 5: return "Excellent";
            default: return "—";
        }
    };

    const renderItem = ({ item }: { item: JournalEntry }) => {
        const dateObj = new Date(item.date);
        const day = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
        const time = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        return (
            <View style={styles.timelineItem}>
                {/* Date Spine */}
                <View style={styles.dateCol}>
                    <Text style={styles.dateText}>{day}</Text>
                    <Text style={styles.timeText}>{time}</Text>
                    <View style={styles.line} />
                </View>

                {/* Content Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={styles.conditionBadge}>
                            <Text style={styles.conditionText}>{getConditionLabel(item.overall_condition)}</Text>
                        </View>
                        <TouchableOpacity onPress={() => handleDelete(item.id)}>
                            <Text style={styles.deleteText}>×</Text>
                        </TouchableOpacity>
                    </View>

                    {item.notes ? (
                        <Text style={styles.notesText}>{item.notes}</Text>
                    ) : (
                        <Text style={styles.emptyNotes}>No notes added.</Text>
                    )}

                    {/* Placeholder for Photo if we add it later */}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Skin Journal</Text>
                <Text style={styles.headerSubtitle}>Track progress over time.</Text>
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>
            ) : (
                <FlatList
                    data={entries}
                    keyExtractor={i => i.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={styles.emptyText}>No check-ins yet.</Text>
                            <Text style={styles.emptySubText}>Tap + to log your skin today.</Text>
                        </View>
                    }
                />
            )}

            {/* FAB */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => setModalVisible(true)}
            >
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>

            {/* Check-in Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Daily Check-In</Text>

                        <Text style={styles.label}>How is your skin today?</Text>
                        <View style={styles.ratingRow}>
                            {[1, 2, 3, 4, 5].map(v => (
                                <TouchableOpacity
                                    key={v}
                                    style={[styles.ratingBtn, condition === v && styles.ratingBtnActive]}
                                    onPress={() => setCondition(v)}
                                >
                                    <Text style={[styles.ratingText, condition === v && styles.ratingTextActive]}>{v}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={styles.ratingLabelCenter}>{getConditionLabel(condition)}</Text>

                        <Text style={styles.label}>Notes</Text>
                        <TextInput
                            style={styles.textArea}
                            placeholder="Details (e.g. Broke out after pizza...)"
                            multiline
                            numberOfLines={3}
                            value={notes} onChangeText={setNotes}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelButton}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleCheckIn} style={styles.saveButton}>
                                <Text style={styles.saveText}>Save Entry</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: { padding: SPACING.l, paddingTop: SPACING.xl, backgroundColor: COLORS.card },
    headerTitle: { ...TYPOGRAPHY.h1, color: COLORS.text, marginBottom: 4 },
    headerSubtitle: { ...TYPOGRAPHY.body, color: COLORS.textLight },

    list: { padding: SPACING.m, paddingBottom: 100 },

    timelineItem: { flexDirection: 'row', marginBottom: SPACING.l },
    dateCol: { width: 60, alignItems: 'center', marginRight: SPACING.s },
    dateText: { fontWeight: 'bold', color: COLORS.text, fontSize: 13 },
    timeText: { color: COLORS.textLight, fontSize: 11 },
    line: { width: 2, flex: 1, backgroundColor: COLORS.border, marginTop: 4 },

    card: { flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.m, padding: SPACING.m, ...SHADOWS.small },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    conditionBadge: { backgroundColor: COLORS.primaryBG, borderRadius: RADIUS.s, paddingHorizontal: 8, paddingVertical: 2 },
    conditionText: { color: COLORS.primary, fontWeight: '600', fontSize: 12 },
    deleteText: { color: COLORS.textLight, fontSize: 18, marginTop: -4 },
    notesText: { ...TYPOGRAPHY.body, color: COLORS.text },
    emptyNotes: { ...TYPOGRAPHY.body, color: COLORS.textLight, fontStyle: 'italic' },

    fab: {
        position: 'absolute', bottom: 30, right: 30,
        width: 60, height: 60, borderRadius: 30,
        backgroundColor: COLORS.primary,
        justifyContent: 'center', alignItems: 'center', ...SHADOWS.medium
    },
    fabText: { color: '#fff', fontSize: 32, marginTop: -2 },

    emptyText: { ...TYPOGRAPHY.h3, color: COLORS.textLight, marginBottom: 8 },
    emptySubText: { ...TYPOGRAPHY.body, color: COLORS.secondaryText },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: SPACING.l },
    modalContent: { backgroundColor: COLORS.card, borderRadius: RADIUS.l, padding: SPACING.l, ...SHADOWS.large },
    modalTitle: { ...TYPOGRAPHY.h2, textAlign: 'center', marginBottom: SPACING.l },
    label: { ...TYPOGRAPHY.label, color: COLORS.textLight, marginBottom: 8 },

    ratingRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    ratingBtn: {
        width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
        justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background
    },
    ratingBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    ratingText: { fontWeight: 'bold', color: COLORS.text },
    ratingTextActive: { color: '#fff' },
    ratingLabelCenter: { textAlign: 'center', color: COLORS.primary, fontWeight: '600', marginBottom: SPACING.l },

    textArea: {
        backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
        borderRadius: RADIUS.m, padding: SPACING.m, height: 80, marginBottom: SPACING.l
    },
    modalActions: { flexDirection: 'row', justifyContent: 'space-between' },
    cancelButton: { padding: SPACING.m },
    cancelText: { color: COLORS.textLight, fontWeight: '600' },
    saveButton: {
        backgroundColor: COLORS.primary, paddingVertical: SPACING.m, paddingHorizontal: SPACING.l,
        borderRadius: RADIUS.m
    },
    saveText: { color: '#fff', fontWeight: 'bold' }
});
