import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Modal, TextInput, ActivityIndicator, Alert, ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getMyProducts, addProduct, deleteProduct, UserProduct, UserProductCreate } from '../services/api';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../theme';

export default function ShelfScreen() {
    const navigation = useNavigation();
    const [products, setProducts] = useState<UserProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);

    // Form
    const [name, setName] = useState('');
    const [brand, setBrand] = useState('');
    const [category, setCategory] = useState('');

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const data = await getMyProducts();
            setProducts(data);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to load shelf");
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!name) return Alert.alert("Required", "Product Name is missing");

        try {
            const payload: UserProductCreate = {
                product_name: name,
                brand: brand || undefined,
                category: category || undefined,
                status: 'active'
            };
            await addProduct(payload);
            setModalVisible(false);
            setName(''); setBrand(''); setCategory('');
            fetchProducts();
        } catch (error) {
            Alert.alert("Error", "Could not add product");
        }
    };

    const handleDelete = async (id: number) => {
        Alert.alert(
            "Remove Product",
            "Are you sure you want to remove this from your shelf?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteProduct(id);
                            fetchProducts();
                        } catch (e) {
                            Alert.alert("Error", "Failed to delete");
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: UserProduct }) => (
        <View style={styles.card}>
            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    {item.brand && <Text style={styles.brandText}>{item.brand}</Text>}
                    <Text style={styles.productName}>{item.product_name}</Text>
                    {item.category && <Text style={styles.categoryTag}>{item.category}</Text>}
                </View>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.moreButton}>
                    <Text style={styles.moreButtonText}>×</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.cardFooter}>
                <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Shelf</Text>
                <Text style={styles.headerSubtitle}>{products.length} Products</Text>
            </View>

            {/* List */}
            {loading ? (
                <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>
            ) : (
                <FlatList
                    data={products}
                    keyExtractor={i => i.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>Your shelf is empty.</Text>
                            <Text style={styles.emptySubText}>Add your skincare products to track them.</Text>
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

            {/* Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add to Shelf</Text>

                        <TextInput
                            placeholder="Brand (e.g. CeraVe)"
                            style={styles.input}
                            value={brand} onChangeText={setBrand}
                        />
                        <TextInput
                            placeholder="Product Name (e.g. Hydrating Cleanser)"
                            style={styles.input}
                            value={name} onChangeText={setName}
                        />
                        <TextInput
                            placeholder="Category (e.g. Cleanser)"
                            style={styles.input}
                            value={category} onChangeText={setCategory}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelButton}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleAdd} style={styles.saveButton}>
                                <Text style={styles.saveText}>Add Product</Text>
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

    header: {
        padding: SPACING.l,
        paddingTop: SPACING.xl,
        backgroundColor: COLORS.background,
    },
    headerTitle: { ...TYPOGRAPHY.h1, color: COLORS.primary },
    headerSubtitle: { ...TYPOGRAPHY.body, color: COLORS.textLight, marginTop: 4 },

    list: { padding: SPACING.m, paddingBottom: 100 },

    card: {
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.m,
        marginBottom: SPACING.m,
        ...SHADOWS.small,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden'
    },
    cardContent: {
        padding: SPACING.m,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
    },
    cardHeader: { flex: 1 },
    brandText: { ...TYPOGRAPHY.label, color: COLORS.textLight, marginBottom: 2 },
    productName: { ...TYPOGRAPHY.h3, color: COLORS.text, marginBottom: 4 },
    categoryTag: {
        ...TYPOGRAPHY.bodySmall,
        color: COLORS.primary,
        backgroundColor: COLORS.primaryBG,
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: RADIUS.s,
        marginTop: 4
    },

    moreButton: { padding: 4 },
    moreButtonText: { fontSize: 20, color: COLORS.textLight },

    cardFooter: {
        backgroundColor: COLORS.background,
        paddingVertical: 8,
        paddingHorizontal: SPACING.m,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    statusText: { ...TYPOGRAPHY.label, color: COLORS.success, fontSize: 10 },

    emptyState: { alignItems: 'center', marginTop: 60 },
    emptyText: { ...TYPOGRAPHY.h3, color: COLORS.textLight, marginBottom: 8 },
    emptySubText: { ...TYPOGRAPHY.body, color: COLORS.secondaryText },

    fab: {
        position: 'absolute',
        bottom: 30, right: 30,
        width: 60, height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.primary,
        justifyContent: 'center', alignItems: 'center',
        ...SHADOWS.medium
    },
    fabText: { color: '#fff', fontSize: 32, marginTop: -2 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: SPACING.l },
    modalContent: {
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.l,
        padding: SPACING.l,
        ...SHADOWS.large
    },
    modalTitle: { ...TYPOGRAPHY.h2, marginBottom: SPACING.l, textAlign: 'center', color: COLORS.text },
    input: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.m,
        padding: SPACING.m,
        marginBottom: SPACING.m,
        fontSize: 16
    },
    modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.m },
    cancelButton: { padding: SPACING.m },
    cancelText: { color: COLORS.textLight, fontWeight: '600' },
    saveButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.m,
        paddingHorizontal: SPACING.l,
        borderRadius: RADIUS.m,
        ...SHADOWS.small
    },
    saveText: { color: '#fff', fontWeight: 'bold' }
});
