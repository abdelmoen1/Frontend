import { Check, X } from "lucide-react";
import { problem } from "../content";

function Points({ points }) {
  return (
    <ul className="lp-points">
      {points.map((point) => (
        <li key={point.text} className={point.ok ? "is-ok" : "is-missing"}>
          <span className="lp-point-icon">
            {point.ok ? <Check size={13} aria-hidden="true" /> : <X size={13} aria-hidden="true" />}
          </span>
          <span>
            <span className="lp-visually-hidden">{point.ok ? "متوفر: " : "ينقصه: "}</span>
            {point.text}
          </span>
        </li>
      ))}
    </ul>
  );
}

function SideCard({ side, children }) {
  return (
    <article className="lp-side-card">
      <header>
        <h3>{side.title}</h3>
        <p>{side.subtitle}</p>
      </header>
      <Points points={side.points} />
      {children}
    </article>
  );
}

// المشكلة: المؤسسة والطالب على جانبي "فجوة"
export default function ProblemSection() {
  const { organization, student } = problem;

  return (
    <section className="lp-section lp-problem" id={problem.id} aria-labelledby="lp-problem-title">
      <div className="lp-container">
        <header className="lp-heading lp-heading-center">
          <span className="lp-eyebrow">{problem.eyebrow}</span>
          <h2 id="lp-problem-title">
            {problem.title.map((part) =>
              part.highlight ? (
                <span key={part.text} className="lp-accent">
                  {part.text}
                </span>
              ) : (
                <span key={part.text}>{part.text}</span>
              ),
            )}
          </h2>
          <p className="lp-lead">{problem.lead}</p>
        </header>

        <div className="lp-gap-layout">
          <SideCard side={organization}>
            <ul className="lp-terms" aria-label="مصطلحات تقنية">
              {organization.terms.map((term) => (
                <li key={term}>{term}</li>
              ))}
            </ul>
            <p className="lp-side-note">{organization.note}</p>
          </SideCard>

          <div className="lp-gap-divider" aria-hidden="true">
            <span className="lp-gap-chip">{problem.gapLabel}</span>
          </div>

          <SideCard side={student}>
            <figure className="lp-meter" aria-label={student.meter.note}>
              {student.meter.rows.map((row) => (
                <div key={row.label} className="lp-meter-row">
                  <span>{row.label}</span>
                  <span className={`lp-meter-dots lp-meter-${row.tone}`} aria-hidden="true">
                    {Array.from({ length: row.dots }, (_, index) => (
                      <i key={index} className={index < row.filled ? "is-on" : ""} />
                    ))}
                  </span>
                </div>
              ))}
              <figcaption>{student.meter.note}</figcaption>
            </figure>
          </SideCard>
        </div>
      </div>
    </section>
  );
}
