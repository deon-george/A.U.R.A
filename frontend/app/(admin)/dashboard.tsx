import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/auth';
import api from '../../src/services/api';
import { colors, fonts, radius, spacing } from '../../src/theme';

type RoleFilter = 'all' | 'patient' | 'caregiver' | 'admin';
type UserStatusFilter = 'all' | 'active' | 'banned' | 'pending_onboarding';

interface AdminStats {
    total_users: number;
    patients: number;
    caregivers: number;
    admins: number;
    banned: number;
    pending_onboarding: number;
    active_sos: number;
    interactions_24h: number;
    journals_24h: number;
    online_aura_modules: number;
    offline_aura_modules: number;
}

interface AdminUser {
    firebase_uid: string;
    email: string;
    display_name: string;
    role: 'patient' | 'caregiver' | 'admin';
    is_banned: boolean;
    is_onboarded: boolean;
    created_at: string;
}

interface ActiveSOS {
    id: string;
    patient_uid: string;
    patient_name: string;
    level: number;
    trigger: string;
    message: string;
    created_at: string;
}

interface UserSummary {
    active_sos: number;
    medications: number;
    journal_entries: number;
    orito_interactions: number;
}

const DEFAULT_STATS: AdminStats = {
    total_users: 0,
    patients: 0,
    caregivers: 0,
    admins: 0,
    banned: 0,
    pending_onboarding: 0,
    active_sos: 0,
    interactions_24h: 0,
    journals_24h: 0,
    online_aura_modules: 0,
    offline_aura_modules: 0,
};

