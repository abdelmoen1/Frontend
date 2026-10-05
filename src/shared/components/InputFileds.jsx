import React from "react";
import EyeButton from "./EyeButton"; // تأكد من مسار الملف

function InputFileds({
  label,
  name,
  icon,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  ifPassword,
  setPassword,
  disabled = false,
  fullWidth = false,
}) {
  return (
    <div
      className={`form-group animate-element delay-300 ${fullWidth ? "full" : ""}`}
    >
      <label htmlFor={name}>{label}</label>
      <div
        className={`glass-input-wrapper ${error ? "has-error" : ""} ${disabled ? "is-disabled" : ""}`}
      >
        {icon}
        <input
          id={name}
          name={name}
          type={type === "password" ? (ifPassword ? "text" : "password") : type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={name}
          disabled={disabled}
        />
        {type === "password" && (
          <EyeButton showPassword={ifPassword} setShowPassword={setPassword} />
        )}
      </div>
      {error && <span className="error-message">{error}</span>}
    </div>
  );
}

export default InputFileds;