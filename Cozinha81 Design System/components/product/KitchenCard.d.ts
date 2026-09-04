import * as React from 'react';

/**
 * The hero product object: a bookable kitchen/station. Composes
 * StatusPill, Badge, Button, IconButton. Falls back to a burner-mark
 * panel when no `image` is given.
 *
 * @startingPoint section="Product" subtitle="Bookable kitchen card" viewport="360x320"
 */
export interface KitchenCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Unit / station name. */
  name: string;
  /** Neighbourhood or address line. */
  location: string;
  /** Live availability. @default "ready" */
  status?: 'ready' | 'warn' | 'stop';
  /** Price figure, e.g. "R$ 48". */
  price: string;
  /** Price unit suffix. @default "/hora" */
  unit?: string;
  /** Equipment / feature chips. */
  tags?: string[];
  /** Photo URL; omit for the burner-mark placeholder. */
  image?: string | null;
  /** Filled-heart state. */
  favorite?: boolean;
  onFavorite?: () => void;
  onReserve?: () => void;
}

export function KitchenCard(props: KitchenCardProps): JSX.Element;
