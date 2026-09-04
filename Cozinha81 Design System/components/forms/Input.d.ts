import * as React from 'react';

/** Text input with optional label + hint. Set `as="textarea"` for multiline. */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Field label rendered above the control. */
  label?: string;
  /** Helper text below the control. */
  hint?: string;
  /** Error styling. */
  invalid?: boolean;
  /** Render an input (default) or a textarea. */
  as?: 'input' | 'textarea';
}

export function Input(props: InputProps): JSX.Element;
