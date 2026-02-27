export const colors = {
    bg: '#000000',
    bgSecondary: '#080808',
    bgTertiary: '#121212',
    surface: '#0F0F0F',
    surfaceLight: '#1A1A1A',
    border: '#1E1E1E',
    borderLight: '#2A2A2A',

    primary: '#FFFFFF',
    primaryDark: '#E0E0E0',
    white: '#FFFFFF',

    textPrimary: '#FFFFFF',
    textSecondary: '#999999',
    textMuted: '#555555',

    red: '#FF3B30',
    redDark: '#DC143C',
    redLight: 'rgba(255, 59, 48, 0.08)',
    redGlow: 'rgba(255, 59, 48, 0.12)',

    success: '#FFFFFF',
    warning: '#FF3B30',
    danger: '#FF3B30',
    disabled: '#2A2A2A',

    overlay: 'rgba(255, 255, 255, 0.06)',
    overlayDark: 'rgba(0, 0, 0, 0.6)',

    transparent: 'transparent',
};

export const fonts = {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    sizes: {
        xs: 11,
        sm: 13,
        md: 15,
        lg: 17,
        xl: 22,
        xxl: 28,
        hero: 40,
    },
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const radius = {
    xs: 4,
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
    full: 999,
};

export const shadows = {
    none: {},
    sm: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 1,
    },
    md: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 3,
    },
    lg: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 6,
    },
    red: {
        shadowColor: '#FF3B30',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 5,
    },
};

export const components = {
    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.lg,
    },
    button: {
        primary: {
            backgroundColor: colors.white,
            borderRadius: radius.full,
            paddingVertical: 18,
            paddingHorizontal: spacing.xl,
        },
        secondary: {
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.full,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
        },
        danger: {
            backgroundColor: colors.red,
            borderRadius: radius.full,
            paddingVertical: 18,
            paddingHorizontal: spacing.xl,
        },
    },
    input: {
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: spacing.lg,
        paddingVertical: 14,
        color: colors.textPrimary,
        fontSize: fonts.sizes.md,
    },
    header: {
        standard: {
            paddingVertical: spacing.lg,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
        },
        centered: {
            flexDirection: 'row' as const,
            justifyContent: 'space-between' as const,
            alignItems: 'center' as const,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.sm,
        },
    },
};
