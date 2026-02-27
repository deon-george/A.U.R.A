import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../src/services/api';
import ConnectionIndicator from '../../src/components/ConnectionIndicator';
import { colors, fonts, spacing, radius } from '../../src/theme';
import Header from '../../src/components/Header';
import { Ionicons } from '@expo/vector-icons';

interface Entry { id: string; content: string; source: string; mood: string; created_at: string; extracted_events: any[] }

//------This Function handles the Journal Screen---------
export default function JournalScreen() {
    const router = useRouter();
    const [entries, setEntries] = useState<Entry[]>([]);
    const [newEntry, setNewEntry] = useState('');
    const [showAdd, setShowAdd] = useState(false);

    useEffect(() => { load(); }, []);

    //------This Function handles the Load---------
    async function load() {
        try { const res = await api.get('/journal/'); setEntries(res.data); }
        catch { Alert.alert('Error', 'Failed to load journal entries'); }
    }

    //------This Function handles the Add Entry---------
    async function addEntry() {
        if (!newEntry.trim()) return;
        await api.post('/journal/', { content: newEntry, source: 'manual', mood: '' });
        setNewEntry(''); setShowAdd(false); load();
    }

    //------This Function handles the Format Date---------
    function formatDate(iso: string): string {
        const d = new Date(iso);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    //------This Function handles the Render Entry---------
    const renderEntry = useCallback(({ item }: { item: Entry }) => (
        <View style={s.entryCard}>
            <View style={s.entryHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name={item.source === 'aura_module' ? 'mic' : 'pencil'} size={12} color={colors.textSecondary} />
                    <Text style={s.entrySource}>{item.source === 'aura_module' ? 'Conversation' : 'Note'}</Text>
                </View>
                <Text style={s.entryDate}>{formatDate(item.created_at)}</Text>
            </View>
            <Text style={s.entryContent} numberOfLines={4}>{item.content}</Text>
            {item.extracted_events.length > 0 && (
                <View style={s.eventsWrap}>
                    {item.extracted_events.slice(0, 2).map((ev: any, i: number) => (
                        <View key={i} style={s.eventTag}>
                            <Ionicons name="bookmark" size={10} color={colors.textSecondary} />
                            <Text style={s.eventText}>{ev.description || JSON.stringify(ev)}</Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    ), []);

    //------This Function handles the List Empty Component---------
    const ListEmptyComponent = useCallback(() => (
        <Text style={s.empty}>No journal entries yet</Text>
    ), []);

    return (
        <View style={s.container}>
            <Header
                title="Journal"
                centered
                showBack
                onBackPress={() => router.back()}
                rightElement={
                    <View style={s.headerRight}>
                        <ConnectionIndicator />
                        <TouchableOpacity onPress={() => setShowAdd(!showAdd)} style={s.addToggle} activeOpacity={0.7}>
                            <Ionicons name={showAdd ? 'close' : 'add'} size={18} color={colors.textPrimary} />
                        </TouchableOpacity>
                    </View>
                }
            />

            {showAdd && (
                <View style={s.addCard}>
                    <TextInput style={s.addInput} value={newEntry} onChangeText={setNewEntry}
                        placeholder="Write a memory or note..." placeholderTextColor={colors.textMuted}
                        multiline numberOfLines={3} />
                    <TouchableOpacity style={s.addBtn} onPress={addEntry} activeOpacity={0.85}>
                        <Ionicons name="save-outline" size={16} color={colors.bg} />
                        <Text style={s.addBtnText}>Save</Text>
                    </TouchableOpacity>
                </View>
            )}

            <FlatList
                data={entries}
                keyExtractor={(e) => e.id}
                renderItem={renderEntry}
                contentContainerStyle={s.list}
                ListEmptyComponent={ListEmptyComponent}
                maxToRenderPerBatch={10}
                updateCellsBatchingPeriod={50}
                initialNumToRender={10}
                windowSize={10}
                removeClippedSubviews={true}
                getItemLayout={(data, index) => ({ length: 150, offset: 150 * index, index })}
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    addToggle: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    addCard: { marginHorizontal: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
    addInput: { color: colors.textPrimary, fontSize: fonts.sizes.md, minHeight: 60, textAlignVertical: 'top' },
    addBtn: { backgroundColor: colors.white, paddingVertical: 12, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.xs, marginTop: spacing.md },
    addBtnText: { color: colors.bg, fontSize: fonts.sizes.sm, fontWeight: '600' },
    list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
    entryCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
    entryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
    entrySource: { color: colors.textSecondary, fontSize: fonts.sizes.xs },
    entryDate: { color: colors.textMuted, fontSize: fonts.sizes.xs },
    entryContent: { color: colors.textPrimary, fontSize: fonts.sizes.md, lineHeight: 22, letterSpacing: -0.1 },
    eventsWrap: { marginTop: spacing.sm, gap: spacing.xs },
    eventTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surfaceLight, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
    eventText: { color: colors.textSecondary, fontSize: fonts.sizes.xs },
    empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xxl, fontSize: fonts.sizes.sm },
});
