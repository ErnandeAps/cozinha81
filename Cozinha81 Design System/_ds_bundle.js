/* @ds-bundle: {"format":3,"namespace":"Cozinha81DesignSystem_72690b","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"StatusPill","sourcePath":"components/core/StatusPill.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"BurnerLoader","sourcePath":"components/product/BurnerLoader.jsx"},{"name":"KitchenCard","sourcePath":"components/product/KitchenCard.jsx"}],"sourceHashes":{"components/core/Avatar.jsx":"621b14c0120c","components/core/Badge.jsx":"8bb544191e52","components/core/Button.jsx":"922f0e6e18f2","components/core/Card.jsx":"342aa21561fc","components/core/IconButton.jsx":"8df29e25eac8","components/core/StatusPill.jsx":"41000604825e","components/core/Tag.jsx":"9ac27bc1a4ef","components/forms/Checkbox.jsx":"e47c4c974074","components/forms/Input.jsx":"28f8e4a7b9e1","components/forms/Select.jsx":"a423311fb535","components/forms/Switch.jsx":"e654c1c2e78e","components/product/BurnerLoader.jsx":"28148c6dcd28","components/product/KitchenCard.jsx":"b1f1b0b297d5","ui_kits/dashboard/sections.jsx":"fc94bbc1dbae","ui_kits/marketing/sections.jsx":"3021d478ec8c"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.Cozinha81DesignSystem_72690b = window.Cozinha81DesignSystem_72690b || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Avatar({
  name = '',
  src = null,
  size = 'md',
  accent = false,
  className = '',
  ...rest
}) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const cls = ['c81-avatar', accent ? 'c81-avatar--accent' : '', size !== 'md' ? `c81-avatar--${size}` : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name
  }) : initials);
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Badge({
  children,
  variant = 'neutral',
  dot = false,
  className = '',
  ...rest
}) {
  const cls = ['c81-badge', `c81-badge--${variant}`, className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    className: "c81-badge__dot"
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Button({
  children,
  variant = 'primary',
  size = 'md',
  block = false,
  iconLeft = null,
  iconRight = null,
  className = '',
  ...rest
}) {
  const cls = ['c81-btn', `c81-btn--${variant}`, size !== 'md' ? `c81-btn--${size}` : '', block ? 'c81-btn--block' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    className: cls
  }, rest), iconLeft, children != null && /*#__PURE__*/React.createElement("span", null, children), iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Card({
  children,
  pad = false,
  raised = false,
  interactive = false,
  className = '',
  ...rest
}) {
  const cls = ['c81-card', pad ? 'c81-card--pad' : '', raised ? 'c81-card--raised' : '', interactive ? 'c81-card--interactive' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function IconButton({
  children,
  variant = 'ghost',
  size = 'md',
  className = '',
  ...rest
}) {
  const cls = ['c81-iconbtn', variant === 'solid' ? 'c81-iconbtn--solid' : '', size === 'sm' ? 'c81-iconbtn--sm' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    className: cls
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/StatusPill.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const LABELS = {
  ready: 'Disponível',
  warn: 'Em preparo',
  stop: 'Ocupada'
};
function StatusPill({
  status = 'ready',
  label,
  className = '',
  ...rest
}) {
  const cls = ['c81-status', `c81-status--${status}`, className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), /*#__PURE__*/React.createElement("span", {
    className: "c81-status__dot"
  }), label ?? LABELS[status]);
}
Object.assign(__ds_scope, { StatusPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/StatusPill.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Tag({
  children,
  active = false,
  selectable = false,
  className = '',
  ...rest
}) {
  const cls = ['c81-tag', selectable ? 'c81-tag--selectable' : '', active ? 'c81-tag--active' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), children);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState
} = React;
function Checkbox({
  checked,
  defaultChecked = false,
  onChange,
  label,
  disabled = false,
  className = '',
  ...rest
}) {
  const isControlled = checked !== undefined;
  const [internal, setInternal] = useState(defaultChecked);
  const on = isControlled ? checked : internal;
  const toggle = () => {
    if (disabled) return;
    if (!isControlled) setInternal(!on);
    onChange && onChange(!on);
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    role: "checkbox",
    "aria-checked": on,
    "data-on": on,
    disabled: disabled,
    onClick: toggle,
    className: ['c81-check', className].filter(Boolean).join(' '),
    style: disabled ? {
      opacity: 0.5,
      cursor: 'not-allowed'
    } : undefined
  }, rest), /*#__PURE__*/React.createElement("span", {
    className: "c81-check__box"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 12 12",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M2.5 6.2l2.3 2.3L9.5 3.5",
    stroke: "#fff",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), label && /*#__PURE__*/React.createElement("span", null, label));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Input({
  label,
  hint,
  invalid = false,
  id,
  className = '',
  as = 'input',
  ...rest
}) {
  const fieldId = id || (label ? 'f-' + label.replace(/\s+/g, '-').toLowerCase() : undefined);
  const cls = ['c81-input', invalid ? 'c81-input--invalid' : '', className].filter(Boolean).join(' ');
  const Tag = as === 'textarea' ? 'textarea' : 'input';
  const control = /*#__PURE__*/React.createElement(Tag, _extends({
    id: fieldId,
    className: cls,
    "aria-invalid": invalid || undefined
  }, rest));
  if (!label && !hint) return control;
  return /*#__PURE__*/React.createElement("div", {
    className: "c81-field"
  }, label && /*#__PURE__*/React.createElement("label", {
    className: "c81-label",
    htmlFor: fieldId
  }, label), control, hint && /*#__PURE__*/React.createElement("span", {
    className: "c81-hint"
  }, hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Select({
  label,
  hint,
  id,
  className = '',
  children,
  ...rest
}) {
  const fieldId = id || (label ? 'f-' + label.replace(/\s+/g, '-').toLowerCase() : undefined);
  const control = /*#__PURE__*/React.createElement("select", _extends({
    id: fieldId,
    className: ['c81-select', className].filter(Boolean).join(' ')
  }, rest), children);
  if (!label && !hint) return control;
  return /*#__PURE__*/React.createElement("div", {
    className: "c81-field"
  }, label && /*#__PURE__*/React.createElement("label", {
    className: "c81-label",
    htmlFor: fieldId
  }, label), control, hint && /*#__PURE__*/React.createElement("span", {
    className: "c81-hint"
  }, hint));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState
} = React;
function Switch({
  checked,
  defaultChecked = false,
  onChange,
  label,
  disabled = false,
  className = '',
  ...rest
}) {
  const isControlled = checked !== undefined;
  const [internal, setInternal] = useState(defaultChecked);
  const on = isControlled ? checked : internal;
  const toggle = () => {
    if (disabled) return;
    if (!isControlled) setInternal(!on);
    onChange && onChange(!on);
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    role: "switch",
    "aria-checked": on,
    "data-on": on,
    disabled: disabled,
    onClick: toggle,
    className: ['c81-switch', className].filter(Boolean).join(' '),
    style: disabled ? {
      opacity: 0.5,
      cursor: 'not-allowed'
    } : undefined
  }, rest), /*#__PURE__*/React.createElement("span", {
    className: "c81-switch__track"
  }, /*#__PURE__*/React.createElement("span", {
    className: "c81-switch__thumb"
  })), label && /*#__PURE__*/React.createElement("span", {
    className: "c81-switch__label"
  }, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/product/BurnerLoader.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function BurnerLoader({
  label,
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['c81-burner-wrap', className].filter(Boolean).join(' '),
    style: {
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '10px'
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    className: "c81-burner",
    role: "status",
    "aria-label": label || 'Carregando'
  }, /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null)), label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-xs)',
      color: 'var(--text-muted)',
      letterSpacing: '.08em'
    }
  }, label));
}
Object.assign(__ds_scope, { BurnerLoader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/product/BurnerLoader.jsx", error: String((e && e.message) || e) }); }

// components/product/KitchenCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const HeartIcon = ({
  filled
}) => /*#__PURE__*/React.createElement("svg", {
  width: "18",
  height: "18",
  viewBox: "0 0 24 24",
  fill: filled ? 'currentColor' : 'none',
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", {
  d: "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
}));
const PinIcon = () => /*#__PURE__*/React.createElement("svg", {
  width: "14",
  height: "14",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", {
  d: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "12",
  cy: "10",
  r: "3"
}));
function KitchenCard({
  name,
  location,
  status = 'ready',
  price,
  unit = '/hora',
  tags = [],
  image = null,
  favorite = false,
  onFavorite,
  onReserve,
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['c81-card', 'c81-card--interactive', 'c81-kitchen', className].filter(Boolean).join(' ')
  }, rest), /*#__PURE__*/React.createElement("div", {
    className: "c81-kitchen__media"
  }, image ? /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: name
  }) : /*#__PURE__*/React.createElement("svg", {
    width: "64",
    height: "64",
    viewBox: "0 0 68 80",
    opacity: "0.55"
  }, /*#__PURE__*/React.createElement("g", {
    fill: "#565350"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "20",
    cy: "25",
    r: "11"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "20",
    cy: "55",
    r: "11"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "48",
    cy: "55",
    r: "11"
  })), /*#__PURE__*/React.createElement("circle", {
    cx: "48",
    cy: "25",
    r: "11",
    fill: "#C4520A"
  })), /*#__PURE__*/React.createElement("div", {
    className: "c81-kitchen__status"
  }, /*#__PURE__*/React.createElement(__ds_scope.StatusPill, {
    status: status
  })), /*#__PURE__*/React.createElement("div", {
    className: "c81-kitchen__fav"
  }, /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    variant: "solid",
    "aria-label": "Favoritar",
    onClick: onFavorite,
    style: {
      background: favorite ? 'var(--accent)' : undefined
    }
  }, /*#__PURE__*/React.createElement(HeartIcon, {
    filled: favorite
  })))), /*#__PURE__*/React.createElement("div", {
    className: "c81-kitchen__body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c81-kitchen__name"
  }, name), /*#__PURE__*/React.createElement("div", {
    className: "c81-kitchen__loc"
  }, /*#__PURE__*/React.createElement(PinIcon, null), " ", location), tags.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "c81-kitchen__meta"
  }, tags.map((t, i) => /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    key: i,
    variant: "neutral"
  }, t))), /*#__PURE__*/React.createElement("div", {
    className: "c81-kitchen__foot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "c81-kitchen__price"
  }, /*#__PURE__*/React.createElement("b", null, price), " ", /*#__PURE__*/React.createElement("span", null, unit)), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "primary",
    size: "sm",
    onClick: onReserve
  }, "Reservar"))));
}
Object.assign(__ds_scope, { KitchenCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/product/KitchenCard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/sections.jsx
try { (() => {
/* Cozinha81 — Operator dashboard (app for brands renting kitchens).
   Composes DS primitives + a few inline icons. Exposes window.DashboardApp. */
const {
  Button,
  Badge,
  Tag,
  StatusPill,
  Avatar,
  IconButton,
  Input
} = window.Cozinha81DesignSystem_72690b;
const {
  useState
} = React;
const Ico = p => /*#__PURE__*/React.createElement("svg", {
  width: p.s || 20,
  height: p.s || 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, p.children);
const IcoGrid = p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("rect", {
  x: "3",
  y: "3",
  width: "7",
  height: "7",
  rx: "1"
}), /*#__PURE__*/React.createElement("rect", {
  x: "14",
  y: "3",
  width: "7",
  height: "7",
  rx: "1"
}), /*#__PURE__*/React.createElement("rect", {
  x: "3",
  y: "14",
  width: "7",
  height: "7",
  rx: "1"
}), /*#__PURE__*/React.createElement("rect", {
  x: "14",
  y: "14",
  width: "7",
  height: "7",
  rx: "1"
}));
const IcoCal = p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("rect", {
  x: "3",
  y: "4",
  width: "18",
  height: "17",
  rx: "2"
}), /*#__PURE__*/React.createElement("path", {
  d: "M3 9h18M8 2v4M16 2v4"
}));
const IcoPin = p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
  d: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "12",
  cy: "10",
  r: "3"
}));
const IcoCard = p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("rect", {
  x: "2",
  y: "5",
  width: "20",
  height: "14",
  rx: "2"
}), /*#__PURE__*/React.createElement("path", {
  d: "M2 10h20"
}));
const IcoCog = p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("circle", {
  cx: "12",
  cy: "12",
  r: "3"
}), /*#__PURE__*/React.createElement("path", {
  d: "M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 6 19.4a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H2a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 6a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9.5A1.7 1.7 0 0 0 11 2.1V2a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1A2 2 0 1 1 20.8 6l-.1.1a1.7 1.7 0 0 0-.3 1.9v.2a1.7 1.7 0 0 0 1.5 1H22a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"
}));
const IcoBell = p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
  d: "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"
}));
const IcoSearch = p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("circle", {
  cx: "11",
  cy: "11",
  r: "7"
}), /*#__PURE__*/React.createElement("path", {
  d: "M21 21l-4.3-4.3"
}));
const IcoPlus = p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
  d: "M12 5v14M5 12h14"
}));
const IcoArrow = p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
  d: "M5 12h14M13 6l6 6-6 6"
}));
const IcoClock = p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("circle", {
  cx: "12",
  cy: "12",
  r: "9"
}), /*#__PURE__*/React.createElement("path", {
  d: "M12 7v5l3 2"
}));
const IcoTrend = p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
  d: "M3 17l6-6 4 4 7-7M14 7h7v7"
}));

