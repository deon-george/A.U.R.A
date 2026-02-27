import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import SosButton from '../../src/components/SosButton';
import Header from '../../src/components/Header';
import ConnectionIndicator from '../../src/components/ConnectionIndicator';
import api from '../../src/services/api';
import { colors, fonts, spacing, radius } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';

//------This Function handles the Sos Screen---------
export default function SOSScreen() {
    const router = useRouter();
    const [sent, setSent] = useState(false);

    //------This Function handles the Handle Sos---------
    async function handleSOS() {
        Alert.alert('Send SOS?', 'This will alert your caregiver immediately.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Send SOS',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await api.post('/sos/trigger', { level: 4, trigger: 'button', message: 'Patient pressed SOS button' });
                        setSent(true);
                    } catch {
                        Alert.alert('Error', 'Could not send SOS. Try again.');
                    }
                },
            },
        ]);
    }

    return (
        <View style={s.container}>
            <Header
                title="Request Help"
                centered
                showBack
                onBackPress={() => router.back()}
                rightElement={<ConnectionIndicator />}
            />

            <View style={s.center}>
                {sent ? (
                    <View style={s.sentWrap}>
                        <View style={s.sentIcon}>
                            <Ionicons name="checkmark" size={32} color={colors.bg} />
                        </View>
                        <Text style={s.sentTitle}>Help is on the way</Text>
                        <Text style={s.sentSub}>Your caregiver has been notified</Text>
                        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.85}>
                            <Ionicons name="arrow-back-outline" size={16} color={colors.textPrimary} />
                            <Text style={s.backBtnText}>Back to Dashboard</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <SosButton onPress={handleSOS} />
                        <Text style={s.hint}>Tap the button to alert your caregiver</Text>
                        <Text style={s.voiceHint}>Or say "Orito, I need help" to your headphones</Text>
                    </>
                )}
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
    hint: { color: colors.textSecondary, fontSize: fonts.sizes.md, marginTop: spacing.xl, textAlign: 'center' },
    voiceHint: { color: colors.textMuted, fontSize: fonts.sizes.sm, marginTop: spacing.sm, textAlign: 'center', letterSpacing: 0.2 },
    sentWrap: { alignItems: 'center', gap: spacing.md },
    sentIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
    sentTitle: { color: colors.textPrimary, fontSize: fonts.sizes.xl, fontWeight: '300', letterSpacing: -0.5 },
    sentSub: { color: colors.textSecondary, fontSize: fonts.sizes.md },
    backBtn: { backgroundColor: colors.surface, paddingHorizontal: spacing.xl, paddingVertical: 14, borderRadius: radius.full, marginTop: spacing.xl, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    backBtnText: { color: colors.textPrimary, fontSize: fonts.sizes.sm, fontWeight: '500' },
});
