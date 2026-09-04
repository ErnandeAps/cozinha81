export function Avatar({ name = '', src = null, size = 'md', accent = false, className = '', ...rest }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const cls = [
    'c81-avatar',
    accent ? 'c81-avatar--accent' : '',
    size !== 'md' ? `c81-avatar--${size}` : '',
    className,
  ].filter(Boolean).join(' ');
  return (
    <span className={cls} {...rest}>
      {src ? <img src={src} alt={name} /> : initials}
    </span>
  );
}
