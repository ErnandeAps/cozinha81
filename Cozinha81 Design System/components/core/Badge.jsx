export function Badge({ children, variant = 'neutral', dot = false, className = '', ...rest }) {
  const cls = ['c81-badge', `c81-badge--${variant}`, className].filter(Boolean).join(' ');
  return (
    <span className={cls} {...rest}>
      {dot && <span className="c81-badge__dot" />}
      {children}
    </span>
  );
}
