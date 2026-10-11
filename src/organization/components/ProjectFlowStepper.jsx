import { Check } from "lucide-react";

import "../styles/ProjectFlowStepper.css";

const STAGES = ["المشكلة", "الأسئلة", "المسودة", "القرار"];

// رأس مسار إنشاء المشروع: وصف مختصر + مؤشر المراحل الأربع
export default function ProjectFlowStepper({ current = 0 }) {
  return (
    <header className="pf-head">
      <p className="pf-lead">
        حوّل مشكلتك إلى مشروع واضح في 4 خطوات بسيطة – بلا مصطلحات تقنية.
      </p>

      <ol className="pf-steps" aria-label="مراحل إنشاء المشروع">
        {STAGES.map((label, index) => {
          const state =
            index < current ? "done" : index === current ? "active" : "todo";

          return (
            <li
              className={`pf-step pf-step-${state}`}
              key={label}
              aria-current={state === "active" ? "step" : undefined}
            >
              <span className="pf-dot" aria-hidden="true">
                {state === "done" && <Check size={13} strokeWidth={3} />}
              </span>
              <span className="pf-label">{label}</span>
            </li>
          );
        })}
      </ol>
    </header>
  );
}
