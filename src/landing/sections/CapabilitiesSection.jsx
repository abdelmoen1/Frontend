import { capabilities } from "../content";
import { LandingIcon, SectionHeading } from "../components/shared";

// ميزات منفذة فعلًا فقط؛ أضف أو احذف عناصر من capabilities.items في content.js
export default function CapabilitiesSection() {
  return (
    <section className="lp-section" id={capabilities.id} aria-labelledby="lp-capabilities-title">
      <div className="lp-container">
        <SectionHeading
          id="lp-capabilities-title"
          eyebrow={capabilities.eyebrow}
          title={capabilities.title}
          lead={capabilities.lead}
        />
        <ul className="lp-features">
          {capabilities.items.map((item) => (
            <li key={item.title} className="lp-card lp-feature">
              <div className="lp-feature-top">
                <span className="lp-icon-tile">
                  <LandingIcon name={item.icon} />
                </span>
                <span className={`lp-tag lp-tag-${item.audience}`}>{capabilities.audienceLabels[item.audience]}</span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
