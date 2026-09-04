import * as React from 'react';

/** Surface container — white, hairline border, soft warm shadow. */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Apply standard internal padding (space-6). */
  pad?: boolean;
  /** Stronger elevation. */
  raised?: boolean;
  /** Hover lift + pointer cursor for clickable cards. */
  interactive?: boolean;
  children?: React.ReactNode;
}

export function Card(props: CardProps): JSX.Element;
