import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../src/services/api';
import Screen from '../../src/components/Screen';
import { colors, fonts, spacing, radius } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';

const SEVERITY_OPTIONS = ['Mild', 'Moderate', 'High Support'];

//------This Function handles the Caregiver Onboarding Intake Screen---------
export default function CaregiverOnboardingIntakeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patientUid, setPatientUid] = useState<string>('');
  const [linkedPatients, setLinkedPatients] = useState<string[]>([]);

  const [condition, setCondition] = useState('');
  const [severity, setSeverity] = useState('Moderate');
  const [diagnosisDate, setDiagnosisDate] = useState('');
  const [notes, setNotes] = useState('');

  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medFrequency, setMedFrequency] = useState('');
  const [medTimes, setMedTimes] = useState('');

  useEffect(() => {
    loadLinkedPatients();
  }, []);

  const canSubmit = useMemo(() => {
    return Boolean(patientUid && condition.trim() && severity.trim() && notes.trim());
  }, [patientUid, condition, severity, notes]);

  //------This Function handles the Load Linked Patients---------
  async function loadLinkedPatients() {
    try {
      const res = await api.get('/auth/me');
      const me = res.data;
      const linked = Array.isArray(me.linked_patients) ? me.linked_patients : [];
      setLinkedPatients(linked);
      setPatientUid(linked[0] || '');
    } catch {
      setLinkedPatients([]);
      setPatientUid('');
    } finally {
      setLoading(false);
    }
  }

  //------This Function handles the Parse Times---------
  function parseTimes(input: string): string[] {
    return input
      .split(',')
      .map(v => v.trim())
      .filter(Boolean)
      .map(v => {
        const parts = v.split(':');
        if (parts.length !== 2) return v;
        const h = parts[0].padStart(2, '0');
        const m = parts[1].padStart(2, '0');
        return `${h}:${m}`;
      });
  }

  //------This Function handles the Submit Intake---------
  async function submitIntake() {
    if (!canSubmit) {
      Alert.alert('Required', 'Please complete all required medical fields before continuing.');
      return;
    }

    const meds = medName.trim()
      ? [{
          name: medName.trim(),
          dosage: medDosage.trim(),
          frequency: medFrequency.trim(),
          schedule_times: parseTimes(medTimes),
          notes: '',
        }]
      : [];

    setSaving(true);
    try {
      await api.put('/onboarding/caregiver-intake', {
        patient_uid: patientUid,
        condition: condition.trim(),
        severity,
        diagnosis_date: diagnosisDate.trim() || null,
        notes: notes.trim(),
        medications: meds,
      });
      router.replace('/(caregiver)/dashboard');
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Could not save caregiver intake';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={colors.white} />
        </View>
      </Screen>
    );
  }

  if (!linkedPatients.length) {
    return (
      <Screen>
        <View style={s.emptyWrap}>
          <Ionicons name="warning-outline" size={44} color={colors.red} />
          <Text style={s.emptyTitle}>No linked patient found</Text>
          <Text style={s.emptySub}>Link a patient first to complete caregiver onboarding.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.headerBlock}>
          <Text style={s.step}>Required before dashboard</Text>
          <Text style={s.title}>Caregiver Intake</Text>
          <Text style={s.subtitle}>Complete these sections once to unlock caregiver tools.</Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Patient</Text>
          <Text style={s.label}>SELECT PATIENT</Text>
          <View style={s.patientRow}>
            {linkedPatients.map((uid) => (
              <TouchableOpacity
                key={uid}
                style={[s.patientChip, patientUid === uid && s.patientChipActive]}
                onPress={() => setPatientUid(uid)}
                activeOpacity={0.8}
              >
                <Text style={[s.patientChipText, patientUid === uid && s.patientChipTextActive]}>{uid.slice(0, 12)}...</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Critical Medical Information</Text>
          <Text style={s.label}>CONDITION</Text>
          <TextInput
            style={s.input}
            value={condition}
            onChangeText={setCondition}
            placeholder="e.g. Alzheimer’s disease"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={s.label}>SEVERITY</Text>
          <View style={s.severityRow}>
            {SEVERITY_OPTIONS.map((item) => (
              <TouchableOpacity
                key={item}
                style={[s.severityChip, severity === item && s.severityChipActive]}
                onPress={() => setSeverity(item)}
                activeOpacity={0.8}
              >
                <Text style={[s.severityText, severity === item && s.severityTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>DIAGNOSIS DATE (OPTIONAL)</Text>
          <TextInput
            style={s.input}
            value={diagnosisDate}
            onChangeText={setDiagnosisDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={s.label}>CRITICAL NOTES (REQUIRED)</Text>
          <TextInput
            style={[s.input, s.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Allergies, escalation instructions, emergency considerations"
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Optional Medication Setup</Text>
          <TextInput
            style={s.input}
            value={medName}
            onChangeText={setMedName}
            placeholder="Medication name"
            placeholderTextColor={colors.textMuted}
          />
          <View style={s.row}>
            <TextInput
              style={[s.input, s.halfInput]}
              value={medDosage}
              onChangeText={setMedDosage}
              placeholder="Dosage"
              placeholderTextColor={colors.textMuted}
            />
            <TextInput
              style={[s.input, s.halfInput]}
              value={medFrequency}
              onChangeText={setMedFrequency}
              placeholder="Frequency"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <TextInput
            style={s.input}
            value={medTimes}
            onChangeText={setMedTimes}
            placeholder="Times in 24h, comma separated (08:00,20:00)"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <TouchableOpacity
          style={[s.primaryBtn, (!canSubmit || saving) && s.primaryBtnDisabled]}
          onPress={submitIntake}
          activeOpacity={0.9}
          disabled={!canSubmit || saving}
        >
          {saving ? <ActivityIndicator color={colors.bg} /> : (
            <>
              <Ionicons name="arrow-forward" size={18} color={colors.bg} />
              <Text style={s.primaryBtnText}>Save Intake and Continue</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBlock: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  step: {
    color: colors.red,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 25,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.sm,
    lineHeight: 20,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.md,
    fontWeight: '700',
  },
  label: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.bgTertiary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: fonts.sizes.md,
  },
  notesInput: {
    minHeight: 100,
  },
  patientRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  patientChip: {
    backgroundColor: colors.bgTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  patientChipActive: {
    backgroundColor: colors.white,
    borderColor: colors.white,
  },
  patientChipText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    fontWeight: '600',
  },
  patientChipTextActive: {
    color: colors.bg,
  },
  severityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  severityChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgTertiary,
  },
  severityChipActive: {
    borderColor: colors.white,
    backgroundColor: colors.white,
  },
  severityText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    fontWeight: '700',
  },
  severityTextActive: {
    color: colors.bg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  halfInput: {
    flex: 1,
  },
  primaryBtn: {
    marginTop: spacing.md,
    height: 54,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: colors.bg,
    fontSize: fonts.sizes.md,
    fontWeight: '700',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.lg,
    fontWeight: '700',
  },
  emptySub: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.md,
    textAlign: 'center',
    lineHeight: 22,
  },
});
