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
    }
  }
};

export default config;