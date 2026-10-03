import { FaEye } from "react-icons/fa";
import { FaEyeSlash } from "react-icons/fa6";
function EyeButton({ showPassword, setShowPassword }) {
  return (
    <button
      id="togglePassword"
      className="password-toggle"
      type="button"
      aria-label={showPassword ? "Hide password" : "Show password"}
      title={showPassword ? "Hide password" : "Show password"}
      onClick={() => setShowPassword(!showPassword)}
    >
      <FaEye className={`eye-icon ${showPassword ? "hidden" : ""}`} />

      <FaEyeSlash className={`eye-icon ${!showPassword ? "hidden" : ""}`} />
    </button>
  );
}

export default EyeButton;
