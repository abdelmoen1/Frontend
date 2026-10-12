import { FaBrain, FaBriefcase, FaBug, FaCheckCircle, FaLaptopCode, FaLayerGroup, FaMobileAlt, FaPencilRuler, FaServer } from "react-icons/fa";

// أيقونات للعرض فقط؛ القائمة نفسها (المفاتيح والأسماء والأوصاف) تأتي من الخادم
const ICONS = {
  frontend_development: FaLaptopCode,
  backend_development: FaServer,
  fullstack_development: FaLayerGroup,
  mobile_development: FaMobileAlt,
  ui_ux_design: FaPencilRuler,
  qa_testing: FaBug,
  data_ai: FaBrain,
};

/** بطاقات اختيار التخصص من القائمة التي يرسلها الخادم. */
function SpecializationPicker({ specializations, value, onChange, error, status, onRetry }) {
  return (
    <fieldset className="spec-picker animate-element delay-300" aria-describedby={error ? "spec-error" : undefined}>
      <legend>التخصص</legend>

      {status === "loading" && (
        <div className="spec-grid" aria-busy="true" aria-label="جارٍ تحميل التخصصات">
          {Array.from({ length: 6 }, (_, index) => (
            <span key={index} className="spec-card is-skeleton" />
          ))}
        </div>
      )}

      {status === "error" && (
        <div className="onboarding-inline-alert" role="alert">
          <span>تعذر تحميل قائمة التخصصات.</span>
          <button type="button" onClick={onRetry}>
            إعادة المحاولة
          </button>
        </div>
      )}

      {status === "ready" && (
        <div className="spec-grid" role="radiogroup" aria-label="التخصص">
          {specializations.map((item, index) => {
            const Icon = ICONS[item.key] ?? FaBriefcase;
            const checked = item.key === value;
            return (
              <label key={item.key} className={`spec-card ${checked ? "is-selected" : ""}`}>
                <input
                  type="radio"
                  name="professional_specialization"
                  id={index === 0 ? "professional_specialization" : undefined}
                  value={item.key}
                  checked={checked}
                  onChange={() => onChange(item.key)}
                />
                <span className="spec-icon" aria-hidden="true">
                  <Icon />
                </span>
                <span className="spec-text">
                  <strong>
                    <bdi>{item.title || item.label}</bdi>
                  </strong>
                  {item.description && <small>{item.description}</small>}
                </span>
                <FaCheckCircle className="spec-check" aria-hidden="true" />
              </label>
            );
          })}
        </div>
      )}

      {error && (
        <span className="error-message" id="spec-error">
          {error}
        </span>
      )}
    </fieldset>
  );
}

export default SpecializationPicker;
