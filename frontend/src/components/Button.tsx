import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, components } from '../theme';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    icon?: keyof typeof Ionicons.glyphMap;
    disabled?: boolean;
    loading?: boolean;
    style?: ViewStyle;
}

//------This Function handles the Button---------
export default function Button({
    title,
    onPress,
    variant = 'primary',
    icon,
    disabled,
    loading,
    style
}: ButtonProps) {
    const getButtonStyle = (): ViewStyle => {
        if (disabled) {
            return styles.disabled;
        }
        switch (variant) {
            case 'secondary':
                return styles.secondary;
            case 'danger':
                return styles.danger;
            default:
                return styles.primary;
        }
    };

    const getTextStyle = (): TextStyle => {
        if (disabled) {
            return styles.disabledText;
        }
        switch (variant) {
            case 'secondary':
                return styles.secondaryText;
            case 'danger':
                return styles.dangerText;
            default:
                return styles.primaryText;
        }
    };

    return (
        <TouchableOpacity
            style={[styles.base, getButtonStyle(), style]}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
        >
            {loading ? (
                <ActivityIndicator
                    size="small"
                    color={variant === 'primary' ? colors.bg : colors.white}
                />
            ) : (
                <>
                    <Text style={[styles.text, getTextStyle()]}>{title}</Text>
                    {icon && (
                        <Ionicons
                            name={icon}
                            size={18}
                            color={variant === 'primary' ? colors.bg : colors.white}
                        />
                    )}
                </>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        height: 56,
    },
    primary: components.button.primary,
    secondary: components.button.secondary,
    danger: components.button.danger,
    disabled: {
        ...components.button.primary,
        backgroundColor: colors.surfaceLight,
        opacity: 0.4,
    },
    text: {
        fontSize: fonts.sizes.md,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    primaryText: {
        color: colors.bg,
    },
    secondaryText: {
        color: colors.textPrimary,
    },
    dangerText: {
        color: colors.white,
    },
    disabledText: {
        color: colors.textMuted,
    },
});
