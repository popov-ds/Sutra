const appJson = require('./app.json');

/** @type {'play' | 'rustore'} */
const distributionChannel = process.env.APP_DISTRIBUTION === 'play' ? 'play' : 'rustore';

const rsyaBannerUnitIdByChannel = {
  play: 'R-M-20373800-1',
  rustore: 'R-M-20373847-1',
};

const useDevTierTools = process.env.EXPO_PUBLIC_DEV_TIER_TOOLS === '1';
const rsyaBannerUnitId = rsyaBannerUnitIdByChannel[distributionChannel];

module.exports = {
  expo: {
    ...appJson.expo,
    plugins: [...(appJson.expo.plugins ?? []), 'expo-secure-store'],
    extra: {
      ...(appJson.expo.extra ?? {}),
      distributionChannel,
      rsyaBannerUnitId,
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
      devTierTools: useDevTierTools,
    },
  },
};
