import { FaCheck } from "react-icons/fa";

function StepIndicator({ currentStep, steps }) {
  return (
    <div className="step-indicator animate-element delay-200">
      {steps.map((label, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isDone = stepNumber < currentStep;

        return (
          <div className="step-indicator-item" key={stepNumber}>
            <div className="step-row">
              <span
                className={`step-circle ${
                  isActive ? "step-circle-active" : ""
                } ${isDone ? "step-circle-done" : ""}`}
              >
                {isDone ? <FaCheck /> : stepNumber}
              </span>
              <span
                className={`step-label ${isActive ? "step-label-active" : ""} ${
                  isDone ? "step-label-done" : ""
                }`}
              >
                {label}
              </span>
            </div>
            {stepNumber !== steps.length && (
              <span className="step-connector"></span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default StepIndicator;