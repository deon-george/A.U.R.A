import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../src/components/Screen';
import Header from '../../src/components/Header';
import Card from '../../src/components/Card';
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';
import EmptyState from '../../src/components/EmptyState';
import LoadingState from '../../src/components/LoadingState';
import { colors, fonts, spacing } from '../../src/theme';
import { patientDataService, Caregiver } from '../../src/services/patientData';

const RELATIONSHIP_OPTIONS = [
  'Spouse',
  'Daughter',
  'Son',
  'Parent',
  'Sibling',
  'Friend',
  'Healthcare Provider',
  'Other',
];

//------This Function handles the Edit Caregivers Screen---------
export default function EditCaregiversScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);

  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('Family');

  useEffect(() => {
    loadData();
  }, []);

  //------This Function handles the Load Data---------
  const loadData = async () => {
    try {
      setLoading(true);
      const data = await patientDataService.loadProfile();
      if (data?.caregivers) {
        setCaregivers(data.caregivers);
      }
    } catch (error) {
      console.error('[EditCaregivers] Failed to load:', error);
      Alert.alert('Error', 'Failed to load caregivers');
    } finally {
      setLoading(false);
    }
  };

  //------This Function handles the Handle Add New---------
  const handleAddNew = () => {
    setEmail('');
    setRelationship('Family');
    setShowAddForm(true);
  };

  //------This Function handles the Handle Add---------
  const handleAdd = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter caregiver email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      await patientDataService.addCaregiver(email.trim(), relationship);
      await loadData();
      setShowAddForm(false);
      setEmail('');
      setRelationship('Family');
      Alert.alert('Success', 'Caregiver added successfully');
    } catch (error: any) {
      console.error('[EditCaregivers] Failed to add:', error);
      const message = error?.response?.data?.detail || 'Failed to add caregiver';
      Alert.alert('Error', message);
    }
  };

  //------This Function handles the Handle Remove---------
  const handleRemove = (caregiver: Caregiver) => {
    if (!caregiver.email) {
      Alert.alert('Error', 'Cannot remove caregiver without email');
      return;
    }
    Alert.alert(
      'Remove Caregiver',
      `Are you sure you want to remove ${caregiver.name || caregiver.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await patientDataService.removeCaregiver(caregiver.email);
              await loadData();
              Alert.alert('Success', 'Caregiver removed');
            } catch (error) {
              console.error('[EditCaregivers] Failed to remove:', error);
              Alert.alert('Error', 'Failed to remove caregiver');
            }
          }
        }
      ]
    );
  };

  //------This Function handles the Handle Cancel---------
  const handleCancel = () => {
    setEmail('');
    setRelationship('Family');
    setShowAddForm(false);
  };

  if (loading) {
    return (
      <Screen safeArea={false}>
        <Header title="Edit Caregivers" onBackPress={() => router.back()} showBack centered />
        <LoadingState message="Loading caregivers..." />
      </Screen>
    );
  }

  return (
    <Screen safeArea={false}>
      <Header title="Edit Caregivers" onBackPress={() => router.back()} showBack centered />

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        <Card style={s.infoCard}>
          <View style={s.infoHeader}>
            <Ionicons name="information-circle" size={20} color={colors.textSecondary} />
            <Text style={s.infoText}>
              Caregivers can monitor your health, receive alerts, and help manage your care.
            </Text>
          </View>
        </Card>

        {!showAddForm && (
          <Button
            variant="primary"
            title="Add Caregiver"
            icon="add"
            onPress={handleAddNew}
            style={s.addButton}
          />
        )}

        {showAddForm && (
          <Card style={s.formCard}>
            <Text style={s.formTitle}>ADD CAREGIVER</Text>

            <Input
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              placeholder="caregiver@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={s.field}>
              <Text style={s.label}>RELATIONSHIP</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.relationshipOptions}
              >
                {RELATIONSHIP_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      s.relationshipChip,
                      relationship === option && s.relationshipChipActive
                    ]}
                    onPress={() => setRelationship(option)}
                  >
                    <Text style={[
                      s.relationshipText,
                      relationship === option && s.relationshipTextActive
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={s.formButtons}>
              <Button
                variant="secondary"
                title="Cancel"
                icon="close-outline"
                onPress={handleCancel}
                style={s.formButton}
              />
              <Button
                variant="primary"
                title="Add"
                icon="person-add-outline"
                onPress={handleAdd}
                style={s.formButton}
              />
            </View>
          </Card>
        )}

        {caregivers.length > 0 ? (
          <View style={s.list}>
            {caregivers.map((caregiver) => (
              <Card key={caregiver.id ?? caregiver.email}>
                <View style={s.caregiverCard}>
                  <View style={s.caregiverHeader}>
                    <View style={s.caregiverInfo}>
                      <Ionicons name="shield-checkmark" size={20} color={colors.textPrimary} />
                      <View style={s.caregiverDetails}>
                        <Text style={s.caregiverName}>{caregiver.name || 'Caregiver'}</Text>
                        <Text style={s.caregiverEmail}>{caregiver.email}</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={s.removeButton}
                      onPress={() => handleRemove(caregiver)}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        ) : !showAddForm ? (
          <EmptyState
            icon="shield-checkmark-outline"
            title="No Caregivers"
            subtitle="Add caregivers to help manage your care"
          />
        ) : null}

        <View style={{ height: spacing.xxl }} />
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
  infoCard: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surfaceLight,
  },
  infoHeader: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: fonts.sizes.sm,
    color: colors.textSecondary,
    lineHeight: fonts.sizes.sm * 1.5,
  },
  addButton: {
    marginBottom: spacing.lg,
  },
  formCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  formTitle: {
    fontSize: fonts.sizes.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: spacing.xs,
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
  relationshipOptions: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  relationshipChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
  },
  relationshipChipActive: {
    backgroundColor: colors.bg,
    borderColor: colors.textPrimary,
  },
  relationshipText: {
    fontSize: fonts.sizes.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  relationshipTextActive: {
    color: colors.textPrimary,
  },
  formButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  formButton: {
    flex: 1,
  },
  list: {
    gap: spacing.md,
  },
  caregiverCard: {
    gap: spacing.sm,
  },
  caregiverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  caregiverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  caregiverDetails: {
    flex: 1,
  },
  caregiverName: {
    fontSize: fonts.sizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  caregiverEmail: {
    fontSize: fonts.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  removeButton: {
    padding: spacing.xs,
  },
});
