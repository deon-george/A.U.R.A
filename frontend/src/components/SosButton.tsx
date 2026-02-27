import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, fonts } from '../theme';

interface Props {
    onPress: () => void;
    level?: number;
}

//------This Function handles the Sos Button---------
export default function SosButton({ onPress, level = 3 }: Props) {
    const pulse = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const anim = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 1.15, duration: 800, useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
            ])
        );
        anim.start();
        return () => anim.stop();
    }, []);

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        onPress();
    };

    return (
        <View style={s.container}>
            <Animated.View style={[s.pulseRing, { transform: [{ scale: pulse }] }]} />
            <TouchableOpacity 
                style={s.button} 
                onPress={handlePress} 
                onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
                activeOpacity={0.8}
                accessibilityLabel="Emergency SOS button"
                accessibilityHint="Double tap to send emergency alert to your caregiver"
                accessibilityRole="button"
            >
                <Ionicons name="alert-circle" size={22} color={colors.white} style={s.icon} />
                <Text style={s.label}>SOS</Text>
                <Text style={s.sub}>Hold for emergency</Text>
            </TouchableOpacity>
        </View>
    );
}

const s = StyleSheet.create({
    container: { alignItems: 'center', justifyContent: 'center' },
    pulseRing: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: colors.redGlow,
    },
    button: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.red,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8,
        shadowColor: colors.red,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
    },
    label: {
        color: colors.white,
        fontSize: fonts.sizes.xxl,
        fontWeight: '900',
        letterSpacing: 2,
    },
    icon: {
        marginBottom: 2,
    },
    sub: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: fonts.sizes.xs,
        marginTop: 2,
    },
});