/* ---------- Inline brand badge (avoids relative asset fetch) ---------- */
const LogoBadge = () => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 100 100",
  xmlns: "http://www.w3.org/2000/svg",
  role: "img",
  "aria-label": "Cozinha81"
}, /*#__PURE__*/React.createElement("rect", {
  width: "100",
  height: "100",
  rx: "20",
  fill: "#1A1A1A"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "36",
  cy: "30",
  r: "11",
  fill: "#4A4A4A"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "36",
  cy: "30",
  r: "5",
  fill: "#1A1A1A"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "36",
  cy: "30",
  r: "2",
  fill: "#4A4A4A"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "36",
  cy: "58",
  r: "11",
  fill: "#4A4A4A"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "36",
  cy: "58",
  r: "5",
  fill: "#1A1A1A"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "36",
  cy: "58",
  r: "2",
  fill: "#4A4A4A"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "64",
  cy: "58",
  r: "11",
  fill: "#4A4A4A"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "64",
  cy: "58",
  r: "5",
  fill: "#1A1A1A"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "64",
  cy: "58",
  r: "2",
  fill: "#4A4A4A"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "64",
  cy: "30",
  r: "11",
  fill: "#C4520A"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "64",
  cy: "30",
  r: "5",
  fill: "#1A1A1A"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "64",
  cy: "30",
  r: "2",
  fill: "#C4520A"
}), /*#__PURE__*/React.createElement("line", {
  x1: "18",
  y1: "76",
  x2: "82",
  y2: "76",
  stroke: "#2E2E2E",
  strokeWidth: "1"
}), /*#__PURE__*/React.createElement("text", {
  x: "50",
  y: "90",
  textAnchor: "middle",
  fontFamily: "'Arial Black','Arial',sans-serif",
  fontSize: "9",
  fontWeight: "900",
  fill: "#F5F5F5",
  letterSpacing: "3"
}, "COZINHA", /*#__PURE__*/React.createElement("tspan", {
  fill: "#C4520A"
}, "81")));

