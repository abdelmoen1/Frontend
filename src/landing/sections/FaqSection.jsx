import { Plus } from "lucide-react";
import { faq } from "../content";
import { SectionHeading } from "../components/shared";
import { Reveal } from "../components/Reveal";

// أسئلة شائعة بعناصر details الأصلية (تعمل بلوحة المفاتيح وقارئات الشاشة دون JavaScript)
export default function FaqSection() {
  return (
    <section className="lp-section" id={faq.id} aria-labelledby="lp-faq-title">
      <div className="lp-container lp-faq-layout">
        <div className="lp-sticky">
          <SectionHeading id="lp-faq-title" eyebrow={faq.eyebrow} title={faq.title} />
        </div>
        <Reveal className="lp-faq" delay={0.1}>
          {faq.items.map((item) => (
            <details key={item.q} className="lp-faq-item">
              <summary>
                <span>{item.q}</span>
                <span className="lp-faq-icon" aria-hidden="true">
                  <Plus size={16} />
                </span>
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
