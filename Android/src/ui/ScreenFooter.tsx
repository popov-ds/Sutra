import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { theme } from '@/ui/theme';

const FOOTER_PAD = 72;

export const SCREEN_FOOTER_SCROLL_PAD = FOOTER_PAD + 16;

export function ScreenFooter({ children }: { children: ReactNode }) {
  return <View style={styles.footer}>{children}</View>;
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: theme.card,
    borderTopColor: theme.line,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    gap: 8,
    left: 0,
    paddingBottom: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    position: 'absolute',
    right: 0,
  },
});