/* ---------- Sidebar ---------- */
function Sidebar({
  view,
  setView
}) {
  const items = [{
    id: 'painel',
    label: 'Painel',
    icon: /*#__PURE__*/React.createElement(IcoGrid, null)
  }, {
    id: 'reservas',
    label: 'Reservas',
    icon: /*#__PURE__*/React.createElement(IcoCal, null)
  }, {
    id: 'unidades',
    label: 'Unidades',
    icon: /*#__PURE__*/React.createElement(IcoPin, null)
  }, {
    id: 'faturamento',
    label: 'Faturamento',
    icon: /*#__PURE__*/React.createElement(IcoCard, null)
  }];
  return /*#__PURE__*/React.createElement("aside", {
    className: "db-side"
  }, /*#__PURE__*/React.createElement("div", {
    className: "db-side__logo"
  }, /*#__PURE__*/React.createElement(LogoBadge, null), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "Burger do Z\xE9"), /*#__PURE__*/React.createElement("span", null, "Plano Turno"))), /*#__PURE__*/React.createElement("nav", {
    className: "db-side__nav"
  }, items.map(it => /*#__PURE__*/React.createElement("button", {
    key: it.id,
    className: 'db-navitem' + (view === it.id ? ' is-active' : ''),
    onClick: () => setView(it.id)
  }, it.icon, /*#__PURE__*/React.createElement("span", null, it.label)))), /*#__PURE__*/React.createElement("div", {
    className: "db-side__foot"
  }, /*#__PURE__*/React.createElement("button", {
    className: "db-navitem"
  }, /*#__PURE__*/React.createElement(IcoCog, null), /*#__PURE__*/React.createElement("span", null, "Configura\xE7\xF5es")), /*#__PURE__*/React.createElement("div", {
    className: "db-side__promo"
  }, /*#__PURE__*/React.createElement("div", {
    className: "db-burner-mini"
  }, /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null)), /*#__PURE__*/React.createElement("p", null, "3 turnos livres na Vila Leopoldina hoje."), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm",
    block: true
  }, "Reservar"))));
}

