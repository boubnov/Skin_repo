// Warm Neutral Palette (Aesop/Hims inspired)
// Premium, gender-neutral, professional healthcare aesthetic

export const COLORS = {
    // Primary - Warm Brown/Tan
    primary: '#8B7355',
    primaryLight: '#C4956A', // Copper accent
    primaryBG: '#F5F0EB', // Warm cream background

    // Secondary
    secondaryButton: '#F0EBE5',
    secondaryText: '#6B6560',

    // Status
    success: '#6B8E6B', // Sage green
    successBG: '#F0F5F0',
    error: '#B85C5C',   // Muted red
    errorBG: '#FDF5F5',
    warning: '#C99A4D', // Warm amber
    warningBG: '#FDF8F0',

    // Neutrals
    background: '#FAF8F5', // Warm off-white
    card: '#FFFFFF',
    text: '#2D2D2D',    // Near black
    textLight: '#8A8580', // Warm gray
    border: '#E8E4DF',  // Warm light gray

    // Gradients (start, end)
    gradientPrimary: ['#8B7355', '#C4956A'],
    gradientWarm: ['#C4956A', '#D4A574'],
    gradientCool: ['#6B8E6B', '#8BA88B'],
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
        shadowColor: "#2D2D2D",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 2,
    },
    medium: {
        shadowColor: "#2D2D2D",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 4,
    },
    large: {
        shadowColor: "#2D2D2D",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
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
