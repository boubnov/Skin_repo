export const COLORS = {
    // Primary - Deep Teal
    primary: '#0F766E',
    primaryLight: '#2DD4BF', // For accents/highlights
    primaryBG: '#F0FDFA', // Very light mint for backgrounds

    // Secondary - Soft Slate
    secondaryButton: '#F1F5F9',
    secondaryText: '#64748B',

    // Status
    success: '#10B981', // Emerald
    successBG: '#ECFDF5',
    error: '#F43F5E',   // Rose
    errorBG: '#FFF1F2',
    warning: '#F59E0B', // Amber
    warningBG: '#FFFBEB',

    // Neutrals
    background: '#F8FAFC', // Slate 50
    card: '#FFFFFF',
    text: '#1E293B',    // Slate 800
    textLight: '#94A3B8', // Slate 400
    border: '#E2E8F0',  // Slate 200

    // Gradients (start, end)
    gradientPrimary: ['#0F766E', '#2DD4BF'],
    gradientWarm: ['#F59E0B', '#F97316'],
    gradientCool: ['#6366F1', '#8B5CF6'],
};

export const TYPOGRAPHY = {
    // Headlines
    h1: {
        fontSize: 32,
        fontWeight: '800' as const,
        letterSpacing: -0.5,
    },
    h2: {
        fontSize: 24,
        fontWeight: '700' as const,
        letterSpacing: -0.3,
    },
    h3: {
        fontSize: 20,
        fontWeight: '600' as const,
    },
    // Body
    bodyLarge: {
        fontSize: 16,
        fontWeight: '400' as const,
        lineHeight: 24,
    },
    body: {
        fontSize: 14,
        fontWeight: '400' as const,
        lineHeight: 20,
    },
    bodySmall: {
        fontSize: 12,
        fontWeight: '400' as const,
        lineHeight: 16,
    },
    // Special
    label: {
        fontSize: 12,
        fontWeight: '600' as const,
        letterSpacing: 0.5,
        textTransform: 'uppercase' as const,
    },
    button: {
        fontSize: 16,
        fontWeight: '600' as const,
        letterSpacing: 0.3,
    },
};

export const SPACING = {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
};

export const SHADOWS = {
    small: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    medium: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
    },
    large: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
    },
};

export const RADIUS = {
    s: 8,
    m: 12,
    l: 16,
    xl: 24,
    full: 9999,
};

export const ANIMATION = {
    fast: 150,
    normal: 250,
    slow: 400,
};
