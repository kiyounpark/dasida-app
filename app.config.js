const IS_DEV = process.env.APP_VARIANT === 'dev';

module.exports = {
  expo: {
    name: IS_DEV ? '다시다 Dev' : '다시다',
    slug: 'dasida-app',
    version: '1.0.3',
    orientation: 'default',
    icon: './assets/images/icon.png',
    scheme: IS_DEV ? 'dasidaapp-dev' : 'dasidaapp',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    updates: {
      url: 'https://u.expo.dev/e398244b-6a71-42d3-bad0-1f69e0fe2148',
      assetPatternsToBeBundled: [],
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
    ios: {
      bundleIdentifier: IS_DEV ? 'com.dasida.app.dev' : 'com.dasida.app',
      buildNumber: '1',
      googleServicesFile: './config/firebase/GoogleService-Info.plist',
      usesAppleSignIn: true,
      supportsTablet: true,
      requireFullScreen: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        UISupportedInterfaceOrientations: [
          'UIInterfaceOrientationPortrait',
        ],
        'UISupportedInterfaceOrientations~ipad': [
          'UIInterfaceOrientationLandscapeLeft',
          'UIInterfaceOrientationLandscapeRight',
        ],
      },
    },
    android: {
      versionCode: 1,
      orientation: 'default',
      adaptiveIcon: {
        backgroundColor: '#ffffff',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: IS_DEV ? 'com.dasida.app.dev' : 'com.dasida.app',
      googleServicesFile: './config/firebase/google-services.json',
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-apple-authentication',
      [
        'expo-build-properties',
        {
          ios: { useFrameworks: 'static' },
        },
      ],
      [
        'expo-notifications',
        {
          androidMode: 'default',
        },
      ],
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#FFFFFF',
          dark: {
            backgroundColor: '#FFFFFF',
          },
        },
      ],
      'expo-secure-store',
      '@react-native-google-signin/google-signin',
      [
        '@react-native-firebase/app',
        {
          ios: {
            googleServicesFile: './config/firebase/GoogleService-Info.plist',
          },
          android: {
            googleServicesFile: './config/firebase/google-services.json',
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: 'e398244b-6a71-42d3-bad0-1f69e0fe2148',
      },
      privacyPolicyUrl: 'https://dasida-app.web.app/privacy',
    },
    owner: 'xsalsswmxzxc',
  },
};
