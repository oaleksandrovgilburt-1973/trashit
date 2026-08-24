import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'bg.trashit.app',
  appName: 'TRASHit',
  webDir: 'dist/public',
  server: {
    url: 'https://trashit.bg',
    cleartext: false
  },
  plugins: {
    CapacitorHttp: {
      enabled: false
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '1007790802752-qvc11eo6iuh6mvt3vhkmluqm2adhu9b8.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    }
  }
};

export default config;