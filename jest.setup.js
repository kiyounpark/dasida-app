// Critical: Set up all jest.expo compatibility mocks BEFORE any module loading
import { configure } from '@testing-library/react-native';

configure({ testIdAttribute: 'testID' });

// Intercept native module access at the TurboModule level
jest.mock('react-native/Libraries/TurboModule/TurboModuleRegistry', () => {
  const mockDeviceInfo = {
    getConstants: () => ({
      forceTouchAvailable: false,
      BatteryState: 0,
    }),
  };

  return {
    get: jest.fn((moduleName) => {
      if (moduleName === 'DeviceInfo') {
        return mockDeviceInfo;
      }
      return null;
    }),
    getEnforcing: jest.fn((moduleName) => {
      if (moduleName === 'DeviceInfo') {
        return mockDeviceInfo;
      }
      return null;
    }),
  };
});

// Mock Dimensions with complete interface
jest.mock('react-native/Libraries/Utilities/Dimensions', () => {
  const mockDimensionsObject = {
    width: 375,
    height: 812,
    scale: 1,
    fontScale: 1,
    screen: {
      width: 375,
      height: 812,
      scale: 1,
      fontScale: 1,
    },
  };

  const mockModule = {
    get: jest.fn((dimension) => mockDimensionsObject[dimension] || mockDimensionsObject),
    set: jest.fn((newDims) => {
      if (newDims.screen) {
        mockDimensionsObject.screen = { ...mockDimensionsObject.screen, ...newDims.screen };
      }
      if (newDims.window) {
        Object.assign(mockDimensionsObject, newDims.window);
      }
    }),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
    _dimensions: mockDimensionsObject,
  };

  // Return both the module interface and the dimensions object directly accessible
  return Object.assign(mockModule, mockDimensionsObject);
});

// Mock PixelRatio - must be mocked early as StyleSheet requires it at load time
jest.mock('react-native/Libraries/Utilities/PixelRatio', () => {
  const pixelRatioMock = {
    get: jest.fn(() => 1),
    getFontScale: jest.fn(() => 1),
    getPixelSizeForLayoutSize: jest.fn((size) => size),
    round: jest.fn((size) => Math.round(size)),
    roundToNearestPixel: jest.fn((size) => Math.round(size)),
  };
  return {
    __esModule: true,
    default: pixelRatioMock,
    ...pixelRatioMock,
  };
});

// Mock third-party modules
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

jest.mock('react-native-svg', () => {
  const React = require('react');
  // Create a simple mock component that accepts any props and renders nothing
  const MockSvgComponent = React.forwardRef(({ children, ...props }, ref) =>
    React.createElement('View', { ref, ...props }, children)
  );

  return {
    __esModule: true,
    default: MockSvgComponent,
    Svg: MockSvgComponent,
    Line: MockSvgComponent,
    Path: MockSvgComponent,
    Polyline: MockSvgComponent,
    Circle: MockSvgComponent,
    Ellipse: MockSvgComponent,
    Rect: MockSvgComponent,
    Polygon: MockSvgComponent,
    G: MockSvgComponent,
    Text: MockSvgComponent,
    TSpan: MockSvgComponent,
    Image: MockSvgComponent,
    Use: MockSvgComponent,
    Symbol: MockSvgComponent,
    Defs: MockSvgComponent,
    LinearGradient: MockSvgComponent,
    RadialGradient: MockSvgComponent,
    Stop: MockSvgComponent,
    ClipPath: MockSvgComponent,
    ForeignObject: MockSvgComponent,
    Marker: MockSvgComponent,
    Mask: MockSvgComponent,
    Pattern: MockSvgComponent,
    animate: MockSvgComponent,
    animateMotion: MockSvgComponent,
    animateTransform: MockSvgComponent,
    view: MockSvgComponent,
  };
});
