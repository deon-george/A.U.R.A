import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../src/components/Screen';
import Header from '../../src/components/Header';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import EmptyState from '../../src/components/EmptyState';
import LoadingState from '../../src/components/LoadingState';
import { colors, fonts, spacing } from '../../src/theme';
import { patientDataService, PatientProfile, Medication, Caregiver } from '../../src/services/patientData';

//------This Function handles the Patient Info Screen---------
export default function PatientInfoScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  //------This Function handles the Load Data---------
  const loadData = async () => {
    try {
      setLoading(true);
      const data = await patientDataService.loadProfile();
      if (data) {
        setProfile(data.patient_profile ?? null);
        setMedications(data.medications || []);
        setCaregivers(data.caregivers || []);
      }
    } catch (error) {
      console.error('[PatientInfo] Failed to load data:', error);
      Alert.alert('Error', 'Failed to load patient information');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Screen safeArea={false}>
        <Header title="Medical Information" showBack={true} />
        <LoadingState message="Loading your information..." />
      </Screen>
    );
  }

  return (
    <Screen safeArea={false}>
      <Header title="Medical Information" showBack={true} />

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        {}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>CONDITION</Text>
            <Button
              variant="secondary"
              title="Edit"
              icon="create-outline"
              onPress={() => router.push('/(patient)/edit-condition')}
              style={s.editButton}
            />
          </View>

          {profile && (profile.condition || profile.severity) ? (
            <Card>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Condition</Text>
                <Text style={s.infoValue}>{profile.condition || 'Not specified'}</Text>
              </View>

              {profile.severity && (
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Severity</Text>
                  <View style={s.severityBadge}>
                    <Text style={s.severityText}>{profile.severity}</Text>
                  </View>
                </View>
              )}

              {profile.diagnosis_date && (
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Diagnosis Date</Text>
                  <Text style={s.infoValue}>
                    {new Date(profile.diagnosis_date).toLocaleDateString()}
                  </Text>
                </View>
              )}

              {profile.notes && (
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Notes</Text>
                  <Text style={s.infoValue}>{profile.notes}</Text>
                </View>
              )}
            </Card>
          ) : (
            <EmptyState
              icon="medical-outline"
              title="No Condition Information"
              subtitle="Add your medical condition details"
            />
          )}
        </View>

        {}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>MEDICATIONS</Text>
            <Button
              variant="secondary"
              title="Edit"
              icon="create-outline"
              onPress={() => router.push('/(patient)/edit-medications')}
              style={s.editButton}
            />
          </View>

          {medications.length > 0 ? (
            <View style={s.list}>
              {medications.map((med) => (
                <Card key={med.id}>
                  <View style={s.medicationCard}>
                    <View style={s.medicationHeader}>
                      <Ionicons name="medical" size={20} color={colors.textPrimary} />
                      <Text style={s.medicationName}>{med.name}</Text>
                    </View>

                    {med.dosage && (
                      <Text style={s.medicationDetail}>Dosage: {med.dosage}</Text>
                    )}

                    {med.frequency && (
                      <Text style={s.medicationDetail}>Frequency: {med.frequency}</Text>
                    )}

                    {med.schedule_times && med.schedule_times.length > 0 && (
                      <View style={s.timesContainer}>
                        <Text style={s.medicationDetail}>Times:</Text>
                        <View style={s.timesList}>
                          {med.schedule_times.map((time, idx) => (
                            <View key={idx} style={s.timeBadge}>
                              <Text style={s.timeText}>{time}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                </Card>
              ))}
            </View>
          ) : (
            <EmptyState
              icon="medical-outline"
              title="No Medications"
              subtitle="Add your medications"
            />
          )}
        </View>

        {}
        <View style={[s.section, { marginBottom: spacing.xxl }]}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>CAREGIVERS</Text>
            <Button
              variant="secondary"
              title="Edit"
              icon="create-outline"
              onPress={() => router.push('/(patient)/edit-caregivers')}
              style={s.editButton}
            />
          </View>

          {caregivers.length > 0 ? (
            <View style={s.list}>
              {caregivers.map((caregiver) => (
                <Card key={caregiver.id ?? caregiver.email}>
                  <View style={s.caregiverCard}>
                    <View style={s.caregiverHeader}>
                      <Ionicons name="shield-checkmark" size={20} color={colors.textPrimary} />
                      <Text style={s.caregiverName}>{caregiver.name}</Text>
                    </View>
                    <Text style={s.caregiverEmail}>{caregiver.email}</Text>
                  </View>
                </Card>
              ))}
            </View>
          ) : (
            <EmptyState
              icon="shield-checkmark-outline"
              title="No Caregivers"
              subtitle="Add caregivers to help manage your care"
            />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fonts.sizes.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  editButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  list: {
    gap: spacing.md,
  },
  infoRow: {
    marginBottom: spacing.md,
  },
  infoLabel: {
    fontSize: fonts.sizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: fonts.sizes.md,
    color: colors.textPrimary,
    lineHeight: fonts.sizes.md * 1.5,
  },
  severityBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceLight,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
  },
  severityText: {
    fontSize: fonts.sizes.sm,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  medicationCard: {
    gap: spacing.sm,
  },
  medicationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  medicationName: {
    fontSize: fonts.sizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  medicationDetail: {
    fontSize: fonts.sizes.sm,
    color: colors.textSecondary,
  },
  timesContainer: {
    gap: spacing.xs,
  },
  timesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  timeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeText: {
    fontSize: fonts.sizes.xs,
    color: colors.textPrimary,
  },
  relativeCard: {
    gap: spacing.xs,
  },
  relativeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  relativeName: {
    fontSize: fonts.sizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  relativeDetail: {
    fontSize: fonts.sizes.sm,
    color: colors.textSecondary,
  },
  relativeNotes: {
    fontSize: fonts.sizes.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  caregiverCard: {
    gap: spacing.xs,
  },
  caregiverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  caregiverName: {
    fontSize: fonts.sizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  caregiverEmail: {
    fontSize: fonts.sizes.sm,
    color: colors.textSecondary,
  },
});
