import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../src/services/api';
import ConnectionIndicator from '../../src/components/ConnectionIndicator';
import { colors, fonts, spacing, radius } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';

interface Med { id: string; name: string; dosage: string; frequency: string; schedule_times: string[]; is_active: boolean }

//------This Function handles the Caregiver Medications Screen---------
export default function CaregiverMedicationsScreen() {
    const router = useRouter();
    const [meds, setMeds] = useState<Med[]>([]);
    const [patientUid, setPatientUid] = useState<string | null>(null);
    const [patientName, setPatientName] = useState<string>('Patient');
    const [showAdd, setShowAdd] = useState(false);
    const [name, setName] = useState('');
    const [dosage, setDosage] = useState('');
    const [frequency, setFrequency] = useState('');
    const [times, setTimes] = useState('');

    useEffect(() => { loadPatient(); }, []);
    useEffect(() => { if (patientUid) load(); }, [patientUid]);

    //------This Function handles the Load Patient---------
    async function loadPatient() {
        try {
            const meRes = await api.get('/auth/me');
            const me = meRes.data;
            if (me.role === 'caregiver' && me.linked_patients?.length > 0) {
                const first = me.linked_patients[0];
                setPatientUid(first);
                setPatientName(typeof first === 'string' ? 'Linked Patient' : first.display_name || 'Patient');
                return;
            }
            if (me.role === 'patient') {
                setPatientUid(me.firebase_uid);
                setPatientName(me.display_name || 'Patient');
                return;
            }
            setPatientUid(null);
        } catch {
            setPatientUid(null);
        }
    }

    //------This Function handles the Load---------
    async function load() {
        if (!patientUid) {
            setMeds([]);
            return;
        }
        try { const res = await api.get(`/medications/?patient_uid=${encodeURIComponent(patientUid)}`); setMeds(res.data); } catch { }
    }

    //------This Function handles the Add Med---------
    async function addMed() {
        if (!name.trim() || !patientUid) return;
        await api.post(`/medications/?patient_uid=${encodeURIComponent(patientUid)}`, {
            name, dosage, frequency,
            schedule_times: times.split(',').map((t) => t.trim()).filter(Boolean),
        });
        setName(''); setDosage(''); setFrequency(''); setTimes('');
        setShowAdd(false); load();
    }

    //------This Function handles the Delete Med---------
    async function deleteMed(id: string) {
        Alert.alert('Delete?', 'Remove this medication?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => { await api.delete(`/medications/${id}`); load(); } },
        ]);
    }

    return (
        <View style={s.container}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
                <View style={{ alignItems: 'center' }}>
                    <Text style={s.title}>Manage Meds</Text>
                    <Text style={s.subtitle}>{patientName}</Text>
                </View>
                <View style={s.headerRight}>
                    <ConnectionIndicator />
                    <TouchableOpacity onPress={() => setShowAdd(!showAdd)} style={s.addToggle} activeOpacity={0.7}>
                        <Ionicons name={showAdd ? 'close' : 'add'} size={20} color={colors.textPrimary} />
                    </TouchableOpacity>
                </View>
            </View>

            {showAdd && (
                <View style={s.addCard}>
                    <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Medication name" placeholderTextColor={colors.textMuted} />
                    <View style={s.row}>
                        <TextInput style={[s.input, s.half]} value={dosage} onChangeText={setDosage} placeholder="Dosage" placeholderTextColor={colors.textMuted} />
                        <TextInput style={[s.input, s.half]} value={frequency} onChangeText={setFrequency} placeholder="Frequency" placeholderTextColor={colors.textMuted} />
                    </View>
                    <TextInput style={s.input} value={times} onChangeText={setTimes} placeholder="Times (8:00, 14:00, 20:00)" placeholderTextColor={colors.textMuted} />
                    <TouchableOpacity style={s.addBtn} onPress={addMed} activeOpacity={0.85}>
                        <Ionicons name="medkit-outline" size={18} color={colors.bg} />
                        <Text style={s.addBtnText}>Add Medication</Text>
                    </TouchableOpacity>
                </View>
            )}

            <FlatList
                data={meds}
                keyExtractor={(m) => m.id}
                renderItem={({ item }) => (
                    <View style={s.medCard}>
                        <View style={s.medLeft}>
                            <Text style={s.medName}>{item.name}</Text>
                            <Text style={s.medDosage}>{item.dosage} · {item.frequency}</Text>
                            <View style={s.timesRow}>
                                {item.schedule_times.map((t, i) => (
                                    <View key={i} style={s.timeChip}><Text style={s.timeText}>{t}</Text></View>
                                ))}
                            </View>
                        </View>
                        <TouchableOpacity onPress={() => deleteMed(item.id)} activeOpacity={0.7}>
                            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                )}
                contentContainerStyle={s.list}
                ListEmptyComponent={<Text style={s.empty}>{patientUid ? 'No medications found' : 'No linked patient found'}</Text>}
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: spacing.xxl, paddingBottom: spacing.md },
    backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    addToggle: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    title: { color: colors.textPrimary, fontSize: fonts.sizes.lg, fontWeight: '600', letterSpacing: -0.3 },
    subtitle: { color: colors.textMuted, fontSize: fonts.sizes.xs, marginTop: 2 },
    addCard: { marginHorizontal: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, gap: spacing.sm },
    input: { backgroundColor: colors.bgTertiary, borderRadius: radius.md, padding: 14, color: colors.textPrimary, fontSize: fonts.sizes.md, borderWidth: 1, borderColor: colors.border },
    row: { flexDirection: 'row', gap: spacing.sm },
    half: { flex: 1 },
    addBtn: { backgroundColor: colors.white, paddingVertical: 14, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
    addBtnText: { color: colors.bg, fontSize: fonts.sizes.sm, fontWeight: '600' },
    list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
    medCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center' },
    medLeft: { flex: 1 },
    medName: { color: colors.textPrimary, fontSize: fonts.sizes.md, fontWeight: '600', letterSpacing: -0.2 },
    medDosage: { color: colors.textSecondary, fontSize: fonts.sizes.xs, marginTop: 2 },
    timesRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm, flexWrap: 'wrap' },
    timeChip: { backgroundColor: colors.surfaceLight, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
    timeText: { color: colors.textSecondary, fontSize: fonts.sizes.xs, fontWeight: '500' },
    empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xxl, fontSize: fonts.sizes.sm },
});
