import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import Screen from '../../src/components/Screen';
import Header from '../../src/components/Header';
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';
import LoadingState from '../../src/components/LoadingState';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '../../src/theme';
import { patientDataService } from '../../src/services/patientData';

const SEVERITY_OPTIONS = ['Mild', 'Moderate', 'Severe'];

//------This Function handles the Edit Condition Screen---------
export default function EditConditionScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [condition, setCondition] = useState('');
  const [severity, setSeverity] = useState('');
  const [diagnosisDate, setDiagnosisDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  //------This Function handles the Load Data---------
  const loadData = async () => {
    try {
      setLoading(true);
      const data = await patientDataService.loadProfile();
      if (data?.patient_profile) {
        const profile = data.patient_profile;
        setCondition(profile.condition || '');
        setSeverity(profile.severity || '');
        setNotes(profile.notes || '');
        if (profile.diagnosis_date) {
          setDiagnosisDate(new Date(profile.diagnosis_date));
        }
      }
    } catch (error) {
      console.error('[EditCondition] Failed to load data:', error);
      Alert.alert('Error', 'Failed to load condition information');
    } finally {
      setLoading(false);
    }
  };

  //------This Function handles the Handle Save---------
  const handleSave = async () => {
    try {
      setSaving(true);
      await patientDataService.updatePatientInfo({
        condition,
        severity,
        diagnosis_date: diagnosisDate?.toISOString().split('T')[0] || undefined,
        notes,
      });
      Alert.alert('Success', 'Condition information updated', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('[EditCondition] Failed to save:', error);
      Alert.alert('Error', 'Failed to save condition information');
    } finally {
      setSaving(false);
    }
  };

  //------This Function handles the On Date Change---------
  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDiagnosisDate(selectedDate);
    }
  };

  if (loading) {
    return (
      <Screen safeArea={false}>
        <Header title="Edit Condition" onBackPress={() => router.back()} showBack centered />
        <LoadingState message="Loading condition information..." />
      </Screen>
    );
  }

  return (
    <Screen safeArea={false}>
      <Header title="Edit Condition" onBackPress={() => router.back()} showBack centered />

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.form}>
          <Input
            label="Condition"
            value={condition}
            onChangeText={setCondition}
            placeholder="e.g., Alzheimer's Disease"
          />

          <View style={s.field}>
            <Text style={s.label}>SEVERITY</Text>
            <View style={s.severityOptions}>
              {SEVERITY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    s.severityChip,
                    severity === option && s.severityChipActive
                  ]}
                  onPress={() => setSeverity(option)}
                >
                  <Text style={[
                    s.severityText,
                    severity === option && s.severityTextActive
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={s.field}>
            <Text style={s.label}>DIAGNOSIS DATE (OPTIONAL)</Text>
            <TouchableOpacity
              style={s.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
              <Text style={s.dateButtonText}>
                {diagnosisDate
                  ? diagnosisDate.toLocaleDateString()
                  : 'Select Date'}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={diagnosisDate || new Date()}
                mode="date"
                display="default"
                onChange={onDateChange}
                maximumDate={new Date()}
              />
            )}
          </View>

          <Input
            label="Additional Notes (Optional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional information..."
            multiline
            numberOfLines={4}
            style={s.notesInput}
          />

          <Button
            variant="primary"
            title={saving ? 'Saving...' : 'Save Changes'}
            icon="save-outline"
            onPress={handleSave}
            disabled={saving || !condition}
            style={s.saveButton}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  form: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  field: {
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: fonts.sizes.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  severityOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  severityChip: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  severityChipActive: {
    backgroundColor: colors.bg,
    borderColor: colors.textPrimary,
  },
  severityText: {
    fontSize: fonts.sizes.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  severityTextActive: {
    color: colors.textPrimary,
  },
  dateButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dateButtonText: {
    fontSize: fonts.sizes.md,
    color: colors.textPrimary,
  },
  notesInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    marginTop: spacing.md,
  },
});
