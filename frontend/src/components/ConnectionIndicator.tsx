import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { connectionMonitor } from '../services/connectionMonitor';
import { colors, fonts } from '../theme';

//------This Function handles the Connection Indicator---------
export default function ConnectionIndicator({ showLabel = true }: { showLabel?: boolean }) {
    const [connected, setConnected] = useState(true);
    const [pingTime, setPingTime] = useState(0);
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        const unsubscribe = connectionMonitor.subscribe((isConnected, ping) => {
            setConnected(isConnected);
            if (ping !== undefined) {
                setPingTime(ping);
            }
        });

        return unsubscribe;
    }, []);

    //------This Function handles the Get Status Color---------
    const getStatusColor = () => {
        if (!connected) return colors.red;
        if (pingTime < 100) return colors.textPrimary;
        if (pingTime < 500) return colors.textMuted;
        return colors.red;
    };

    const getStatusText = () => {
        if (!connected) return 'Offline';
        if (pingTime < 100) return 'Excellent';
        if (pingTime < 500) return 'Good';
        return 'Slow';
    };

    return (
        <TouchableOpacity
            onPress={() => setShowDetails(!showDetails)}
            onLongPress={() => connectionMonitor.checkConnectionNow()}
            style={s.container}
            activeOpacity={0.7}
        >
            <View style={[s.dot, { backgroundColor: getStatusColor() }]} />
            {showDetails && showLabel && (
                <Text style={s.detailText}>
                    {getStatusText()} {connected && `(${pingTime}ms)`}
                </Text>
            )}
        </TouchableOpacity>
    );
}

const s = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        opacity: 1,
    },
    detailText: {
        marginLeft: 6,
        fontSize: fonts.sizes.xs,
        color: colors.textMuted,
        fontFamily: 'monospace',
    },
});
