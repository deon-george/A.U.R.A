import { View, StyleSheet, ViewStyle, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets, Edge } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

interface ScreenProps {
    children: React.ReactNode;
    style?: ViewStyle;
    safeArea?: boolean;
    header?: React.ReactNode;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    edges?: Edge[];
}

//------This Function handles the Screen---------
export default function Screen({
    children,
    style,
    safeArea = true,
    header,
    padding = 'md',
    edges = ['top', 'left', 'right']
}: ScreenProps) {
    const insets = useSafeAreaInsets();

    const containerStyle: ViewStyle = {
        paddingTop: safeArea && edges.includes('top') ? insets.top : 0,
        paddingBottom: safeArea && edges.includes('bottom') ? insets.bottom : 0,
        paddingLeft: safeArea && edges.includes('left') ? insets.left : 0,
        paddingRight: safeArea && edges.includes('right') ? insets.right : 0,
    };

    const contentPadding = padding === 'none' ? 0 : spacing[padding];

    return (
        <View style={[s.container, containerStyle]}>
            <StatusBar barStyle="light-content" backgroundColor={colors.bg} translucent />
            <View style={[s.wrapper, style]}>
                {header}
                <View style={[s.content, { paddingHorizontal: contentPadding }]}>{children}</View>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    wrapper: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
});
