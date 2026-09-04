export function Select({ label, hint, id, className = '', children, ...rest }) {
  const fieldId = id || (label ? 'f-' + label.replace(/\s+/g, '-').toLowerCase() : undefined);
  const control = (
    <select id={fieldId} className={['c81-select', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </select>
  );
  if (!label && !hint) return control;
  return (
    <div className="c81-field">
      {label && <label className="c81-label" htmlFor={fieldId}>{label}</label>}
      {control}
      {hint && <span className="c81-hint">{hint}</span>}
    </div>
  );
}
