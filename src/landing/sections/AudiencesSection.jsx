import { ArrowLeft } from "lucide-react";
import { audiences } from "../content";
import { CtaLink, LandingIcon } from "../components/shared";

// مساران للجمهورين جنبًا إلى جنب؛ لكل منهما id يُستخدم في روابط القائمة (#students و #organizations)
function AudiencePanel({ audience, tone }) {
  const titleId = `lp-${audience.id}-title`;
  return (
    <article className={`lp-audience lp-audience-${tone}`} id={audience.id} aria-labelledby={titleId}>
      <span className="lp-eyebrow">{audience.eyebrow}</span>
      <h2 id={titleId}>{audience.title}</h2>
      <ul className="lp-benefits">
        {audience.benefits.map((benefit) => (
          <li key={benefit.title}>
            <span className="lp-icon-tile">
              <LandingIcon name={benefit.icon} />
            </span>
            <div>
              <h3>{benefit.title}</h3>
              <p>{benefit.text}</p>
            </div>
          </li>
        ))}
      </ul>
      <CtaLink to={audience.cta.to} variant={tone === "dark" ? "light" : "primary"}>
        {audience.cta.label}
        <ArrowLeft size={17} aria-hidden="true" />
      </CtaLink>
    </article>
  );
}

export default function AudiencesSection() {
  return (
    <section className="lp-section lp-section-tight" aria-label="لمن GoTrainee">
      <div className="lp-container lp-audiences">
        <AudiencePanel audience={audiences.students} tone="light" />
        <AudiencePanel audience={audiences.organizations} tone="dark" />
      </div>
    </section>
  );
}
