import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../src/services/api';
import Screen from '../../src/components/Screen';
import Input from '../../src/components/Input';
import { colors, fonts, spacing, radius } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ROUTINE_OPTIONS = [
  { key: 'morning', label: 'Calm mornings' },
  { key: 'daytime', label: 'Steady daytime rhythm' },
  { key: 'evening', label: 'Quiet evenings' },
];

//------This Function handles the Patient Onboarding Routine Screen---------
export default function PatientOnboardingRoutineScreen() {
  const router = useRouter();
  const [routinePreference, setRoutinePreference] = useState('');
  const [favoriteFood, setFavoriteFood] = useState('');
  const [dailyRoutine, setDailyRoutine] = useState('');
  const [saving, setSaving] = useState(false);

  //------This Function handles the Handle Next---------
  async function handleNext() {
    setSaving(true);
    try {
      const comfortsRaw = await AsyncStorage.getItem('onboarding_patient_comforts');
      const preferredName = await AsyncStorage.getItem('onboarding_patient_name');
      const people = await AsyncStorage.getItem('onboarding_patient_people');
      const comforts = comfortsRaw ? JSON.parse(comfortsRaw) : [];

      await api.put('/onboarding/preferences', {
        hobbies: comforts,
        important_people: people || '',
        daily_routine: dailyRoutine,
        time_preference: routinePreference,
        favorite_food: favoriteFood,
        communication_style: preferredName || '',
      }).catch(() => {});

      await AsyncStorage.removeItem('onboarding_patient_comforts');
      await AsyncStorage.removeItem('onboarding_patient_name');
      await AsyncStorage.removeItem('onboarding_patient_people');

      router.push('/(onboarding)/headphones');
    } catch {
      router.push('/(onboarding)/headphones');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.headerBlock}>
            <Text style={s.step}>Step 2 of 4</Text>
            <Text style={s.title}>Daily rhythm</Text>
            <Text style={s.subtitle}>These details help Orito time reminders in a gentle way.</Text>
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>Timing Preference</Text>
            <Text style={s.label}>WHAT FEELS MOST NATURAL?</Text>
            <View style={s.optionList}>
              {ROUTINE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[s.optionCard, routinePreference === opt.key && s.optionCardActive]}
                  onPress={() => setRoutinePreference(opt.key)}
                  activeOpacity={0.85}
                >
                  <Text style={[s.optionText, routinePreference === opt.key && s.optionTextActive]}>{opt.label}</Text>
                  {routinePreference === opt.key && <Ionicons name="checkmark-circle" size={18} color={colors.white} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>Simple Preferences</Text>
            <Input
              label="A COMFORT FOOD YOU LOVE"
              value={favoriteFood}
              onChangeText={setFavoriteFood}
              placeholder="e.g. Soup, Tea, Toast"
            />
            <Input
              label="ANY DAILY RHYTHM TO KEEP IN MIND?"
              value={dailyRoutine}
              onChangeText={setDailyRoutine}
              placeholder="e.g. Tea at 7, walk at 8, rest after lunch"
              multiline
              numberOfLines={3}
              style={s.textArea}
            />
          </View>

          <TouchableOpacity style={[s.primaryBtn, saving && s.primaryBtnDisabled]} onPress={handleNext} activeOpacity={0.9} disabled={saving}>
            <Text style={s.primaryBtnText}>{saving ? 'Saving...' : 'Continue'}</Text>
            {!saving && <Ionicons name="arrow-forward" size={18} color={colors.bg} />}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  headerBlock: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  step: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
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
  },
  optionList: {
    gap: spacing.sm,
  },
  optionCard: {
    backgroundColor: colors.bgTertiary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionCardActive: {
    borderColor: colors.white,
    backgroundColor: colors.bg,
  },
  optionText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.md,
    fontWeight: '600',
  },
  optionTextActive: {
    color: colors.white,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  primaryBtn: {
    marginTop: spacing.md,
    height: 54,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: colors.bg,
    fontSize: fonts.sizes.md,
    fontWeight: '700',
  },
});
