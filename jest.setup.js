// Mock native modules that jest-expo can't load
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    getCurrentUser: jest.fn(),
    isSignedIn: jest.fn(),
  },
}));

jest.mock('expo-haptics', () => ({
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
  notificationAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
}));

jest.mock('expo-apple-authentication', () => ({}));

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid'),
  digestStringAsync: jest.fn(() => Promise.resolve('mock-hash')),
}));

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('expo-auth-session', () => ({
  AccessTokenRequest: jest.fn(),
  AuthRequest: jest.fn(),
  ResponseType: { IdToken: 'id_token' },
  revokeAsync: jest.fn(),
}));

jest.mock('expo-constants', () => ({
  manifest: {
    extra: {},
  },
}));

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  GoogleAuthProvider: jest.fn(),
  OAuthProvider: jest.fn(),
  deleteUser: jest.fn(),
  getAuth: jest.fn(),
  initializeAuth: jest.fn(),
  signInWithCustomToken: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(),
  onSnapshot: jest.fn(),
  query: jest.fn(),
  collection: jest.fn(),
  getDocs: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  getAllKeys: jest.fn(),
}));

jest.mock('react-native/Libraries/TurboModule/TurboModuleRegistry', () => {
  const mockModules = {
    NativeDeviceInfo: {
      getConstants: () => ({
        forceTouchAvailable: false,
        BatteryState: 0,
      }),
    },
  };

  return {
    get: jest.fn((name) => mockModules[name]),
    getEnforcing: jest.fn((name) => mockModules[name] || {}),
  };
});
