import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { storage } from '../utils/storage';

export default function SettingsScreen() {
    const [apiKey, setApiKey] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadKey();
    }, []);

    const loadKey = async () => {
        try {
            const storedKey = await storage.getItem('user_google_api_key');
            if (storedKey) {
                setApiKey(storedKey);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!apiKey.trim()) {
            Alert.alert("Error", "Please enter a valid key");
            return;
        }
        setLoading(true);
        try {
            await storage.setItem('user_google_api_key', apiKey.trim());
            Alert.alert("Success", "API Key saved securely.");
        } catch (e) {
            Alert.alert("Error", "Could not save key");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Settings</Text>

            <Text style={styles.label}>Google Gemini API Key (BYOK)</Text>
            <Text style={styles.hint}>
                Your key is stored securely on this device and never saved to our servers.
            </Text>

            <TextInput
                style={styles.input}
                value={apiKey}
                onChangeText={setApiKey}
                placeholder="AIzaSy..."
                secureTextEntry
            />

            <View style={styles.spacer} />
            <Button title="Save Key" onPress={handleSave} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        marginTop: 40,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 15,
    },
    hint: {
        fontSize: 12,
        color: '#666',
        marginBottom: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        borderRadius: 5,
        marginTop: 5,
        fontSize: 16
    },
    spacer: {
        height: 30
    }
});
