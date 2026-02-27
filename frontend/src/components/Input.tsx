import React from 'react';
import { View, Text, TextInput as RNTextInput, StyleSheet, TextInputProps } from 'react-native';
import { colors, fonts, spacing, components } from '../theme';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
}

//------This Function handles the Input---------
export default function Input({ label, error, style, ...props }: InputProps) {
    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}
            <RNTextInput
                style={[styles.input, style, error && styles.inputError]}
                placeholderTextColor={colors.textMuted}
                {...props}
            />
            {error && <Text style={styles.error}>{error}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: spacing.sm,
    },
    label: {
        color: colors.textSecondary,
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    input: {
        ...components.input,
    },
    inputError: {
        borderColor: colors.red,
    },
    error: {
        color: colors.red,
        fontSize: fonts.sizes.xs,
        marginTop: spacing.xs,
    },
});
