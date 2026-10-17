import { Check, Info } from "lucide-react";
import { outcomes } from "../content";
import { SectionHeading } from "../components/shared";
import { Reveal, RevealItem, RevealList } from "../components/Reveal";

// القيمة المقصودة من التجربة العملية، مع تنبيه صريح بعدم ضمان النتائج
export default function OutcomesSection() {
  return (
    <section className="lp-section lp-outcomes-section" id={outcomes.id} aria-labelledby="lp-outcomes-title">
      <div className="lp-container lp-outcomes-layout">
        <div className="lp-sticky">
          <SectionHeading id="lp-outcomes-title" eyebrow={outcomes.eyebrow} title={outcomes.title} />
        </div>
        <div className="lp-outcomes">
          {outcomes.groups.map((group, index) => (
            <Reveal key={group.title} delay={index * 0.1} className="lp-outcome">
              <h3>{group.title}</h3>
              <RevealList delay={0.15}>
                {group.items.map((item) => (
                  <RevealItem key={item}>
                    <span className="lp-check" aria-hidden="true">
                      <Check size={14} strokeWidth={2.5} />
                    </span>
                    <span>{item}</span>
                  </RevealItem>
                ))}
              </RevealList>
            </Reveal>
          ))}
          <Reveal className="lp-disclaimer">
            <Info size={16} aria-hidden="true" />
            <p>{outcomes.disclaimer}</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
