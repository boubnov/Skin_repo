import React from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { COLORS, SHADOWS, RADIUS } from '../theme';

export const ResponsiveContainer = ({ children }: { children: React.ReactNode }) => {
    const { width } = useWindowDimensions();

    if (Platform.OS !== 'web') {
        return <>{children}</>;
    }

    const isLargeScreen = width > 768;

    if (isLargeScreen) {
        // Desktop/Tablet: Render full width (for WebDashboard)
        return <View style={{ flex: 1 }}>{children}</View>;
    }

    return (
        <View style={styles.webContainer}>
            <View style={styles.phoneFrame}>
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    webContainer: {
        flex: 1,
        backgroundColor: '#E2E8F0', // Slate 200 background
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20
    },
    phoneFrame: {
        width: 400,
        height: '95%',
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.l,
        overflow: 'hidden',
        borderWidth: 8,
        borderColor: '#1E293B', // Dark Bezel
        ...SHADOWS.medium,
    },
    webMobile: {
        flex: 1,
        backgroundColor: COLORS.background,
        maxWidth: 500,
        alignSelf: 'center',
        width: '100%',
        height: '100%',
        ...SHADOWS.small
    }
});
