export function Button({
  children,
  variant = 'primary',
  size = 'md',
  block = false,
  iconLeft = null,
  iconRight = null,
  className = '',
  ...rest
}) {
  const cls = [
    'c81-btn',
    `c81-btn--${variant}`,
    size !== 'md' ? `c81-btn--${size}` : '',
    block ? 'c81-btn--block' : '',
    className,
  ].filter(Boolean).join(' ');
  return (
    <button className={cls} {...rest}>
      {iconLeft}
      {children != null && <span>{children}</span>}
      {iconRight}
    </button>
  );
}
