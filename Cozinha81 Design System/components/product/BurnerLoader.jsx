export function BurnerLoader({ label, className = '', ...rest }) {
  return (
    <div className={['c81-burner-wrap', className].filter(Boolean).join(' ')}
      style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }} {...rest}>
      <span className="c81-burner" role="status" aria-label={label || 'Carregando'}>
        <i /><i /><i /><i />
      </span>
      {label && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', letterSpacing: '.08em' }}>{label}</span>}
    </div>
  );
}
