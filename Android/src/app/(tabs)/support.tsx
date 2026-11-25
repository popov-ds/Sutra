import { Redirect } from 'expo-router';
import { View } from 'react-native';

/** Заглушка: вкладка «Поддержка» открывает браузер через listeners в _layout. */
export default function SupportTabPlaceholder() {
  return (
    <View style={{ flex: 1 }}>
      <Redirect href="/(tabs)" />
    </View>
  );
}