/* ---------- Topbar ---------- */
function Topbar({
  title
}) {
  return /*#__PURE__*/React.createElement("header", {
    className: "db-top"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "db-eyebrow"
  }, "// ", new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })), /*#__PURE__*/React.createElement("h1", {
    className: "db-top__title"
  }, title)), /*#__PURE__*/React.createElement("div", {
    className: "db-top__right"
  }, /*#__PURE__*/React.createElement("div", {
    className: "db-search"
  }, /*#__PURE__*/React.createElement(IcoSearch, {
    s: 16
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "Buscar unidade, reserva\u2026"
  })), /*#__PURE__*/React.createElement(IconButton, {
    "aria-label": "Notifica\xE7\xF5es"
  }, /*#__PURE__*/React.createElement(IcoBell, null)), /*#__PURE__*/React.createElement(Avatar, {
    name: "Z\xE9 Ramos",
    accent: true
  })));
}

/* ---------- Stat cards ---------- */
function Stats() {
  const stats = [{
    k: 'Próxima reserva',
    v: 'Hoje, 18:00',
    sub: 'Estação 04 · Vila Leopoldina',
    icon: /*#__PURE__*/React.createElement(IcoClock, null),
    accent: true
  }, {
    k: 'Horas no mês',
    v: '92h',
    sub: '+14h vs. mês anterior',
    icon: /*#__PURE__*/React.createElement(IcoTrend, null)
  }, {
    k: 'Gasto no mês',
    v: 'R$ 4.416',
    sub: 'Plano Turno + avulsos',
    icon: /*#__PURE__*/React.createElement(IcoCard, null)
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "db-stats"
  }, stats.map((s, i) => /*#__PURE__*/React.createElement("div", {
    className: 'db-stat' + (s.accent ? ' is-accent' : ''),
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    className: "db-stat__icon"
  }, s.icon), /*#__PURE__*/React.createElement("div", {
    className: "db-stat__k"
  }, s.k), /*#__PURE__*/React.createElement("div", {
    className: "db-stat__v"
  }, s.v), /*#__PURE__*/React.createElement("div", {
    className: "db-stat__sub"
  }, s.sub))));
}

/* ---------- Live station board ---------- */
const STATIONS = [{
  id: '01',
  unit: 'Vila Leopoldina',
  status: 'stop',
  who: 'Você · até 22:00'
}, {
  id: '02',
  unit: 'Vila Leopoldina',
  status: 'ready',
  who: 'Livre'
}, {
  id: '03',
  unit: 'Vila Leopoldina',
  status: 'warn',
  who: 'Higienização'
}, {
  id: '04',
  unit: 'Vila Leopoldina',
  status: 'ready',
  who: 'Sua reserva 18:00'
}, {
  id: '11',
  unit: 'Pinheiros',
  status: 'ready',
  who: 'Livre'
}, {
  id: '12',
  unit: 'Pinheiros',
  status: 'stop',
  who: 'Ocupada · 19:30'
}];
function StationBoard() {
  return /*#__PURE__*/React.createElement("div", {
    className: "db-card db-board"
  }, /*#__PURE__*/React.createElement("div", {
    className: "db-card__head"
  }, /*#__PURE__*/React.createElement("h3", null, "Esta\xE7\xF5es ao vivo"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    iconRight: /*#__PURE__*/React.createElement(IcoArrow, {
      s: 15
    })
  }, "Ver mapa")), /*#__PURE__*/React.createElement("div", {
    className: "db-board__grid"
  }, STATIONS.map((s, i) => /*#__PURE__*/React.createElement("div", {
    className: 'db-station db-station--' + s.status,
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    className: "db-station__ring"
  }, /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null)), /*#__PURE__*/React.createElement("div", {
    className: "db-station__id"
  }, "Esta\xE7\xE3o ", s.id), /*#__PURE__*/React.createElement("div", {
    className: "db-station__unit"
  }, s.unit), /*#__PURE__*/React.createElement("div", {
    className: "db-station__who"
  }, s.who)))));
}

