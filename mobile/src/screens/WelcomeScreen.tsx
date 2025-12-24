import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';

export default function WelcomeScreen({ navigation }: any) {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                {/* Logo or App Name */}
                <View style={styles.header}>
                    <Text style={styles.emoji}>✨</Text>
                    <Text style={styles.title}>Skincare AI</Text>
                    <Text style={styles.subtitle}>Your personalized skincare copilot</Text>
                </View>

                {/* Hero Illustration (Placeholder) */}
                <View style={styles.heroContainer}>
                    <Text style={styles.heroText}>
                        Discover routines, track progress, and get expert AI advice tailored to your skin.
                    </Text>
                    <View style={styles.featureRow}>
                        <Feature icon="🧴" text="Routine Builder" />
                        <Feature icon="📊" text="Track Progress" />
                        <Feature icon="💬" text="AI Consultant" />
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => navigation.navigate('Login')}
                    >
                        <Text style={styles.primaryButtonText}>Get Started</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => navigation.navigate('Login')}
                    >
                        <Text style={styles.secondaryButtonText}>I already have an account</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

function Feature({ icon, text }: { icon: string, text: string }) {
    return (
        <View style={styles.feature}>
            <Text style={styles.featureIcon}>{icon}</Text>
            <Text style={styles.featureText}>{text}</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: SPACING.xl,
        maxWidth: 500,
        alignSelf: 'center',
        width: '100%',
    },
    header: {
        alignItems: 'center',
        marginBottom: SPACING.xl * 1.5,
    },
    emoji: {
        fontSize: 60,
        marginBottom: SPACING.m,
    },
    title: {
        fontSize: 36,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: SPACING.s,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 18,
        color: COLORS.textLight,
        textAlign: 'center',
    },
    heroContainer: {
        marginBottom: SPACING.xl * 2,
    },
    heroText: {
        fontSize: 16,
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: SPACING.xl,
        lineHeight: 24,
    },
    featureRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: SPACING.xl,
    },
    feature: {
        alignItems: 'center',
    },
    featureIcon: {
        fontSize: 24,
        marginBottom: SPACING.xs,
    },
    featureText: {
        fontSize: 12,
        color: COLORS.textLight,
        fontWeight: '500',
    },
    actions: {
        gap: SPACING.m,
    },
    primaryButton: {
        backgroundColor: COLORS.primary,
        padding: SPACING.l,
        borderRadius: RADIUS.m,
        alignItems: 'center',
        ...SHADOWS.medium,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        padding: SPACING.m,
        borderRadius: RADIUS.m,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: COLORS.text,
        fontSize: 15,
        fontWeight: '600',
    },
});
