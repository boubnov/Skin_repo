// Triaskin AI Interface Refresh: "Dermatological Clarity"
// High-end, futuristic skincare clinic - sterile but welcoming

export const COLORS = {
    // The Primary Palette (Hydration & Trust)
    primary: '#00D2FF',      // Electric Cyan Start
    primaryAccent: '#3A7BD5', // Electric Cyan End
    accent: '#FF9A8B',       // Soft Coral (Human Tone)
    primaryBG: '#FAFBFF',    // Active White (Base Surface)

    // Secondary / Status
    secondaryButton: '#F0F4F8',
    secondaryText: '#636E72', // Slate Grey (Body Text)
    success: '#00B894',
    successBG: '#EBFBF5',
    error: '#D63031',
    errorBG: '#FFF5F5',
    warning: '#FDCB6E',
    warningBG: '#FFF9EB',

    // Neutrals
    background: '#FAFBFF',   // Active White
    card: '#FFFFFF',
    text: '#2D3436',         // Dark Charcoal (Headers)
    textLight: '#636E72',    // Slate Grey (Body)
    border: '#E1E8ED',       // Card Border

    // Gradients (Electric Cyan)
    gradientPrimary: ['#00D2FF', '#3A7BD5'],
    gradientAccent: ['#FF9A8B', '#FF7F6D'],
};

export const TYPOGRAPHY = {
    // Headlines
    h1: {
        fontSize: 32,
        fontWeight: '700' as const,
        letterSpacing: -0.5,
    },
    h2: {
        fontSize: 24,
        fontWeight: '600' as const,
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
        fontSize: 11,
        fontWeight: '600' as const,
        letterSpacing: 1,
        textTransform: 'uppercase' as const,
    },
    button: {
        fontSize: 15,
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
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    medium: {
        shadowColor: "#2D3436",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 5,
    },
    large: {
        shadowColor: "#2D3436",
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.08,
        shadowRadius: 30,
        elevation: 10,
    },
};

export const RADIUS = {
    s: 12, // Softer
    m: 16, // Softer
    l: 24, // Bouncy
    xl: 32, // Extra Bouncy
    full: 9999,
};

export const ANIMATION = {
    fast: 150,
    normal: 250,
    slow: 400,
};
