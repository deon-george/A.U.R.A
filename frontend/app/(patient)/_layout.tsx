import React from 'react';
import { View } from 'react-native';
import { Slot } from 'expo-router';
import BottomNav from '../../src/components/BottomNav';
import { colors } from '../../src/theme';

//------This Function handles the Patient Layout---------
export default function PatientLayout() {
    return (
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <Slot />
            <BottomNav />
        </View>
    );
}
