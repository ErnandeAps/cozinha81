const LABELS = { ready: 'Disponível', warn: 'Em preparo', stop: 'Ocupada' };

export function StatusPill({ status = 'ready', label, className = '', ...rest }) {
  const cls = ['c81-status', `c81-status--${status}`, className].filter(Boolean).join(' ');
  return (
    <span className={cls} {...rest}>
      <span className="c81-status__dot" />
      {label ?? LABELS[status]}
    </span>
  );
}
