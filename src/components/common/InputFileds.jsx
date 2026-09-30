import EyeButton from "./EyeButton";

function InputFileds({
  label,
  name,
  icon,
  type,
  placeholder,
  value,
  onChange,
  error,
  ifPassword,
  setPassword,
  disabled = false,
}) {
  return (
    <>
      <div className="form-group animate-element delay-300">
        <label htmlFor={name}>{label}</label>
        <div
          className={`glass-input-wrapper ${error ? "has-error" : ""} ${
            disabled ? "is-disabled" : ""
          }`}
        >
          {icon}
          <input
            id={name}
            name={name}
            type={
              type === "password" ? (ifPassword ? "text" : "password") : type
            }
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            autoComplete={name}
            disabled={disabled}
          />
        </div>
        {type === "password" ? (
          <EyeButton showPassword={ifPassword} setShowPassword={setPassword} />
        ) : (
          ""
        )}
      </div>
      {error && <span className="error-message">{error}</span>}
    </>
  );
}

export default InputFileds;