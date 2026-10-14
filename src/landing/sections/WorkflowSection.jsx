import { ArrowLeft, Check } from "lucide-react";
import { workflow } from "../content";
import { CtaLink, SectionHeading } from "../components/shared";
// بطاقات ورسومات صفحة بداية المشروع داخل التطبيق نفسها (أصناف .pi-* فقط، بلا قواعد عامة)
import "../../organization/styles/ProjectIntro.css";

// الرسومات نفسها في ProjectIntro.jsx؛ المفتاح art في content.js يختار منها
const ART = {
  chat: (
    <div className="pi-art pi-art-3" aria-hidden="true">
      <div className="pi-bubble pi-bubble-primary">
        <i />
        <i />
        <i />
      </div>
      <div className="pi-bubble pi-bubble-secondary">
        <i />
      </div>
    </div>
  ),
  question: (
    <div className="pi-art pi-art-2" aria-hidden="true">
      <div className="pi-orb">؟</div>
      <span className="pi-star pi-star-1" />
      <span className="pi-star pi-star-2" />
    </div>
  ),
  document: (
    <div className="pi-art pi-art-1" aria-hidden="true">
      <div className="pi-doc">
        <i className="pi-tag" />
        <i className="pi-line pi-line-full" />
        <i className="pi-line pi-line-long" />
        <i className="pi-line pi-line-medium" />
      </div>
      <span className="pi-check">
        <Check size={20} strokeWidth={3} />
      </span>
    </div>
  ),
};

export default function WorkflowSection() {
  return (
    <section className="lp-section lp-section-soft lp-workflow" id={workflow.id} aria-labelledby="lp-workflow-title">
      <div className="lp-container">
        <SectionHeading id="lp-workflow-title" eyebrow={workflow.eyebrow} title={workflow.title} lead={workflow.lead} />
        <ol className="pi-grid">
          {workflow.steps.map((step) => (
            <li className="pi-card" key={step.number}>
              <span className="pi-num" aria-hidden="true">
                {step.number}
              </span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
              {ART[step.art]}
              <span className="lp-pi-note">{step.note}</span>
            </li>
          ))}
        </ol>
        <div className="lp-workflow-cta">
          <CtaLink to={workflow.cta.to} className="lp-btn-lg">
            {workflow.cta.label}
            <ArrowLeft size={18} aria-hidden="true" />
          </CtaLink>
        </div>
      </div>
    </section>
  );
}
