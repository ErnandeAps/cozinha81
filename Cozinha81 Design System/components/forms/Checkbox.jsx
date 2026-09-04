import { useState } from 'react';

export function Checkbox({ checked, defaultChecked = false, onChange, label, disabled = false, className = '', ...rest }) {
  const isControlled = checked !== undefined;
  const [internal, setInternal] = useState(defaultChecked);
  const on = isControlled ? checked : internal;
  const toggle = () => {
    if (disabled) return;
    if (!isControlled) setInternal(!on);
    onChange && onChange(!on);
  };
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      data-on={on}
      disabled={disabled}
      onClick={toggle}
      className={['c81-check', className].filter(Boolean).join(' ')}
      style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
      {...rest}
    >
      <span className="c81-check__box">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 6.2l2.3 2.3L9.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {label && <span>{label}</span>}
    </button>
  );
}
