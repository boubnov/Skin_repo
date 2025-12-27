import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Modal, TextInput, ActivityIndicator, Alert, ScrollView, Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import {
    getMyProducts, addProduct, deleteProduct, UserProduct, UserProductCreate,
    startScanJob, pollScanJob, completeScanManually, ScanJobResult
} from '../services/api';
import SafetyGuardOverlay, { SafetyWarning } from '../components/SafetyGuardOverlay';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../theme';

type ScanStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed' | 'partial';

export default function ShelfScreen() {
    const navigation = useNavigation();
    const [products, setProducts] = useState<UserProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);

    // Scan state
    const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
    const [scanProgress, setScanProgress] = useState('');
    const [currentJobId, setCurrentJobId] = useState<string | null>(null);
    const [scanResult, setScanResult] = useState<ScanJobResult | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [brand, setBrand] = useState('');
    const [category, setCategory] = useState('');
    const [ingredients, setIngredients] = useState('');

    // Safety Guard state
    const [safetyWarning, setSafetyWarning] = useState<SafetyWarning | null>(null);
    const [safetyGuardVisible, setSafetyGuardVisible] = useState(false);
    const [pendingProduct, setPendingProduct] = useState<UserProductCreate | null>(null);

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

    // =========== SCAN FUNCTIONALITY ===========
    const handleScanLabel = async () => {
        try {
            // Request permission
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Camera access is required to scan product labels');
                return;
            }

            // Launch camera or picker
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
            });

            if (result.canceled) return;

            const imageUri = result.assets[0].uri;

            // Start scan job
            setScanStatus('uploading');
            setScanProgress('Uploading image...');

            const jobResponse = await startScanJob(imageUri);
            setCurrentJobId(jobResponse.job_id);

            // Poll for completion
            setScanStatus('processing');
            setScanProgress('AI is reading the label...');

            const scanResult = await pollScanJob(
                jobResponse.job_id,
                (status) => {
                    if (status === 'processing') {
                        setScanProgress('Extracting ingredients...');
                    }
                }
            );

            setScanResult(scanResult);

            if (scanResult.status === 'completed' && scanResult.extraction) {
                // Auto-fill form
                setName(scanResult.extraction.product_name || '');
                setBrand(scanResult.extraction.brand || '');
                setCategory(scanResult.extraction.category || '');
                if (scanResult.extraction.ingredients_parsed?.length) {
                    setIngredients(scanResult.extraction.ingredients_parsed.join(', '));
                }
                setScanStatus('completed');
                setScanProgress('Extraction complete!');
            } else if (scanResult.status === 'partial') {
                // Partial extraction - fill what we have
                if (scanResult.extraction) {
                    setName(scanResult.extraction.product_name || '');
                    setBrand(scanResult.extraction.brand || '');
                    setCategory(scanResult.extraction.category || '');
                }
                setScanStatus('partial');
                setScanProgress('Some info extracted. Please fill in the rest.');
            } else {
                setScanStatus('failed');
                setScanProgress(scanResult.error_message || 'Could not read label. Please enter manually.');
            }

        } catch (error: any) {
            console.error('Scan error:', error);
            setScanStatus('failed');
            setScanProgress('Scan failed. Please enter manually.');
        }
    };

    // =========== ADD PRODUCT ===========
    const handleAdd = async () => {
        if (!name) return Alert.alert("Required", "Product Name is missing");

        const payload: UserProductCreate = {
            product_name: name,
            brand: brand || undefined,
            category: category || undefined,
            status: 'active',
            notes: ingredients ? `Ingredients: ${ingredients}` : undefined
        };

        try {
            const response = await addProduct(payload);

            // Check for safety warning in response
            if ((response as any).safety_warning) {
                setSafetyWarning((response as any).safety_warning);
                setPendingProduct(payload);
                setSafetyGuardVisible(true);
            } else {
                // Success - close modal and refresh
                setModalVisible(false);
                resetForm();
                fetchProducts();
            }
        } catch (error) {
            Alert.alert("Error", "Could not add product");
        }
    };

    const handleSafetyAddAnyway = () => {
        // Product was already added with warning - just close and refresh
        setSafetyGuardVisible(false);
        setSafetyWarning(null);
        setModalVisible(false);
        resetForm();
        fetchProducts();
    };

    const handleSafetyCanceled = () => {
        // User cancelled - we should delete the product that was added
        // For now, just close the modal
        setSafetyGuardVisible(false);
        setSafetyWarning(null);
    };

    const resetForm = () => {
        setName('');
        setBrand('');
        setCategory('');
        setIngredients('');
        setScanStatus('idle');
        setScanProgress('');
        setScanResult(null);
        setCurrentJobId(null);
    };

    // =========== DELETE PRODUCT ===========
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

    // =========== RENDER ===========
    const renderItem = ({ item }: { item: UserProduct }) => {
        const isAnalyzing = item.is_analyzing || item.verification_status === 'pending';

        return (
            <View style={[styles.card, isAnalyzing && styles.cardAnalyzing]}>
                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        {isAnalyzing ? (
                            <View style={styles.analyzingContainer}>
                                <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 8 }} />
                                <Text style={styles.analyzingText}>Analyzing Ingredients...</Text>
                            </View>
                        ) : (
                            <>
                                {item.brand && <Text style={styles.brandText}>{item.brand}</Text>}
                                <Text style={styles.productName}>{item.product_name}</Text>
                                {item.category && <Text style={styles.categoryTag}>{item.category}</Text>}
                            </>
                        )}
                    </View>
                    {!isAnalyzing && (
                        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.moreButton}>
                            <Text style={styles.moreButtonText}>×</Text>
                        </TouchableOpacity>
                    )}
                </View>
                <View style={[styles.cardFooter, isAnalyzing && { backgroundColor: 'rgba(0, 210, 255, 0.05)' }]}>
                    <View style={styles.statusBadge}>
                        <Text style={[
                            styles.statusText,
                            isAnalyzing && { color: COLORS.primary },
                            item.verification_status === 'failed' && { color: '#FF5252' }
                        ]}>
                            {isAnalyzing ? "AI PROCESSING" : item.status.toUpperCase()}
                        </Text>
                    </View>
                </View>
                {isAnalyzing && <View style={styles.analyzingBar} />}
            </View>
        );
    };

    const renderScanStatus = () => {
        if (scanStatus === 'idle') return null;

        const statusColors: Record<ScanStatus, string> = {
            idle: COLORS.textLight,
            uploading: COLORS.primary,
            processing: COLORS.primary,
            completed: COLORS.success,
            failed: '#FF5252',
            partial: '#FFB300'
        };

        return (
            <View style={[styles.scanStatusContainer, { borderColor: statusColors[scanStatus] }]}>
                {(scanStatus === 'uploading' || scanStatus === 'processing') && (
                    <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 8 }} />
                )}
                {scanStatus === 'completed' && <Text style={styles.scanStatusIcon}>✅</Text>}
                {scanStatus === 'failed' && <Text style={styles.scanStatusIcon}>❌</Text>}
                {scanStatus === 'partial' && <Text style={styles.scanStatusIcon}>⚠️</Text>}
                <Text style={[styles.scanStatusText, { color: statusColors[scanStatus] }]}>
                    {scanProgress}
                </Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Shelf</Text>
                <Text style={styles.headerSubtitle}>
                    {products.length} Products {products.some(p => p.is_analyzing) && "• Analyzing..."}
                </Text>
            </View>

            {/* List */}
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

            {/* FAB */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => setModalVisible(true)}
            >
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>

            {/* Add Product Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add to Shelf</Text>

                        {/* Scan Button */}
                        <View style={styles.quickActions}>
                            <TouchableOpacity
                                style={[styles.scanBtn, scanStatus !== 'idle' && styles.scanBtnDisabled]}
                                onPress={handleScanLabel}
                                disabled={scanStatus === 'uploading' || scanStatus === 'processing'}
                            >
                                <Text style={styles.scanBtnText}>
                                    {scanStatus === 'idle' ? '📸 Scan Label (AI)' :
                                        scanStatus === 'uploading' ? '📤 Uploading...' :
                                            scanStatus === 'processing' ? '🔍 Processing...' :
                                                '📸 Scan Again'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Scan Status */}
                        {renderScanStatus()}

                        <Text style={styles.modalSubLabel}>OR MANUAL ENTRY</Text>

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
                        <TextInput
                            placeholder="Ingredients (comma-separated)"
                            style={[styles.input, styles.ingredientsInput]}
                            value={ingredients}
                            onChangeText={setIngredients}
                            multiline
                            numberOfLines={3}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }} style={styles.cancelButton}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleAdd} style={styles.saveButton}>
                                <Text style={styles.saveText}>Add Product</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Safety Guard Overlay */}
            <SafetyGuardOverlay
                visible={safetyGuardVisible}
                warning={safetyWarning}
                productName={name}
                onAddAnyway={handleSafetyAddAnyway}
                onCancel={handleSafetyCanceled}
            />
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
        overflow: 'hidden',
        position: 'relative'
    },
    cardAnalyzing: {
        borderColor: COLORS.primary,
        backgroundColor: '#FFF',
    },
    analyzingBar: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: 2,
        backgroundColor: COLORS.primary,
        opacity: 0.6
    },
    analyzingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10
    },
    analyzingText: {
        ...TYPOGRAPHY.body,
        color: COLORS.primary,
        fontWeight: '600',
        fontStyle: 'italic'
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
    modalSubLabel: {
        fontSize: 10, fontWeight: '800', color: COLORS.textLight,
        textAlign: 'center', marginVertical: 15, letterSpacing: 1
    },
    quickActions: {
        marginBottom: 10
    },
    scanBtn: {
        backgroundColor: COLORS.primary,
        padding: 16,
        borderRadius: RADIUS.m,
        alignItems: 'center',
        ...SHADOWS.small
    },
    scanBtnDisabled: {
        backgroundColor: COLORS.primaryBG,
    },
    scanBtnText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 16
    },
    scanStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.m,
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.m,
        borderWidth: 1,
        marginBottom: SPACING.m,
    },
    scanStatusIcon: {
        fontSize: 16,
        marginRight: 8,
    },
    scanStatusText: {
        ...TYPOGRAPHY.body,
        fontWeight: '500',
    },
    input: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.m,
        padding: SPACING.m,
        marginBottom: SPACING.m,
        fontSize: 16
    },
    ingredientsInput: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.m },
    cancelButton: { padding: SPACING.m },
    cancelText: { color: COLORS.textLight, fontWeight: '600' },
    saveButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.m,
        paddingHorizontal: SPACING.l,
        borderRadius: RADIUS.xl,
        ...SHADOWS.small
    },
    saveText: { color: '#fff', fontWeight: 'bold' }
});
