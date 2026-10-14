import { CircleAlert, CircleCheck } from "lucide-react";
import { approach } from "../content";
import { SectionHeading } from "../components/shared";

// المشكلة وطريقتنا: عمودان متقابلان (التحدي / ما تقدمه المنصة)
export default function ApproachSection() {
  return (
    <section className="lp-section" id={approach.id} aria-labelledby="lp-approach-title">
      <div className="lp-container">
        <SectionHeading id="lp-approach-title" eyebrow={approach.eyebrow} title={approach.title} lead={approach.lead} />
        <div className="lp-compare">
          <div className="lp-compare-col lp-compare-gap">
            <h3>{approach.gap.title}</h3>
            <ul>
              {approach.gap.items.map((item) => (
                <li key={item}>
                  <CircleAlert size={18} aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="lp-compare-col lp-compare-answer">
            <h3>{approach.answer.title}</h3>
            <ul>
              {approach.answer.items.map((item) => (
                <li key={item}>
                  <CircleCheck size={18} aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
