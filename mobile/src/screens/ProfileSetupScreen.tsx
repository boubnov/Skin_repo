import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ProfileSetupScreen({ navigation }: any) {
    const { setHasProfile } = useAuth();
    const [age, setAge] = useState('');
    const [skinType, setSkinType] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            await api.put('/users/me/profile', {
                age: parseInt(age),
                skin_type: skinType
            });
            // Update Context to trigger navigation in App.tsx
            setHasProfile(true);
        } catch (error: any) {
            console.error(error);
            Alert.alert("Error", "Could not save profile.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Tell us about you</Text>

            <Text style={styles.label}>Age</Text>
            <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
                placeholder="e.g. 25"
            />

            <Text style={styles.label}>Skin Type</Text>
            <TextInput
                style={styles.input}
                value={skinType}
                onChangeText={setSkinType}
                placeholder="e.g. Oily, Dry, Combo"
            />

            <View style={styles.spacer} />

            {loading ? (
                <ActivityIndicator />
            ) : (
                <Button title="Save Profile" onPress={handleSave} />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
        justifyContent: 'center'
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 30,
        textAlign: 'center'
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 15,
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
