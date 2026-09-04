import * as React from 'react';

/** Square icon-only button. Pair with an `aria-label`. */
export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** @default "ghost" */
  variant?: 'ghost' | 'solid';
  /** @default "md" */
  size?: 'sm' | 'md';
  /** The icon node. */
  children?: React.ReactNode;
}

export function IconButton(props: IconButtonProps): JSX.Element;
