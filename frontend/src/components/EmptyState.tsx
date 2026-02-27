import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing } from '../theme';

interface EmptyStateProps {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
}

//------This Function handles the Empty State---------
export default function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
    return (
        <View style={styles.container}>
            <Ionicons name={icon} size={48} color={colors.textMuted} />
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl,
        paddingHorizontal: spacing.xl,
    },
    title: {
        color: colors.textPrimary,
        fontSize: fonts.sizes.lg,
        fontWeight: '600',
        marginTop: spacing.md,
        textAlign: 'center',
    },
    subtitle: {
        color: colors.textSecondary,
        fontSize: fonts.sizes.md,
        textAlign: 'center',
        marginTop: spacing.sm,
        lineHeight: 22,
    },
});
