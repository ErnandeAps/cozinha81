import { useState } from 'react';

export function Switch({ checked, defaultChecked = false, onChange, label, disabled = false, className = '', ...rest }) {
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
      role="switch"
      aria-checked={on}
      data-on={on}
      disabled={disabled}
      onClick={toggle}
      className={['c81-switch', className].filter(Boolean).join(' ')}
      style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
      {...rest}
    >
      <span className="c81-switch__track"><span className="c81-switch__thumb" /></span>
      {label && <span className="c81-switch__label">{label}</span>}
    </button>
  );
}
