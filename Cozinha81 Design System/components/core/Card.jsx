export function Card({ children, pad = false, raised = false, interactive = false, className = '', ...rest }) {
  const cls = [
    'c81-card',
    pad ? 'c81-card--pad' : '',
    raised ? 'c81-card--raised' : '',
    interactive ? 'c81-card--interactive' : '',
    className,
  ].filter(Boolean).join(' ');
  return <div className={cls} {...rest}>{children}</div>;
}
