import * as React from 'react';

/**
 * Primary action control. Flame-orange `primary` for the main CTA,
 * `ink` for strong dark actions, `secondary`/`ghost` for lower emphasis.
 *
 * @startingPoint section="Core" subtitle="Buttons — all variants & sizes" viewport="700x220"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual emphasis. @default "primary" */
  variant?: 'primary' | 'ink' | 'secondary' | 'ghost' | 'danger';
  /** Control height. @default "md" */
  size?: 'sm' | 'md' | 'lg';
  /** Stretch to full container width. */
  block?: boolean;
  /** Icon element rendered before the label. */
  iconLeft?: React.ReactNode;
  /** Icon element rendered after the label. */
  iconRight?: React.ReactNode;
}

export function Button(props: ButtonProps): JSX.Element;
