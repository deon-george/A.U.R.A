import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, Image, Modal, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import api from '../../src/services/api';
import { colors, fonts, spacing, radius } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../src/components/Header';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Relative { id: string; name: string; relationship: string; photos: string[]; face_embeddings: any[] }

//------This Function handles the Relatives Screen---------
export default function RelativesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [relatives, setRelatives] = useState<Relative[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);

    
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newName, setNewName] = useState('');
    const [newRelationship, setNewRelationship] = useState('');
    const [newImageUri, setNewImageUri] = useState<string | null>(null);
    const [currentPhotos, setCurrentPhotos] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => { load(); }, []);

    //------This Function handles the Load---------
    async function load() {
        try {
            const res = await api.get('/relatives/');
            setRelatives(res.data);
        } catch (error) {
            console.error('[Relatives] Failed to load:', error);
        }
    }

    //------This Function handles the Reset Form---------
    const resetForm = () => {
        setEditingId(null);
        setNewName('');
        setNewRelationship('');
        setNewImageUri(null);
        setCurrentPhotos([]);
        setIsSubmitting(false);
        setShowAddModal(false);
    };

    //------This Function handles the Open Edit Modal---------
    const openEditModal = (relative: Relative) => {
        setEditingId(relative.id);
        setNewName(relative.name);
        setNewRelationship(relative.relationship);
        setCurrentPhotos(relative.photos);
        setNewImageUri(null);
        setShowAddModal(true);
    };

    //------This Function handles the Handle Delete Relative---------
    async function handleDeleteRelative(id: string) {
        Alert.alert(
            'Delete Person',
            'Are you sure you want to delete this person? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/relatives/${id}`);
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            load();
                            if (editingId === id) resetForm();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete person');
                        }
                    }
                }
            ]
        );
    }

    
    //------This Function handles the Handle Remove Photo---------
    const handleRemovePhoto = (photoUrl: string) => {
        setCurrentPhotos(prev => prev.filter(p => p !== photoUrl));
    };

    //------This Function handles the Pick Image For New Person---------
    async function pickImageForNewPerson() {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                Alert.alert('Permission Required', 'We need access to your photos to add a person.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setNewImageUri(result.assets[0].uri);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick image');
        }
    }

    //------This Function handles the Handle Submit---------
    async function handleSubmit() {
        if (!newName.trim() || !newRelationship.trim()) {
            Alert.alert('Missing Info', 'Please enter a name and relationship.');
            return;
        }
        
        if (!newImageUri && currentPhotos.length === 0) {
            Alert.alert('Photo Required', 'You must have at least one photo for this person.');
            return;
        }

        setIsSubmitting(true);
        try {
            let targetId = editingId;

            if (editingId) {
                
                await api.put(`/relatives/${editingId}`, {
                    name: newName,
                    relationship: newRelationship,
                    photos: currentPhotos 
                });
            } else {
                
                const createRes = await api.post('/relatives/', {
                    name: newName,
                    relationship: newRelationship
                });
                targetId = createRes.data.id;
            }

            
            if (newImageUri && targetId) {
                const formData = new FormData();
                const filename = newImageUri.split('/').pop() || 'photo.jpg';
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : 'image/jpeg';

                formData.append('file', {
                    uri: newImageUri,
                    name: filename,
                    type,
                } as any);

                await api.post(`/relatives/${targetId}/photo`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            resetForm();
            load();
        } catch (error: any) {
            console.error('Save Person Error:', error);
            Alert.alert('Error', 'Failed to save person. Please try again.');
            setIsSubmitting(false);
        }
    }

    return (
        <View style={s.container}>
            <Header title="My People" showBack={true} />

            <FlatList
                data={relatives}
                keyExtractor={(r) => r.id}
                numColumns={2}
                columnWrapperStyle={s.row}
                contentContainerStyle={s.list}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                    <View style={s.card}>
                        <TouchableOpacity
                            activeOpacity={0.9}
                            style={s.imageContainer}
                            onPress={() => openEditModal(item)}
                        >
                            {item.photos.length > 0 ? (
                                <Image source={{ uri: item.photos[0] }} style={s.cardImage} />
                            ) : (
                                <View style={s.placeholderImage}>
                                    <Ionicons name="person" size={40} color="#333" />
                                </View>
                            )}
                            <View style={s.editBadge}>
                                <Ionicons name="pencil" size={12} color="#000" />
                            </View>
                        </TouchableOpacity>

                        <View style={s.cardInfo}>
                            <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
                            <Text style={s.cardRel} numberOfLines={1}>{item.relationship}</Text>
                        </View>
                    </View>
                )}
                ListEmptyComponent={
                    <View style={s.emptyState}>
                        <Ionicons name="people-outline" size={48} color="#333" />
                        <Text style={s.emptyText}>No people added yet</Text>
                    </View>
                }
            />

            <TouchableOpacity
                style={s.fab}
                activeOpacity={0.8}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    resetForm();
                    setShowAddModal(true);
                }}
            >
                <Ionicons name="add" size={32} color="#000" />
            </TouchableOpacity>

            <Modal
                visible={showAddModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowAddModal(false)}
            >
                <View style={[s.modalContainer, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
                    <View style={s.modalHeader}>
                        <Text style={s.modalTitle}>{editingId ? 'Edit Person' : 'New Person'}</Text>
                        <TouchableOpacity onPress={resetForm}>
                            <Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <View style={s.form}>
                        {}
                        <View>
                            <Text style={s.sectionLabel}>Photos</Text>
                            <View style={s.photosRow}>
                                {currentPhotos.map((photo, index) => (
                                    <View key={index} style={s.miniPhotoWrap}>
                                        <Image source={{ uri: photo }} style={s.miniPhoto} />
                                        <TouchableOpacity
                                            style={s.removePhotoBtn}
                                            onPress={() => handleRemovePhoto(photo)}
                                        >
                                            <Ionicons name="close" size={10} color="#fff" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                                <TouchableOpacity style={s.addPhotoBtn} onPress={pickImageForNewPerson}>
                                    {newImageUri ? (
                                        <Image source={{ uri: newImageUri }} style={s.miniPhoto} />
                                    ) : (
                                        <Ionicons name="add" size={24} color="#666" />
                                    )}
                                </TouchableOpacity>
                            </View>
                            {newImageUri && <Text style={s.helperText}>New photo selected to upload</Text>}
                        </View>

                        <View style={s.inputGroup}>
                            <Text style={s.label}>Name</Text>
                            <TextInput
                                style={s.input}
                                value={newName}
                                onChangeText={setNewName}
                                placeholder="Enter name"
                                placeholderTextColor="#666"
                            />
                        </View>

                        <View style={s.inputGroup}>
                            <Text style={s.label}>Relationship</Text>
                            <TextInput
                                style={s.input}
                                value={newRelationship}
                                onChangeText={setNewRelationship}
                                placeholder="e.g. Son, Friend, Doctor"
                                placeholderTextColor="#666"
                            />
                        </View>

                        <TouchableOpacity
                            style={[s.submitBtn, isSubmitting && s.submitBtnDisabled]}
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color={colors.textPrimary} />
                            ) : (
                                <>
                                    <Ionicons name={editingId ? 'save-outline' : 'person-add-outline'} size={20} color={colors.textPrimary} />
                                    <Text style={s.submitBtnText}>
                                        {editingId ? 'Save Changes' : 'Add Person'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {editingId && (
                            <TouchableOpacity
                                style={s.deleteBtn}
                                onPress={() => handleDeleteRelative(editingId)}
                            >
                                <Ionicons name="trash-outline" size={18} color={colors.red} />
                                <Text style={s.deleteBtnText}>Delete Person</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    list: { padding: spacing.md, paddingBottom: 130 },
    row: { justifyContent: 'space-between', marginBottom: spacing.md },

    
    card: {
        width: '48%',
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: spacing.md,
        alignItems: 'flex-start',
    },
    imageContainer: {
        width: '100%',
        height: 140,
        borderRadius: radius.lg,
        overflow: 'hidden',
        backgroundColor: colors.surfaceLight,
        marginBottom: spacing.md,
        position: 'relative',
    },
    cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    placeholderImage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    editBadge: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
        backgroundColor: colors.primary,
        padding: spacing.xs,
        borderRadius: radius.full,
    },
    cardInfo: { width: '100%' },
    cardName: { color: colors.textPrimary, fontSize: fonts.sizes.lg, fontWeight: '600', marginBottom: 2 },
    cardRel: { color: colors.textSecondary, fontSize: fonts.sizes.sm },

    emptyState: { alignItems: 'center', marginTop: 100, opacity: 0.5 },
    emptyText: { color: colors.textMuted, marginTop: spacing.lg, fontSize: fonts.sizes.lg },

    
    fab: {
        position: 'absolute',
        bottom: 110,
        right: spacing.lg,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.red,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.red,
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },

    
    modalContainer: { flex: 1, backgroundColor: colors.surface, padding: spacing.lg },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
    modalTitle: { color: colors.textPrimary, fontSize: fonts.sizes.xxl, fontWeight: 'bold' },

    form: { gap: spacing.xl },
    
    sectionLabel: { color: colors.textSecondary, fontSize: fonts.sizes.sm, textTransform: 'uppercase', marginBottom: spacing.sm },
    photosRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
    miniPhotoWrap: { width: 60, height: 60, borderRadius: radius.sm, overflow: 'hidden', position: 'relative' },
    miniPhoto: { width: '100%', height: '100%' },
    removePhotoBtn: {
        position: 'absolute', top: 2, right: 2, backgroundColor: colors.overlayDark,
        width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center'
    },
    addPhotoBtn: {
        width: 60, height: 60, borderRadius: radius.sm, backgroundColor: colors.surfaceLight,
        borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
        alignItems: 'center', justifyContent: 'center'
    },
    helperText: { color: colors.primary, fontSize: fonts.sizes.sm, marginTop: spacing.xs },

    inputGroup: { gap: spacing.sm },
    label: { color: colors.textSecondary, fontSize: fonts.sizes.sm, textTransform: 'uppercase', letterSpacing: 1 },
    input: {
        backgroundColor: colors.surfaceLight,
        borderRadius: radius.lg,
        padding: spacing.lg,
        color: colors.textPrimary,
        fontSize: fonts.sizes.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },

    submitBtn: {
        backgroundColor: colors.red,
        padding: spacing.lg,
        borderRadius: radius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: spacing.xs,
        marginTop: spacing.lg,
    },
    submitBtnDisabled: { backgroundColor: colors.surfaceLight },
    submitBtnText: { color: colors.textPrimary, fontSize: fonts.sizes.lg, fontWeight: 'bold' },
    deleteBtn: {
        padding: spacing.lg,
        borderRadius: radius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: spacing.xs,
        marginTop: 0,
        borderWidth: 1,
        borderColor: colors.red,
    },
    deleteBtnText: { color: colors.red, fontSize: fonts.sizes.lg, fontWeight: '600' },
});
