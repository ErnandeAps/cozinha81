import * as React from 'react';

/** Checkbox with flame fill + check when on. Controlled or uncontrolled. */
export interface CheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (next: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function Checkbox(props: CheckboxProps): JSX.Element;
