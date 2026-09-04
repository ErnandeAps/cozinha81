import * as React from 'react';

/**
 * Live kitchen-state pill. `ready` pulses a green ring; `warn`/`stop`
 * are static. Defaults its own PT-BR label per status.
 */
export interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** @default "ready" */
  status?: 'ready' | 'warn' | 'stop';
  /** Override the default PT-BR label. */
  label?: string;
}

export function StatusPill(props: StatusPillProps): JSX.Element;
