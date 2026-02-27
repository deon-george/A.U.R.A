import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { connectionMonitor } from '../services/connectionMonitor';
import { colors, fonts, spacing } from '../theme';

//------This Function handles the Connection Lost---------
export default function ConnectionLost() {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const [dots, setDots] = useState('');
    const [lastPing, setLastPing] = useState<number | null>(null);

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 0.6, duration: 1000, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
            ])
        ).start();

        const dotsInterval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);

        const unsubscribe = connectionMonitor.subscribe((_connected, pingTime) => {
            if (pingTime) setLastPing(pingTime);
        });

        return () => {
            clearInterval(dotsInterval);
            unsubscribe();
        };
    }, []);

    return (
        <View style={s.container}>
            <Animated.View style={[s.iconContainer, { opacity: pulseAnim }]}>
                <Ionicons name="cloud-offline-outline" size={80} color={colors.textMuted} />
            </Animated.View>

            <Text style={s.title}>Connection Lost</Text>
            <Text style={s.subtitle}>Unable to reach the server</Text>

            <View style={s.statusContainer}>
                <ActivityIndicator size="small" color={colors.textSecondary} />
                <Text style={s.reconnecting}>Reconnecting{dots}</Text>
            </View>

            {lastPing !== null && (
                <View style={s.statsContainer}>
                    <Text style={s.statsLabel}>Last successful ping</Text>
                    <Text style={s.statsValue}>{lastPing}ms</Text>
                </View>
            )}

            <Text style={s.footer}>The app will resume automatically once connected</Text>
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    iconContainer: {
        marginBottom: 30,
    },
    title: {
        fontSize: fonts.sizes.xxl,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: fonts.sizes.md,
        color: colors.textSecondary,
        marginBottom: 40,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 50,
        gap: spacing.md,
    },
    reconnecting: {
        fontSize: fonts.sizes.sm,
        color: colors.textSecondary,
        fontWeight: '500',
        width: 120,
    },
    statsContainer: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    statsLabel: {
        fontSize: fonts.sizes.xs,
        color: colors.textMuted,
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    statsValue: {
        fontSize: fonts.sizes.md,
        color: colors.textSecondary,
        fontWeight: '600',
        fontFamily: 'monospace',
    },
    footer: {
        fontSize: fonts.sizes.xs,
        color: colors.textMuted,
        textAlign: 'center',
        fontStyle: 'italic',
        position: 'absolute',
        bottom: 60,
    },
});
