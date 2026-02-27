const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  const message = args[0];
  if (
    typeof message === 'string' && 
    (message.includes('This method is deprecated') ||
     message.includes('React Native Firebase namespaced API') ||
     message.includes('rnfirebase.io/migrating-to-v22'))
  ) {
    return;
  }
  originalWarn(...args);
};

import 'expo-router/entry';
