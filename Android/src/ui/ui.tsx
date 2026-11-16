import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { formatRuDate, isoDateToLocalDate, localDateToIso } from '@/domain/dates';
import { effectiveStatus } from '@/domain/taskStatus';
import type { TaskListItem } from '@/domain/types';
import { useLanguage } from '@/i18n/LanguageProvider';
import { visibleTask } from '@/i18n/text';

import { categoryColor, theme } from './theme';

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'number-pad';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.muted}
        multiline={multiline}
        keyboardType={keyboardType}
        style={[styles.input, multiline && styles.multiline]}
      />
    </View>
  );
}

export function Button({
  label,
  onPress,
  disabled,
  tone = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'quiet';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, tone === 'quiet' && styles.quietButton, disabled && styles.disabled]}
    >
      <Text style={[styles.buttonText, tone === 'quiet' && styles.quietButtonText]}>{label}</Text>
    </Pressable>
  );
}

export function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.section}>{children}</Text>;
}

export function Notice({ text }: { text: string | null }) {
  if (!text) return null;
  return <Text style={styles.notice}>{text}</Text>;
}

export function DatePickerField({
  label,
  valueIso,
  onChangeIso,
  hint,
}: {
  label: string;
  valueIso: string;
  onChangeIso: (iso: string) => void;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const shown = formatRuDate(valueIso);

  const onPick = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'dismissed' || !date) return;
    onChangeIso(localDateToIso(date));
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={styles.dateButton}>
        <Text style={styles.dateButtonText}>{shown}</Text>
      </Pressable>
      {hint ? <Text style={styles.dateHint}>{hint}</Text> : null}
      {open ? (
        <>
          <DateTimePicker
            value={isoDateToLocalDate(valueIso)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onPick}
          />
          {Platform.OS === 'ios' ? (
            <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={styles.dateDone}>
              <Text style={styles.dateDoneText}>OK</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

export function TaskCard({
  task,
  today,
  onOpen,
  onComplete,
}: {
  task: TaskListItem;
  today: string;
  onOpen?: () => void;
  onComplete?: () => void;
}) {
  const { language, text } = useLanguage();
  const colors = categoryColor[task.category];
  const status = effectiveStatus(task.status, task.touchOn, today);
  const done = status === 'done';
  const visible = visibleTask(task, text, language);

  return (
    <Pressable onPress={onOpen} style={[styles.card, done && styles.doneCard, { borderLeftColor: colors.ink }]}>
      <View style={styles.cardTop}>
        <Text style={[styles.chip, { color: colors.ink, backgroundColor: colors.soft }]}>
          {text.category[task.category]}
        </Text>
        <Text style={[styles.status, status === 'overdue' && styles.overdue]}>{text.taskStatus[status]}</Text>
      </View>
      <Text style={styles.meta}>
        {formatRuDate(task.touchOn)}
        {task.clientName ? ` · ${task.clientName}` : ''}
        {task.productName ? ` · ${task.productName}` : ''}
      </Text>
      <Text style={[styles.cardTitle, done && styles.doneTitle]}>{visible.title}</Text>
      {visible.details ? <Text style={styles.details}>{visible.details}</Text> : null}
      {onComplete && !done ? <Button label={text.complete} tone="quiet" onPress={onComplete} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { color: theme.muted, fontSize: 13, fontWeight: '600' },
  input: {
    backgroundColor: theme.white,
    borderColor: theme.line,
    borderRadius: 12,
    borderWidth: 1,
    color: theme.ink,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  button: {
    alignItems: 'center',
    backgroundColor: theme.service,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  quietButton: { backgroundColor: theme.card, borderColor: theme.line, borderWidth: 1 },
  buttonText: { color: theme.white, fontSize: 16, fontWeight: '700' },
  quietButtonText: { color: theme.ink },
  disabled: { opacity: 0.45 },
  section: { color: theme.ink, fontSize: 18, fontWeight: '700', marginTop: 8 },
  notice: { color: theme.ink, fontSize: 15, lineHeight: 21 },
  dateButton: {
    backgroundColor: theme.white,
    borderColor: theme.line,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  dateButtonText: { color: theme.ink, fontSize: 16, fontWeight: '600' },
  dateHint: { color: theme.muted, fontSize: 13, lineHeight: 18 },
  dateDone: { alignSelf: 'flex-end', paddingHorizontal: 8, paddingVertical: 4 },
  dateDoneText: { color: theme.service, fontSize: 16, fontWeight: '700' },
  card: {
    backgroundColor: theme.card,
    borderColor: theme.line,
    borderLeftWidth: 4,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  doneCard: { opacity: 0.62 },
  cardTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  chip: { borderRadius: 999, fontSize: 12, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 4 },
  status: { color: theme.muted, fontSize: 12, fontWeight: '600' },
  overdue: { color: theme.danger },
  meta: { color: theme.muted, fontSize: 13 },
  cardTitle: { color: theme.ink, fontSize: 16, fontWeight: '600', lineHeight: 22 },
  doneTitle: { textDecorationLine: 'line-through' },
  details: { color: theme.muted, fontSize: 14, lineHeight: 20 },
});