/* ---------- Upcoming reservations ---------- */
const RES = [{
  day: 'HOJE',
  date: '09',
  time: '18:00 – 22:00',
  unit: 'Estação 04 · Vila Leopoldina',
  status: 'ready',
  price: 'R$ 192'
}, {
  day: 'QUI',
  date: '11',
  time: '06:00 – 14:00',
  unit: 'Estação 02 · Vila Leopoldina',
  status: 'ready',
  price: 'R$ 384'
}, {
  day: 'SEX',
  date: '12',
  time: '18:00 – 23:00',
  unit: 'Estação 11 · Pinheiros',
  status: 'warn',
  price: 'R$ 260'
}];
function Upcoming({
  full
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "db-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "db-card__head"
  }, /*#__PURE__*/React.createElement("h3", null, full ? 'Suas reservas' : 'Próximas reservas'), !full && /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    iconRight: /*#__PURE__*/React.createElement(IcoArrow, {
      s: 15
    })
  }, "Todas"), full && /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm",
    iconLeft: /*#__PURE__*/React.createElement(IcoPlus, {
      s: 16
    })
  }, "Nova reserva")), /*#__PURE__*/React.createElement("div", {
    className: "db-reslist"
  }, RES.map((r, i) => /*#__PURE__*/React.createElement("div", {
    className: "db-res",
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    className: "db-res__date"
  }, /*#__PURE__*/React.createElement("span", null, r.day), /*#__PURE__*/React.createElement("b", null, r.date)), /*#__PURE__*/React.createElement("div", {
    className: "db-res__main"
  }, /*#__PURE__*/React.createElement("div", {
    className: "db-res__unit"
  }, r.unit), /*#__PURE__*/React.createElement("div", {
    className: "db-res__time"
  }, /*#__PURE__*/React.createElement(IcoClock, {
    s: 14
  }), " ", r.time)), /*#__PURE__*/React.createElement("div", {
    className: "db-res__tags"
  }, /*#__PURE__*/React.createElement(StatusPill, {
    status: r.status
  })), /*#__PURE__*/React.createElement("div", {
    className: "db-res__price"
  }, r.price), /*#__PURE__*/React.createElement(IconButton, {
    "aria-label": "Detalhes"
  }, /*#__PURE__*/React.createElement(IcoArrow, {
    s: 16
  }))))));
}

/* ---------- Views ---------- */
function PainelView() {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Stats, null), /*#__PURE__*/React.createElement("div", {
    className: "db-grid2"
  }, /*#__PURE__*/React.createElement(StationBoard, null), /*#__PURE__*/React.createElement(Upcoming, null)));
}
function App() {
  const [view, setView] = useState('painel');
  const titles = {
    painel: 'Painel',
    reservas: 'Reservas',
    unidades: 'Unidades',
    faturamento: 'Faturamento'
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "db"
  }, /*#__PURE__*/React.createElement(Sidebar, {
    view: view,
    setView: setView
  }), /*#__PURE__*/React.createElement("main", {
    className: "db-main"
  }, /*#__PURE__*/React.createElement(Topbar, {
    title: titles[view]
  }), /*#__PURE__*/React.createElement("div", {
    className: "db-content"
  }, view === 'painel' && /*#__PURE__*/React.createElement(PainelView, null), view === 'reservas' && /*#__PURE__*/React.createElement(Upcoming, {
    full: true
  }), view !== 'painel' && view !== 'reservas' && /*#__PURE__*/React.createElement("div", {
    className: "db-empty"
  }, /*#__PURE__*/React.createElement("div", {
    className: "db-burner-mini"
  }, /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null)), /*#__PURE__*/React.createElement("p", null, "Em breve nesta demonstra\xE7\xE3o.")))));
}
Object.assign(window, {
  DashboardApp: App
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/sections.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/sections.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Cozinha81 — Marketing site sections.
   Composes DS primitives from the bundle namespace + a few inline icons. */
const {
  Button,
  Badge,
  Tag,
  KitchenCard,
  StatusPill
} = window.Cozinha81DesignSystem_72690b;
const {
  useState
} = React;

/* ---------- inline icons (Lucide-style, 2px stroke) ---------- */
const Ico = p => /*#__PURE__*/React.createElement("svg", {
  width: p.s || 20,
  height: p.s || 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, p.children);
const IcoArrow = p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
  d: "M5 12h14M13 6l6 6-6 6"
}));
const IcoPin = p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
  d: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "12",
  cy: "10",
  r: "3"
}));
const IcoClock = p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("circle", {
  cx: "12",
  cy: "12",
  r: "9"
}), /*#__PURE__*/React.createElement("path", {
  d: "M12 7v5l3 2"
}));
const IcoShield = p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
  d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"
}));
const IcoBolt = p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
  d: "M13 2L4.5 13H11l-1 9 8.5-11H12l1-9Z"
}));
const IcoMenu = p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
  d: "M3 6h18M3 12h18M3 18h18"
}));

