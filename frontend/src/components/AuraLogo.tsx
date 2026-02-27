import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme';

interface AuraLogoProps {
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  color?: string;
  style?: any;
}

//------This Function handles the Aura Logo---------
export default function AuraLogo({ size = 'medium', color = colors.textPrimary, style }: AuraLogoProps) {
  const sizeStyles = {
    small: { fontSize: 20, letterSpacing: 4 },
    medium: { fontSize: 28, letterSpacing: 6 },
    large: { fontSize: 48, letterSpacing: 8 },
    xlarge: { fontSize: 72, letterSpacing: 12 },
  };

  return (
    <View style={[s.container, style]}>
      <Text style={[s.logo, { color, ...sizeStyles[size] }]}>
        AURA
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontFamily: 'System',
    fontWeight: '200',
    textTransform: 'uppercase',
  },
});
