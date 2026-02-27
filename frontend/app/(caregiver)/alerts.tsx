import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../src/services/api';
import ConnectionIndicator from '../../src/components/ConnectionIndicator';
import { colors, fonts, spacing, radius } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';

interface SOSAlert { id: string; level: number; trigger: string; message: string; status: string; created_at: string; resolved_at: string | null }

//------This Function handles the Alerts Screen---------
export default function AlertsScreen() {
    const router = useRouter();
    const [alerts, setAlerts] = useState<SOSAlert[]>([]);

    useEffect(() => { load(); }, []);

    //------This Function handles the Load---------
    async function load() { try { const res = await api.get('/sos/'); setAlerts(res.data); } catch { } }

    //------This Function handles the Resolve---------
    async function resolve(id: string) { await api.post(`/sos/${id}/resolve`); load(); }

    return (
        <View style={s.container}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={s.title}>SOS History</Text>
                <ConnectionIndicator />
            </View>

            <FlatList
                data={alerts}
                keyExtractor={(a) => a.id}
                renderItem={({ item }) => (
                    <View style={[s.alertCard, item.status === 'active' && s.alertActive]}>
                        <View style={s.alertTop}>
                            <View style={[s.levelBadge, item.level >= 4 ? s.levelHigh : s.levelLow]}>
                                <Text style={s.levelText}>L{item.level}</Text>
                            </View>
                            <Text style={s.alertDate}>{new Date(item.created_at).toLocaleString()}</Text>
                        </View>
                        <Text style={s.alertMsg}>{item.message}</Text>
                        <Text style={s.alertTrigger}>Triggered via: {item.trigger}</Text>
                        <View style={s.alertBottom}>
                            <Text style={[s.statusText, item.status === 'active' ? s.statusActive : s.statusResolved]}>
                                {item.status.toUpperCase()}
                            </Text>
                            {item.status === 'active' && (
                                <TouchableOpacity style={s.resolveBtn} onPress={() => resolve(item.id)} activeOpacity={0.85}>
                                    <Ionicons name="checkmark-done-outline" size={14} color={colors.bg} />
                                    <Text style={s.resolveBtnText}>Resolve</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}
                contentContainerStyle={s.list}
                ListEmptyComponent={<Text style={s.empty}>No alerts</Text>}
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: spacing.xxl, paddingBottom: spacing.md },
    backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    title: { color: colors.textPrimary, fontSize: fonts.sizes.lg, fontWeight: '600', letterSpacing: -0.3 },
    list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
    alertCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
    alertActive: { borderColor: 'rgba(255,59,48,0.3)', backgroundColor: 'rgba(255,59,48,0.04)' },
    alertTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    levelBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full },
    levelHigh: { backgroundColor: 'rgba(255,59,48,0.12)' },
    levelLow: { backgroundColor: 'rgba(255,59,48,0.06)' },
    levelText: { fontSize: fonts.sizes.xs, fontWeight: '700', color: colors.red, letterSpacing: 0.5 },
    alertDate: { color: colors.textMuted, fontSize: fonts.sizes.xs },
    alertMsg: { color: colors.textPrimary, fontSize: fonts.sizes.md, fontWeight: '500', letterSpacing: -0.2 },
    alertTrigger: { color: colors.textMuted, fontSize: fonts.sizes.xs, marginTop: 4 },
    alertBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
    statusText: { fontSize: 10, fontWeight: '600', letterSpacing: 1 },
    statusActive: { color: colors.red },
    statusResolved: { color: colors.textSecondary },
    resolveBtn: { backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    resolveBtnText: { color: colors.bg, fontSize: fonts.sizes.xs, fontWeight: '600' },
    empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xxl, fontSize: fonts.sizes.sm },
});
