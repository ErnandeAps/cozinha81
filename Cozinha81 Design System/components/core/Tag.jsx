export function Tag({ children, active = false, selectable = false, className = '', ...rest }) {
  const cls = [
    'c81-tag',
    selectable ? 'c81-tag--selectable' : '',
    active ? 'c81-tag--active' : '',
    className,
  ].filter(Boolean).join(' ');
  return <span className={cls} {...rest}>{children}</span>;
}
