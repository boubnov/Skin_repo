import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';

export default function LoginScreen() {
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [agreed, setAgreed] = useState(false);

    const handleMockGoogleLogin = async () => {
        console.log("Mock Google Login Pressed");
        if (!agreed) {
            Alert.alert("Required", "You must agree to the Terms of Service.");
            return;
        }

        setLoading(true);
        try {
            // 1. Simulate getting an ID Token from Google SDK
            const mockIdToken = "mock_google_id_token_123";

            // 2. Send to Backend
            const response = await api.post('/auth/google', {
                id_token: mockIdToken,
                tos_agreed: agreed
            });

            // 3. Backend returns Access Token
            const { access_token } = response.data;

            // 4. Login Locally
            await login(access_token);

        } catch (error: any) {
            console.error("Login Error:", error);

            let errorMessage = "Could not connect to server";
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                errorMessage = `Server Error (${error.response.status}):\n${JSON.stringify(error.response.data, null, 2)}`;
            } else if (error.request) {
                // The request was made but no response was received
                errorMessage = "Network Error: No response received from server. Check if backend is running.";
            } else {
                // Something happened in setting up the request that triggered an Error
                errorMessage = `Request Error: ${error.message}`;
            }

            Alert.alert("Login Failed", errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.logo}>🧴✨</Text>
            <Text style={styles.title}>Skincare AI</Text>
            <Text style={styles.subtitle}>Your personal dermatologist.</Text>

            <View style={styles.buttonContainer}>
                <View style={styles.termsContainer}>
                    <TouchableOpacity onPress={() => setAgreed(!agreed)}>
                        <Text style={styles.checkbox}>{agreed ? "✅" : "⬜️"}</Text>
                    </TouchableOpacity>
                    <Text style={styles.termsText} onPress={() => Alert.alert("Terms", "Terms...")}>
                        I agree to Terms & Conditions
                    </Text>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={COLORS.primary} />
                ) : (
                    <TouchableOpacity
                        style={[styles.googleButton, { opacity: agreed ? 1 : 0.5 }]}
                        onPress={handleMockGoogleLogin}
                        disabled={!agreed}
                    >
                        <Text style={styles.googleButtonText}>Sign in with Google</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.l,
        backgroundColor: COLORS.background,
    },
    logo: {
        fontSize: 64,
        marginBottom: SPACING.m,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: SPACING.s,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.secondaryText,
        marginBottom: SPACING.xl,
        textAlign: 'center',
    },
    termsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.l,
    },
    checkbox: {
        fontSize: 24,
        marginRight: 10,
    },
    termsText: {
        fontSize: 14,
        color: COLORS.textLight,
        textDecorationLine: 'underline',
    },
    buttonContainer: {
        width: '100%',
        backgroundColor: COLORS.card,
        padding: SPACING.l,
        borderRadius: RADIUS.l,
        ...SHADOWS.medium,
        alignItems: 'center',
    },
    googleButton: {
        flexDirection: 'row',
        backgroundColor: COLORS.primary,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: RADIUS.full,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.small
    },
    googleButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 8
    }
});
