const STORAGE_KEY = 'sutra_pro_cloud_sync_warn_dismissed';

export function isProCloudSyncWarnDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setProCloudSyncWarnDismissed(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* private mode / quota */
  }
}