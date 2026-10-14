import { Check, Info } from "lucide-react";
import { outcomes } from "../content";
import { SectionHeading } from "../components/shared";

// القيمة المقصودة من التجربة العملية، مع تنبيه صريح بعدم ضمان النتائج
export default function OutcomesSection() {
  return (
    <section className="lp-section lp-section-soft" id={outcomes.id} aria-labelledby="lp-outcomes-title">
      <div className="lp-container">
        <SectionHeading id="lp-outcomes-title" eyebrow={outcomes.eyebrow} title={outcomes.title} />
        <div className="lp-outcomes">
          {outcomes.groups.map((group) => (
            <div key={group.title} className="lp-card lp-outcome">
              <h3>{group.title}</h3>
              <ul>
                {group.items.map((item) => (
                  <li key={item}>
                    <Check size={17} aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="lp-disclaimer">
          <Info size={16} aria-hidden="true" />
          {outcomes.disclaimer}
        </p>
      </div>
    </section>
  );
}
