import { MdOutlinePhoneAndroid } from "react-icons/md";

export const COUNTRY_CODES = ["+970", "+972", "+962", "+966"];

function PhoneField({ label, name, value, phoneCode, onChange, onCodeChange, error, disabled = false }) {
  return (
    <>
      <div className="form-group animate-element delay-300">
        <label htmlFor={name}>{label}</label>
        <div className={`phone-field-row ${error ? "has-error" : ""}`}>
          <div
            className={`glass-input-wrapper phone-number-wrapper ${
              disabled ? "is-disabled" : ""
            }`}
          >
            <MdOutlinePhoneAndroid className="input-icon" />
            <input
              id={name}
              name={name}
              type="tel"
              placeholder="599 123 456"
              value={value}
              onChange={onChange}
              autoComplete="tel-national"
              disabled={disabled}
            />
          </div>

          <div className="glass-input-wrapper phone-code-wrapper">
            <select
              name="phone_code"
              value={phoneCode}
              onChange={onCodeChange}
              disabled={disabled}
            >
              {COUNTRY_CODES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {error && <span className="error-message">{error}</span>}
    </>
  );
}

export default PhoneField;