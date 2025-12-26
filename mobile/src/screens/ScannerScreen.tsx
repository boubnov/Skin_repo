import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Button, TextInput, Alert, Platform } from 'react-native';
import { CameraView, Camera } from 'expo-camera';

export default function ScannerScreen({ navigation }: any) {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);
    const [manualCode, setManualCode] = useState("");
    const [manualLink, setManualLink] = useState("");
    const [product, setProduct] = useState<any>(null);

    useEffect(() => {
        if (Platform.OS !== 'web') {
            const getPermissions = async () => {
                const { status } = await Camera.requestCameraPermissionsAsync();
                setHasPermission(status === 'granted');
            };
            getPermissions();
        } else {
            // Web: Don't request immediately. Assume manual input first.
            setHasPermission(false);
        }
    }, []);

    const handleBarCodeScanned = async ({ type, data }: any) => {
        setScanned(true);
        await fetchProduct(data);
    };

    const fetchProduct = async (barcode: string) => {
        try {
            // Use localhost for web, or 10.0.2.2 for Android emulator
            // For physical device, replace with your IP
            const apiUrl = Platform.OS === 'web'
                ? `http://localhost:8000/products/barcode/${barcode}`
                : `http://10.0.2.2:8000/products/barcode/${barcode}`;

            console.log(`Fetching: ${apiUrl}`);
            const response = await fetch(apiUrl);

            if (response.ok) {
                const data = await response.json();
                setProduct(data);
                Alert.alert("Product Found!", `${data.name}\n${data.brand}`);
            } else {
                console.log("Fetch failed", response.status);
                Alert.alert("Not Found", "We don't have this product yet. Take a photo to analyze it? (Coming Soon)");
                setProduct(null);
            }
        } catch (error) {
            console.error("Error fetching product:", error);
            Alert.alert("Error", "Could not connect to backend.");
        }
    };

    // Web or No Permission State -> Show Manual Input
    if (hasPermission === false || Platform.OS === 'web') {
        return (
            <View style={styles.container}>
                <View style={styles.manualContainer}>
                    <Text style={styles.title}>Find Product</Text>
                    <Text style={styles.subtitle}>
                        {Platform.OS === 'web' ? "Enter a barcode (e.g. from the product label):" : "Camera access denied. Enter code manually:"}
                    </Text>

                    <TextInput
                        style={styles.mainInput}
                        placeholder="e.g. 3606000537439"
                        value={manualCode}
                        onChangeText={setManualCode}
                    />

                    <View style={styles.divider}>
                        <Text style={styles.dividerText}>OR</Text>
                    </View>

                    <TextInput
                        style={styles.mainInput}
                        placeholder="Paste Product URL (e.g. sephora.com/...)"
                        value={manualLink}
                        onChangeText={setManualLink}
                    />

                    <View style={styles.buttonRow}>
                        <Button title="Search Barcode" onPress={() => fetchProduct(manualCode)} disabled={!manualCode} />
                        <View style={{ width: 20 }} />
                        <Button title="Analyze Link" onPress={() => Alert.alert("Coming Soon", "Link scraper not yet connected to frontend.")} disabled={!manualLink} />
                    </View>

                    {product && (
                        <View style={styles.resultCard}>
                            <Text style={styles.productName}>{product.name}</Text>
                            <Text style={styles.productBrand}>{product.brand}</Text>
                            <Text style={styles.productTier}>{product.confidence_tier}</Text>
                        </View>
                    )}

                    {Platform.OS === 'web' && (
                        <Text style={{ marginTop: 20, color: '#666', fontStyle: 'italic', textAlign: 'center' }}>
                            (Camera scanning is optimized for the Mobile App.{"\n"}Paste a link to import new products.)
                        </Text>
                    )}
                </View>
            </View>
        );
    }

    if (hasPermission === null) {
        return <View style={styles.container}><Text style={{ color: '#fff' }}>Requesting camera permission...</Text></View>;
    }

    return (
        <View style={styles.container}>
            {/* Camera View */}
            <View style={styles.cameraContainer}>
                <CameraView
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    barcodeScannerSettings={{
                        barcodeTypes: ["ean13", "upc_e"],
                    }}
                    style={StyleSheet.absoluteFillObject}
                />
            </View>

            {/* Overlay UI */}
            <View style={styles.overlay}>
                {scanned && (
                    <Button title={'Tap to Scan Again'} onPress={() => { setScanned(false); setProduct(null); }} />
                )}

                {/* Debug / Web Fallback */}
                <View style={styles.manualInput}>
                    <Text style={styles.label}>Manual Barcode Entry (Debug):</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 3606000537439"
                        value={manualCode}
                        onChangeText={setManualCode}
                    />
                    <Button title="Go" onPress={() => fetchProduct(manualCode)} />
                </View>

                {product && (
                    <View style={styles.resultCard}>
                        <Text style={styles.productName}>{product.name}</Text>
                        <Text style={styles.productBrand}>{product.brand}</Text>
                        <Text style={styles.productTier}>{product.confidence_tier}</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        backgroundColor: '#000',
    },
    cameraContainer: {
        flex: 1,
        maxHeight: '60%'
    },
    overlay: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 20,
        alignItems: 'center'
    },
    manualInput: {
        marginTop: 20,
        width: '100%',
        alignItems: 'center'
    },
    label: {
        fontWeight: 'bold',
        marginBottom: 5
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        width: '80%',
        marginBottom: 10,
        borderRadius: 5
    },
    resultCard: {
        marginTop: 20,
        padding: 20,
        backgroundColor: '#f0f0f0',
        borderRadius: 10,
        width: '100%'
    },
    productName: {
        fontSize: 18,
        fontWeight: 'bold'
    },
    productBrand: {
        fontSize: 16,
        color: '#666'
    },
    productTier: {
        fontSize: 12,
        color: 'blue',
        marginTop: 5
    },
    // New Styles
    manualContainer: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 30,
        justifyContent: 'center',
        alignItems: 'center',
        maxWidth: 600, // Limit width on big screens
        alignSelf: 'center',
        width: '100%'
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
        textAlign: 'center'
    },
    mainInput: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 15,
        width: '100%',
        marginBottom: 10,
        borderRadius: 8,
        fontSize: 16
    },
    divider: {
        marginVertical: 15,
        alignItems: 'center'
    },
    dividerText: {
        color: '#999',
        fontWeight: 'bold'
    },
    buttonRow: {
        flexDirection: 'row',
        marginTop: 10,
        marginBottom: 20
    }
});
