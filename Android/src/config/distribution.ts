import Constants from 'expo-constants';

export type DistributionChannel = 'play' | 'rustore';

export function getDistributionChannel(): DistributionChannel {
  const extra = Constants.expoConfig?.extra as { distributionChannel?: string } | undefined;
  if (extra?.distributionChannel === 'play') return 'play';
  return 'rustore';
}

export function isRuStoreBuild(): boolean {
  return getDistributionChannel() === 'rustore';
}

export function isPlayBuild(): boolean {
  return getDistributionChannel() === 'play';
}