/* ---------- Inline brand logo (avoids relative asset fetch) ---------- */
const LogoLight = ({
  w = 200,
  className
}) => /*#__PURE__*/React.createElement("svg", {
  className: className,
  width: w,
  height: w * 80 / 300,
  viewBox: "0 0 300 80",
  xmlns: "http://www.w3.org/2000/svg",
  role: "img",
  "aria-label": "Cozinha81"
}, /*#__PURE__*/React.createElement("path", {
  fillRule: "evenodd",
  fill: "#F5F4F1",
  d: "M 31 25 A 11 11 0 1 1 9 25 A 11 11 0 1 1 31 25 Z M 25 25 A  5  5 0 1 1 15 25 A  5  5 0 1 1 25 25 Z M 31 55 A 11 11 0 1 1 9 55 A 11 11 0 1 1 31 55 Z M 25 55 A  5  5 0 1 1 15 55 A  5  5 0 1 1 25 55 Z M 59 55 A 11 11 0 1 1 37 55 A 11 11 0 1 1 59 55 Z M 53 55 A  5  5 0 1 1 43 55 A  5  5 0 1 1 53 55 Z"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "20",
  cy: "25",
  r: "2.5",
  fill: "#F5F4F1"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "20",
  cy: "55",
  r: "2.5",
  fill: "#F5F4F1"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "48",
  cy: "55",
  r: "2.5",
  fill: "#F5F4F1"
}), /*#__PURE__*/React.createElement("path", {
  fillRule: "evenodd",
  fill: "#DA6E22",
  d: "M 59 25 A 11 11 0 1 1 37 25 A 11 11 0 1 1 59 25 Z M 53 25 A  5  5 0 1 1 43 25 A  5  5 0 1 1 53 25 Z"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "48",
  cy: "25",
  r: "2.5",
  fill: "#DA6E22"
}), /*#__PURE__*/React.createElement("line", {
  x1: "73",
  y1: "14",
  x2: "73",
  y2: "66",
  stroke: "#3D3B39",
  strokeWidth: "1"
}), /*#__PURE__*/React.createElement("text", {
  x: "85",
  y: "43",
  fontFamily: "'Archivo','Arial Black',sans-serif",
  fontSize: "22",
  fontWeight: "900",
  letterSpacing: "0.5"
}, /*#__PURE__*/React.createElement("tspan", {
  fill: "#F5F4F1"
}, "COZINHA"), /*#__PURE__*/React.createElement("tspan", {
  fill: "#DA6E22"
}, "81")), /*#__PURE__*/React.createElement("text", {
  x: "85",
  y: "60",
  fontFamily: "'Archivo',Arial,sans-serif",
  fontSize: "8",
  fontWeight: "400",
  fill: "#74706A",
  letterSpacing: "3.5"
}, "COZINHAS PROFISSIONAIS"));

/* ---------- Cooktop motif graphic (CSS burner rings) ---------- */
function Cooktop({
  lit = 1
}) {
  const burners = [0, 1, 2, 3];
  return /*#__PURE__*/React.createElement("div", {
    className: "mk-cooktop"
  }, burners.map(i => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: 'mk-burner' + (i === lit ? ' is-lit' : '')
  }, /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null))));
}

/* ---------- Nav ---------- */
function Nav() {
  return /*#__PURE__*/React.createElement("header", {
    className: "mk-nav"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-wrap mk-nav__inner"
  }, /*#__PURE__*/React.createElement(LogoLight, {
    className: "mk-nav__logo",
    w: 200
  }), /*#__PURE__*/React.createElement("nav", {
    className: "mk-nav__links"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#como"
  }, "Como funciona"), /*#__PURE__*/React.createElement("a", {
    href: "#unidades"
  }, "Unidades"), /*#__PURE__*/React.createElement("a", {
    href: "#planos"
  }, "Planos"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Para investidores")), /*#__PURE__*/React.createElement("div", {
    className: "mk-nav__cta"
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    style: {
      color: 'var(--steel-200)'
    }
  }, "Entrar"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm",
    iconRight: /*#__PURE__*/React.createElement(IcoArrow, {
      s: 16
    })
  }, "Reservar cozinha")), /*#__PURE__*/React.createElement("button", {
    className: "mk-nav__burger",
    "aria-label": "Menu"
  }, /*#__PURE__*/React.createElement(IcoMenu, null))));
}

/* ---------- Hero ---------- */
function Hero() {
  return /*#__PURE__*/React.createElement("section", {
    className: "mk-hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-wrap mk-hero__inner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-hero__copy"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-eyebrow"
  }, "// Cozinhas profissionais para aluguel"), /*#__PURE__*/React.createElement("h1", {
    className: "mk-hero__title"
  }, "Sua cozinha", /*#__PURE__*/React.createElement("br", null), "j\xE1 est\xE1 ", /*#__PURE__*/React.createElement("em", null, "acesa"), "."), /*#__PURE__*/React.createElement("p", {
    className: "mk-hero__lead"
  }, "Esta\xE7\xF5es profissionais licenciadas, equipadas e higienizadas. Alugue por hora, turno ou m\xEAs \u2014 sem obra, sem CAPEX, sem dor de cabe\xE7a."), /*#__PURE__*/React.createElement("div", {
    className: "mk-hero__actions"
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    iconRight: /*#__PURE__*/React.createElement(IcoArrow, null)
  }, "Encontrar uma unidade"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg",
    style: {
      background: 'transparent',
      color: '#fff',
      borderColor: 'var(--steel-700)'
    }
  }, "Ver como funciona")), /*#__PURE__*/React.createElement("div", {
    className: "mk-hero__trust"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "14"), /*#__PURE__*/React.createElement("span", null, "unidades em SP")), /*#__PURE__*/React.createElement("div", {
    className: "mk-div"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "320+"), /*#__PURE__*/React.createElement("span", null, "marcas operando")), /*#__PURE__*/React.createElement("div", {
    className: "mk-div"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "24/7"), /*#__PURE__*/React.createElement("span", null, "acesso liberado")))), /*#__PURE__*/React.createElement("div", {
    className: "mk-hero__visual"
  }, /*#__PURE__*/React.createElement(Cooktop, {
    lit: 1
  }), /*#__PURE__*/React.createElement("div", {
    className: "mk-hero__chip mk-hero__chip--1"
  }, /*#__PURE__*/React.createElement(StatusPill, {
    status: "ready"
  })), /*#__PURE__*/React.createElement("div", {
    className: "mk-hero__chip mk-hero__chip--2"
  }, /*#__PURE__*/React.createElement(Badge, {
    variant: "solid"
  }, "UNIT-VL-07")))));
}

