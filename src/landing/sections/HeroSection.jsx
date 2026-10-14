import { Link } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { hero, ROUTES } from "../content";
import { CtaLink } from "../components/shared";
import HeroPreview from "../components/HeroPreview";

export default function HeroSection() {
  return (
    <section className="lp-hero" aria-labelledby="lp-hero-title">
      <div className="lp-container lp-hero-grid">
        <div className="lp-hero-copy">
          <span className="lp-pill">{hero.eyebrow}</span>
          <h1 id="lp-hero-title">
            {hero.title} <span className="lp-highlight">{hero.titleHighlight}</span>
          </h1>
          <p className="lp-hero-lead">{hero.lead}</p>
          <div className="lp-hero-actions">
            <CtaLink to={hero.primary.to} className="lp-btn-lg">
              {hero.primary.label}
              <ArrowLeft size={18} aria-hidden="true" />
            </CtaLink>
            <CtaLink to={hero.secondary.to} variant="secondary" className="lp-btn-lg">
              {hero.secondary.label}
            </CtaLink>
          </div>
          <p className="lp-hero-login">
            {hero.loginPrompt} <Link to={ROUTES.login}>{hero.loginLabel}</Link>
          </p>
          <ul className="lp-hero-notes">
            {hero.notes.map((note) => (
              <li key={note}>
                <Check size={15} aria-hidden="true" />
                {note}
              </li>
            ))}
          </ul>
        </div>
        <HeroPreview preview={hero.preview} />
      </div>
    </section>
  );
}
