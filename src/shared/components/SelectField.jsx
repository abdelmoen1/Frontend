function SelectField({
  label,
  name,
  icon,
  value,
  onChange,
  options,
  error,
  placeholder = "اختر",
  disabled = false,
}) {
  return (
    <>
      <div className="form-group animate-element delay-300">
        <label htmlFor={name}>{label}</label>
        <div
          className={`glass-input-wrapper select-field-wrapper ${
            error ? "has-error" : ""
          } ${disabled ? "is-disabled" : ""}`}
        >
          {icon}
          <select
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            disabled={disabled}
          >
            <option value="">{placeholder}</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && <span className="error-message">{error}</span>}
    </>
  );
}

export default SelectField;