import { ArrowLeft } from "lucide-react";
import { audiences } from "../content";
import { CtaLink, LandingIcon } from "../components/shared";
import { Reveal, RevealItem, RevealList } from "../components/Reveal";
import { trackPointer } from "../motion";

// لوحتان غير متماثلتين: الطلاب بشبكة مزايا عريضة، والمؤسسات بقائمة في عمود أضيق بتوهج أزرق.
// لكل لوحة id يُستخدم في روابط القائمة (#students و #organizations)
function AudiencePanel({ audience, tone, delay = 0 }) {
  const titleId = `lp-${audience.id}-title`;
  return (
    <Reveal delay={delay} className={`lp-audience-cell lp-audience-cell-${tone}`}>
      <article
        className={`lp-audience lp-audience-${tone} lp-glow`}
        id={audience.id}
        aria-labelledby={titleId}
        onPointerMove={trackPointer}
      >
        <span className="lp-eyebrow">{audience.eyebrow}</span>
        <h2 id={titleId}>{audience.title}</h2>
        <RevealList className="lp-benefits" delay={0.15}>
          {audience.benefits.map((benefit) => (
            <RevealItem key={benefit.title}>
              <span className="lp-icon-tile">
                <LandingIcon name={benefit.icon} />
              </span>
              <div>
                <h3>{benefit.title}</h3>
                <p>{benefit.text}</p>
              </div>
            </RevealItem>
          ))}
        </RevealList>
        <CtaLink to={audience.cta.to} variant={tone === "org" ? "primary" : "ghost"}>
          {audience.cta.label}
          <ArrowLeft size={17} aria-hidden="true" />
        </CtaLink>
      </article>
    </Reveal>
  );
}

export default function AudiencesSection() {
  return (
    <section className="lp-section lp-section-tight" id="roles" aria-label="لمن GoTrainee">
      <div className="lp-container lp-audiences">
        <AudiencePanel audience={audiences.students} tone="student" />
        <AudiencePanel audience={audiences.organizations} tone="org" delay={0.12} />
      </div>
    </section>
  );
}
