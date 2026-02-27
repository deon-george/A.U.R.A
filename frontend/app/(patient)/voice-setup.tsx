import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/auth';
import Screen from '../../src/components/Screen';
import { colors, fonts, spacing, radius } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';
import { AudioModule } from 'expo-audio';

//------This Function handles the Voice Setup Screen---------
export default function VoiceSetupScreen() {
    const router = useRouter();
    const { setVoiceSetup } = useAuth();
    const [step, setStep] = useState(1);
    const [permStatus, setPermStatus] = useState<string | null>(null);

    //------This Function handles the Request Perms---------
    async function requestPerms() {
        const { granted } = await AudioModule.requestRecordingPermissionsAsync();
        setPermStatus(granted ? 'granted' : 'denied');
        if (granted) {
            setStep(2);
        }
    }

    //------This Function handles the Finish Setup---------
    async function finishSetup() {
        await setVoiceSetup(true);
        router.replace('/(patient)/chat?autoStart=true');
    }

    return (
        <Screen>
            <View style={s.container}>
                <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}>
                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>

                <View style={s.content}>
                    <View style={s.iconWrap}>
                        <Ionicons name="mic" size={48} color={colors.bg} />
                    </View>

                    <Text style={s.title}>
                        {step === 1 ? 'Enable Voice Control' : 'You\'re All Set!'}
                    </Text>

                    <Text style={s.desc}>
                        {step === 1
                            ? 'Orito can listen to you. Just tap the mic slightly.'
                            : 'Orito is ready. Tap the mic icon anytime to start talking.'}
                    </Text>

                    {step === 1 ? (
                        <TouchableOpacity style={s.btn} onPress={requestPerms}>
                            <Ionicons name="mic-outline" size={18} color={colors.bg} />
                            <Text style={s.btnText}>Enable Microphone</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={s.btn} onPress={finishSetup}>
                            <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.bg} />
                            <Text style={s.btnText}>Start Talking</Text>
                        </TouchableOpacity>
                    )}

                    {permStatus === 'denied' && (
                        <Text style={s.error}>Permission denied. Please enable it in settings.</Text>
                    )}
                </View>
            </View>
        </Screen>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
        padding: spacing.xl,
        justifyContent: 'center',
    },
    closeBtn: {
        position: 'absolute',
        top: spacing.xl,
        right: spacing.xl,
        padding: spacing.sm,
        zIndex: 10,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xl,
        paddingBottom: 80,
    },
    iconWrap: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    title: {
        color: colors.textPrimary,
        fontSize: 28,
        fontWeight: '300',
        textAlign: 'center',
    },
    desc: {
        color: colors.textSecondary,
        fontSize: fonts.sizes.md,
        textAlign: 'center',
        lineHeight: 24,
        maxWidth: 280,
    },
    btn: {
        backgroundColor: colors.white,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: radius.full,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        marginTop: spacing.lg,
    },
    btnText: {
        color: colors.bg,
        fontSize: fonts.sizes.md,
        fontWeight: '600',
    },
    error: {
        color: colors.textPrimary,
        fontSize: fonts.sizes.sm,
        marginTop: spacing.md,
    },
});
