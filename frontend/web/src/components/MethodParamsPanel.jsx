import { useMemo } from 'react';

function ParamField({ field, value, onChange }) {
  const { name, label, type, description, options, min, max, step } = field;

  if (type === 'readonly') {
    return (
      <div className="param-field param-readonly">
        <label className="param-label">{label}</label>
        <span className="param-readonly-value">{value ?? field.default}</span>
        {description && <p className="param-desc">{description}</p>}
      </div>
    );
  }

  if (type === 'select') {
    return (
      <div className="param-field">
        <label className="param-label" htmlFor={`param-${name}`}>{label}</label>
        <select
          id={`param-${name}`}
          className="param-control"
          value={value ?? field.default ?? ''}
          onChange={(e) => {
            const raw = e.target.value;
            const parsed = options?.length && typeof options[0] === 'number'
              ? Number(raw)
              : raw;
            onChange(name, parsed);
          }}
        >
          {(options || []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        {description && <p className="param-desc">{description}</p>}
      </div>
    );
  }

  if (type === 'boolean') {
    return (
      <div className="param-field param-field-inline">
        <label className="param-checkbox">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(name, e.target.checked)}
          />
          {label}
        </label>
        {description && <p className="param-desc">{description}</p>}
      </div>
    );
  }

  const inputType = type === 'range' ? 'range' : 'number';

  return (
    <div className="param-field">
      <label className="param-label" htmlFor={`param-${name}`}>
        {label}
        {type === 'range' && (
          <span className="param-value-tag">{value ?? field.default}</span>
        )}
      </label>
      <input
        id={`param-${name}`}
        type={inputType}
        className="param-control"
        value={value ?? field.default ?? ''}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={(e) => onChange(name, e.target.value === '' ? '' : Number(e.target.value))}
      />
      {description && <p className="param-desc">{description}</p>}
    </div>
  );
}

export default function MethodParamsPanel({ paramsSchema, values, onChange }) {
  const schema = paramsSchema || [];

  if (schema.length === 0) {
    return <p className="card-desc param-empty">该方法暂无可调参数。</p>;
  }

  const handleChange = (name, val) => {
    onChange?.({ ...values, [name]: val });
  };

  return (
    <div className="method-params-panel">
      <h4 className="param-panel-title">方法参数</h4>
      <div className="param-fields">
        {schema.map((field) => (
          <ParamField
            key={field.name}
            field={field}
            value={values?.[field.name] ?? field.default}
            onChange={handleChange}
          />
        ))}
      </div>
    </div>
  );
}
