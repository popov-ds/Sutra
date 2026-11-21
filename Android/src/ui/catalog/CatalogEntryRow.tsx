import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { theme } from '@/ui/theme';

import { catalogStyles as styles } from './catalogStyles';

type CatalogEntryRowProps = {
  title: string;
  meta?: string;
  selected?: boolean;
  onPress: () => void;
  onDelete: () => void;
  deleteLabel: string;
  onEdit?: () => void;
  editLabel?: string;
};

export function CatalogEntryRow({
  title,
  meta,
  selected,
  onPress,
  onDelete,
  deleteLabel,
  onEdit,
  editLabel,
}: CatalogEntryRowProps) {
  return (
    <View style={[styles.card, selected && styles.cardOn]}>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.cardBody}>
        <Text style={[styles.cardTitle, selected && styles.cardTitleOn]}>{title}</Text>
        {meta ? <Text style={[styles.cardMeta, selected && styles.cardMetaOn]}>{meta}</Text> : null}
      </Pressable>
      {onEdit ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={editLabel}
          hitSlop={8}
          onPress={onEdit}
          style={styles.rowAction}
        >
          <MaterialCommunityIcons name="pencil-outline" size={22} color={theme.service} />
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={deleteLabel}
        hitSlop={8}
        onPress={onDelete}
        style={styles.rowAction}
      >
        <MaterialCommunityIcons name="trash-can-outline" size={22} color={theme.danger} />
      </Pressable>
    </View>
  );
}