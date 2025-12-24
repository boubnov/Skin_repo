import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, Animated, Linking } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../theme';

export default function LoginScreen() {
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [agreed, setAgreed] = useState(false);

    // Animation
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleMockGoogleLogin = async () => {
        if (!agreed) {
            Alert.alert("Required", "Please agree to the Terms & Privacy Policy to continue.");
            return;
        }

        setLoading(true);
        try {
            const mockIdToken = "mock_google_id_token_123";
            const response = await api.post('/auth/google', {
                id_token: mockIdToken,
                tos_agreed: agreed
            });
            const { access_token } = response.data;
            await login(access_token);
        } catch (error: any) {
            let errorMessage = "Could not connect to server";
            if (error.response) {
                errorMessage = `Server Error (${error.response.status})`;
            } else if (error.request) {
                errorMessage = "Network Error: Check if backend is running.";
            }
            Alert.alert("Login Failed", errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Gradient-like background effect */}
            <View style={styles.backgroundCircle} />
            <View style={styles.backgroundCircle2} />

            <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                {/* Logo & Branding */}
                <View style={styles.brandingSection}>
                    <Text style={styles.logo}>🧴</Text>
                    <Text style={styles.title}>Skincare AI</Text>
                    <Text style={styles.subtitle}>Your AI-powered skincare assistant</Text>
                </View>

                {/* Login Card */}
                <View style={styles.loginCard}>
                    {/* Trust Indicators */}
                    <View style={styles.trustBadges}>
                        <View style={styles.badge}>
                            <Text style={styles.badgeIcon}>🔒</Text>
                            <Text style={styles.badgeText}>Private & Secure</Text>
                        </View>
                        <View style={styles.badge}>
                            <Text style={styles.badgeIcon}>✨</Text>
                            <Text style={styles.badgeText}>Personalized</Text>
                        </View>
                    </View>

                    {/* Terms Checkbox */}
                    <TouchableOpacity
                        style={styles.termsContainer}
                        onPress={() => setAgreed(!agreed)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                            {agreed && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={styles.termsText}>
                            I agree to the{' '}
                            <Text style={styles.termsLink} onPress={() => Alert.alert("Terms", "Terms of Service...")}>
                                Terms
                            </Text>
                            {' & '}
                            <Text style={styles.termsLink} onPress={() => Alert.alert("Privacy", "Privacy Policy...")}>
                                Privacy Policy
                            </Text>
                        </Text>
                    </TouchableOpacity>

                    {/* Google Sign In Button */}
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                            <Text style={styles.loadingText}>Signing in...</Text>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={[styles.googleButton, !agreed && styles.googleButtonDisabled]}
                            onPress={handleMockGoogleLogin}
                            disabled={!agreed}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.googleIcon}>G</Text>
                            <Text style={styles.googleButtonText}>Continue with Google</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Footer */}
                <Text style={styles.footer}>
                    Your data stays on your device. We never sell your information.
                </Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.l,
    },

    // Background decorations
    backgroundCircle: {
        position: 'absolute',
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: COLORS.primaryBG,
        opacity: 0.8,
    },
    backgroundCircle2: {
        position: 'absolute',
        bottom: -50,
        left: -50,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: COLORS.primaryBG,
        opacity: 0.5,
    },

    content: {
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
    },

    // Branding
    brandingSection: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    logo: {
        fontSize: 72,
        marginBottom: SPACING.m,
    },
    title: {
        ...TYPOGRAPHY.h1,
        color: COLORS.primary,
        marginBottom: SPACING.xs,
    },
    subtitle: {
        ...TYPOGRAPHY.bodyLarge,
        color: COLORS.secondaryText,
        textAlign: 'center',
    },

    // Login Card
    loginCard: {
        width: '100%',
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.xl,
        padding: SPACING.l,
        ...SHADOWS.large,
    },

    // Trust Badges
    trustBadges: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: SPACING.l,
        gap: SPACING.m,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primaryBG,
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.s,
        borderRadius: RADIUS.full,
    },
    badgeIcon: {
        fontSize: 14,
        marginRight: SPACING.xs,
    },
    badgeText: {
        ...TYPOGRAPHY.bodySmall,
        color: COLORS.primary,
        fontWeight: '600',
    },

    // Terms
    termsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.l,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: RADIUS.s,
        borderWidth: 2,
        borderColor: COLORS.border,
        marginRight: SPACING.s,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.card,
    },
    checkboxChecked: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    checkmark: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    termsText: {
        ...TYPOGRAPHY.body,
        color: COLORS.textLight,
        flex: 1,
    },
    termsLink: {
        color: COLORS.primary,
        fontWeight: '600',
    },

    // Loading
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: SPACING.m,
    },
    loadingText: {
        ...TYPOGRAPHY.body,
        color: COLORS.textLight,
        marginTop: SPACING.s,
    },

    // Google Button
    googleButton: {
        flexDirection: 'row',
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingVertical: 14,
        paddingHorizontal: SPACING.l,
        borderRadius: RADIUS.full,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.small,
    },
    googleButtonDisabled: {
        opacity: 0.5,
    },
    googleIcon: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#4285F4',
        marginRight: SPACING.s,
    },
    googleButtonText: {
        ...TYPOGRAPHY.button,
        color: COLORS.text,
    },

    // Footer
    footer: {
        ...TYPOGRAPHY.bodySmall,
        color: COLORS.textLight,
        textAlign: 'center',
        marginTop: SPACING.l,
        paddingHorizontal: SPACING.l,
    },
});
