import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fonts, shadows } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HOME_PATHS = [
    '/',
    '/(patient)/dashboard',
    '/(patient)/connect-aura',
    '/(patient)/camera-preview',
    '/(patient)/relatives',
    '/(patient)/sos',
];

const CALENDAR_PATHS = [
    '/(patient)/calendar',
    '/(patient)/calendar-medications',
    '/(patient)/calendar-tasks',
    '/(patient)/calendar-journal',
];

const MEMORY_PATHS = [
    '/(patient)/memory_bank',
    '/(patient)/journal',
];

const SETTINGS_PATHS = [
    '/(patient)/settings',
    '/(patient)/profile',
    '/(patient)/voice-setup',
    '/(patient)/chat',
    '/(patient)/patient-info',
    '/(patient)/edit-condition',
    '/(patient)/edit-caregivers',
    '/(patient)/edit-medications',
];

//------This Function handles the Normalize Path---------
function normalizePath(path: string) {
    if (!path) {
        return '/';
    }

    let normalized = path.trim();
    if (!normalized.startsWith('/')) {
        normalized = `/${normalized}`;
    }

    normalized = normalized.replace(/\/+/g, '/');
    normalized = normalized
        .split('/')
        .filter(Boolean)
        .filter((segment) => !(segment.startsWith('(') && segment.endsWith(')')))
        .join('/');

    normalized = `/${normalized}`;
    if (normalized.length > 1 && normalized.endsWith('/')) {
        normalized = normalized.slice(0, -1);
    }

    return normalized;
}

//------This Function handles the Matches Any Path---------
function matchesAnyPath(pathname: string, paths: string[]) {
    const currentPath = normalizePath(pathname);
    return paths.some((path) => {
        const targetPath = normalizePath(path);
        return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
    });
}

//------This Function handles the Bottom Nav---------
export default function BottomNav() {
    const router = useRouter();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();

    const tabs = [
        {
            name: 'Home',
            activeIcon: 'home-sharp',
            inactiveIcon: 'home-outline',
            route: '/(patient)/dashboard',
        },
        {
            name: 'Calendar',
            activeIcon: 'calendar-sharp',
            inactiveIcon: 'calendar-outline',
            route: '/(patient)/calendar',
        },
        {
            name: 'Memory',
            activeIcon: 'archive-sharp',
            inactiveIcon: 'archive-outline',
            route: '/(patient)/memory_bank',
        },
        {
            name: 'Settings',
            activeIcon: 'settings-sharp',
            inactiveIcon: 'settings-outline',
            route: '/(patient)/settings',
        },
    ];

    const activeTab = (() => {
        if (matchesAnyPath(pathname, CALENDAR_PATHS)) return 'Calendar';
        if (matchesAnyPath(pathname, MEMORY_PATHS)) return 'Memory';
        if (matchesAnyPath(pathname, SETTINGS_PATHS)) return 'Settings';
        if (matchesAnyPath(pathname, HOME_PATHS)) return 'Home';
        return 'Home';
    })();

    return (
        <View style={[s.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
            <View style={s.bar}>
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.name;
                    const isCurrentRoot = matchesAnyPath(pathname, [tab.route]);

                    return (
                        <Pressable
                            key={tab.name}
                            style={({ pressed }) => [
                                s.tab,
                                isActive && s.tabActive,
                                pressed && !isActive && s.tabPressed,
                            ]}
                            onPress={() => {
                                if (isCurrentRoot) {
                                    return;
                                }
                                router.replace(tab.route as any);
                            }}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: isActive }}
                            hitSlop={6}
                        >
                            <Ionicons
                                name={(isActive ? tab.activeIcon : tab.inactiveIcon) as any}
                                size={18}
                                color={isActive ? colors.bg : colors.textMuted}
                            />
                            <Text style={[s.label, isActive && s.labelActive]}>{tab.name}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: spacing.md,
        backgroundColor: 'transparent',
    },
    bar: {
        flexDirection: 'row',
        backgroundColor: '#0D0D0D',
        borderRadius: 26,
        paddingVertical: 8,
        paddingHorizontal: 6,
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.md,
    },
    tab: {
        flex: 1,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.lg,
        marginHorizontal: 3,
    },
    tabActive: {
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    tabPressed: {
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
    },
    label: {
        fontSize: fonts.sizes.xs,
        color: colors.textMuted,
        fontWeight: '500',
        marginTop: 4,
        letterSpacing: 0.15,
    },
    labelActive: {
        color: colors.bg,
        fontWeight: '700',
    },
});
