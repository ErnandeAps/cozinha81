import * as React from 'react';

/** Round avatar — image or auto initials on ink (or flame with `accent`). */
export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Full name; initials are derived when no `src`. */
  name?: string;
  /** Image URL. */
  src?: string | null;
  /** @default "md" */
  size?: 'sm' | 'md' | 'lg';
  /** Flame fill instead of ink. */
  accent?: boolean;
}

export function Avatar(props: AvatarProps): JSX.Element;
