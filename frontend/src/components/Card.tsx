import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { components } from '../theme';

interface CardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    onPress?: () => void;
}

//------This Function handles the Card---------
export default function Card({ children, style, onPress }: CardProps) {
    const Component = onPress ? TouchableOpacity : View;
    
    return (
        <Component 
            style={[styles.card, style]} 
            onPress={onPress}
            activeOpacity={onPress ? 0.7 : 1}
        >
            {children}
        </Component>
    );
}

const styles = StyleSheet.create({
    card: components.card,
});
