export default ({ config }) => {
  return {
    ...config,
    plugins: [
      ...(config.plugins || []),
      '@react-native-firebase/app',
      '@react-native-firebase/messaging',
    ],
    scheme: ['orito', 'com.aura.app'],
    extra: {
      groqApiKey: process.env.GROQ_API_KEY || '',
      newsApiKey: process.env.NEWSAPI_KEY || '',
      firebaseWebClientId: process.env.FIREBASE_WEB_CLIENT_ID || '',
      expoPublicGoogleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || process.env.FIREBASE_WEB_CLIENT_ID || '',
      backendUrl: process.env.BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'http://10.0.2.2:8001',
      projectId: process.env.EXPO_PROJECT_ID || '',
    },
  };
};
