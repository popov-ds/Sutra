import {
  getPermissionsAsync,
  requestPermissionsAsync,
} from 'expo-notifications';
import { Linking, Platform } from 'react-native';

export type NotificationAccess = 'granted' | 'denied' | 'unavailable';

export async function readNotificationAccess(): Promise<NotificationAccess> {
  if (Platform.OS === 'web') return 'unavailable';
  const current = await getPermissionsAsync();
  return current.granted ? 'granted' : 'denied';
}

export async function promptNotificationAccess(): Promise<NotificationAccess> {
  if (Platform.OS === 'web') return 'unavailable';
  const current = await getPermissionsAsync();
  if (current.granted) return 'granted';
  if (current.canAskAgain) {
    const asked = await requestPermissionsAsync();
    return asked.granted ? 'granted' : 'denied';
  }
  await Linking.openSettings();
  return readNotificationAccess();
}
