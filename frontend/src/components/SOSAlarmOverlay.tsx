import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import api from '../services/api';
import { useAuth } from '../context/auth';
import { colors, fonts, radius, spacing } from '../theme';

type ActiveSOSAlert = {
    id: string;
    patient_uid: string;
    level: number;
    trigger: string;
    message: string;
    created_at: string;
    resolved?: boolean;
    status?: string;
};

const SOS_ALARM_SOUND_URL = 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg';
const SOS_POLL_INTERVAL_MS = 3000;

//------This Function handles the Sos Alarm Overlay---------
export default function SOSAlarmOverlay() {
    const { user, loading } = useAuth();
    const [alerts, setAlerts] = useState<ActiveSOSAlert[]>([]);
    const [resolving, setResolving] = useState(false);
    const alarmStartedRef = useRef(false);
    const player = useAudioPlayer(SOS_ALARM_SOUND_URL, {
        downloadFirst: false,
        updateInterval: 1000,
    });

    const isSupportedRole = user?.role === 'patient' || user?.role === 'caregiver';
    const hasActiveAlert = alerts.length > 0;
    const currentAlert = alerts[0] || null;
    const isVisible = !loading && isSupportedRole && hasActiveAlert;
    const isCaregiver = user?.role === 'caregiver';

    //------This Function handles the Fetch Active Alerts---------
    const fetchActiveAlerts = useCallback(async () => {
        if (!isSupportedRole) {
            setAlerts([]);
            return;
        }
        try {
            const response = await api.get('/sos/active');
            const data = Array.isArray(response.data) ? response.data : [];
            const active = data.filter((event) => !event.resolved && event.status !== 'resolved');
            setAlerts(active);
        } catch {
            setAlerts([]);
        }
    }, [isSupportedRole]);

    useEffect(() => {
        if (!isSupportedRole) {
            setAlerts([]);
            return;
        }

        let cancelled = false;
        const refresh = async () => {
            if (cancelled) {
                return;
            }
            await fetchActiveAlerts();
        };

        void refresh();
        const interval = setInterval(() => {
            void refresh();
        }, SOS_POLL_INTERVAL_MS);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [fetchActiveAlerts, isSupportedRole]);

    useEffect(() => {
        const startAlarm = async () => {
            if (alarmStartedRef.current || !isVisible) {
                return;
            }
            try {
                await setAudioModeAsync({
                    playsInSilentMode: true,
                    shouldPlayInBackground: true,
                    interruptionMode: 'doNotMix',
                    allowsRecording: false,
                    shouldRouteThroughEarpiece: false,
                });
                player.loop = true;
                player.volume = 1.0;
                try {
                    await player.seekTo(0);
                } catch { }
                player.play();
                Vibration.vibrate([0, 600, 350, 600], true);
                alarmStartedRef.current = true;
            } catch { }
        };

        const stopAlarm = async () => {
            if (!alarmStartedRef.current) {
                return;
            }
            try {
                player.pause();
                try {
                    await player.seekTo(0);
                } catch { }
            } catch { }
            Vibration.cancel();
            alarmStartedRef.current = false;
        };

        if (isVisible) {
            void startAlarm();
        } else {
            void stopAlarm();
        }

        return () => {
            if (!isVisible) {
                return;
            }
            void stopAlarm();
        };
    }, [isVisible, player]);

    //------This Function handles the Trigger Time---------
    const triggerTime = useMemo(() => {
        if (!currentAlert?.created_at) {
            return '';
        }
        return new Date(currentAlert.created_at).toLocaleString();
    }, [currentAlert?.created_at]);

    //------This Function handles the Resolve Current Alert---------
    async function resolveCurrentAlert() {
        if (!isCaregiver || !currentAlert?.id || resolving) {
            return;
        }
        setResolving(true);
        try {
            await api.post(`/sos/${currentAlert.id}/resolve`);
            await fetchActiveAlerts();
        } catch {
        } finally {
            setResolving(false);
        }
    }

    return (
        <Modal visible={isVisible} transparent={false} animationType="fade" onRequestClose={() => { }}>
            <View style={styles.container}>
                <View style={styles.pulseRing} />
                <View style={styles.iconWrap}>
                    <Ionicons name="warning" size={46} color={colors.bg} />
                </View>

                <Text style={styles.title}>Emergency SOS Active</Text>
                <Text style={styles.subtitle}>
                    {isCaregiver
                        ? 'Your patient needs immediate attention.'
                        : 'Emergency alert sent. Waiting for caregiver acknowledgement.'}
                </Text>

                {currentAlert ? (
                    <View style={styles.card}>
                        <Text style={styles.cardLine}>Level: {currentAlert.level}</Text>
                        <Text style={styles.cardLine}>Trigger: {currentAlert.trigger}</Text>
                        <Text style={styles.cardLine}>Time: {triggerTime}</Text>
                        <Text style={styles.cardMessage}>{currentAlert.message || 'No message provided.'}</Text>
                        {alerts.length > 1 && (
                            <Text style={styles.cardCount}>{alerts.length} active alerts</Text>
                        )}
                    </View>
                ) : null}

                {isCaregiver ? (
                    <TouchableOpacity
                        style={[styles.resolveBtn, resolving && styles.resolveBtnDisabled]}
                        onPress={resolveCurrentAlert}
                        activeOpacity={0.85}
                        disabled={resolving}
                    >
                        {resolving ? (
                            <ActivityIndicator size="small" color={colors.bg} />
                        ) : (
                            <>
                                <Ionicons name="checkmark-done-outline" size={18} color={colors.bg} />
                                <Text style={styles.resolveText}>Acknowledge & Stop Alarm</Text>
                            </>
                        )}
                    </TouchableOpacity>
                ) : (
                    <Text style={styles.waitingText}>Only your caregiver can disable this alarm.</Text>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0A',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    pulseRing: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        borderWidth: 2,
        borderColor: 'rgba(255, 59, 48, 0.35)',
        backgroundColor: 'rgba(255, 59, 48, 0.08)',
    },
    iconWrap: {
        width: 92,
        height: 92,
        borderRadius: 46,
        backgroundColor: colors.red,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    title: {
        color: colors.textPrimary,
        fontSize: 30,
        fontWeight: '700',
        letterSpacing: -0.6,
    },
    subtitle: {
        marginTop: spacing.sm,
        color: colors.textSecondary,
        fontSize: fonts.sizes.md,
        textAlign: 'center',
        maxWidth: 340,
        lineHeight: 22,
    },
    card: {
        marginTop: spacing.xl,
        width: '100%',
        maxWidth: 360,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: 'rgba(255, 59, 48, 0.28)',
        borderRadius: radius.xl,
        padding: spacing.lg,
        gap: 6,
    },
    cardLine: {
        color: colors.textPrimary,
        fontSize: fonts.sizes.sm,
        fontWeight: '600',
    },
    cardMessage: {
        marginTop: spacing.xs,
        color: colors.textSecondary,
        fontSize: fonts.sizes.sm,
        lineHeight: 20,
    },
    cardCount: {
        marginTop: spacing.xs,
        color: colors.textMuted,
        fontSize: fonts.sizes.xs,
        letterSpacing: 0.3,
    },
    resolveBtn: {
        marginTop: spacing.xl,
        minHeight: 52,
        borderRadius: radius.full,
        backgroundColor: colors.white,
        paddingHorizontal: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
    },
    resolveBtnDisabled: {
        opacity: 0.7,
    },
    resolveText: {
        color: colors.bg,
        fontSize: fonts.sizes.sm,
        fontWeight: '700',
    },
    waitingText: {
        marginTop: spacing.xl,
        color: colors.textMuted,
        fontSize: fonts.sizes.sm,
        textAlign: 'center',
    },
});
