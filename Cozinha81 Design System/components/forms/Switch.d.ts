import * as React from 'react';

/** On/off toggle. Controlled via `checked` or uncontrolled via `defaultChecked`. */
export interface SwitchProps {
  /** Controlled on-state. */
  checked?: boolean;
  /** Initial state when uncontrolled. */
  defaultChecked?: boolean;
  /** Fires with the next boolean value. */
  onChange?: (next: boolean) => void;
  /** Optional trailing label. */
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function Switch(props: SwitchProps): JSX.Element;
