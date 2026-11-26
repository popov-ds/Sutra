import * as SecureStore from 'expo-secure-store';

const KEY = 'pro_cloud_sync_warn_dismissed';

export async function isProCloudSyncWarnDismissed(): Promise<boolean> {
  return (await SecureStore.getItemAsync(KEY)) === '1';
}

export async function setProCloudSyncWarnDismissed(): Promise<void> {
  await SecureStore.setItemAsync(KEY, '1');
}