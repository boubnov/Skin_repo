import React, { useEffect, useRef } from 'react';
import { View, Image, Text, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
    onAnimationComplete: () => void;
}

export default function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const pulseAnim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        // 1. Entrance Fade & Tagline Fade (Simultaneous)
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();

        // 2. Continuous Backlight Pulse
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.3,
                    duration: 1500,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // 3. Haptic Sync (Simulated for Web/Web-friendly)
        setTimeout(() => {
            console.log("[Haptic] UIImpactFeedbackStyleLight triggered at 400ms");
        }, 400);

        // 4. Exit Animation (Scale down + Fade out)
        setTimeout(() => {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 0.9,
                    duration: 600,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                onAnimationComplete();
            });
        }, 2500); // 2.5 seconds total reveal time
    }, []);

    return (
        <View style={styles.container}>
            {/* Radial Backlight Pulse */}
            <Animated.View
                style={[
                    styles.backlight,
                    { opacity: pulseAnim }
                ]}
            />

            <Animated.View style={[
                styles.logoContainer,
                {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }]
                }
            ]}>
                <Image
                    source={{ uri: '/Users/mbvk/Documents/skin_app/company_images/splash.png' }}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text style={styles.tagline}>The Art of Intelligent Skincare</Text>
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
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 9999,
    },
    backlight: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: COLORS.primary,
        // Radial effect simulated via shadow/blur for React Native
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 100,
        ...(Platform.OS === 'web' ? {
            filter: 'blur(80px)',
            background: `radial-gradient(circle, ${COLORS.primary} 0%, transparent 70%)`
        } : {}),
    },
    logoContainer: {
        alignItems: 'center',
        marginTop: -height * 0.1, // 40% headroom logic (centering - 10%)
    },
    logo: {
        width: width * 0.7,
        height: width * 0.7,
    },
    tagline: {
        ...TYPOGRAPHY.bodyLarge,
        color: COLORS.textLight,
        marginTop: SPACING.l,
        textAlign: 'center',
        letterSpacing: 2,
        opacity: 0.8,
    }
});
