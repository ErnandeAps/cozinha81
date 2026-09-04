import * as React from 'react';

/** Small uppercase mono label for metadata, categories, counts. */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** @default "neutral" */
  variant?: 'neutral' | 'accent' | 'ready' | 'warn' | 'stop' | 'solid';
  /** Show a leading status dot. */
  dot?: boolean;
  children?: React.ReactNode;
}

export function Badge(props: BadgeProps): JSX.Element;
