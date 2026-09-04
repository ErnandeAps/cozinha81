import { StatusPill } from '../core/StatusPill.jsx';
import { Badge } from '../core/Badge.jsx';
import { Button } from '../core/Button.jsx';
import { IconButton } from '../core/IconButton.jsx';

const HeartIcon = ({ filled }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);
const PinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
  </svg>
);

export function KitchenCard({
  name, location, status = 'ready', price, unit = '/hora',
  tags = [], image = null, favorite = false, onFavorite, onReserve,
  className = '', ...rest
}) {
  return (
    <div className={['c81-card', 'c81-card--interactive', 'c81-kitchen', className].filter(Boolean).join(' ')} {...rest}>
      <div className="c81-kitchen__media">
        {image
          ? <img src={image} alt={name} />
          : <svg width="64" height="64" viewBox="0 0 68 80" opacity="0.55"><g fill="#565350"><circle cx="20" cy="25" r="11"/><circle cx="20" cy="55" r="11"/><circle cx="48" cy="55" r="11"/></g><circle cx="48" cy="25" r="11" fill="#C4520A"/></svg>}
        <div className="c81-kitchen__status"><StatusPill status={status} /></div>
        <div className="c81-kitchen__fav">
          <IconButton variant="solid" aria-label="Favoritar" onClick={onFavorite}
            style={{ background: favorite ? 'var(--accent)' : undefined }}>
            <HeartIcon filled={favorite} />
          </IconButton>
        </div>
      </div>
      <div className="c81-kitchen__body">
        <div className="c81-kitchen__name">{name}</div>
        <div className="c81-kitchen__loc"><PinIcon /> {location}</div>
        {tags.length > 0 && (
          <div className="c81-kitchen__meta">
            {tags.map((t, i) => <Badge key={i} variant="neutral">{t}</Badge>)}
          </div>
        )}
        <div className="c81-kitchen__foot">
          <div className="c81-kitchen__price"><b>{price}</b> <span>{unit}</span></div>
          <Button variant="primary" size="sm" onClick={onReserve}>Reservar</Button>
        </div>
      </div>
    </div>
  );
}
