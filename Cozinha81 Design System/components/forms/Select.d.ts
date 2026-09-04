import * as React from 'react';

/** Native select styled with the Cozinha81 chevron. Pass `<option>`s as children. */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  children?: React.ReactNode;
}

export function Select(props: SelectProps): JSX.Element;
