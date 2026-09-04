import * as React from 'react';

/** Pill-shaped filter/category chip. Use `selectable` + `active` for filter rows. */
export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Selected state (ink fill). */
  active?: boolean;
  /** Adds hover affordance + pointer cursor. */
  selectable?: boolean;
  children?: React.ReactNode;
}

export function Tag(props: TagProps): JSX.Element;
