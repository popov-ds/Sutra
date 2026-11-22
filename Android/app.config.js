const appJson = require('./app.json');

/** @type {'play' | 'rustore'} */
const distributionChannel = process.env.APP_DISTRIBUTION === 'play' ? 'play' : 'rustore';

const rsyaBannerUnitIdByChannel = {
  play: 'R-M-20373800-1',
  rustore: 'R-M-20373847-1',
};

const useDevTierTools = process.env.EXPO_PUBLIC_DEV_TIER_TOOLS === '1';
/** debug APK / EXPO_PUBLIC_RSYA_USE_DEMO — стабильный demo-banner-yandex для проверки SDK */
const rsyaBannerUnitId =
  process.env.EXPO_PUBLIC_RSYA_USE_DEMO === '1' || useDevTierTools
    ? 'demo-banner-yandex'
    : rsyaBannerUnitIdByChannel[distributionChannel];
const rustoreProProductIds = (
  process.env.EXPO_PUBLIC_RUSTORE_PRO_PRODUCT_IDS ?? 'pro_year,pro_month'
)
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);
const rustoreConsoleAppId = process.env.EXPO_PUBLIC_RUSTORE_CONSOLE_APP_ID ?? '2063787405';
const rustoreProMonthPrice = Number(process.env.EXPO_PUBLIC_RUSTORE_PRO_MONTH_PRICE ?? '249');
const rustoreProYearPrice = Number(process.env.EXPO_PUBLIC_RUSTORE_PRO_YEAR_PRICE ?? '1490');

module.exports = {
  expo: {
    ...appJson.expo,
    plugins: [
      ...(appJson.expo.plugins ?? []),
      'expo-secure-store',
      [
        './plugins/withRustorePay.js',
        {
          consoleAppId: rustoreConsoleAppId,
          deeplinkScheme: appJson.expo.scheme ?? 'sutra',
        },
      ],
    ],
    extra: {
      ...(appJson.expo.extra ?? {}),
      distributionChannel,
      rsyaBannerUnitId,
      rustoreProProductIds,
      rustoreProMonthPrice,
      rustoreProYearPrice,
      rustoreConsoleAppId,
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
      devTierTools: useDevTierTools,
    },
  },
};
