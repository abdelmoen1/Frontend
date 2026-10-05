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
            {options.map((option) => {
              const value = typeof option === "string" ? option : option.value;
              const label = typeof option === "string" ? option : option.label;

              return (
                <option key={value} value={value}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>
      </div>
      {error && <span className="error-message">{error}</span>}
    </>
  );
}

export default SelectField;