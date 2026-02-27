import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, components } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HeaderProps {
    title: string;
    showBack?: boolean;
    onBackPress?: () => void;
    rightElement?: React.ReactNode;
    centered?: boolean;
    subtitle?: string;
}

//------This Function handles the Header---------
export default function Header({
    title,
    showBack,
    onBackPress,
    rightElement,
    centered,
    subtitle
}: HeaderProps) {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const handleBack = () => {
        if (onBackPress) {
            onBackPress();
        } else {
            router.back();
        }
    };

    if (centered) {
        return (
            <View style={[styles.centeredHeader, { paddingTop: insets.top + spacing.sm }]}>
                {showBack ? (
                    <TouchableOpacity onPress={handleBack} style={styles.backCircle}>
                        <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 36 }} />
                )}
                <View style={{ alignItems: 'center' }}>
                    <Text style={styles.centeredTitle}>{title}</Text>
                    {subtitle && <Text style={styles.centeredSubtitle}>{subtitle}</Text>}
                </View>
                {rightElement || <View style={{ width: 36 }} />}
            </View>
        );
    }

    return (
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
            <View style={styles.headerContent}>
                {showBack && (
                    <TouchableOpacity onPress={handleBack} style={styles.backCircle}>
                        <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
                    </TouchableOpacity>
                )}
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>{title}</Text>
                    {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                </View>
                {rightElement && <View style={styles.rightElement}>{rightElement}</View>}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        ...components.header.standard,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    titleContainer: {
        flex: 1,
    },
    title: {
        color: colors.textPrimary,
        fontSize: fonts.sizes.lg,
        fontWeight: '600',
        letterSpacing: -0.3,
    },
    subtitle: {
        color: colors.textSecondary,
        fontSize: fonts.sizes.xs,
        marginTop: 2,
    },
    rightElement: {
        marginLeft: spacing.md,
    },
    centeredHeader: components.header.centered,
    centeredTitle: {
        color: colors.textPrimary,
        fontSize: fonts.sizes.lg,
        fontWeight: '600',
        letterSpacing: -0.3,
    },
    centeredSubtitle: {
        color: colors.textSecondary,
        fontSize: fonts.sizes.xs,
        fontWeight: '400',
        marginTop: 2,
    },
});
