import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Modal, TextInput, Alert, ActivityIndicator
} from 'react-native';
import { api } from '../services/api';
import { COLORS, SPACING, SHADOWS, RADIUS } from '../theme';

type ProductLog = {
    id: number;
    product_name: string;
    brand?: string;
    status: 'safe' | 'unsafe' | 'wishlist';
    notes?: string;
    rating?: number;
};

export default function HistoryScreen() {
    const [activeTab, setActiveTab] = useState<'safe' | 'unsafe'>('safe');
    const [logs, setLogs] = useState<ProductLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [brand, setBrand] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const res = await api.get('/history/'); // Trailing slash is important
            setLogs(res.data);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to fetch history.");
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!name) return Alert.alert("Validation", "Product Name is required");

        try {
            const payload = {
                product_name: name,
                brand: brand || undefined,
                status: activeTab, // Add to currently viewed list
                notes: notes || undefined
            };
            await api.post('/history/', payload);
            setModalVisible(false);
            setName(''); setBrand(''); setNotes('');
            fetchLogs(); // Refresh
        } catch (error) {
            Alert.alert("Error", "Failed to add product.");
        }
    };

    // Filter logs for display
    const filteredLogs = logs.filter(l => l.status === activeTab);

    const renderItem = ({ item }: { item: ProductLog }) => (
        <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: item.status === 'safe' ? COLORS.success : COLORS.error }]}>
            <Text style={styles.cardTitle}>{item.product_name}</Text>
            {item.brand && <Text style={styles.cardSubtitle}>{item.brand}</Text>}
            {item.notes && <Text style={styles.cardNotes}>"{item.notes}"</Text>}
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'safe' && styles.activeTabSafe]}
                    onPress={() => setActiveTab('safe')}
                >
                    <Text style={[styles.tabText, activeTab === 'safe' && styles.activeTabText]}>Safe List 🟢</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'unsafe' && styles.activeTabUnsafe]}
                    onPress={() => setActiveTab('unsafe')}
                >
                    <Text style={[styles.tabText, activeTab === 'unsafe' && styles.activeTabText]}>Blacklist 🔴</Text>
                </TouchableOpacity>
            </View>

            {/* List */}
            {loading ? (
                <ActivityIndicator size="large" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={filteredLogs}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No products in this list yet.</Text>
                    }
                />
            )}

            {/* Floating Action Button */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: activeTab === 'safe' ? COLORS.success : COLORS.error }]}
                onPress={() => setModalVisible(true)}
            >
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>

            {/* Add Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add to {activeTab === 'safe' ? 'Safe List' : 'Blacklist'}</Text>

                        <TextInput
                            placeholder="Product Name (e.g. CeraVe)"
                            style={styles.input}
                            value={name} onChangeText={setName}
                        />
                        <TextInput
                            placeholder="Brand (Optional)"
                            style={styles.input}
                            value={brand} onChangeText={setBrand}
                        />
                        <TextInput
                            placeholder="Notes (e.g. Caused redness)"
                            style={styles.input}
                            value={notes} onChangeText={setNotes}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelButton}>
                                <Text>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleAdd} style={styles.saveButton}>
                                <Text style={styles.saveButtonText}>Save</Text>
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

    // Tabs (Segmented Control)
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.m,
        marginTop: SPACING.m,
        marginBottom: SPACING.m
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: RADIUS.l,
        backgroundColor: COLORS.border, // Inactive
        marginHorizontal: 4
    },
    activeTabSafe: { backgroundColor: COLORS.success }, // Solid Color
    activeTabUnsafe: { backgroundColor: COLORS.error }, // Solid Color

    tabText: { fontWeight: '600', color: COLORS.textLight },
    activeTabText: { color: '#fff', fontWeight: 'bold' }, // White text on solid color

    list: { paddingHorizontal: SPACING.m },
    card: {
        backgroundColor: COLORS.card,
        padding: SPACING.m,
        marginBottom: SPACING.s,
        borderRadius: RADIUS.m,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.small
    },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
    cardSubtitle: { color: COLORS.textLight, fontSize: 14, marginBottom: 4 },
    cardNotes: { marginTop: 4, fontStyle: 'italic', color: COLORS.secondaryText, fontSize: 13 },

    emptyText: { textAlign: 'center', color: COLORS.textLight, marginTop: 40 },

    // FAB
    fab: {
        position: 'absolute', bottom: 30, right: 30, width: 56, height: 56,
        borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center',
        ...SHADOWS.medium
    },
    fabText: { color: '#fff', fontSize: 30, lineHeight: 30 },

    // Modal (Keep roughly same, just updated colors)
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: COLORS.card, padding: 24, borderRadius: RADIUS.l, ...SHADOWS.medium },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center', color: COLORS.text },
    input: {
        borderWidth: 1, borderColor: COLORS.border, padding: 12,
        borderRadius: RADIUS.s, marginBottom: 12, backgroundColor: COLORS.background
    },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
    cancelButton: { padding: 12 },
    saveButton: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: RADIUS.s },
    saveButtonText: { color: '#fff', fontWeight: 'bold' }
});
