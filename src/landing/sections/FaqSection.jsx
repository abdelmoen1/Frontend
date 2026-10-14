import { ChevronDown } from "lucide-react";
import { faq } from "../content";
import { SectionHeading } from "../components/shared";

// أسئلة شائعة بعناصر details الأصلية (تعمل بلوحة المفاتيح وقارئات الشاشة دون JavaScript)
export default function FaqSection() {
  return (
    <section className="lp-section" id={faq.id} aria-labelledby="lp-faq-title">
      <div className="lp-container lp-faq-layout">
        <SectionHeading id="lp-faq-title" eyebrow={faq.eyebrow} title={faq.title} />
        <div className="lp-faq">
          {faq.items.map((item) => (
            <details key={item.q} className="lp-faq-item">
              <summary>
                <span>{item.q}</span>
                <ChevronDown size={18} aria-hidden="true" />
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
