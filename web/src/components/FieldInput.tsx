import { FieldDef } from '../types';

export function FieldInput({ field, value, onChange }: {
  field: FieldDef;
  value: any;
  onChange: (v: any) => void;
}) {
  const common = {
    placeholder: field.placeholder,
    className: field.type === 'textarea' ? 'textarea' : field.type === 'select' ? 'select' : 'input',
    value: value ?? '',
    onChange: (e: any) => {
      const v = e.target.value;
      onChange(v === '' && field.type !== 'select' ? '' : v);
    },
  };

  let control: React.ReactNode;
  if (field.type === 'textarea') {
    control = <textarea {...common} />;
  } else if (field.type === 'select') {
    control = (
      <select {...common}>
        <option value="">Select…</option>
        {field.options?.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  } else {
    control = <input {...common} type={field.type === 'number' ? 'number' : 'text'} />;
  }

  return (
    <div className="field">
      <label className={`field-label ${field.required ? 'req' : ''}`}>{field.label}</label>
      {control}
      {field.help && <span className="field-help">{field.help}</span>}
    </div>
  );
}
