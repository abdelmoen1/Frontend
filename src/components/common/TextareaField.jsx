function TextareaField({
  label,
  name,
  icon,
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
}) {
  return (
    <>
      <div className="form-group animate-element delay-300">
        <label htmlFor={name}>{label}</label>
        <div
          className={`glass-input-wrapper textarea-wrapper ${
            error ? "has-error" : ""
          } ${disabled ? "is-disabled" : ""}`}
        >
          {icon}
          <textarea
            id={name}
            name={name}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            disabled={disabled}
            rows={4}
          />
        </div>
      </div>
      {error && <span className="error-message">{error}</span>}
    </>
  );
}

export default TextareaField;