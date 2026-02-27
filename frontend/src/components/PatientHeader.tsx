import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/auth';
import AuraLogo from './AuraLogo';
import { colors, spacing } from '../theme';

interface PatientHeaderProps {
    rightIcon?: keyof typeof Ionicons.glyphMap;
    onRightPress?: () => void;
    showRightIcon?: boolean;
}

//------This Function handles the Patient Header---------
export default function PatientHeader({
    rightIcon = 'calendar-clear-outline',
    onRightPress,
    showRightIcon = true
}: PatientHeaderProps) {
    const router = useRouter();
    const { user } = useAuth();

    const handleRightPress = () => {
        if (onRightPress) {
            onRightPress();
        } else {
            router.push('/(patient)/calendar');
        }
    };

    return (
        <View style={s.header}>
            <TouchableOpacity onPress={() => router.push('/(patient)/profile')}>
                {user?.photo_url ? (
                    <Image
                        source={{ uri: user.photo_url }}
                        style={s.avatar}
                    />
                ) : (
                    <Ionicons name="person-circle-outline" size={28} color={colors.textSecondary} />
                )}
            </TouchableOpacity>

            <AuraLogo size="small" color={colors.textSecondary} />

            {showRightIcon ? (
                <TouchableOpacity onPress={handleRightPress}>
                    <Ionicons name={rightIcon} size={24} color={colors.textSecondary} />
                </TouchableOpacity>
            ) : (
                <View style={s.placeholder} />
            )}
        </View>
    );
}

const s = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16
    },
    placeholder: {
        width: 24,
    }
});
