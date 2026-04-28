import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.roombuddy.app',
  appName: 'RoomBuddy',
  webDir: 'out',
  server: {
    // For local Android Emulator testing, 10.0.2.2 is the alias for localhost
    // If testing on a physical device over Wi-Fi, change this to your computer's IP address (e.g. 192.168.1.5)
    // When you deploy the app to production (Vercel), change this to your live URL (e.g. https://roomsplit.vercel.app)
    url: 'https://roomledger.vercel.app/',
    cleartext: false // Disable cleartext for production HTTPS
  },
  plugins: {
    PushNotifications: {
      // Push notification configuration
      // The plugin will handle FCM registration automatically
    }
  }
};

export default config;
