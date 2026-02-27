import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import api from '../../src/services/api';
import ConnectionIndicator from '../../src/components/ConnectionIndicator';
import { colors, fonts, spacing, radius } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';

//------This Function handles the Location Screen---------
export default function LocationScreen() {
    const router = useRouter();
    const [location, setLocation] = useState<any>(null);
    const [patientUid, setPatientUid] = useState<string | null>(null);
    const [patientName, setPatientName] = useState<string>('Patient');
    const [loading, setLoading] = useState(true);
    const mapRef = useRef<MapView>(null);

    useEffect(() => {
        loadPatientUid();
    }, []);

    useEffect(() => {
        if (!patientUid) {
            return;
        }
        fetchLocation();
        const interval = setInterval(fetchLocation, 30000);
        return () => clearInterval(interval);
    }, [patientUid]);

    //------This Function handles the Load Patient Uid---------
    async function loadPatientUid() {
        try {
            const meRes = await api.get('/auth/me');
            const userData = meRes.data;
            if (userData.role === 'caregiver' && userData.linked_patients?.length > 0) {
                setPatientUid(userData.linked_patients[0]);
                return;
            }
            if (userData.role === 'patient') {
                setPatientUid(userData.firebase_uid);
                return;
            }
            setPatientUid(null);
            setLoading(false);
        } catch {
            setPatientUid(null);
            setLoading(false);
        }
    }

    //------This Function handles the Fetch Location---------
    async function fetchLocation() {
        if (!patientUid) {
            setLoading(false);
            return;
        }
        try {
            const res = await api.get(`/location/${patientUid}`);
            const loc = res.data?.location ?? null;
            setLocation(loc);
            setPatientName(res.data?.display_name || 'Patient');
            if (loc && mapRef.current) {
                mapRef.current.animateToRegion({
                    latitude: loc.latitude, longitude: loc.longitude,
                    latitudeDelta: 0.01, longitudeDelta: 0.01,
                }, 1000);
            }
        } catch {
            setLocation(null);
            setPatientName('Patient');
        } finally {
            setLoading(false);
        }
    }

    return (
        <View style={s.container}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={s.title}>Patient Location</Text>
                <View style={s.headerRight}>
                    <ConnectionIndicator />
                    <TouchableOpacity onPress={fetchLocation} style={s.refreshBtn} activeOpacity={0.7}>
                        <Ionicons name="refresh" size={18} color={colors.textPrimary} />
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <View style={s.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.white} />
                    <Text style={s.loadingText}>Loading location...</Text>
                </View>
            ) : location ? (
                <>
                    <MapView
                        ref={mapRef} provider={PROVIDER_GOOGLE} style={s.map}
                        initialRegion={{ latitude: location.latitude || 0, longitude: location.longitude || 0, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
                        customMapStyle={darkMapStyle}
                    >
                        <Marker coordinate={{ latitude: location.latitude, longitude: location.longitude }}
                            title={`${patientName} Location`}
                            description={`Updated: ${new Date(location.timestamp || Date.now()).toLocaleString()}`}
                            pinColor={colors.red}
                        >
                            <View style={s.marker}>
                                <Ionicons name="person" size={20} color={colors.white} />
                            </View>
                        </Marker>
                        {location.accuracy && (
                            <Circle center={{ latitude: location.latitude, longitude: location.longitude }}
                                radius={location.accuracy} strokeColor="rgba(255,255,255,0.3)" fillColor="rgba(255,255,255,0.05)" />
                        )}
                    </MapView>

                    <View style={s.infoCard}>
                        <View style={s.infoGrid}>
                            <View style={s.infoItem}>
                                <Text style={s.infoLabel}>COORDINATES</Text>
                                <Text style={s.infoValue}>{location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</Text>
                            </View>
                            {location.accuracy && (
                                <View style={s.infoItem}>
                                    <Text style={s.infoLabel}>ACCURACY</Text>
                                    <Text style={s.infoValue}>±{Math.round(location.accuracy)}m</Text>
                                </View>
                            )}
                            <View style={s.infoItem}>
                                <Text style={s.infoLabel}>UPDATED</Text>
                                <Text style={s.infoValue}>{new Date(location.timestamp || Date.now()).toLocaleTimeString()}</Text>
                            </View>
                        </View>
                    </View>
                </>
            ) : (
                <View style={s.noData}>
                    <Ionicons name="location-outline" size={48} color={colors.textMuted} />
                    <Text style={s.noDataTitle}>No location data</Text>
                    <Text style={s.noDataSub}>{patientUid ? 'Patient tracking may not be enabled' : 'No linked patient found for this account'}</Text>
                </View>
            )}
        </View>
    );
}

const darkMapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#0A0A0A' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#666666' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#050505' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#151515' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1A1A1A' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#080808' }] },
];

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: spacing.xxl, paddingBottom: spacing.md, backgroundColor: colors.bg, zIndex: 10 },
    backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    refreshBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    title: { color: colors.textPrimary, fontSize: fonts.sizes.lg, fontWeight: '600', letterSpacing: -0.3 },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
    loadingText: { color: colors.textSecondary, fontSize: fonts.sizes.sm },
    map: { flex: 1, width: '100%' },
    marker: { backgroundColor: colors.white, borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.bg },
    infoCard: { position: 'absolute', bottom: spacing.xl, left: spacing.xl, right: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
    infoGrid: { flexDirection: 'row', justifyContent: 'space-between' },
    infoItem: { gap: 4 },
    infoLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '600', letterSpacing: 1 },
    infoValue: { color: colors.textPrimary, fontSize: fonts.sizes.sm, fontWeight: '500', fontFamily: 'monospace' },
    noData: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
    noDataTitle: { color: colors.textPrimary, fontSize: fonts.sizes.lg, fontWeight: '600' },
    noDataSub: { color: colors.textMuted, fontSize: fonts.sizes.sm },
});