/* ---------- Value props ---------- */
function Values() {
  const items = [{
    icon: /*#__PURE__*/React.createElement(IcoBolt, null),
    t: 'Ligue e opere',
    d: 'Estações prontas para uso imediato. Você chega, cozinha e despacha o pedido.'
  }, {
    icon: /*#__PURE__*/React.createElement(IcoShield, null),
    t: 'Tudo licenciado',
    d: 'Alvará, vigilância sanitária e laudos em dia. A regularização é nossa.'
  }, {
    icon: /*#__PURE__*/React.createElement(IcoClock, null),
    t: 'Flexível de verdade',
    d: 'Por hora, turno ou mês. Aumente ou reduza sua operação quando quiser.'
  }, {
    icon: /*#__PURE__*/React.createElement(IcoPin, null),
    t: 'Perto da demanda',
    d: 'Unidades posicionadas nos polos de delivery com maior densidade de pedidos.'
  }];
  return /*#__PURE__*/React.createElement("section", {
    className: "mk-values"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-wrap mk-values__grid"
  }, items.map((it, i) => /*#__PURE__*/React.createElement("div", {
    className: "mk-value",
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-value__icon"
  }, it.icon), /*#__PURE__*/React.createElement("h3", null, it.t), /*#__PURE__*/React.createElement("p", null, it.d)))));
}

/* ---------- How it works ---------- */
function How() {
  const steps = [{
    n: '01',
    t: 'Escolha a unidade',
    d: 'Compare localização, equipamentos e disponibilidade em tempo real.'
  }, {
    n: '02',
    t: 'Reserve o turno',
    d: 'Selecione hora ou turno. Confirmação na hora, sem fila de espera.'
  }, {
    n: '03',
    t: 'Cozinhe e despache',
    d: 'Acesso liberado por app. Coifa, gás e câmara fria prontos.'
  }];
  return /*#__PURE__*/React.createElement("section", {
    className: "mk-how",
    id: "como"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-sec-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-eyebrow mk-eyebrow--dark"
  }, "// Como funciona"), /*#__PURE__*/React.createElement("h2", {
    className: "mk-h2"
  }, "Tr\xEAs passos entre voc\xEA e o pr\xF3ximo pedido")), /*#__PURE__*/React.createElement("div", {
    className: "mk-how__grid"
  }, steps.map((s, i) => /*#__PURE__*/React.createElement("div", {
    className: "mk-step",
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-step__n"
  }, s.n), /*#__PURE__*/React.createElement("h3", null, s.t), /*#__PURE__*/React.createElement("p", null, s.d))))));
}

/* ---------- Kitchen grid ---------- */
const UNITS = [{
  name: 'Estação 04',
  location: 'Vila Leopoldina',
  status: 'ready',
  price: 'R$ 48',
  tags: ['Coifa', 'Forno combinado']
}, {
  name: 'Estação 11',
  location: 'Pinheiros',
  status: 'warn',
  price: 'R$ 52',
  tags: ['Câmara fria', 'Fritadeira']
}, {
  name: 'Estação 02',
  location: 'Santo Amaro',
  status: 'ready',
  price: 'R$ 39',
  tags: ['Chapa', '24h']
}, {
  name: 'Estação 08',
  location: 'Tatuapé',
  status: 'stop',
  price: 'R$ 45',
  tags: ['Coifa', 'Confeitaria']
}];
function Units() {
  const [fav, setFav] = useState(0);
  const filters = ['Todas', 'Disponíveis agora', 'Confeitaria', '24 horas', 'Câmara fria'];
  const [active, setActive] = useState(0);
  return /*#__PURE__*/React.createElement("section", {
    className: "mk-units",
    id: "unidades"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-sec-head mk-sec-head--row"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "mk-eyebrow mk-eyebrow--dark"
  }, "// Unidades"), /*#__PURE__*/React.createElement("h2", {
    className: "mk-h2"
  }, "Cozinhas dispon\xEDveis perto de voc\xEA")), /*#__PURE__*/React.createElement(Button, {
    variant: "ink",
    iconRight: /*#__PURE__*/React.createElement(IcoArrow, {
      s: 16
    })
  }, "Ver todas as 14")), /*#__PURE__*/React.createElement("div", {
    className: "mk-filters"
  }, filters.map((f, i) => /*#__PURE__*/React.createElement(Tag, {
    key: i,
    selectable: true,
    active: i === active,
    onClick: () => setActive(i)
  }, f))), /*#__PURE__*/React.createElement("div", {
    className: "mk-units__grid"
  }, UNITS.map((u, i) => /*#__PURE__*/React.createElement(KitchenCard, _extends({
    key: i
  }, u, {
    favorite: fav === i,
    onFavorite: () => setFav(i)
  }))))));
}

