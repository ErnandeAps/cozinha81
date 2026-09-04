export function IconButton({ children, variant = 'ghost', size = 'md', className = '', ...rest }) {
  const cls = [
    'c81-iconbtn',
    variant === 'solid' ? 'c81-iconbtn--solid' : '',
    size === 'sm' ? 'c81-iconbtn--sm' : '',
    className,
  ].filter(Boolean).join(' ');
  return <button className={cls} {...rest}>{children}</button>;
}
