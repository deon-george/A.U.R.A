import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Screen from '../../src/components/Screen';
import { colors, fonts, spacing, radius } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';

//------This Function handles the Headphones Screen---------
export default function HeadphonesScreen() {
  const router = useRouter();

  return (
    <Screen>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.headerBlock}>
          <Text style={s.step}>Step 3 of 4</Text>
          <Text style={s.title}>Audio setup</Text>
          <Text style={s.subtitle}>Connect headphones now for private voice support, or do it later in settings.</Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Recommended</Text>
          <View style={s.iconWrap}>
            <Ionicons name="headset" size={56} color={colors.white} />
          </View>
          <Text style={s.sectionText}>Headphones make voice prompts clearer and reduce nearby distractions.</Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Continue</Text>
          <Text style={s.sectionText}>You can continue without connecting a device.</Text>
        </View>

        <TouchableOpacity style={s.primaryBtn} onPress={() => router.push('/(onboarding)/permissions')} activeOpacity={0.9}>
          <Text style={s.primaryBtnText}>Continue</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.bg} />
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
    alignItems: 'center',
  },
  sectionTitle: {
    alignSelf: 'flex-start',
    color: colors.textPrimary,
    fontSize: fonts.sizes.md,
    fontWeight: '700',
  },
  sectionText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.sm,
    lineHeight: 20,
    textAlign: 'center',
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.bgTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
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
