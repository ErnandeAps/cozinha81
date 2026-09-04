export function Input({ label, hint, invalid = false, id, className = '', as = 'input', ...rest }) {
  const fieldId = id || (label ? 'f-' + label.replace(/\s+/g, '-').toLowerCase() : undefined);
  const cls = ['c81-input', invalid ? 'c81-input--invalid' : '', className].filter(Boolean).join(' ');
  const Tag = as === 'textarea' ? 'textarea' : 'input';
  const control = <Tag id={fieldId} className={cls} aria-invalid={invalid || undefined} {...rest} />;
  if (!label && !hint) return control;
  return (
    <div className="c81-field">
      {label && <label className="c81-label" htmlFor={fieldId}>{label}</label>}
      {control}
      {hint && <span className="c81-hint">{hint}</span>}
    </div>
  );
}
