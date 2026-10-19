import { useRef } from "react";
import { Check, X } from "lucide-react";
import { useInView } from "motion/react";
import * as m from "motion/react-m";
import { problem } from "../content";
import { SectionHeading } from "../components/shared";
import { Reveal } from "../components/Reveal";
import { GapScene } from "../components/Illustrations";
import { DURATION, EASE_OUT, VIEWPORT, trackPointer } from "../motion";

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

function SideCard({ side, delay = 0, className = "", children }) {
  return (
    <Reveal delay={delay} className={`lp-side ${className}`.trim()}>
      <article className="lp-side-card lp-glow" onPointerMove={trackPointer}>
        <header>
          <h3>{side.title}</h3>
          <p>{side.subtitle}</p>
        </header>
        <Points points={side.points} />
        {children}
      </article>
    </Reveal>
  );
}

// رسم النقاط يمتلئ عند ظهوره؛ رسم توضيحي بلا أرقام
function Meter({ meter }) {
  const ref = useRef(null);
  const inView = useInView(ref, VIEWPORT);
  return (
    <figure ref={ref} className={`lp-meter ${inView ? "is-in" : ""}`} aria-label={meter.note}>
      {meter.rows.map((row) => (
        <div key={row.label} className="lp-meter-row">
          <span>{row.label}</span>
          <span className={`lp-meter-dots lp-meter-${row.tone}`} aria-hidden="true">
            {Array.from({ length: row.dots }, (_, index) => (
              <i key={index} className={index < row.filled ? "is-on" : ""} style={{ "--i": index }} />
            ))}
          </span>
        </div>
      ))}
      <figcaption>{meter.note}</figcaption>
    </figure>
  );
}

const grow = {
  initial: { scale: 0 },
  whileInView: { scale: 1 },
  viewport: VIEWPORT,
  transition: { duration: DURATION.slow, ease: EASE_OUT, delay: 0.3 },
};

// المشكلة: المؤسسة والطالب على جانبي "فجوة"؛ خطان يقتربان ولا يلتقيان
export default function ProblemSection() {
  const { organization, student } = problem;
  const title = problem.title.map((part) => (
    <span key={part.text} className={part.highlight ? "lp-accent" : undefined}>
      {part.text}
    </span>
  ));

  return (
    <section className="lp-section lp-problem" id={problem.id} aria-labelledby="lp-problem-title">
      <div className="lp-container">
        <SectionHeading id="lp-problem-title" eyebrow={problem.eyebrow} title={title} lead={problem.lead} split />

        <div className="lp-gap-scene">
          <GapScene />
        </div>

        <div className="lp-gap-layout">
          <SideCard side={organization}>
            <ul className="lp-terms" aria-label="مصطلحات تقنية">
              {organization.terms.map((term, index) => (
                <li key={term} style={{ "--i": index }}>
                  {term}
                </li>
              ))}
            </ul>
            <p className="lp-side-note">{organization.note}</p>
          </SideCard>

          <div className="lp-gap" aria-hidden="true">
            <m.span className="lp-gap-line lp-gap-line-a" {...grow} />
            <span className="lp-gap-chip">{problem.gapLabel}</span>
            <m.span className="lp-gap-line lp-gap-line-b" {...grow} />
          </div>

          <SideCard side={student} delay={0.15} className="lp-side-offset">
            <Meter meter={student.meter} />
          </SideCard>
        </div>
      </div>
    </section>
  );
}
