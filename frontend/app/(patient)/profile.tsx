import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '../../src/context/auth';
import api from '../../src/services/api';
import Screen from '../../src/components/Screen';
import Header from '../../src/components/Header';
import AuraLogo from '../../src/components/AuraLogo';
import { colors, fonts, spacing, radius } from '../../src/theme';

//------This Function handles the Profile Screen---------
export default function ProfileScreen() {
    const router = useRouter();
    const { user, signOut, refreshUser } = useAuth();

    const [name, setName] = useState(user?.display_name || '');
    const [photo, setPhoto] = useState(user?.photo_url || null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) { setName(user.display_name || ''); setPhoto(user.photo_url || null); }
    }, [user]);

    const menuItems = [
        { label: 'Medical Information', icon: 'medical-outline', action: () => router.push('/(patient)/patient-info') },
        { label: 'Delete Account', icon: 'person-remove-outline', action: () => Alert.alert('Delete Account', 'This action cannot be undone.'), isDestructive: true },
        { label: 'App Settings', icon: 'settings-outline', action: () => router.push('/(patient)/settings') },
        { label: 'About', icon: 'information-circle-outline', action: () => { } },
        { label: 'Share App', icon: 'share-outline', action: () => { } },
    ];

    //------This Function handles the Pick Image---------
    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true, aspect: [1, 1], quality: 0.5,
            });
            if (!result.canceled) setPhoto(result.assets[0].uri);
        } catch { Alert.alert('Error', 'Failed to pick image'); }
    };

    //------This Function handles the Handle Save---------
    const handleSave = async () => {
        if (!name.trim()) { Alert.alert('Required', 'Please enter your name'); return; }
        setLoading(true);
        try {
            let photoUrl = photo;
            if (photo && photo.startsWith('file://')) {
                const base64 = await FileSystem.readAsStringAsync(photo, { encoding: 'base64' });
                photoUrl = `data:image/jpeg;base64,${base64}`;
            }
            await api.put('/auth/me', { display_name: name, photo_url: photoUrl });
            await refreshUser();
            Alert.alert('Success', 'Profile updated successfully');
        } catch { Alert.alert('Error', 'Failed to update profile.'); }
        finally { setLoading(false); }
    };

    return (
        <Screen safeArea={false}>
            <Header title="Profile" showBack={true} />
            <View style={s.content}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={s.profileSection}>
                        <Text style={s.sectionTitle}>EDIT PROFILE</Text>

                        <TouchableOpacity style={s.avatarWrapper} onPress={pickImage} activeOpacity={0.8}>
                            <View style={s.avatarContainer}>
                                {photo ? (
                                    <Image source={{ uri: photo }} style={s.avatar} />
                                ) : (
                                    <Ionicons name="person" size={36} color={colors.textMuted} />
                                )}
                            </View>
                            <View style={s.editIconBadge}>
                                <Ionicons name="camera" size={12} color={colors.bg} />
                            </View>
                        </TouchableOpacity>

                        <View style={s.formContainer}>
                            <Text style={s.label}>DISPLAY NAME</Text>
                            <TextInput style={s.input} value={name} onChangeText={setName}
                                placeholder="Enter your name" placeholderTextColor={colors.textMuted} />

                            <TouchableOpacity style={[s.saveBtn, loading && s.saveBtnDisabled]}
                                onPress={handleSave} disabled={loading} activeOpacity={0.85}>
                                {loading ? (
                                    <ActivityIndicator size="small" color={colors.bg} />
                                ) : (
                                    <>
                                        <Ionicons name="save-outline" size={18} color={colors.bg} />
                                        <Text style={s.saveBtnText}>Save Changes</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={s.section}>
                        <Text style={s.sectionTitle}>MENU</Text>
                        <View style={s.menuCard}>
                            {menuItems.map((item, index) => (
                                <TouchableOpacity key={index} style={[s.menuItem, index < menuItems.length - 1 && s.menuItemBorder]}
                                    onPress={item.action} activeOpacity={0.7}>
                                    <View style={s.menuItemLeft}>
                                        <View style={[s.menuIcon, item.isDestructive && s.menuIconDanger]}>
                                            <Ionicons name={item.icon as any} size={16} color={item.isDestructive ? colors.red : colors.textPrimary} />
                                        </View>
                                        <Text style={[s.menuItemText, item.isDestructive && { color: colors.red }]}>{item.label}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <TouchableOpacity style={s.logoutBtn} onPress={signOut} activeOpacity={0.7}>
                        <Ionicons name="log-out-outline" size={18} color={colors.textMuted} />
                        <Text style={s.logoutText}>Logout</Text>
                    </TouchableOpacity>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </View>
        </Screen>
    );
}

const s = StyleSheet.create({
    content: { flex: 1, paddingTop: spacing.lg, paddingHorizontal: spacing.xl },
    profileSection: { alignItems: 'center', marginBottom: spacing.xl },
    section: { marginBottom: spacing.xl },
    sectionTitle: { color: colors.textMuted, fontSize: 10, marginBottom: spacing.md, letterSpacing: 1.5, fontWeight: '600' },
    avatarWrapper: { position: 'relative', marginBottom: spacing.xl },
    avatarContainer: {
        width: 88, height: 88, borderRadius: 20, backgroundColor: colors.surface,
        alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
    },
    avatar: { width: '100%', height: '100%' },
    editIconBadge: {
        position: 'absolute', bottom: -2, right: -2, backgroundColor: colors.white,
        width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
        borderWidth: 3, borderColor: colors.bg,
    },
    formContainer: { width: '100%', gap: spacing.md },
    label: { fontSize: 10, color: colors.textMuted, letterSpacing: 1.5, fontWeight: '600', marginLeft: spacing.xs },
    input: {
        backgroundColor: colors.surface, borderRadius: radius.md, padding: 14,
        color: colors.textPrimary, fontSize: fonts.sizes.md, borderWidth: 1, borderColor: colors.border,
    },
    saveBtn: {
        backgroundColor: colors.white, height: 56, borderRadius: radius.full,
        width: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm,
    },
    saveBtnDisabled: { opacity: 0.5 },
    saveBtnText: { color: colors.bg, fontSize: fonts.sizes.md, fontWeight: '600' },
    menuCard: { backgroundColor: colors.surface, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
    menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
    menuItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    menuIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.surfaceLight, alignItems: 'center', justifyContent: 'center' },
    menuIconDanger: { backgroundColor: 'rgba(255,59,48,0.08)' },
    menuItemText: { color: colors.textPrimary, fontSize: fonts.sizes.sm, fontWeight: '500', letterSpacing: -0.2 },
    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
        paddingVertical: 14, borderRadius: radius.full, backgroundColor: colors.surface,
        borderWidth: 1, borderColor: colors.border,
    },
    logoutText: { color: colors.textMuted, fontSize: fonts.sizes.sm, fontWeight: '500' },
});
