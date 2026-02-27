import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSavedModule } from '../../src/services/aura-discovery';
import { WebView } from 'react-native-webview';
import { colors, fonts, spacing, radius } from '../../src/theme';

const { width, height } = Dimensions.get('window');

//------This Function handles the Camera Preview Screen---------
export default function CameraPreviewScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [streamUrl, setStreamUrl] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const webViewRef = useRef<any>(null);

    useEffect(() => {
        console.log('\n' + '='.repeat(60));
        console.log('[CAMERA-PREVIEW] 📹 Camera Preview Screen Mounted');
        console.log('='.repeat(60));
        loadStreamUrl();

        return () => {
            console.log('\n' + '='.repeat(60));
            console.log('[CAMERA-PREVIEW] 📹 Camera Preview Screen Unmounted');
            console.log('='.repeat(60) + '\n');
        };
    }, []);

    //------This Function handles the Load Stream Url---------
    const loadStreamUrl = async () => {
        try {
            console.log('[CAMERA-PREVIEW] Loading stream URL...');
            setLoading(true);
            setError(null);

            
            console.log('[CAMERA-PREVIEW] Fetching saved module from storage...');
            const module = await getSavedModule();

            if (!module) {
                console.error('[CAMERA-PREVIEW] ✗ No module found in storage');
                setError('No AuraModule connected. Please connect to a module first.');
                setLoading(false);
                return;
            }

            console.log('[CAMERA-PREVIEW] ✓ Module found:', JSON.stringify(module, null, 2));

            
            const port = module.ws_port || module.port || 8001;
            const url = `http://${module.ip}:${port}/video_feed`;

            console.log('[CAMERA-PREVIEW] Built stream URL:', url);
            console.log('[CAMERA-PREVIEW] Testing connection to:', `http://${module.ip}:${port}/health`);

            
            try {
                const healthResponse = await fetch(`http://${module.ip}:${port}/health`, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                });

                if (healthResponse.ok) {
                    const healthData = await healthResponse.json();
                    console.log('[CAMERA-PREVIEW] ✓ Health check passed:', healthData);
                    console.log('[CAMERA-PREVIEW] Camera status:', healthData.camera ? 'Running' : 'Not running');

                    if (!healthData.camera) {
                        console.warn('[CAMERA-PREVIEW] ⚠️ Warning: Camera is not running on module');
                    }
                } else {
                    console.warn('[CAMERA-PREVIEW] ⚠️ Health check returned status:', healthResponse.status);
                }
            } catch (healthError) {
                console.error('[CAMERA-PREVIEW] ✗ Health check failed:', healthError);
                setError('Cannot connect to AuraModule. Please check if the module is running.');
                setLoading(false);
                return;
            }

            console.log('[CAMERA-PREVIEW] ✓ Setting stream URL:', url);
            setStreamUrl(url);
            setLoading(false);

            console.log('[CAMERA-PREVIEW] ✓ Stream initialized successfully');
            console.log('='.repeat(60) + '\n');
        } catch (err: any) {
            console.error('[CAMERA-PREVIEW] ✗ Error loading stream:', err);
            console.error('[CAMERA-PREVIEW] Error details:', err.message || err);
            console.log('='.repeat(60) + '\n');
            setError('Failed to connect to camera stream: ' + (err.message || 'Unknown error'));
            setLoading(false);
        }
    };

    //------This Function handles the Handle Refresh---------
    const handleRefresh = () => {
        console.log('\n[CAMERA-PREVIEW] 🔄 Refresh button pressed');
        setRefreshKey((prev) => prev + 1);
        loadStreamUrl();
    };

    //------This Function handles the Handle Close---------
    const handleClose = () => {
        console.log('[CAMERA-PREVIEW] ✕ Close button pressed, navigating back\n');
        router.back();
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleClose} style={styles.backButton}>
                        <Ionicons name="close" size={28} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Camera Preview</Text>
                    <View style={styles.placeholder} />
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Connecting to camera...</Text>
                </View>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleClose} style={styles.backButton}>
                        <Ionicons name="close" size={28} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Camera Preview</Text>
                    <View style={styles.placeholder} />
                </View>
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={64} color={colors.red} />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
                        <Ionicons name="refresh-outline" size={18} color={colors.bg} />
                        <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {}
            <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
                <TouchableOpacity onPress={handleClose} style={styles.backButton}>
                    <Ionicons name="close" size={28} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Camera Preview</Text>
                <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
                    <Ionicons name="refresh" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
            </View>

            {}
            <View style={styles.streamContainer}>
                {streamUrl && (
                    <WebView
                        ref={webViewRef}
                        key={refreshKey}
                        source={{
                            html: `
                                <!DOCTYPE html>
                                <html>
                                <head>
                                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                                    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
                                    <meta http-equiv="Pragma" content="no-cache">
                                    <meta http-equiv="Expires" content="0">
                                    <style>
                                        * {
                                            margin: 0;
                                            padding: 0;
                                            box-sizing: border-box;
                                        }
                                        html, body {
                                            width: 100%;
                                            height: 100%;
                                            background: #000;
                                            overflow: hidden;
                                        }
                                        #container {
                                            width: 100%;
                                            height: 100%;
                                            display: flex;
                                            align-items: center;
                                            justify-content: center;
                                        }
                                        img {
                                            max-width: 100%;
                                            max-height: 100%;
                                            object-fit: contain;
                                            display: block;
                                        }
                                        #status {
                                            display: none;
                                        }
                                        #error {
                                            position: fixed;
                                            top: 50%;
                                            left: 50%;
                                            transform: translate(-50%, -50%);
                                            color: white;
                                            text-align: center;
                                            padding: 20px;
                                            font-size: 14px;
                                            display: none;
                                        }
                                    </style>
                                </head>
                                <body>
                                    <div id="status">Connecting...</div>
                                    <div id="error"></div>
                                    <div id="container">
                                        <img id="stream" src="${streamUrl}" alt="Camera Stream" />
                                    </div>
                                    <script>
                                        const img = document.getElementById('stream');
                                        const status = document.getElementById('status');
                                        const errorDiv = document.getElementById('error');
                                        let frameCount = 0;
                                        let startTime = Date.now();
                                        
                                        let isLoading = true;
                                        let loadTimeout = null;
                                        
                                        //------This Function handles the Update Status---------
                                        function updateStatus(msg) {
                                            status.textContent = msg;
                                            window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'status', message: msg }));
                                        }
                                        
                                        //------This Function handles the Show Error---------
                                        function showError(msg) {
                                            errorDiv.textContent = msg;
                                            errorDiv.style.display = 'block';
                                            img.style.display = 'none';
                                            window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'error', message: msg }));
                                        }
                                        
                                        img.onload = function() {
                                            if (isLoading) {
                                                isLoading = false;
                                                updateStatus('Stream Active');
                                                window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'loaded' }));
                                            }
                                            frameCount++;
                                            
                                            if (frameCount % 30 === 0) {
                                                const elapsed = (Date.now() - startTime) / 1000;
                                                const fps = Math.round(30 / elapsed);
                                                updateStatus('Streaming • ' + fps + ' FPS');
                                                startTime = Date.now();
                                            }
                                        };
                                        
                                        img.onerror = function(e) {
                                            console.error('Stream error:', e);
                                            showError('Failed to load camera stream.\\n\\nPlease check:\\n- Camera is running on AuraModule\\n- Network connection is stable');
                                        };
                                        
                                        loadTimeout = setTimeout(() => {
                                            if (isLoading) {
                                                showError('Stream loading timeout.\\n\\nThe camera stream took too long to respond.');
                                            }
                                        }, 10000);
                                        
                                        console.log('MJPEG stream initialized:', '${streamUrl}');
                                        updateStatus('Loading stream...');
                                    </script>
                                </body>
                                </html>
                            `
                        }}
                        style={styles.stream}
                        onMessage={(event) => {
                            try {
                                const data = JSON.parse(event.nativeEvent.data);
                                console.log('[CAMERA-PREVIEW] WebView message:', data);

                                if (data.type === 'error') {
                                    console.error('[CAMERA-PREVIEW] Stream error from WebView:', data.message);
                                } else if (data.type === 'loaded') {
                                    console.log('[CAMERA-PREVIEW] ✓ Stream loaded and displaying frames');
                                } else if (data.type === 'status') {
                                    console.log('[CAMERA-PREVIEW] Status:', data.message);
                                }
                            } catch (e) {
                                console.log('[CAMERA-PREVIEW] WebView message (raw):', event.nativeEvent.data);
                            }
                        }}
                        onLoadStart={() => {
                            console.log('[CAMERA-PREVIEW] 📡 WebView loading started...');
                        }}
                        onLoad={() => {
                            console.log('[CAMERA-PREVIEW] ✓ WebView HTML loaded');
                        }}
                        onError={(syntheticEvent) => {
                            const { nativeEvent } = syntheticEvent;
                            console.error('[CAMERA-PREVIEW] ✗ WebView error:', nativeEvent);
                            setError('WebView error: ' + JSON.stringify(nativeEvent));
                        }}
                        onHttpError={(syntheticEvent) => {
                            const { nativeEvent } = syntheticEvent;
                            console.error('[CAMERA-PREVIEW] ✗ HTTP error:', nativeEvent.statusCode, nativeEvent.description);
                        }}
                        
                        androidHardwareAccelerationDisabled={false}
                        androidLayerType="hardware"
                        
                        mixedContentMode="always"
                        
                        cacheEnabled={false}
                        cacheMode="LOAD_NO_CACHE"
                        
                        allowsInlineMediaPlayback={true}
                        mediaPlaybackRequiresUserAction={false}
                        
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        
                        scrollEnabled={false}
                        bounces={false}
                        
                        showsHorizontalScrollIndicator={false}
                        showsVerticalScrollIndicator={false}
                    />
                )}

                {}
                <View style={styles.overlayInfo}>
                    <View style={styles.infoItem}>
                        <Ionicons name="videocam" size={16} color="#fff" />
                        <Text style={styles.infoText}>Live Feed</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <View style={styles.liveIndicator} />
                        <Text style={styles.infoText}>LIVE</Text>
                    </View>
                </View>
            </View>

            {}
            <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, 20) + 80 }]}>
                <Text style={styles.controlsTitle}>Camera Controls</Text>
                <Text style={styles.controlsSubtitle}>
                    This is a live view from the AuraModule camera. The module continuously monitors
                    for familiar faces and can be triggered for identification.
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
        backgroundColor: colors.overlayDark,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: fonts.sizes.lg,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    refreshButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholder: {
        width: 40,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: spacing.lg,
        fontSize: fonts.sizes.lg,
        color: colors.textPrimary,
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    errorText: {
        marginTop: spacing.lg,
        fontSize: fonts.sizes.lg,
        color: colors.textPrimary,
        textAlign: 'center',
        lineHeight: 24,
    },
    retryButton: {
        marginTop: spacing.lg,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        backgroundColor: colors.primary,
        borderRadius: radius.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
    },
    retryButtonText: {
        fontSize: fonts.sizes.lg,
        fontWeight: '600',
        color: colors.bg,
    },
    streamContainer: {
        flex: 1,
        backgroundColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stream: {
        width: width,
        height: height - 200,
    },
    overlayInfo: {
        position: 'absolute',
        top: spacing.md,
        left: spacing.md,
        right: spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.overlayDark,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radius.lg,
        gap: spacing.xs,
    },
    infoText: {
        fontSize: fonts.sizes.sm,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    liveIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.red,
    },
    controls: {
        backgroundColor: colors.overlayDark,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.lg,
        
    },
    controlsTitle: {
        fontSize: fonts.sizes.lg,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    controlsSubtitle: {
        fontSize: fonts.sizes.md,
        color: colors.textSecondary,
        lineHeight: 20,
    },
});
