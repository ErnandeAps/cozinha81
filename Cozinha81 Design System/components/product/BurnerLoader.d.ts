import * as React from 'react';

/** Brand loading indicator — four burner rings igniting in sequence. */
export interface BurnerLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional caption under the burners. */
  label?: string;
}

export function BurnerLoader(props: BurnerLoaderProps): JSX.Element;