//------This Function handles the Admin Dashboard---------
export default function AdminDashboard() {
    const { signOut } = useAuth();

    const [stats, setStats] = useState<AdminStats>(DEFAULT_STATS);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [activeSos, setActiveSos] = useState<ActiveSOS[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
    const [statusFilter, setStatusFilter] = useState<UserStatusFilter>('all');
    const [expandedUserUid, setExpandedUserUid] = useState<string | null>(null);
    const [summaryByUid, setSummaryByUid] = useState<Record<string, UserSummary>>({});

    const statsCards = useMemo(
        () => [
            { label: 'Users', value: stats.total_users, icon: 'people-outline', danger: false },
            { label: 'Patients', value: stats.patients, icon: 'person-outline', danger: false },
            { label: 'Caregivers', value: stats.caregivers, icon: 'heart-outline', danger: false },
            { label: 'Admins', value: stats.admins, icon: 'shield-checkmark-outline', danger: false },
            { label: 'Active SOS', value: stats.active_sos, icon: 'alert-circle-outline', danger: true },
            { label: 'Banned', value: stats.banned, icon: 'ban-outline', danger: stats.banned > 0 },
            { label: 'Pending Setup', value: stats.pending_onboarding, icon: 'hourglass-outline', danger: false },
            { label: 'Aura Online', value: stats.online_aura_modules, icon: 'radio-outline', danger: false },
        ],
        [stats]
    );

    useEffect(() => {
        void loadStatsAndIncidents();
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => {
            void loadUsers();
        }, 180);
        return () => clearTimeout(timeout);
    }, [searchQuery, roleFilter, statusFilter]);

    //------This Function handles the Load Stats And Incidents---------
    async function loadStatsAndIncidents() {
        try {
            const [statsRes, sosRes] = await Promise.all([
                api.get('/admin/stats').catch(() => ({ data: DEFAULT_STATS })),
                api.get('/admin/sos/active', { params: { limit: 20 } }).catch(() => ({ data: [] })),
            ]);
            setStats({
                ...DEFAULT_STATS,
                ...(statsRes.data || {}),
            });
            const incidents = Array.isArray(sosRes.data) ? sosRes.data : [];
            const dedupedIncidents = Array.from(
                new Map(incidents.map((incident: ActiveSOS) => [incident.id, incident])).values()
            );
            setActiveSos(dedupedIncidents);
        } catch {
        }
    }

    //------This Function handles the Load Users---------
    async function loadUsers() {
        setLoadingUsers(true);
        try {
            const params: Record<string, string | boolean | number> = {
                limit: 300,
            };
            if (searchQuery.trim()) {
                params.q = searchQuery.trim();
            }
            if (roleFilter !== 'all') {
                params.role = roleFilter;
            }
            if (statusFilter === 'active') {
                params.banned = false;
            } else if (statusFilter === 'banned') {
                params.banned = true;
            } else if (statusFilter === 'pending_onboarding') {
                params.onboarded = false;
            }

            const usersRes = await api.get('/admin/users', { params }).catch(() => ({ data: [] }));
            const rawUsers = Array.isArray(usersRes.data) ? usersRes.data : [];
            const dedupedUsers = Array.from(
                new Map(rawUsers.map((user: AdminUser) => [user.firebase_uid, user])).values()
            );
            setUsers(dedupedUsers);
        } catch {
            setUsers([]);
        } finally {
            setLoadingUsers(false);
        }
    }

    //------This Function handles the On Refresh---------
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([loadStatsAndIncidents(), loadUsers()]);
        setRefreshing(false);
    }, [searchQuery, roleFilter, statusFilter]);

    //------This Function handles the Toggle Ban---------
    async function toggleBan(uid: string, ban: boolean) {
        try {
            await api.put(`/admin/users/${uid}/${ban ? 'ban' : 'unban'}`);
            await Promise.all([loadStatsAndIncidents(), loadUsers()]);
        } catch {
        }
    }

    //------This Function handles the Set User Role---------
    async function setUserRole(uid: string, role: 'patient' | 'caregiver' | 'admin') {
        try {
            await api.put(`/admin/users/${uid}/role`, null, {
                params: { role },
            });
            await loadUsers();
        } catch {
        }
    }

    //------This Function handles the Resolve Sos---------
    async function resolveSos(id: string) {
        try {
            await api.post(`/sos/${id}/resolve`);
            await loadStatsAndIncidents();
        } catch {
        }
    }

    //------This Function handles the Toggle Expanded User---------
    async function toggleExpandedUser(uid: string) {
        if (expandedUserUid === uid) {
            setExpandedUserUid(null);
            return;
        }
        setExpandedUserUid(uid);

        if (summaryByUid[uid]) {
            return;
        }

        try {
            const response = await api.get(`/admin/users/${uid}/summary`);
            const summary = response.data?.summary as UserSummary | undefined;
            if (summary) {
                setSummaryByUid((prev) => ({ ...prev, [uid]: summary }));
            }
        } catch {
        }
    }

    return (
        <View style={s.container}>
            <View style={s.header}>
                <View>
                    <Text style={s.greeting}>Admin Panel</Text>
                    <Text style={s.title}>Operations</Text>
                </View>
                <View style={s.headerActions}>
                    <TouchableOpacity onPress={onRefresh} style={s.iconBtn} activeOpacity={0.75}>
                        <Ionicons name="refresh-outline" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={signOut} style={s.iconBtn} activeOpacity={0.75}>
                        <Ionicons name="log-out-outline" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={s.scroll}
                contentContainerStyle={s.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.white} />}
            >
                <View style={s.statsGrid}>
                    {statsCards.map((card) => (
                        <View key={card.label} style={[s.statCard, card.danger && card.value > 0 && s.statCardDanger]}>
                            <Ionicons
                                name={card.icon as any}
                                size={18}
                                color={card.danger && card.value > 0 ? colors.red : colors.textSecondary}
                            />
                            <Text style={[s.statValue, card.danger && card.value > 0 && s.statValueDanger]}>
                                {card.value}
                            </Text>
                            <Text style={s.statLabel}>{card.label}</Text>
                        </View>
                    ))}
                </View>

                <View style={s.section}>
                    <View style={s.sectionHeader}>
                        <Text style={s.sectionLabel}>ACTIVE INCIDENTS</Text>
                        <Text style={s.sectionMeta}>{activeSos.length} open</Text>
                    </View>
                    {activeSos.length === 0 ? (
                        <View style={s.emptyCard}>
                            <Text style={s.emptyText}>No active SOS incidents</Text>
                        </View>
                    ) : (
                        activeSos.map((incident) => (
                            <View key={incident.id} style={s.incidentCard}>
                                <View style={s.incidentTop}>
                                    <View style={s.levelBadge}>
                                        <Text style={s.levelText}>L{incident.level}</Text>
                                    </View>
                                    <Text style={s.incidentTime}>
                                        {new Date(incident.created_at).toLocaleString()}
                                    </Text>
                                </View>
                                <Text style={s.incidentTitle}>{incident.patient_name || 'Patient'}</Text>
                                <Text style={s.incidentSub}>
                                    Trigger: {incident.trigger || 'unknown'} • UID: {incident.patient_uid}
                                </Text>
                                {!!incident.message && <Text style={s.incidentMessage}>{incident.message}</Text>}
                                <TouchableOpacity
                                    style={s.resolveBtn}
                                    onPress={() => resolveSos(incident.id)}
                                    activeOpacity={0.82}
                                >
                                    <Ionicons name="checkmark-done-outline" size={15} color={colors.bg} />
                                    <Text style={s.resolveBtnText}>Resolve Incident</Text>
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </View>

                <View style={s.section}>
                    <Text style={s.sectionLabel}>USER MANAGEMENT</Text>

                    <View style={s.searchWrap}>
                        <Ionicons name="search-outline" size={16} color={colors.textMuted} />
                        <TextInput
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Search by name, email, or UID"
                            placeholderTextColor={colors.textMuted}
                            style={s.searchInput}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    <Text style={s.filterLabel}>Role</Text>
                    <View style={s.filterRow}>
                        {(['all', 'patient', 'caregiver', 'admin'] as RoleFilter[]).map((role) => (
                            <TouchableOpacity
                                key={role}
                                style={[s.chip, roleFilter === role && s.chipActive]}
                                onPress={() => setRoleFilter(role)}
                                activeOpacity={0.8}
                            >
                                <Text style={[s.chipText, roleFilter === role && s.chipTextActive]}>{role}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={s.filterLabel}>Status</Text>
                    <View style={s.filterRow}>
                        {(['all', 'active', 'banned', 'pending_onboarding'] as UserStatusFilter[]).map((status) => (
                            <TouchableOpacity
                                key={status}
                                style={[s.chip, statusFilter === status && s.chipActive]}
                                onPress={() => setStatusFilter(status)}
                                activeOpacity={0.8}
                            >
                                <Text style={[s.chipText, statusFilter === status && s.chipTextActive]}>
                                    {status === 'pending_onboarding' ? 'Pending setup' : status === 'all' ? 'Any' : status}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {loadingUsers ? (
                        <View style={s.loadingWrap}>
                            <ActivityIndicator size="small" color={colors.white} />
                            <Text style={s.loadingText}>Loading users...</Text>
                        </View>
                    ) : users.length === 0 ? (
                        <View style={s.emptyCard}>
                            <Text style={s.emptyText}>No users found for current filters</Text>
                        </View>
                    ) : (
                        users.map((user) => {
                            const summary = summaryByUid[user.firebase_uid];
                            const isExpanded = expandedUserUid === user.firebase_uid;
                            return (
                                <View key={user.firebase_uid} style={[s.userCard, user.is_banned && s.userCardBanned]}>
                                    <TouchableOpacity
                                        style={s.userTop}
                                        onPress={() => toggleExpandedUser(user.firebase_uid)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={s.avatar}>
                                            <Text style={s.avatarText}>
                                                {(user.display_name || user.email || '?')[0].toUpperCase()}
                                            </Text>
                                        </View>
                                        <View style={s.userMeta}>
                                            <Text style={s.userName}>{user.display_name || 'No name'}</Text>
                                            <Text style={s.userEmail}>{user.email}</Text>
                                            <Text style={s.userUid}>{user.firebase_uid}</Text>
                                        </View>
                                        <View style={s.userTopRight}>
                                            <View style={[s.roleBadge, user.role === 'admin' && s.roleBadgeAdmin]}>
                                                <Text style={[s.roleText, user.role === 'admin' && s.roleTextAdmin]}>
                                                    {user.role}
                                                </Text>
                                            </View>
                                            {!user.is_onboarded && (
                                                <View style={s.pendingBadge}>
                                                    <Text style={s.pendingText}>pending</Text>
                                                </View>
                                            )}
                                        </View>
                                    </TouchableOpacity>

                                    <View style={s.userActions}>
                                        {user.role !== 'admin' && (
                                            <>
                                                <TouchableOpacity
                                                    style={[s.actionBtn, s.secondaryBtn]}
                                                    onPress={() => setUserRole(user.firebase_uid, 'patient')}
                                                    activeOpacity={0.82}
                                                >
                                                    <Text style={s.actionText}>Set Patient</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[s.actionBtn, s.secondaryBtn]}
                                                    onPress={() => setUserRole(user.firebase_uid, 'caregiver')}
                                                    activeOpacity={0.82}
                                                >
                                                    <Text style={s.actionText}>Set Caregiver</Text>
                                                </TouchableOpacity>
                                            </>
                                        )}
                                        {user.role !== 'admin' && (
                                            <TouchableOpacity
                                                style={[s.actionBtn, user.is_banned ? s.secondaryBtn : s.dangerBtn]}
                                                onPress={() => toggleBan(user.firebase_uid, !user.is_banned)}
                                                activeOpacity={0.82}
                                            >
                                                <Ionicons
                                                    name={user.is_banned ? 'checkmark-circle-outline' : 'ban-outline'}
                                                    size={14}
                                                    color={colors.textPrimary}
                                                />
                                                <Text style={s.actionText}>{user.is_banned ? 'Unban' : 'Ban'}</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    {isExpanded && (
                                        <View style={s.summaryWrap}>
                                            {!summary ? (
                                                <Text style={s.summaryLoading}>Loading user summary...</Text>
                                            ) : (
                                                <View style={s.summaryGrid}>
                                                    <View style={s.summaryItem}>
                                                        <Text style={s.summaryValue}>{summary.active_sos}</Text>
                                                        <Text style={s.summaryLabel}>Active SOS</Text>
                                                    </View>
                                                    <View style={s.summaryItem}>
                                                        <Text style={s.summaryValue}>{summary.medications}</Text>
                                                        <Text style={s.summaryLabel}>Meds</Text>
                                                    </View>
                                                    <View style={s.summaryItem}>
                                                        <Text style={s.summaryValue}>{summary.journal_entries}</Text>
                                                        <Text style={s.summaryLabel}>Journal</Text>
                                                    </View>
                                                    <View style={s.summaryItem}>
                                                        <Text style={s.summaryValue}>{summary.orito_interactions}</Text>
                                                        <Text style={s.summaryLabel}>Orito Chats</Text>
                                                    </View>
                                                </View>
                                            )}
                                        </View>
                                    )}
                                </View>
                            );
                        })
                    )}
                </View>

                <View style={{ height: spacing.xxl }} />
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xxl,
        paddingBottom: spacing.md,
    },
    greeting: { color: colors.textMuted, fontSize: fonts.sizes.sm, letterSpacing: 0.3 },
    title: { color: colors.textPrimary, fontSize: fonts.sizes.xxl, fontWeight: '300', letterSpacing: -0.5, marginTop: 2 },
    headerActions: { flexDirection: 'row', gap: spacing.sm },
    iconBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.xl },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
    statCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    statCardDanger: { borderColor: 'rgba(255,59,48,0.3)', backgroundColor: 'rgba(255,59,48,0.05)' },
    statValue: { color: colors.textPrimary, fontSize: fonts.sizes.xl, fontWeight: '600', marginTop: spacing.xs, letterSpacing: -0.3 },
    statValueDanger: { color: colors.red },
    statLabel: { color: colors.textSecondary, fontSize: 10, marginTop: 2 },

    section: { marginBottom: spacing.xl },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
    sectionLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '600', letterSpacing: 1.4, marginBottom: spacing.md },
    sectionMeta: { color: colors.textSecondary, fontSize: fonts.sizes.xs, marginBottom: spacing.md },

    emptyCard: {
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: spacing.lg,
        alignItems: 'center',
    },
    emptyText: { color: colors.textMuted, fontSize: fonts.sizes.sm },

    incidentCard: {
        borderWidth: 1,
        borderColor: 'rgba(255,59,48,0.24)',
        backgroundColor: 'rgba(255,59,48,0.05)',
        borderRadius: radius.xl,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    incidentTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    levelBadge: {
        backgroundColor: 'rgba(255,59,48,0.18)',
        borderRadius: radius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
    },
    levelText: { color: colors.red, fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
    incidentTime: { color: colors.textMuted, fontSize: 10 },
    incidentTitle: { color: colors.textPrimary, fontSize: fonts.sizes.md, fontWeight: '700', marginTop: spacing.xs },
    incidentSub: { color: colors.textSecondary, fontSize: fonts.sizes.xs, marginTop: 2 },
    incidentMessage: { color: colors.textPrimary, fontSize: fonts.sizes.sm, marginTop: spacing.sm, lineHeight: 18 },
    resolveBtn: {
        marginTop: spacing.md,
        height: 36,
        borderRadius: radius.full,
        backgroundColor: colors.white,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
    },
    resolveBtnText: { color: colors.bg, fontSize: fonts.sizes.xs, fontWeight: '700' },

    searchWrap: {
        height: 42,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        marginBottom: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    searchInput: {
        flex: 1,
        color: colors.textPrimary,
        fontSize: fonts.sizes.sm,
        paddingVertical: 0,
    },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
    filterLabel: {
        color: colors.textMuted,
        fontSize: 10,
        letterSpacing: 1.1,
        marginBottom: spacing.xs,
        textTransform: 'uppercase',
    },
    chip: {
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        borderRadius: radius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
    },
    chipActive: {
        borderColor: colors.white,
        backgroundColor: '#191919',
    },
    chipText: { color: colors.textSecondary, fontSize: 11, textTransform: 'capitalize' },
    chipTextActive: { color: colors.textPrimary, fontWeight: '600' },

    loadingWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
    loadingText: { color: colors.textSecondary, fontSize: fonts.sizes.sm },

    userCard: {
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    userCardBanned: {
        borderColor: 'rgba(255,59,48,0.22)',
        backgroundColor: 'rgba(255,59,48,0.04)',
    },
    userTop: { flexDirection: 'row', alignItems: 'center' },
    avatar: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: colors.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    avatarText: { color: colors.textPrimary, fontSize: fonts.sizes.sm, fontWeight: '700' },
    userMeta: { flex: 1 },
    userName: { color: colors.textPrimary, fontSize: fonts.sizes.md, fontWeight: '700' },
    userEmail: { color: colors.textSecondary, fontSize: fonts.sizes.xs, marginTop: 1 },
    userUid: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
    userTopRight: { alignItems: 'flex-end', gap: 4 },
    roleBadge: {
        borderRadius: radius.full,
        backgroundColor: colors.surfaceLight,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
    },
    roleBadgeAdmin: { backgroundColor: 'rgba(255,255,255,0.14)' },
    roleText: { color: colors.textSecondary, fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
    roleTextAdmin: { color: colors.textPrimary },
    pendingBadge: {
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.16)',
        borderRadius: radius.full,
        paddingHorizontal: spacing.xs,
        paddingVertical: 1,
    },
    pendingText: { color: colors.textMuted, fontSize: 9, textTransform: 'uppercase' },
    userActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
    actionBtn: {
        height: 30,
        borderRadius: radius.full,
        paddingHorizontal: spacing.md,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 5,
    },
    secondaryBtn: {
        borderColor: colors.border,
        backgroundColor: colors.surfaceLight,
    },
    dangerBtn: {
        borderColor: 'rgba(255,59,48,0.26)',
        backgroundColor: 'rgba(255,59,48,0.10)',
    },
    actionText: { color: colors.textPrimary, fontSize: 11, fontWeight: '600' },

    summaryWrap: {
        marginTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: spacing.sm,
    },
    summaryLoading: { color: colors.textMuted, fontSize: fonts.sizes.xs },
    summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    summaryItem: {
        flex: 1,
        minWidth: '44%',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        backgroundColor: colors.bgSecondary,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    summaryValue: { color: colors.textPrimary, fontSize: fonts.sizes.md, fontWeight: '700' },
    summaryLabel: { color: colors.textMuted, fontSize: 10, marginTop: 1 },
});
