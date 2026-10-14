import { proof } from "../content";
import { SectionHeading } from "../components/shared";

/**
 * أرقام وآراء موثقة — معطّل في SECTIONS. لا يظهر شيء ما دامت proof.stats و proof.testimonials فارغتين،
 * فلا يمكن أن تُنشر بيانات ناقصة أو تجريبية بالخطأ. املأهما بمحتوى حقيقي فقط (انظر التعليق في content.js).
 */
export default function ProofSection() {
  const stats = proof.stats.filter((item) => item?.value && item?.label);
  const testimonials = proof.testimonials.filter((item) => item?.quote && item?.name);
  if (stats.length === 0 && testimonials.length === 0) return null;

  return (
    <section className="lp-section" id={proof.id} aria-labelledby="lp-proof-title">
      <div className="lp-container">
        <SectionHeading id="lp-proof-title" eyebrow={proof.eyebrow} title={proof.title} align="center" />
        {stats.length > 0 && (
          <dl className="lp-stats">
            {stats.map((item) => (
              <div key={item.label} className="lp-card">
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
                {item.source && <small>{item.source}</small>}
              </div>
            ))}
          </dl>
        )}
        {testimonials.length > 0 && (
          <div className="lp-testimonials">
            {testimonials.map((item) => (
              <blockquote key={item.name} className="lp-card">
                <p>{item.quote}</p>
                <footer>
                  <strong>{item.name}</strong>
                  {item.role && <span>{item.role}</span>}
                </footer>
              </blockquote>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
