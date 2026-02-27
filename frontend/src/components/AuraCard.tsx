import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radius, spacing, fonts } from '../theme';
import { Ionicons } from '@expo/vector-icons';

interface Props {
    title: string;
    subtitle?: string;
    icon?: ReactNode;
    onPress?: () => void;
    style?: ViewStyle;
    variant?: 'default' | 'danger' | 'success';
}

//------This Function handles the Aura Card---------
export default function AuraCard({ title, subtitle, icon, onPress, style, variant = 'default' }: Props) {
    const isDanger = variant === 'danger';

    const handlePress = () => {
        if (onPress) {
            if (isDanger) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } else {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            onPress();
        }
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.7}
            disabled={!onPress}
            accessibilityLabel={title}
            accessibilityHint={subtitle || `Open ${title}`}
            accessibilityRole="button"
            style={[s.card, isDanger && s.cardDanger, style]}
        >
            <View style={s.content}>
                {icon ? (
                    <View style={[s.iconWrap, isDanger && s.iconWrapDanger]}>
                        {icon}
                    </View>
                ) : (
                    <View style={s.spacer} />
                )}

                <View style={s.textWrap}>
                    <Text style={[s.title, isDanger && s.textDanger]}>{title}</Text>
                    {subtitle && <Text style={[s.subtitle, isDanger && s.textDangerOps]}>{subtitle}</Text>}
                </View>

                <Ionicons name="chevron-forward" size={16} color={isDanger ? colors.danger : colors.textMuted} style={{ opacity: 0.6 }} />
            </View>
        </TouchableOpacity>
    );
}

const s = StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    cardDanger: {
        borderColor: 'rgba(255, 59, 48, 0.3)',
        backgroundColor: 'rgba(255, 59, 48, 0.04)',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    iconWrap: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: colors.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconWrapDanger: {
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
    },
    spacer: {
        width: 0,
    },
    textWrap: {
        flex: 1,
        gap: 2,
    },
    title: {
        color: colors.textPrimary,
        fontSize: fonts.sizes.md,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    subtitle: {
        color: colors.textSecondary,
        fontSize: fonts.sizes.xs,
        letterSpacing: 0.1,
    },
    textDanger: {
        color: colors.danger,
    },
    textDangerOps: {
        color: 'rgba(255, 59, 48, 0.7)',
    },
});
