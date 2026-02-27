import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import Screen from '../../src/components/Screen';
import Input from '../../src/components/Input';
import { colors, fonts, spacing, radius } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COMFORT_OPTIONS = [
  { key: 'walks', label: 'Short walks', icon: 'walk' },
  { key: 'music', label: 'Music', icon: 'musical-notes' },
  { key: 'photos', label: 'Photo memories', icon: 'images' },
  { key: 'tea', label: 'Tea time', icon: 'cafe' },
  { key: 'prayer', label: 'Prayer', icon: 'heart' },
  { key: 'chat', label: 'Talking with family', icon: 'people' },
  { key: 'garden', label: 'Plants & nature', icon: 'leaf' },
  { key: 'stories', label: 'Stories', icon: 'book' },
];

//------This Function handles the Patient Onboarding Welcome Screen---------
export default function PatientOnboardingWelcomeScreen() {
  const router = useRouter();
  const [selectedComforts, setSelectedComforts] = useState<string[]>([]);
  const [preferredName, setPreferredName] = useState('');
  const [importantPeople, setImportantPeople] = useState('');

  //------This Function handles the Toggle Comfort---------
  function toggleComfort(key: string) {
    setSelectedComforts(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]);
  }

  //------This Function handles the Handle Next---------
  async function handleNext() {
    await AsyncStorage.setItem('onboarding_patient_comforts', JSON.stringify(selectedComforts));
    await AsyncStorage.setItem('onboarding_patient_name', preferredName.trim());
    await AsyncStorage.setItem('onboarding_patient_people', importantPeople.trim());
    router.push('/(onboarding)/medications');
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.headerBlock}>
            <Text style={s.step}>Step 1 of 4</Text>
            <Text style={s.title}>Set your daily comfort</Text>
            <Text style={s.subtitle}>Share simple preferences so Orito can feel familiar.</Text>
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>Profile</Text>
            <Input
              label="NAME YOU LIKE"
              value={preferredName}
              onChangeText={setPreferredName}
              placeholder="e.g. Nana, Dad, Maria"
            />
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>Comfort Choices</Text>
            <Text style={s.label}>WHAT HELPS YOU FEEL GOOD?</Text>
            <View style={s.chipGrid}>
              {COMFORT_OPTIONS.map((item) => {
                const selected = selectedComforts.includes(item.key);
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[s.chip, selected && s.chipActive]}
                    onPress={() => toggleComfort(item.key)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name={item.icon as any} size={16} color={selected ? colors.bg : colors.textSecondary} />
                    <Text style={[s.chipText, selected && s.chipTextActive]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>Important People</Text>
            <Input
              label="PEOPLE ORITO SHOULD REMEMBER"
              value={importantPeople}
              onChangeText={setImportantPeople}
              placeholder="Names you want support with"
              multiline
              numberOfLines={3}
              style={s.textArea}
            />
          </View>

          <TouchableOpacity style={s.primaryBtn} onPress={handleNext} activeOpacity={0.9}>
            <Text style={s.primaryBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.bg} />
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
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgTertiary,
  },
  chipActive: {
    borderColor: colors.white,
    backgroundColor: colors.white,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.bg,
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
  primaryBtnText: {
    color: colors.bg,
    fontSize: fonts.sizes.md,
    fontWeight: '700',
  },
});
