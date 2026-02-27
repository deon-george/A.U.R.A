import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '../theme';

interface LoadingStateProps {
    message?: string;
}

//------This Function handles the Loading State---------
export default function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color={colors.white} />
            <Text style={styles.text}>{message}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
    },
    text: {
        color: colors.textSecondary,
        fontSize: fonts.sizes.md,
        marginTop: spacing.md,
    },
});
