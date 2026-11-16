import Constants from 'expo-constants';

/** Metro: __DEV__. Вшитый debug APK: EXPO_PUBLIC_DEV_TIER_TOOLS=1 при сборке. */
export function showDevTierTools(): boolean {
  if (__DEV__) return true;
  const extra = Constants.expoConfig?.extra as { devTierTools?: boolean } | undefined;
  return extra?.devTierTools === true;
}