/* ---------- Pricing ---------- */
function Pricing() {
  const plans = [{
    name: 'Avulso',
    price: 'R$ 48',
    unit: '/hora',
    desc: 'Para testar receitas e picos de demanda.',
    feats: ['Sem fidelidade', 'Reserva por hora', 'Acesso 24/7'],
    cta: 'secondary'
  }, {
    name: 'Turno',
    price: 'R$ 690',
    unit: '/mês',
    desc: 'Um turno fixo por dia na sua unidade.',
    feats: ['Estação garantida', 'Armazenamento incluso', 'Suporte operacional'],
    cta: 'primary',
    featured: true
  }, {
    name: 'Dedicada',
    price: 'Sob consulta',
    unit: '',
    desc: 'Estação exclusiva para alto volume.',
    feats: ['Uso exclusivo', 'Marca na fachada', 'Gestor de conta'],
    cta: 'secondary'
  }];
  return /*#__PURE__*/React.createElement("section", {
    className: "mk-pricing",
    id: "planos"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-sec-head mk-sec-head--center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-eyebrow mk-eyebrow--dark"
  }, "// Planos"), /*#__PURE__*/React.createElement("h2", {
    className: "mk-h2"
  }, "Pague pelo que usar")), /*#__PURE__*/React.createElement("div", {
    className: "mk-pricing__grid"
  }, plans.map((p, i) => /*#__PURE__*/React.createElement("div", {
    className: 'mk-plan' + (p.featured ? ' is-feat' : ''),
    key: i
  }, p.featured && /*#__PURE__*/React.createElement("div", {
    className: "mk-plan__flag"
  }, "Mais popular"), /*#__PURE__*/React.createElement("div", {
    className: "mk-plan__name"
  }, p.name), /*#__PURE__*/React.createElement("div", {
    className: "mk-plan__price"
  }, /*#__PURE__*/React.createElement("b", null, p.price), /*#__PURE__*/React.createElement("span", null, p.unit)), /*#__PURE__*/React.createElement("p", {
    className: "mk-plan__desc"
  }, p.desc), /*#__PURE__*/React.createElement("ul", {
    className: "mk-plan__feats"
  }, p.feats.map((f, j) => /*#__PURE__*/React.createElement("li", {
    key: j
  }, /*#__PURE__*/React.createElement("span", {
    className: "mk-tick"
  }), f))), /*#__PURE__*/React.createElement(Button, {
    variant: p.cta,
    block: true
  }, p.featured ? 'Começar agora' : 'Escolher'))))));
}

/* ---------- CTA ---------- */
function CTA() {
  return /*#__PURE__*/React.createElement("section", {
    className: "mk-cta"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-wrap mk-cta__inner"
  }, /*#__PURE__*/React.createElement(Cooktop, {
    lit: 3
  }), /*#__PURE__*/React.createElement("h2", {
    className: "mk-cta__title"
  }, "Acenda sua opera\xE7\xE3o", /*#__PURE__*/React.createElement("br", null), "ainda esta semana."), /*#__PURE__*/React.createElement("p", {
    className: "mk-cta__lead"
  }, "Fale com a gente e receba uma proposta para a unidade mais pr\xF3xima do seu p\xFAblico."), /*#__PURE__*/React.createElement("div", {
    className: "mk-cta__actions"
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    iconRight: /*#__PURE__*/React.createElement(IcoArrow, null)
  }, "Reservar cozinha"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg",
    style: {
      background: 'transparent',
      color: '#fff',
      borderColor: 'var(--steel-700)'
    }
  }, "Falar com vendas"))));
}

/* ---------- Footer ---------- */
function Footer() {
  const cols = [{
    h: 'Produto',
    l: ['Unidades', 'Planos', 'Equipamentos', 'App do operador']
  }, {
    h: 'Empresa',
    l: ['Sobre', 'Investidores', 'Carreiras', 'Imprensa']
  }, {
    h: 'Suporte',
    l: ['Central de ajuda', 'Contato', 'Status', 'Termos']
  }];
  return /*#__PURE__*/React.createElement("footer", {
    className: "mk-foot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-wrap mk-foot__inner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-foot__brand"
  }, /*#__PURE__*/React.createElement(LogoLight, {
    w: 200
  }), /*#__PURE__*/React.createElement("p", null, "Cozinhas inteligentes para aluguel.", /*#__PURE__*/React.createElement("br", null), "S\xE3o Paulo \xB7 Brasil")), cols.map((c, i) => /*#__PURE__*/React.createElement("div", {
    className: "mk-foot__col",
    key: i
  }, /*#__PURE__*/React.createElement("h4", null, c.h), c.l.map((x, j) => /*#__PURE__*/React.createElement("a", {
    key: j,
    href: "#"
  }, x))))), /*#__PURE__*/React.createElement("div", {
    className: "mk-wrap mk-foot__bar"
  }, /*#__PURE__*/React.createElement("span", null, "\xA9 2026 Cozinha81 Cozinhas Profissionais Ltda."), /*#__PURE__*/React.createElement("span", null, "CNPJ 00.000.000/0001-00")));
}
function Page() {
  return /*#__PURE__*/React.createElement("div", {
    className: "mk"
  }, /*#__PURE__*/React.createElement(Nav, null), /*#__PURE__*/React.createElement(Hero, null), /*#__PURE__*/React.createElement(Values, null), /*#__PURE__*/React.createElement(How, null), /*#__PURE__*/React.createElement(Units, null), /*#__PURE__*/React.createElement(Pricing, null), /*#__PURE__*/React.createElement(CTA, null), /*#__PURE__*/React.createElement(Footer, null));
}
Object.assign(window, {
  MarketingPage: Page
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/sections.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.StatusPill = __ds_scope.StatusPill;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.BurnerLoader = __ds_scope.BurnerLoader;

__ds_ns.KitchenCard = __ds_scope.KitchenCard;

})();
