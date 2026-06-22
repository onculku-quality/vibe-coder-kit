import type { ExpoConfig, ConfigContext } from 'expo/config';

const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Denetim Yönetim Sistemi',
  slug: 'denetim',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'denetim',
  userInterfaceStyle: 'automatic',
  ios: {
    ...config.ios,
    supportsTablet: true,
    bundleIdentifier: 'com.sizinadi.denetim',
  },
  android: {
    ...config.android,
    package: 'com.sizinadi.denetim',
    adaptiveIcon: {
      backgroundColor: '#ffffff',
    },
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#1e3a8a',
        android: {
          image: './assets/images/splash-icon.png',
          imageWidth: 120,
        },
      },
    ],
  ],
  extra: {
    eas: {
      projectId: EAS_PROJECT_ID ?? 'EAS_PROJECT_ID_BURAYA',
    },
  },
  experiments: {
    typedRoutes: true,
  },
});
