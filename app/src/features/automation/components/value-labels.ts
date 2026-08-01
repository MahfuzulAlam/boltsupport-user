import type { SelectOption } from '@/components/Select'

/**
 * The enum values a condition or action can take, with their human labels.
 *
 * Shared between the pickers and the plain English recap, so a rule cannot offer you "Not good"
 * and then read itself back as "notGood".
 */
export const STATUS_OPTIONS: SelectOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'closed', label: 'Closed' },
  { value: 'spam', label: 'Spam' },
]

export const PRIORITY_OPTIONS: SelectOption[] = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' },
]

export const CHANNEL_OPTIONS: SelectOption[] = [
  { value: 'email', label: 'Email' },
  { value: 'chat', label: 'Live chat' },
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'messenger', label: 'Messenger' },
]

export const CSAT_OPTIONS: SelectOption[] = [
  { value: 'great', label: 'Great' },
  { value: 'okay', label: 'Okay' },
  { value: 'notGood', label: 'Not good' },
]

export const SNOOZE_OPTIONS: SelectOption[] = [
  { value: '1h', label: 'One hour' },
  { value: 'tomorrow', label: 'Tomorrow, 09:00' },
  { value: 'monday', label: 'Monday, 09:00' },
]

const ALL_OPTIONS = [
  ...STATUS_OPTIONS,
  ...PRIORITY_OPTIONS,
  ...CHANNEL_OPTIONS,
  ...CSAT_OPTIONS,
  ...SNOOZE_OPTIONS,
]

/** The label for a stored enum value, or undefined if it is not one. */
export function enumLabel(value: string): string | undefined {
  return ALL_OPTIONS.find((option) => option.value === value)?.label
}
